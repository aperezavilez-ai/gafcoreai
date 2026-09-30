// scripts/add-new-scaffold.mjs
// Añade rama determinista al handler /new. Sin módulos nuevos. Sin init nuevos.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "web/js/app.js");
const BACKUP = APP + ".bak-new-scaffold";

//  1. Diagnóstico 
console.log(" 1. Diagnóstico \n");
const src0 = readFileSync(APP, "utf-8");

const hasHandler = src0.includes('if (firstWord === "/new") { input.value = ""; hideSlashMenu(); openNewProjectModal(); return; }');
console.log("Handler /new original encontrado: " + hasHandler);

const hasTauriBridge = /import\s+\{[^}]*tauriBridge[^}]*\}\s+from\s+["']\.\/tauri-bridge\.js["']/.test(src0);
console.log("tauriBridge importado en app.js: " + hasTauriBridge);

const bridgeSrc = readFileSync(join(ROOT, "web/js/tauri-bridge.js"), "utf-8");
const hasCreateDir = /createDir\s*\(/.test(bridgeSrc);
const hasWriteFile = /writeFile\s*\(/.test(bridgeSrc);
console.log("tauriBridge.createDir disponible: " + hasCreateDir);
console.log("tauriBridge.writeFile disponible: " + hasWriteFile);

if (!hasHandler) {
  console.log("\n Handler /new no encontrado con el patrón exacto.");
  console.log("   Abortar sin tocar nada.");
  process.exit(1);
}
if (!hasTauriBridge || !hasCreateDir || !hasWriteFile) {
  console.log("\n tauriBridge no está disponible completamente.");
  console.log("   Abortar sin tocar nada.");
  process.exit(1);
}

//  2. Backup + aplicar cambio 
console.log("\n 2. Aplicando cambio \n");
copyFileSync(APP, BACKUP);

const oldHandler = 'if (firstWord === "/new") { input.value = ""; hideSlashMenu(); openNewProjectModal(); return; }';

const newHandler = `if (firstWord === "/new") {
    const _newArg = text.slice(firstWord.length).trim();
    input.value = "";
    hideSlashMenu();
    if (!_newArg) { openNewProjectModal(); return; }
    if (_newArg === "?" || _newArg === "help") {
      appendChat("system", "**Uso:** \\\`/new <nombre>\\\` crea proyecto web determinista en \\\`D:\\\\\\\\PROGRAMAS IA\\\\\\\\NUEVOS PROYECTOS\\\\\\\\<nombre>\\\`\\\\n\\\\nSin argumento: abre el modal de templates.");
      return;
    }
    (async () => {
      try {
        const safeName = _newArg.replace(/[^a-zA-Z0-9_-]/g, "");
        if (!safeName || safeName !== _newArg) {
          appendChat("system", " Nombre inválido. Solo letras, números, guiones y guiones bajos.");
          return;
        }
        const projDir = "D:\\\\\\\\PROGRAMAS IA\\\\\\\\NUEVOS PROYECTOS\\\\\\\\" + safeName;
        try { await tauriBridge.createDir(projDir); } catch (_) {}
        const files = {
          "index.html": "<!DOCTYPE html>\\\\n<html lang=\\"es\\">\\\\n<head>\\\\n  <meta charset=\\"UTF-8\\">\\\\n  <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\\\n  <title>" + safeName + "</title>\\\\n  <link rel=\\"stylesheet\\" href=\\"styles.css\\">\\\\n</head>\\\\n<body>\\\\n  <main class=\\"container\\">\\\\n    <h1>" + safeName + "</h1>\\\\n    <p>Proyecto creado con GafCoreAI.</p>\\\\n    <button id=\\"btn\\">Haz clic</button>\\\\n    <p id=\\"output\\"></p>\\\\n  </main>\\\\n  <script src=\\"script.js\\"></script>\\\\n</body>\\\\n</html>",
          "styles.css": "* { margin: 0; padding: 0; box-sizing: border-box; }\\\\nbody { font-family: system-ui, sans-serif; background: #0f1115; color: #e6e6e6; min-height: 100vh; display: flex; align-items: center; justify-content: center; }\\\\n.container { text-align: center; padding: 40px; }\\\\nh1 { font-size: 2.5rem; margin-bottom: 16px; }\\\\np { color: #8a93a6; margin-bottom: 24px; }\\\\nbutton { background: #6d28d9; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 1rem; cursor: pointer; }\\\\nbutton:hover { background: #7c3aed; }",
          "script.js": "document.getElementById(\\"btn\\").addEventListener(\\"click\\", () => {\\\\n  document.getElementById(\\"output\\").textContent = \\"Funciona. Editá script.js.\\";\\\\n});",
          "package.json": JSON.stringify({ name: safeName, version: "0.1.0", description: "Proyecto GafCoreAI", type: "module", scripts: { dev: "npx serve ." } }, null, 2)
        };
        const written = [];
        for (const name of Object.keys(files)) {
          await tauriBridge.writeFile(projDir + "\\\\\\\\" + name, files[name]);
          written.push(name);
        }
        appendChat("assistant", "##  Proyecto creado\\\\n\\\\n**Ruta:** \\\`" + projDir + "\\\`\\\\n**Archivos:** " + written.length + " (" + written.join(", ") + ")");
        termWrite("Scaffold OK: " + projDir, "success");
      } catch (e) {
        appendChat("system", " Error: " + (e && e.message ? e.message : e));
      }
    })();
    return;
  }`;

if (!src0.includes(oldHandler)) {
  console.log(" El handler cambió entre el diagnóstico y ahora. Abortar.");
  process.exit(1);
}
let src = src0.replace(oldHandler, newHandler);
writeFileSync(APP, src, "utf-8");
console.log(" Handler /new reemplazado");
console.log("  Tamaño antes: " + src0.length + " chars");
console.log("  Tamaño después: " + src.length + " chars");

//  3. Verificar 
console.log("\n 3. Verificando \n");
try {
  execSync("node --check web/js/app.js", { cwd: ROOT, stdio: "pipe" });
  console.log(" node --check OK");
  console.log("\n  IMPORTANTE: abre el exe manualmente y verifica:");
  console.log("   1. La app abre normal (sin alert rojo)");
  console.log("   2. Prueba: /new test-scaffold en el chat");
  console.log("   3. Verifica que se crea D:\\\\PROGRAMAS IA\\\\NUEVOS PROYECTOS\\\\test-scaffold\\\\");
  console.log("\n   Si algo falla: Copy-Item \"" + BACKUP + "\" \"" + APP + "\" -Force");
} catch (e) {
  console.log(" Error de sintaxis. Revirtiendo...");
  copyFileSync(BACKUP, APP);
  console.log("    Revertido");
  process.exit(1);
}