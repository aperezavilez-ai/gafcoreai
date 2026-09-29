// scripts/bump-version.mjs
// v63  Bump 1.5.0  1.6.0 en Cargo.toml, tauri.conf.json, package.json.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
const NEW = "1.6.0";

function stripBOM(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

const targets = [
  { rel: "src-tauri/Cargo.toml",      regex: /^version\s*=\s*"[^"]+"/m,    desc: "[package] version" },
  { rel: "src-tauri/tauri.conf.json", regex: /"version"\s*:\s*"[^"]+"/,     desc: "app.version" },
  { rel: "package.json",              regex: /"version"\s*:\s*"[^"]+"/,     desc: "root version" },
];

console.log("=== Bump a " + NEW + " ===\n");

for (const { rel, regex, desc } of targets) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { console.log("SKIP " + rel + " (no existe)"); continue; }
  copyFileSync(p, p + ".bak-" + TS);
  const raw = stripBOM(readFileSync(p, "utf-8"));
  const m = raw.match(regex);
  const prev = m ? m[0] : "(no encontrado)";

  if (!m) {
    console.log("WARN " + rel + "  no se encontro " + desc);
    continue;
  }

  const replaced = raw.replace(regex, (match) => match.replace(/"[^"]+"$/, '"' + NEW + '"'));
  writeFileSync(p, replaced, "utf-8");
  console.log("OK " + rel + "  " + prev.replace(/"/g, "") + " -> " + NEW);
}

console.log("\n=== Verificacion ===");
const checks = [
  { rel: "src-tauri/Cargo.toml",      needle: 'version = "' + NEW + '"' },
  { rel: "src-tauri/tauri.conf.json", needle: '"version": "' + NEW + '"' },
  { rel: "package.json",              needle: '"version": "' + NEW + '"' },
];
for (const { rel, needle } of checks) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { console.log("  " + rel + ": NO EXISTE"); continue; }
  const c = readFileSync(p, "utf-8");
  const ok = c.includes(needle);
  console.log("  " + rel + ": " + (ok ? "OK" : "FALLO"));
}

// Buscar residuos de 1.5.0
console.log("\n=== Residuos de 1.5.x ===");
let found = 0;
for (const { rel } of targets) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  const c = readFileSync(p, "utf-8");
  const hits = c.match(/1\.5\.[0-9]+/g);
  if (hits) { console.log("  " + rel + ": " + hits.join(", ")); found += hits.length; }
}
if (found === 0) console.log("  ninguno");

console.log("\nBackups: *.bak-" + TS);
console.log("Siguiente: npm run tauri build");