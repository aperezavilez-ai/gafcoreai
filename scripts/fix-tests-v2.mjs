// scripts/fix-tests-v2.mjs
// v63.2  Limpieza definitiva de tests post-cinematic.
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

function stripBOM(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

// Restaurar desde backup .bak-* más reciente
function restoreLatestBackup(rel) {
  const dir = join(ROOT, rel, "..");
  const base = rel.split("/").pop();
  const files = readdirSync(dir).filter(f => f.startsWith(base + ".bak-"));
  if (files.length === 0) return false;
  files.sort().reverse();
  const backup = join(dir, files[0]);
  copyFileSync(backup, join(ROOT, rel));
  return files[0];
}

//  E2E 
const e2ePath = join(ROOT, "scripts/test-full-e2e.mjs");
if (existsSync(e2ePath)) {
  const restored = restoreLatestBackup("scripts/test-full-e2e.mjs");
  if (restored) console.log("E2E: restaurado desde " + restored);
  let src = stripBOM(readFileSync(e2ePath, "utf-8"));
  const before = src.length;

  // Eliminar bloque desde "5. MOTOR DE GUION Y ESTUDIO CINEMATICO" hasta antes del resumen final.
  // Patrón: la sección empieza con comentario que diga "5." y "ESTUDIO CINEM" y termina
  // en el cierre de esa sección (antes del bloque "RESUMEN" o similar).
  const startRe = /\/\/[^\n]*5\.[^\n]*ESTUDIO CINEM[^\n]*\r?\n/i;
  const startMatch = src.match(startRe);
  if (startMatch) {
    const startIdx = startMatch.index;
    // Buscar el final: el siguiente comentario que empiece con "// 6." o "// ---" + "RESUMEN" o "console.log" del resultado final
    const after = src.slice(startIdx + startMatch[0].length);
    const endPatterns = [
      /\r?\n\/\/[^\n]*6\./,
      /\r?\nconsole\.log\("?=?+"?\\n=+[^\n]*Resultado/i,
      /\r?\nconsole\.log\(`\\n=+`\)/,
    ];
    let endIdx = -1;
    for (const p of endPatterns) {
      const m = after.match(p);
      if (m && (endIdx === -1 || m.index < endIdx)) endIdx = m.index;
    }
    if (endIdx > 0) {
      const removeUntil = startIdx + startMatch[0].length + endIdx;
      // Reemplazar la sección 5 por un stub minimal
      const stub = '// -------------------------------------------------------------\n' +
        '// 5. [v63.2] Estudio Cinematico eliminado en v61  test removido.\n' +
        '// -------------------------------------------------------------\n' +
        'console.log("\\n5. Estudio Cinematico: (removido en v61, test omitido)");\n';
      src = src.slice(0, startIdx) + stub + src.slice(removeUntil);
      console.log("E2E: bloque 5 (studio) eliminado");
    } else {
      // Fallback: eliminar desde start hasta fin del archivo, y añadir resumen mínimo
      const stub = '// [v63.2] Estudio Cinematico eliminado  test omitido\n' +
        'console.log("\\n5. Estudio Cinematico: (removido, test omitido)");\n\n' +
        'console.log("\\n============================================================");\n' +
        'console.log(`Resultado: ${passed} PASADOS, ${failed} FALLADOS`);\n' +
        'console.log("============================================================\\n");\n\n' +
        'if (failed > 0) { process.exit(1); }\n' +
        'process.exit(0);\n';
      src = src.slice(0, startIdx) + stub;
      console.log("E2E: bloque 5 y resto eliminados (fallback)");
    }
  } else {
    // Sin marcador  comentar TODAS las líneas con CinematicStudio / studio.
    src = src.split("\n").map(l => {
      if (/\bCinematicStudio|\bstudioUI\b|\bstudio\._|\bnew Cinematic/.test(l) && !l.trim().startsWith("//")) {
        return "// [v63.2] removed: " + l;
      }
      return l;
    }).join("\n");
    console.log("E2E: sin marcador, lineas comentadas");
  }

  writeFileSync(e2ePath, src, "utf-8");
  console.log("E2E: " + (before - src.length) + " chars menos");
}

//  MEDIA 
const mediaPath = join(ROOT, "scripts/verify-media-pipeline.mjs");
if (existsSync(mediaPath)) {
  const restored = restoreLatestBackup("scripts/verify-media-pipeline.mjs");
  if (restored) console.log("MEDIA: restaurado desde " + restored);

  // Reescribir COMPLETAMENTE el archivo: era 100% studioUI
  const stub = `// scripts/verify-media-pipeline.mjs
// v63.2  Reescrito: el pipeline original verificaba CinematicStudioUI,
// eliminado en v61. Ahora solo verifica que MediaRouter/MediaTaskManager basicos
// sigan disponibles (sin el estudio).

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log("  PASS " + msg); passed++; }
  else { console.log("  FAIL " + msg); failed++; }
}

console.log("\\n=== Media Pipeline (v63.2 - sin estudio cinematico) ===\\n");

// Verificar que MediaRouter y MediaTaskManager se pueden importar
import("./web/js/media-router.js").then(mod => {
  assert(typeof mod.MediaRouter === "function" || typeof mod.default === "function" || mod.MediaRouter, "media-router.js importable");
}).catch(e => {
  assert(false, "media-router.js importable: " + e.message);
}).finally(async () => {
  try {
    const mod = await import("./web/js/media-task-manager.js");
    assert(mod.MediaTaskManager, "media-task-manager.js exporta MediaTaskManager");
  } catch (e) {
    assert(false, "media-task-manager.js importable: " + e.message);
  }

  console.log("\\n============================================================");
  console.log(\`Resultado: \${passed} PASADOS, \${failed} FALLADOS\`);
  console.log("============================================================\\n");

  process.exit(failed > 0 ? 1 : 0);
});
`;
  writeFileSync(mediaPath, stub, "utf-8");
  console.log("MEDIA: reescrito (sin studioUI)");
}

console.log("\n=== Fin. Probar con: node scripts/verify-full-system.mjs ===");