// scripts/fix-tests-v3.mjs
// v63.3  Reescribe los 2 tests rotos sin dependencia de Cinematic Studio.
import { writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

function backup(rel) {
  const p = join(ROOT, rel);
  if (existsSync(p)) copyFileSync(p, p + ".bak-" + TS);
  return p;
}

//  1. E2E  remover la sección 5 (studio) dejando lo demás intacto 
const e2ePath = backup("scripts/test-full-e2e.mjs");
if (existsSync(e2ePath)) {
  let src = require("node:fs").readFileSync(e2ePath, "utf-8");
  // Localizar inicio de sección 5: línea que contenga "5." y "Motor de Guiones"
  const lines = src.split(/\r?\n/);
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/5\.\s*Motor de Guiones/i.test(lines[i])) { startIdx = i; break; }
  }
  if (startIdx === -1) {
    // fallback: buscar cualquier "5." con "Estudio" o "Cinem"
    for (let i = 0; i < lines.length; i++) {
      if (/(Estudio Cinem|Cinem[aá]tic)/i.test(lines[i])) { startIdx = i; break; }
    }
  }

  if (startIdx === -1) {
    console.log("E2E: no se encontró sección 5  se deja como está");
  } else {
    // Buscar el final: línea con "Resultado:" o "PASADOS"
    let endIdx = -1;
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (/Resultado:|PASADOS,\s*\$\{failed\}/i.test(lines[i])) { endIdx = i; break; }
    }
    if (endIdx === -1) endIdx = lines.length;

    const stub = [
      '// -------------------------------------------------------------',
      '// 5. [v63.3] Estudio Cinematico eliminado en v61  test removido.',
      '// -------------------------------------------------------------',
      'console.log("\\n5. Estudio Cinematico: (removido en v61, test omitido)");',
      ''
    ];

    const newLines = [
      ...lines.slice(0, startIdx),
      ...stub,
      ...lines.slice(endIdx),
    ];
    writeFileSync(e2ePath, newLines.join("\n"), "utf-8");
    console.log("E2E: sección 5 reemplazada por stub (" + (endIdx - startIdx) + " líneas removidas)");
  }
}

//  2. Media Pipeline  reescribir completamente 
const mediaPath = backup("scripts/verify-media-pipeline.mjs");
if (existsSync(mediaPath) || true) {
  const stub = `// scripts/verify-media-pipeline.mjs
// v63.3  Reescrito: el pipeline original probaba CinematicStudioUI (eliminado v61).
// Ahora verifica que MediaRouter / MediaTaskManager básicos sigan funcionando.

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log("  PASS " + msg); passed++; }
  else { console.log("  FAIL " + msg); failed++; }
}

console.log("\\n=== Media Pipeline (v63.3 - sin estudio cinematico) ===\\n");

try {
  const mr = await import("../web/js/media-router.js");
  assert(mr.MediaRouter || mr.default, "media-router.js exporta MediaRouter");
} catch (e) {
  assert(false, "media-router.js importable: " + e.message);
}

try {
  const tm = await import("../web/js/media-task-manager.js");
  assert(tm.MediaTaskManager || tm.default, "media-task-manager.js exporta MediaTaskManager");
} catch (e) {
  assert(false, "media-task-manager.js importable: " + e.message);
}

console.log("\\n============================================================");
console.log(\`Resultado: \${passed} PASADOS, \${failed} FALLADOS\`);
console.log("============================================================\\n");

process.exit(failed > 0 ? 1 : 0);
`;
  writeFileSync(mediaPath, stub, "utf-8");
  console.log("MEDIA: reescrito");
}

console.log("\\nListo.");