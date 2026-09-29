// scripts/test-full-e2e.mjs
// v63.4  Reescrito: eliminado el test de Estudio Cinematico (removido en v61).
// Verifica los subsistemas que SI siguen activos en GafCoreAI.

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log("  \u2713 " + msg); passed++; }
  else { console.log("  \u2717 " + msg); failed++; }
}

function section(t) { console.log("\n" + t); }

console.log("\n=== GafCoreAI Full E2E (v63.4 - sin estudio cinematico) ===");

// -------------------------------------------------------------
section("1. Modulos base importables");
// -------------------------------------------------------------
try {
  const core = await import("../web/js/core.js");
  assert(core.MultiAgentOrchestrator || core.default, "core.js carga");
} catch (e) { assert(false, "core.js carga: " + e.message); }

try {
  const tools = await import("../web/js/tools.js");
  assert(tools.ToolRegistry || Object.keys(tools).length > 0, "tools.js carga");
} catch (e) { assert(false, "tools.js carga: " + e.message); }

try {
  const prov = await import("../web/js/providers.js");
  assert(typeof prov.chatCompletion === "function", "providers.js::chatCompletion existe");
  assert(typeof prov.findModelWithKey === "function", "providers.js::findModelWithKey existe");
} catch (e) { assert(false, "providers.js carga: " + e.message); }

// -------------------------------------------------------------
section("2. Secrets cifrados");
// -------------------------------------------------------------
try {
  const s = await import("../web/js/secrets.js");
  assert(typeof s.getSecret === "function", "secrets.js::getSecret");
  assert(typeof s.setSecret === "function", "secrets.js::setSecret");
  assert(typeof s.removeSecret === "function", "secrets.js::removeSecret");
  assert(Array.isArray(s.SECRET_KEYS), "secrets.js::SECRET_KEYS es array");
} catch (e) { assert(false, "secrets.js carga: " + e.message); }

// -------------------------------------------------------------
section("3. ZIP nativo");
// -------------------------------------------------------------
try {
  const z = await import("../web/js/zip-writer.js");
  assert(z.ZipWriter || z.default, "zip-writer.js exporta ZipWriter");
} catch (e) { assert(false, "zip-writer.js carga: " + e.message); }

// -------------------------------------------------------------
section("4. Agente ReAct");
// -------------------------------------------------------------
try {
  const a = await import("../web/js/agent.js");
  assert(Object.keys(a).length > 0, "agent.js exporta algo");
} catch (e) { assert(false, "agent.js carga: " + e.message); }

// -------------------------------------------------------------
section("5. [v63.4] Estudio Cinematico");
// -------------------------------------------------------------
console.log("  \u25CB Estudio Cinematico eliminado en v61  test omitido");

// -------------------------------------------------------------
console.log("\n============================================================");
console.log("Resultado: " + passed + " PASADOS, " + failed + " FALLADOS");
console.log("============================================================\n");

process.exit(failed > 0 ? 1 : 0);