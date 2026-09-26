// ============================================================
//  GafCoreAI - End-to-End Comprehensive Verification Test Suite
// ============================================================

// Mock Browser Environment for Node.js test execution
const storageMap = new Map();
global.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};
global.window = {
  __TAURI__: null,
  localStorage: global.localStorage
};
global.document = {
  getElementById: (id) => ({
    innerHTML: "",
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => []
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  }),
  body: { appendChild: () => {}, removeChild: () => {} }
};

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
    results.push({ name: testName, status: "PASS", details });
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
    results.push({ name: testName, status: "FAIL", details });
  }
}

console.log("\n" + "=".repeat(70));
console.log("🚀 INICIANDO AUDITORÍA Y SUITE DE PRUEBAS END-TO-END (GAFCOREAI)");
console.log("=".repeat(70) + "\n");

// -------------------------------------------------------------
// 1. VERIFICACIÓN DE INTEGRIDAD DE ARCHIVOS
// -------------------------------------------------------------
console.log("📦 1. Verificación de Integridad de Código y Módulos JS:");
const jsDir = path.join(rootDir, "web", "js");
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js"));

for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  try {
    const code = fs.readFileSync(filePath, "utf-8");
    assert(code.length > 50, `Archivo web/js/${file} verificado (${(code.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    assert(false, `Lectura de web/js/${file}`, err.message);
  }
}

// -------------------------------------------------------------
// 2. PARSER UNIVERSAL DE HERRAMIENTAS & ALIASES
// -------------------------------------------------------------
console.log("\n🔧 2. Parser Universal de Herramientas y Mapeo de Aliases:");
import { ToolRegistry } from "../web/js/core.js";

const toolRegistry = new ToolRegistry();

// Test Formato 1: Custom pipe <tool>name|args</tool>
const t1 = toolRegistry.parseCalls('<tool>list_files|path=D:\\PROGRAMAS IA\\GAFCOREAI|recursive=true</tool>');
assert(t1.length === 1 && t1[0].name === "list_files" && t1[0].args.path.includes("GAFCOREAI"), "Parseo de formato estándar <tool>list_files|path=...</tool>");

// Test Formato 2: Alias dot-separated con tags XML <tool_call><function=fs.list>
const t2 = toolRegistry.parseCalls('<tool_call><function=fs.list><parameter=path>D:\\PROYECTO</parameter><parameter=recursive>true</parameter></function></tool_call>');
assert(t2.length === 1 && t2[0].name === "list_files" && t2[0].args.path === "D:\\PROYECTO", "Mapeo de alias 'fs.list' -> 'list_files'");

// Test Formato 3: Alias fs.read -> read_file
const t3 = toolRegistry.parseCalls('<function=fs.read><parameter=path>src/index.js</parameter></function>');
assert(t3.length === 1 && t3[0].name === "read_file" && t3[0].args.path === "src/index.js", "Mapeo de alias 'fs.read' -> 'read_file'");

// Test Formato 4: Alias cmd.run -> run_command
const t4 = toolRegistry.parseCalls('<tool>cmd.run|cmd=npm test</tool>');
assert(t4.length === 1 && t4[0].name === "run_command" && t4[0].args.cmd === "npm test", "Mapeo de alias 'cmd.run' -> 'run_command'");

// Test Formato 5: Bloque de escritura ```write:path\ncontent```
const t5 = toolRegistry.parseCalls('```write:test.json\n{"ok": true}\n```');
assert(t5.length === 1 && t5[0].name === "write_file" && t5[0].args.path === "test.json", "Parseo de bloque de escritura ```write:path```");

// Test Formato 6: Direct XML tag <read_file path="..."/>
const t6 = toolRegistry.parseCalls('<read_file path="web/index.html"/>');
assert(t6.length === 1 && t6[0].name === "read_file" && t6[0].args.path === "web/index.html", "Parseo de etiqueta XML directa <read_file path='...'/>");

// Test Formato 7: Direct XML tag anidado <edit_file path="..."><target>...</target><replacement>...</replacement></edit_file>
const t7 = toolRegistry.parseCalls('<edit_file path="web/js/app.js"><target>foo</target><replacement>bar</replacement></edit_file>');
assert(t7.length === 1 && t7[0].name === "edit_file" && t7[0].args.path === "web/js/app.js" && t7[0].args.target === "foo" && t7[0].args.replacement === "bar", "Parseo de etiqueta anidada <edit_file>");

// -------------------------------------------------------------
// 3. LIMPIEZA DE ETIQUETAS EN STREAMING (Anti-Leak)
// -------------------------------------------------------------
console.log("\n🛡️ 3. Filtro Anti-Fugas de Etiquetas en Chat (cleanForDisplay):");
import { AgentOrchestrator, sanitizeApiErrorMessage } from "../web/js/agent.js";

const rawLeakedText = "He analizado el proyecto.\n<tool_call>\n<function=fs.list>\n<parameter=path>D:\\PROGRAMAS IA\\CALILI</parameter>\n</function>\n</tool_call>\n<edit_file path=\"test.js\"><target>a</target><replacement>b</replacement></edit_file>\nAquí están los resultados.";
const cleaned = AgentOrchestrator.cleanForDisplay(rawLeakedText);
assert(!cleaned.includes("<tool_call>") && !cleaned.includes("<function=") && !cleaned.includes("</tool_call>") && !cleaned.includes("<edit_file"), "Elimina completamente etiquetas XML <tool_call>, <function> y <edit_file>");
assert(cleaned.includes("He analizado el proyecto.") && cleaned.includes("Aquí están los resultados."), "Preserva el texto genuino del asistente intacto");

// -------------------------------------------------------------
// 4. SANITIZACIÓN DE ERRORES DE API Y PROVEEDORES
// -------------------------------------------------------------
console.log("\n🌐 4. Sanitización de Errores de API (401, 402, Red, Undefined):");
const err401 = sanitizeApiErrorMessage("HTTP 401 - 该令牌状态不可用", "claude-sonnet-4-6");
assert(err401.includes("API Key o Saldo Inválido") && err401.includes("HTTP 401"), "Traduce error 401 a mensaje claro en español");

const err429 = sanitizeApiErrorMessage("HTTP 429 Rate limit reached", "gpt-5.6-terra");
assert(err429.includes("Límite de Peticiones") && err429.includes("HTTP 429"), "Traduce error 429 de cuota a mensaje claro");

const errUndef = sanitizeApiErrorMessage(undefined, "");
assert(!errUndef.includes("undefined") && errUndef.includes("Error desconocido"), "Previene 'Error: undefined' cuando el mensaje es nulo");

// -------------------------------------------------------------
// 5. MOTOR DE GUIÓN Y ESTUDIO CINEMÁTICO
// -------------------------------------------------------------
console.log("\n🎬 5. Motor de Guiones, Continuidad y Estudio Cinemático:");
import { CinematicStudioUI } from "../web/js/cinematic-studio-ui.js";

const studio = new CinematicStudioUI({
  state: {},
  mediaRouter: {},
  mediaTaskManager: {
    createTask: () => ({ id: "task_1", status: "PENDING" })
  }
});

assert(typeof studio.init === "function", "CinematicStudioUI inicializa correctamente");

// Test de Análisis de Guión con IA
const sampleScript = `TITULO: PROYECTO NEBULOSA
GENERO: CIENCIA FICCIÓN
PERSONAJES:
1. ELENA (28 años, cabello negro recogido. VESTIMENTA: Traje espacial presurizado blanco. VOZ: Calmada).
ESCENA 1 - EXT. ESTACIÓN ORBITAL - DÍA
TOMA 1: Gran angular (24mm). Elena flota fuera de la compuerta.`;

studio._parseAndApplyScript(sampleScript);

assert(studio.project.title === "PROYECTO NEBULOSA", "Motor de guión extrae título correctamente");
assert(studio.project.genre === "CIENCIA FICCIÓN", "Motor de guión extrae género correctamente");
assert(studio.project.scenes.length >= 1, "Motor de guión desglosa escenas");

// Test de Cambio de Formatos
studio._handleDirectorChatUserMessage("Cambia el formato a 9:16 vertical para TikTok");
assert(studio.activeFormat.id === "9:16", "Comando de chat cambia formato a 9:16");

studio._handleDirectorChatUserMessage("Cambia a formato 21:9 cinemascope");
assert(studio.activeFormat.id === "21:9", "Comando de chat cambia formato a 21:9");

// Test de Simulación de Producción
studio._startProduction();
assert(studio.isRendering === true, "Pipeline de producción inicia en estado rendering");

// -------------------------------------------------------------
// 6. PROVEEDORES Y VALIDACIÓN DE KEYS
// -------------------------------------------------------------
console.log("\n🔑 6. Validación de Providers y Filtrado de Keys:");
import { getVerifiedModels, migrateIfNeeded } from "../web/js/providers.js";

const mockProv = {
  id: "test-prov",
  name: "Test Provider",
  groups: [
    { id: "g1", key: "sk-valid-key", models: ["model-a", "model-b"] },
    { id: "g2", key: "", models: ["model-c"] },
    { id: "g3", key: "   ", models: ["model-d"] }
  ]
};

const verified = getVerifiedModels(mockProv);
assert(verified.length === 2, `getVerifiedModels sólo retorna modelos con key válida no vacía (Esperado: 2, Obtenido: ${verified.length})`);
assert(verified.every(v => v.key === "sk-valid-key"), "Todos los modelos verificados tienen clave válida");

// -------------------------------------------------------------
// REPORTE FINAL CONSOLIDADO
// -------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log(`📊 REPORTE DE AUDITORÍA END-TO-END FINAL:`);
console.log(`   Total de Pruebas: ${passed + failed}`);
console.log(`   ✅ Pasadas: ${passed}`);
console.log(`   ❌ Falladas: ${failed}`);
console.log(`   Tasa de Éxito: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log("=".repeat(70) + "\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
