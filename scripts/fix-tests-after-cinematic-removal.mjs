// scripts/fix-tests-after-cinematic-removal.mjs
// v63.1  Quita referencias cinematic de tests + arregla regex en verify-full-system.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
function stripBOM(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

//  1. Limpiar imports cinematic de los tests 
const testFiles = [
  "scripts/test-full-e2e.mjs",
  "scripts/verify-media-pipeline.mjs",
];

for (const rel of testFiles) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { console.log("SKIP " + rel); continue; }
  copyFileSync(p, p + ".bak-" + TS);
  let src = stripBOM(readFileSync(p, "utf-8"));
  const before = src.length;

  // Quitar imports que apunten a cinematic-*.js
  const importRe = /^[ \t]*import[^\n]*cinematic-[^\n]*\r?\n/gm;
  const importHits = (src.match(importRe) || []).length;
  src = src.replace(importRe, "");

  // Quitar require() a cinematic-*.js
  const requireRe = /^[ \t]*(?:const|let|var)[^\n]*require[^\n]*cinematic-[^\n]*\r?\n/gm;
  const requireHits = (src.match(requireRe) || []).length;
  src = src.replace(requireRe, "");

  // Comentar referencias a variables cinematográficas sueltas
  // (CinematicStudioUI, cinematicProject, etc.) en líneas individuales
  // Patrón: líneas que contienen 'cinematic' como palabra suelta y son de uso
  // Pero evitar borrar bloques complejos  sólo comentamos
  src = src.replace(/^([ \t]*)(.*\bCinematicStudioUI\b.*)$/gm, "$1// [v63.1] removed: $2");
  src = src.replace(/^([ \t]*)(.*\bcinematicStudio\b.*)$/gm, "$1// [v63.1] removed: $2");

  const changes = importHits + requireHits;
  writeFileSync(p, src, "utf-8");
  console.log(rel + " -> " + changes + " import(s) eliminados, " + (before - src.length) + " chars menos");
}

//  2. Arreglar regex en verify-full-system.mjs 
const vfsPath = join(ROOT, "scripts/verify-full-system.mjs");
if (existsSync(vfsPath)) {
  copyFileSync(vfsPath, vfsPath + ".bak-" + TS);
  let src = stripBOM(readFileSync(vfsPath, "utf-8"));

  // Reemplazar la lectura del pass count para aceptar formato Node 24:
  // "ℹ pass 26" en lugar de "# pass 26"
  const oldBlock = src.match(/const m = out\.match\(\/\^# pass \(\\d\+\)\/m\);[\s\S]{0,120}?pass\("Tests unitarios"[^;]+;/);
  if (oldBlock) {
    const newBlock = `const m = out.match(/(?:^#|ℹ|i|) pass (\\d+)/m);
  const total = m ? m[1] : "?";
  pass("Tests unitarios", "(" + total + " PASS)");`;
    src = src.replace(oldBlock[0], newBlock);
    writeFileSync(vfsPath, src, "utf-8");
    console.log("verify-full-system.mjs -> regex de tests unitarios arreglado");
  } else {
    console.log("verify-full-system.mjs -> patron original no encontrado, revisar");
  }
}

console.log("\nListo. Ejecuta: node scripts\\verify-full-system.mjs");