// scripts/add-keyboard-shortcuts.mjs
// Añade Ctrl+N/O/S/B al inicio de bindUI().
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "web/js/app.js");
const BACKUP = APP + ".bak-shortcuts";
const TS = Date.now();

const src = readFileSync(APP, "utf-8");
const marker = "function bindUI() {";
const idx = src.indexOf(marker);

if (idx < 0) {
  console.log(" No se encontró bindUI(). Abortar.");
  process.exit(1);
}
if (src.includes("GLOBAL_KEYBOARD_SHORTCUTS")) {
  console.log("  Los atajos ya estaban instalados. No hacer nada.");
  process.exit(0);
}

copyFileSync(APP, BACKUP);

const injection = `function bindUI() {
  //  GLOBAL_KEYBOARD_SHORTCUTS (v1.5.1) 
  document.addEventListener("keydown", (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    if (e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "n") {
      e.preventDefault();
      const btn = document.getElementById("btn-new-project");
      if (btn) btn.click();
      return;
    }
    if (key === "s") {
      e.preventDefault();
      const btn = document.getElementById("btn-save-file");
      if (btn) btn.click();
      return;
    }
    if (key === "o") {
      e.preventDefault();
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        const t = (b.textContent || "").trim();
        if (t.includes("Carpeta")) { b.click(); return; }
      }
      return;
    }
    if (key === "b") {
      e.preventDefault();
      // Toggle panel derecho (probamos varios selectores comunes)
      const candidates = [
        document.getElementById("right-panel"),
        document.querySelector(".right-panel"),
        document.querySelector("aside.panel"),
        document.querySelector("[data-panel='right']")
      ];
      for (const el of candidates) {
        if (el) { el.classList.toggle("hidden"); return; }
      }
      return;
    }
  });
  //  FIN GLOBAL_KEYBOARD_SHORTCUTS 
`;

const out = src.slice(0, idx) + injection + src.slice(idx + marker.length);

writeFileSync(APP, out, "utf-8");
console.log(" Atajos añadidos al inicio de bindUI()");
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