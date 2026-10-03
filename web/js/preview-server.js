// ============================================================
//  GafCoreAI - Servidor de vista previa
//  Levanta el servidor de desarrollo del proyecto abierto (Vite, Next,
//  CRA, Astro, Angular, Express, Django, Flask, PHP...) en una sesion PTY
//  en segundo plano y detecta la URL que imprime para cargarla en el
//  navegador interno.
// ============================================================

const ANSI_RE = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[=>()][0-9A-Za-z]?/g;

export function stripAnsi(text) {
  return String(text || "").replace(ANSI_RE, "").replace(/\r/g, "");
}

/**
 * Decide como servir el proyecto.
 * @param {{ pkg?: object|null, rootNames: Set<string>|string[] }} info
 * @returns {{ kind: "node"|"python"|"php", cmd: string, label: string, needsInstall: boolean } | null}
 *   null = sitio estatico (se sirve inline como antes).
 */
export function detectDevCommand({ pkg = null, rootNames = [] } = {}) {
  const names = new Set([...rootNames].map(n => String(n).toLowerCase()));
  if (pkg && typeof pkg === "object") {
    const scripts = pkg.scripts || {};
    // Los scripts que abren una app de escritorio (tauri dev, electron .) no sirven una web.
    const pick = ["dev", "start", "serve", "develop"].find(s =>
      typeof scripts[s] === "string" && scripts[s].trim() && !/\b(tauri|electron)\b/i.test(scripts[s]));
    if (pick) {
      const run = pick === "start" ? "npm.cmd start" : "npm.cmd run " + pick;
      const needsInstall = !names.has("node_modules");
      const cmd = needsInstall ? "npm.cmd install; if ($?) { " + run + " }" : run;
      return { kind: "node", cmd, label: (needsInstall ? "npm install + " : "") + run.replace("npm.cmd", "npm"), needsInstall };
    }
  }
  if (names.has("manage.py")) {
    return { kind: "python", cmd: "python manage.py runserver", label: "python manage.py runserver", needsInstall: false };
  }
  if (names.has("app.py")) {
    return { kind: "python", cmd: "python app.py", label: "python app.py", needsInstall: false };
  }
  if (names.has("index.php") || names.has("composer.json")) {
    const docroot = names.has("public") && !names.has("index.php") ? " -t public" : "";
    return { kind: "php", cmd: "php -S localhost:8000" + docroot, label: "php -S localhost:8000" + docroot, needsInstall: false };
  }
  return null;
}

/**
 * Busca en la salida del servidor la URL local donde quedo escuchando.
 */
export function parseServerUrl(output) {
  const text = stripAnsi(output);
  const urls = [];
  const re = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]|\[::\]):\d{2,5}(?:\/[^\s'"<>)\]]*)?/gi;
  let m;
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    urls.push({ url: m[0], local: /local/i.test(before) });
  }
  const chosen = urls.find(u => u.local) || urls[0];
  if (chosen) {
    return chosen.url
      .replace(/\/\/(?:0\.0\.0\.0|\[::\]|\[::1?\])/, "//localhost")
      .replace(/[.,;:]+$/, "");
  }
  const port = text.match(/(?:listening|running|started|server|escuchando)[^\n]{0,60}?\bport\s*:?\s*(\d{2,5})\b/i)
    || text.match(/\bport\s*:?\s*(\d{4,5})\b[^\n]{0,30}(?:listening|ready|started)/i);
  return port ? "http://localhost:" + port[1] : null;
}

export function looksLikeFatalError(output) {
  const text = stripAnsi(output);
  return /npm ERR!|npm error|ERR_MODULE_NOT_FOUND|Cannot find module|command not found|no se reconoce como|is not recognized as|SyntaxError:|EADDRINUSE/i.test(text);
}

export class PreviewServer {
  constructor({ bridge, onLog, onUrl, onExit }) {
    this.bridge = bridge;
    this.onLog = onLog || (() => {});
    this.onUrl = onUrl || (() => {});
    this.onExit = onExit || (() => {});
    this.session = null; // { id, folder, cmd, url, output, unlisten[] }
  }

  isRunningFor(folder) {
    return !!(this.session && this.session.folder === folder);
  }

  get url() {
    return this.session ? this.session.url : null;
  }

  async start(folder, plan) {
    await this.stop();
    const id = "preview-" + Date.now().toString(36);
    const session = { id, folder, cmd: plan.cmd, label: plan.label || plan.cmd, url: null, output: "", unlisten: [] };
    this.session = session;

    const offOut = await this.bridge.onTerminalOutput(id, chunk => {
      if (this.session !== session) return;
      session.output = (session.output + chunk).slice(-20000);
      this.onLog(stripAnsi(session.output));
      if (!session.url) {
        const url = parseServerUrl(session.output);
        if (url) {
          session.url = url;
          this.onUrl(url, session);
        }
      }
    });
    const offExit = await this.bridge.onTerminalExit(id, () => {
      if (this.session !== session) return;
      this.onExit(stripAnsi(session.output), session);
      this.session = null;
    });
    session.unlisten = [offOut, offExit].filter(f => typeof f === "function");

    await this.bridge.spawnTerminal(id, folder);
    await new Promise(r => setTimeout(r, 400));
    await this.bridge.writeTerminal(id, plan.cmd + "\r");
    return session;
  }

  async stop() {
    const s = this.session;
    if (!s) return;
    this.session = null;
    s.unlisten.forEach(off => { try { off(); } catch (_) {} });
    try {
      // Ctrl+C llega a todo el grupo de procesos de la consola (npm, vite, node...).
      await this.bridge.writeTerminal(s.id, "\x03");
      await new Promise(r => setTimeout(r, 300));
      await this.bridge.writeTerminal(s.id, "\x03");
      await new Promise(r => setTimeout(r, 300));
    } catch (_) {}
    try { await this.bridge.closeTerminal(s.id); } catch (_) {}
  }
}
