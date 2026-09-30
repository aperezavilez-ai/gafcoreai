import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "web/js/app.js");
const HANDLER = join(ROOT, "scripts/new-handler.txt");
const BACKUP = APP + ".bak-new-scaffold";

if (!existsSync(HANDLER)) {
  console.log(" new-handler.txt no existe");
  process.exit(1);
}

const newHandler = readFileSync(HANDLER, "utf-8").trimEnd();
const oldHandler = 'if (firstWord === "/new") { input.value = ""; hideSlashMenu(); openNewProjectModal(); return; }';

const src = readFileSync(APP, "utf-8");
if (!src.includes(oldHandler)) {
  console.log(" Handler original no encontrado. Abortar.");
  process.exit(1);
}

copyFileSync(APP, BACKUP);
const out = src.replace(oldHandler, newHandler);
writeFileSync(APP, out, "utf-8");

console.log(" Handler /new reemplazado");
console.log("  Antes:  " + src.length + " chars");
console.log("  Después: " + out.length + " chars");

try {
  execSync("node --check web/js/app.js", { cwd: ROOT, stdio: "pipe" });
  console.log(" node --check OK");
} catch (e) {
  console.log(" Error de sintaxis. Revirtiendo...");
  copyFileSync(BACKUP, APP);
  process.exit(1);
}