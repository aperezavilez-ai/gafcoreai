// scripts/fix-versions-to-1.5.1.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = "1.5.1";
const TARGET_V = "v" + TARGET;
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

console.log(" Fix versiones  " + TARGET + " \n");

//  1. Diagnóstico: buscar TODAS las versiones 
console.log("1. Estado actual de versiones:\n");

const files = [
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "package.json",
  "web/index.html",
  "web/js/app.js",
];

const found = {};
for (const rel of files) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  const c = readFileSync(p, "utf-8");
  // Buscar patrones de versión
  const hits = [];
  const re1 = /["'](?:version|Version)["']?\s*[:=]\s*["']([0-9]+\.[0-9]+\.[0-9]+)["']/g;
  const re2 = /v[0-9]+\.[0-9]+\.[0-9]+/g;
  let m;
  while ((m = re1.exec(c)) !== null) hits.push(m[0]);
  while ((m = re2.exec(c)) !== null) hits.push(m[0]);
  found[rel] = [...new Set(hits)];
  if (hits.length > 0) {
    console.log("  " + rel + ":");
    [...new Set(hits)].forEach(h => console.log("    " + h));
  }
}

//  2. Aplicar cambios 
console.log("\n2. Aplicando cambios:\n");

let totalChanges = 0;

// 2.1 Cargo.toml
const cargoPath = join(ROOT, "src-tauri/Cargo.toml");
if (existsSync(cargoPath)) {
  copyFileSync(cargoPath, cargoPath + ".bak-" + TS);
  let c = readFileSync(cargoPath, "utf-8");
  const before = c;
  c = c.replace(/^version\s*=\s*"[^"]+"/m, 'version = "' + TARGET + '"');
  if (c !== before) {
    writeFileSync(cargoPath, c, "utf-8");
    console.log("   Cargo.toml  " + TARGET);
    totalChanges++;
  }
}

// 2.2 tauri.conf.json (version + title)
const tauriPath = join(ROOT, "src-tauri/tauri.conf.json");
if (existsSync(tauriPath)) {
  copyFileSync(tauriPath, tauriPath + ".bak-" + TS);
  let c = readFileSync(tauriPath, "utf-8");
  const before = c;
  c = c.replace(/"version"\s*:\s*"[^"]+"/, '"version": "' + TARGET + '"');
  c = c.replace(/"title"\s*:\s*"[^"]+"/, '"title": "GafCoreAI ' + TARGET_V + '"');
  if (c !== before) {
    writeFileSync(tauriPath, c, "utf-8");
    console.log("   tauri.conf.json  " + TARGET + " + título " + TARGET_V);
    totalChanges++;
  }
}

// 2.3 package.json
const pkgPath = join(ROOT, "package.json");
if (existsSync(pkgPath)) {
  copyFileSync(pkgPath, pkgPath + ".bak-" + TS);
  let c = readFileSync(pkgPath, "utf-8");
  const before = c;
  // Solo cambiar la versión raíz (primera aparición)
  c = c.replace(/"version"\s*:\s*"[^"]+"/, '"version": "' + TARGET + '"');
  if (c !== before) {
    writeFileSync(pkgPath, c, "utf-8");
    console.log("   package.json  " + TARGET);
    totalChanges++;
  }
}

// 2.4 web/index.html (versión estática del footer)
const htmlPath = join(ROOT, "web/index.html");
if (existsSync(htmlPath)) {
  copyFileSync(htmlPath, htmlPath + ".bak-" + TS);
  let c = readFileSync(htmlPath, "utf-8");
  const before = c;
  // Reemplazar versiones v1.5.x / v1.6.x en el HTML
  c = c.replace(/v1\.5\.\d+/g, TARGET_V);
  c = c.replace(/v1\.6\.\d+/g, TARGET_V);
  if (c !== before) {
    writeFileSync(htmlPath, c, "utf-8");
    console.log("   web/index.html  " + TARGET_V);
    totalChanges++;
  }
}

//  3. Verificación final 
console.log("\n3. Verificación final:\n");
for (const rel of files) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  const c = readFileSync(p, "utf-8");
  const hits = [];
  const re1 = /["'](?:version|Version)["']?\s*[:=]\s*["']([0-9]+\.[0-9]+\.[0-9]+)["']/g;
  const re2 = /v[0-9]+\.[0-9]+\.[0-9]+/g;
  let m;
  while ((m = re1.exec(c)) !== null) hits.push(m[0]);
  while ((m = re2.exec(c)) !== null) hits.push(m[0]);
  if (hits.length > 0) {
    console.log("  " + rel + ": " + [...new Set(hits)].join(", "));
  }
}

console.log("\n Total: " + totalChanges + " archivos modificados ");
console.log("Backups con sufijo .bak-" + TS);

// Verificar sintaxis JS si tocamos index.html (no es JS, pero por consistencia)
console.log("\nVerificando sintaxis de app.js (no debería cambiar)...");
try {
  execSync("node --check web/js/app.js", { cwd: ROOT, stdio: "pipe" });
  console.log("   app.js OK");
} catch (e) {
  console.log("    app.js tiene problema (¿lo tocamos?)");
}