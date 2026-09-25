// ============================================================
//  Suite de Pruebas Unitarias & Integración: Synaptic Knowledge Graph & Token Optimizer
// ============================================================

import assert from "assert";
import { SynapticGraph, computeFastHash } from "../web/js/synaptic-graph.js";
import { TokenOptimizer } from "../web/js/token-optimizer.js";
import { AgentMemory } from "../web/js/agent-memory.js";

console.log("=======================================================");
console.log("  🧠 INICIANDO TEST SUITE: SYNAPTIC KNOWLEDGE GRAPH    ");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

async function runTests() {
  console.log("🕸️ [1/4] Verificando Inicialización y Nodos Inmutables...");

  const graph = new SynapticGraph();

  test("Bootstrap del ecosistema GAFCORE (Reglas y Tools)", () => {
    assert(graph.hasNode("ecosystem:gafcore_supabase"), "Debe existir nodo de Supabase Self-Hosted");
    const node = graph.getNode("ecosystem:gafcore_supabase");
    assert.strictEqual(node.data.publicUrl, "https://supabase.gafcore.com");
    assert.strictEqual(node.immutable, true);
    assert(graph.hasNode("tool:open_folder"), "Debe existir nodo de open_folder");
    assert(graph.hasNode("tool:write_file"), "Debe existir nodo de write_file");
  });

  console.log("\n⚡ [2/4] Verificando Aristas, Sinapsis y Refuerzo de Pesos...");

  test("Conexión de nodos y pesos sinápticos", () => {
    graph.addNode({ id: "project:calili", type: "project", label: "Calili App" });
    const edge = graph.connect("project:calili", "tool:open_folder", "uses", 1.0);
    assert(edge, "Debe crearse la arista");
    assert.strictEqual(edge.weight, 1.0);

    // Refuerzo positivo
    graph.recordSuccess("project:calili", "tool:open_folder");
    assert(edge.weight > 1.0, "El peso debe incrementarse tras éxito");
    assert.strictEqual(edge.successes, 1);

    // Refuerzo negativo
    const prevWeight = edge.weight;
    graph.recordFailure("project:calili", "tool:open_folder");
    assert(edge.weight < prevWeight, "El peso debe reducirse tras fallo");
    assert.strictEqual(edge.failures, 1);
  });

  console.log("\n🛠️ [3/4] Verificando Memoria Causa-Efecto de Errores (Error-Fix Memory)...");

  test("Búsqueda y aplicación de solución de error en 0 turnos", () => {
    const fix = graph.lookupErrorFix("Error: listen EADDRINUSE: address already in use :::3000");
    assert(fix, "Debe encontrar el parche de EADDRINUSE");
    assert.strictEqual(fix.errorType, "Puerto en uso");
    assert.strictEqual(fix.toolName, "run_cmd");
  });

  test("Detección de intento de conexión no autorizada a supabase.co", () => {
    const fix = graph.lookupErrorFix("Failed connecting to https://abcxyz.supabase.co/rest/v1");
    assert(fix, "Debe detectar supabase.co");
    assert.strictEqual(fix.errorType, "Intento de conexión a nube de pago");
  });

  console.log("\n💰 [4/4] Verificando TokenOptimizer y Poda Sináptica...");

  test("Verificación de Hash Caching (0 tokens si no cambió)", () => {
    const optimizer = new TokenOptimizer(graph);
    const code = "console.log('hola mundo'); function test() { return 42; }";
    
    // Primera vez: archivo nuevo
    const firstCheck = optimizer.isContentUnchanged("src/index.js", code);
    assert.strictEqual(firstCheck.unchanged, false);

    // Segunda vez: archivo idéntico (cache hit)
    const secondCheck = optimizer.isContentUnchanged("src/index.js", code);
    assert.strictEqual(secondCheck.unchanged, true);
    assert(secondCheck.tokenSavings > 0, "Debe reportar ahorro de tokens");
  });

  test("Generación de subgrafo compacto y métricas de ahorro", () => {
    const optimizer = new TokenOptimizer(graph);
    const compactCtx = optimizer.buildCompactContext("analiza el backend y supabase", { diskFolder: "D:\\PROGRAMAS IA\\CALILI" });
    assert(compactCtx.includes("CONOCIMIENTO SINÁPTICO"), "Debe contener cabecera de conocimiento");
    assert(compactCtx.includes("supabase"), "Debe inyectar nodo de supabase relevante");

    const report = optimizer.getSavingsReport();
    assert(report.totalTokensSaved > 0, "Debe tener tokens ahorrados");
    assert(report.costSavedUsd.includes("$"), "Debe estimar costo ahorrado");
  });

  test("Integración con AgentMemory", () => {
    const memory = new AgentMemory({ synapticGraph: graph });
    memory.addFact("Analyst", "El proyecto CALILI utiliza Tailwind CSS v3", "task-1");
    assert(graph.hasNode(`fact:${computeFastHash("El proyecto CALILI utiliza Tailwind CSS v3")}`));
    
    memory.addDecision("Coder", "Usar componentes modulares en React", "Mejor mantenimiento", "task-1");
    assert(graph.hasNode(`decision:${computeFastHash("Usar componentes modulares en React")}`));
  });

  test("Poda sináptica (Garbage Collection)", () => {
    // Agregar 10 nodos temporales
    for (let i = 0; i < 10; i++) {
      graph.addNode({ id: `temp_node_${i}`, type: "temp", label: `Temp ${i}` });
    }
    const initialCount = graph.nodes.size;
    const removed = graph.prune(initialCount - 5);
    assert.strictEqual(removed, 5, "Debe haber podado 5 nodos no inmutables");
  });

  console.log("\n=======================================================");
  console.log(`  🏁 RESULTADOS: ${passed} PASADAS | ${failed} FALLIDAS`);
  console.log("=======================================================");

  if (failed > 0) process.exit(1);
  console.log("\n🎉 ¡100% DE PRUEBAS DEL GRAFO SINÁPTICO Y TOKEN OPTIMIZER EXITOSAS!");
}

runTests();
