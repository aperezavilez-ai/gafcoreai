// scripts/bump-version.mjs
// Sube la version de GafCoreAI en todos los lugares donde aparece.
//
// Uso:
//   node scripts/bump-version.mjs <version>            (ej. 1.5.5)
//   node scripts/bump-version.mjs <version> --dry-run  (solo muestra que cambiaria)
//
// Actualiza:
//   - package.json                "version"
//   - src-tauri/Cargo.toml        version de [package]
//   - src-tauri/tauri.conf.json   "version" y titulo de ventana "GafCoreAI vX"
//   - web/index.html              <title>, .version-badge y ?v= de styles.css / js/app.js
//
// Seguridad: aborta sin escribir si algun patron no se encuentra; respalda cada archivo
// modificado en _backups/<archivo>.bak-<timestamp>; verifica que no cambie ningun caracter
// no-ASCII y que los JSON sigan siendo validos; si algo falla restaura todo.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const version = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Uso: node scripts/bump-version.mjs <version> [--dry-run]   (ej. 1.5.5)");
  process.exit(1);
}

// count: "one" = debe aparecer exactamente una vez; "some" = al menos una vez.
const TARGETS = [
  { file: "package.json", edits: [
    { name: "version", re: /^(\s*"version"\s*:\s*")[^"]+(")/m, count: "one" },
  ] },
  { file: "src-tauri/Cargo.toml", edits: [
    { name: "[package] version", re: /^(\[package\][^[]*?^version\s*=\s*")[^"]+(")/m, count: "one" },
  ] },
  { file: "src-tauri/tauri.conf.json", edits: [
    { name: "version", re: /("version"\s*:\s*")[^"]+(")/, count: "one" },
    { name: "titulo de ventana", re: /("title"\s*:\s*"GafCoreAI v)[^"]+(")/, count: "one" },
  ] },
  { file: "web/index.html", edits: [
    { name: "<title>", re: /(<title>GafCoreAI v)[^<]+(<\/title>)/, count: "one" },
    { name: "version-badge", re: /(class="version-badge">v)[^<]+(<)/, count: "one" },
    { name: "cache-busting ?v=", re: /((?:styles\.css|js\/app\.js)\?v=)[^"'&\s]+()/g, count: "some" },
  ] },
];

function nonAscii(s) {
  let n = 0;
  for (const ch of s) if (ch.codePointAt(0) > 127) n++;
  return n;
}

const plan = [];
for (const t of TARGETS) {
  const path = join(ROOT, t.file);
  const original = readFileSync(path, "utf8");
  let text = original;
  for (const e of t.edits) {
    const flags = e.re.flags.includes("g") ? e.re.flags : e.re.flags + "g";
    const matches = text.match(new RegExp(e.re.source, flags)) || [];
    if (matches.length === 0 || (e.count === "one" && matches.length !== 1)) {
      console.error(`[bump] ${t.file}: patron "${e.name}" encontrado ${matches.length} veces. Abortando sin escribir nada.`);
      process.exit(1);
    }
    text = text.replace(e.re, (_, pre, post) => pre + version + post);
  }
  if (nonAscii(text) !== nonAscii(original)) {
    console.error(`[bump] ${t.file}: cambiaria caracteres no-ASCII. Abortando sin escribir nada.`);
    process.exit(1);
  }
  plan.push({ file: t.file, path, original, text, changed: text !== original });
}

for (const p of plan) console.log(`[bump] ${p.file}: ${p.changed ? "se actualiza" : "sin cambios"}`);
if (dryRun) { console.log("[bump] --dry-run: no se escribio nada."); process.exit(0); }

const changed = plan.filter((p) => p.changed);
if (!changed.length) { console.log(`[bump] Todo ya estaba en ${version}.`); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = join(ROOT, "_backups");
mkdirSync(backupDir, { recursive: true });

try {
  for (const p of changed) {
    copyFileSync(p.path, join(backupDir, `${basename(p.file)}.bak-${stamp}`));
    writeFileSync(p.path, p.text, "utf8");
  }
  for (const p of changed) {
    const back = readFileSync(p.path, "utf8");
    if (back !== p.text) throw new Error(`${p.file}: el contenido releido no coincide`);
    if (p.file.endsWith(".json")) JSON.parse(back);
  }
} catch (e) {
  console.error("[bump] ERROR:", e.message, "- restaurando archivos originales...");
  for (const p of changed) writeFileSync(p.path, p.original, "utf8");
  process.exit(1);
}

console.log(`[bump] OK: version ${version}. Respaldos en _backups/*.bak-${stamp}`);
