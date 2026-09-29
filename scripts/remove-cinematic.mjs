// scripts/remove-cinematic.mjs
// v61  Elimina TODAS las referencias del Estudio Cinematico de GafCoreAI.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

function stripBOM(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

function removeLineBySubstring(src, sub) {
  const lines = src.split("\n");
  const out = [];
  let removed = 0;
  for (const l of lines) {
    if (l.includes(sub)) { removed++; continue; }
    out.push(l);
  }
  return { result: out.join("\n"), removed };
}

// Elimina bloque balanceado { } comenzando en la primera aparición del marcador.
function removeBlock(src, marker) {
  const idx = src.indexOf(marker);
  if (idx === -1) return { result: src, removed: 0 };
  let start = idx;
  while (start > 0 && src[start - 1] !== "\n") start--;
  const braceStart = src.indexOf("{", idx);
  if (braceStart === -1) return { result: src, removed: 0 };
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  while (i < src.length && src[i] !== "\n") i++;
  if (i < src.length) i++;
  return { result: src.slice(0, start) + src.slice(i), removed: 1 };
}

console.log("=== Limpieza Cinematic Studio ===\n");

// ---------- index.html ----------
const htmlPath = join(ROOT, "web/index.html");
if (existsSync(htmlPath)) {
  copyFileSync(htmlPath, htmlPath + ".bak-" + TS);
  let html = stripBOM(readFileSync(htmlPath, "utf-8"));
  const before = html.length;
  const marks = [
    'id="btn-studio-menu"',
    'data-cmd="/cinema"',
    'id="tab-studio"',
    'id="view-studio"',
  ];
  for (const m of marks) {
    const r = removeLineBySubstring(html, m);
    html = r.result;
    console.log("  index.html  ->", r.removed, "linea(s) con", m);
  }
  writeFileSync(htmlPath, html, "utf-8");
  console.log("  Reduccion index.html:", before - html.length, "chars\n");
}

// ---------- app.js ----------
const jsPath = join(ROOT, "web/js/app.js");
if (existsSync(jsPath)) {
  copyFileSync(jsPath, jsPath + ".bak-" + TS);
  let js = stripBOM(readFileSync(jsPath, "utf-8"));
  const before = js.length;

  // 1. Slash map "/cinema": "__CINEMA_STUDIO__",
  let r = removeLineBySubstring(js, '"/cinema":');
  js = r.result;
  console.log("  app.js  ->", r.removed, "linea '/cinema': en slash map");

  // 2. Handler "if (firstWord === \"/cinema\")"
  r = removeLineBySubstring(js, 'if (firstWord === "/cinema")');
  js = r.result;
  console.log("  app.js  ->", r.removed, "linea handler /cinema");

  // 3. safeBind btn-studio-menu
  r = removeLineBySubstring(js, 'safeBind("btn-studio-menu"');
  js = r.result;
  console.log("  app.js  ->", r.removed, "linea safeBind btn-studio-menu");

  // 4. Bloque if (state.cinematicStudio) { ... } (2 veces)
  for (let i = 0; i < 5; i++) {
    const rr = removeBlock(js, "if (state.cinematicStudio) {");
    if (rr.removed === 0) break;
    js = rr.result;
    console.log("  app.js  -> bloque if(state.cinematicStudio) eliminado");
  }

  // 5. Bloque if (firstWord === "/video") { ... }
  for (let i = 0; i < 5; i++) {
    const rr = removeBlock(js, 'if (firstWord === "/video") {');
    if (rr.removed === 0) break;
    js = rr.result;
    console.log("  app.js  -> bloque if(firstWord === \"/video\") eliminado");
  }

  // 6. Renombrar mensaje del catch
  if (js.includes('"CinematicStudio init error:"')) {
    js = js.replace('"CinematicStudio init error:"', '"Media init error:"');
    console.log("  app.js  -> catch renombrado");
  }

  writeFileSync(jsPath, js, "utf-8");
  console.log("  Reduccion app.js:", before - js.length, "chars\n");
}

// ---------- Verificacion final ----------
console.log("=== Verificacion ===");
const verify = ["web/index.html", "web/js/app.js"].map(p => join(ROOT, p));
for (const p of verify) {
  const c = readFileSync(p, "utf-8");
  const hits = (c.match(/cinematic/gi) || []).length;
  const tag = hits === 0 ? "OK" : "quedan " + hits + " refs";
  console.log("  " + p.replace(ROOT, ".") + ": " + tag);
}
console.log("\nBackups con sufijo .bak-" + TS);