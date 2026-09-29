// scripts/fix-productname.mjs
// v63.1  Arregla productName y limpia bundles viejos.
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

function stripBOM(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

//  1. Fix productName 
const confPath = join(ROOT, "src-tauri/tauri.conf.json");
if (existsSync(confPath)) {
  copyFileSync(confPath, confPath + ".bak-" + TS);
  let conf = stripBOM(readFileSync(confPath, "utf-8"));

  // Mostrar valor actual
  const m = conf.match(/"productName"\s*:\s*"[^"]*"/);
  console.log("productName actual:", m ? m[0] : "(no encontrado)");

  // Reemplazar por uno limpio
  conf = conf.replace(/"productName"\s*:\s*"[^"]*"/, '"productName": "GafCoreAI"');
  writeFileSync(confPath, conf, "utf-8");

  const m2 = conf.match(/"productName"\s*:\s*"[^"]*"/);
  console.log("productName nuevo:  " + (m2 ? m2[0] : "(?)"));
}

//  2. Limpiar bundles viejos (v1.5.0) 
const bundleRoot = join(ROOT, "src-tauri/target/release/bundle");
if (existsSync(bundleRoot)) {
  console.log("\n=== Limpieza de bundles viejos ===");
  const { readdirSync, statSync } = await import("node:fs");
  const dirs = readdirSync(bundleRoot);
  let removed = 0;
  for (const d of dirs) {
    const sub = join(bundleRoot, d);
    if (!statSync(sub).isDirectory()) continue;
    const files = readdirSync(sub);
    for (const f of files) {
      if (/1\.5\.[0-9]+/.test(f) || /GafCoreAI_1\.5/.test(f)) {
        const full = join(sub, f);
        rmSync(full, { force: true });
        console.log("  borrado: " + d + "/" + f);
        removed++;
      }
    }
  }
  if (removed === 0) console.log("  nada que borrar");
}

console.log("\nBackups: *.bak-" + TS);
console.log("\nSiguiente: npm run tauri build");