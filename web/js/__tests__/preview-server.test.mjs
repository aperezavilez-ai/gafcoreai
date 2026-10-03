import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDevCommand, parseServerUrl, stripAnsi, looksLikeFatalError, PreviewServer } from "../preview-server.js";

test("detectDevCommand: Vite/Next con node_modules usa npm run dev", () => {
  const p = detectDevCommand({ pkg: { scripts: { dev: "vite" } }, rootNames: ["node_modules", "src", "index.html"] });
  assert.equal(p.kind, "node");
  assert.equal(p.cmd, "npm.cmd run dev");
  assert.equal(p.needsInstall, false);
});

test("detectDevCommand: sin node_modules instala primero", () => {
  const p = detectDevCommand({ pkg: { scripts: { dev: "next dev" } }, rootNames: ["package.json"] });
  assert.equal(p.needsInstall, true);
  assert.match(p.cmd, /^npm\.cmd install; if \(\$\?\) \{ npm\.cmd run dev \}$/);
});

test("detectDevCommand: salta tauri/electron y usa serve o start", () => {
  const p = detectDevCommand({ pkg: { scripts: { dev: "tauri dev", serve: "npx serve web -l 3000" } }, rootNames: ["node_modules"] });
  assert.equal(p.cmd, "npm.cmd run serve");
  const s = detectDevCommand({ pkg: { scripts: { start: "node server.mjs" } }, rootNames: ["node_modules"] });
  assert.equal(s.cmd, "npm.cmd start");
  assert.equal(detectDevCommand({ pkg: { scripts: { dev: "electron ." } }, rootNames: ["index.html"] }), null);
});

test("detectDevCommand: Python, PHP y estatico", () => {
  assert.equal(detectDevCommand({ rootNames: ["manage.py"] }).cmd, "python manage.py runserver");
  assert.equal(detectDevCommand({ rootNames: ["app.py", "templates"] }).cmd, "python app.py");
  assert.equal(detectDevCommand({ rootNames: ["index.php"] }).cmd, "php -S localhost:8000");
  assert.equal(detectDevCommand({ rootNames: ["index.html", "styles.css"] }), null);
});

test("parseServerUrl: Vite con colores ANSI", () => {
  const out = "\x1b[32m  VITE v5.0.0\x1b[39m  ready in 300 ms\n\n  ➜  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m5174\x1b[22m/\x1b[39m\n  ➜  Network: use --host to expose\n";
  assert.equal(parseServerUrl(out), "http://localhost:5174/");
});

test("parseServerUrl: Next, Django, Flask, 0.0.0.0 y puerto suelto", () => {
  assert.equal(parseServerUrl("   ▲ Next.js 14.2.3\n   - Local:        http://localhost:3000\n"), "http://localhost:3000");
  assert.equal(parseServerUrl("Starting development server at http://127.0.0.1:8000/\nQuit the server with CTRL-BREAK."), "http://127.0.0.1:8000/");
  assert.equal(parseServerUrl(" * Running on http://127.0.0.1:5000 (Press CTRL+C to quit)"), "http://127.0.0.1:5000");
  assert.equal(parseServerUrl("Network: http://0.0.0.0:4321/"), "http://localhost:4321/");
  assert.equal(parseServerUrl("Server listening on port 8080"), "http://localhost:8080");
  assert.equal(parseServerUrl("PS D:\\X> npm.cmd run dev\n> vite"), null);
});

test("stripAnsi y looksLikeFatalError", () => {
  assert.equal(stripAnsi("\x1b[31mhola\x1b[0m\r\n"), "hola\n");
  assert.ok(looksLikeFatalError("npm ERR! missing script: dev"));
  assert.ok(looksLikeFatalError("'vite' no se reconoce como un comando interno o externo"));
  assert.ok(!looksLikeFatalError("VITE ready in 200ms"));
});

function fakeBridge() {
  const handlers = {};
  const calls = [];
  return {
    calls,
    emit(kind, id, payload) { (handlers[kind + id] || (() => {}))(payload); },
    async onTerminalOutput(id, h) { handlers["out" + id] = h; return () => { delete handlers["out" + id]; }; },
    async onTerminalExit(id, h) { handlers["exit" + id] = h; return () => { delete handlers["exit" + id]; }; },
    async spawnTerminal(id, cwd) { calls.push(["spawn", id, cwd]); },
    async writeTerminal(id, data) { calls.push(["write", id, data]); },
    async closeTerminal(id) { calls.push(["close", id]); }
  };
}

test("PreviewServer: arranca, detecta la URL una vez y se detiene con Ctrl+C", async () => {
  const bridge = fakeBridge();
  const urls = [];
  const server = new PreviewServer({ bridge, onUrl: u => urls.push(u) });
  const session = await server.start("D:\\LIPOBLUE", { cmd: "npm.cmd run dev", label: "npm run dev" });
  assert.ok(server.isRunningFor("D:\\LIPOBLUE"));
  assert.deepEqual(bridge.calls.find(c => c[0] === "write"), ["write", session.id, "npm.cmd run dev\r"]);

  bridge.emit("out", session.id, "  Local:   http://local");
  bridge.emit("out", session.id, "host:5173/\n");
  bridge.emit("out", session.id, "  Local:   http://localhost:9999/\n");
  assert.deepEqual(urls, ["http://localhost:5173/"]);
  assert.equal(server.url, "http://localhost:5173/");

  await server.stop();
  assert.ok(bridge.calls.some(c => c[0] === "write" && c[2] === "\x03"));
  assert.ok(bridge.calls.some(c => c[0] === "close" && c[1] === session.id));
  assert.equal(server.isRunningFor("D:\\LIPOBLUE"), false);
});

test("PreviewServer: al cambiar de proyecto detiene el anterior", async () => {
  const bridge = fakeBridge();
  const server = new PreviewServer({ bridge });
  const a = await server.start("D:\\A", { cmd: "npm.cmd run dev" });
  await server.start("D:\\B", { cmd: "npm.cmd run dev" });
  assert.ok(bridge.calls.some(c => c[0] === "close" && c[1] === a.id));
  assert.ok(server.isRunningFor("D:\\B"));
});

test("PreviewServer: avisa si el proceso termina sin URL", async () => {
  const bridge = fakeBridge();
  let exited = null;
  const server = new PreviewServer({ bridge, onExit: log => { exited = log; } });
  const s = await server.start("D:\\X", { cmd: "npm.cmd run dev" });
  bridge.emit("out", s.id, "npm ERR! missing script: dev\n");
  bridge.emit("exit", s.id, "exit");
  assert.match(exited, /missing script/);
  assert.equal(server.session, null);
});
