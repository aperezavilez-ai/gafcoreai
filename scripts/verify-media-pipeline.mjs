// scripts/verify-media-pipeline.mjs
// v63.4  Reescrito: verifica MediaRouter/MediaTaskManager sin el estudio.

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log("  \u2713 " + msg); passed++; }
  else { console.log("  \u2717 " + msg); failed++; }
}

console.log("\n=== Media Pipeline (v63.4 - sin estudio cinematico) ===\n");

try {
  const mr = await import("../web/js/media-router.js");
  assert(mr.MediaRouter || mr.default, "media-router.js exporta MediaRouter");
} catch (e) {
  assert(false, "media-router.js carga: " + e.message);
}

try {
  const tm = await import("../web/js/media-task-manager.js");
  assert(tm.MediaTaskManager || tm.default, "media-task-manager.js exporta MediaTaskManager");
} catch (e) {
  assert(false, "media-task-manager.js carga: " + e.message);
}

console.log("\n============================================================");
console.log("Resultado: " + passed + " PASADOS, " + failed + " FALLADOS");
console.log("============================================================\n");

process.exit(failed > 0 ? 1 : 0);