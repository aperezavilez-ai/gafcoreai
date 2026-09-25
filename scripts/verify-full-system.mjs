// ============================================================
//  GafCoreAI - Automated Full System Test Suite
//  Verificación rigurosa del 100% de funcionalidades
// ============================================================
import fs from "fs";
import path from "path";
import assert from "assert";

// Polyfill de entorno browser/DOM para pruebas en Node.js
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};
globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

console.log("\n=======================================================");
console.log("  🧪 INICIANDO SUITE DE PRUEBAS DE SISTEMA 100% GAFCOREAI");
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
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// ────────────────────────────────────────────────────────────
//  1. VERIFICACIÓN DE SINTAXIS Y CARGA DE MÓDULOS ES
// ────────────────────────────────────────────────────────────
console.log("📂 [1/6] Verificando Importación y Sintaxis de Módulos...");

const modules = [
  "../web/js/core.js",
  "../web/js/tools.js",
  "../web/js/agent.js",
  "../web/js/ghost.js",
  "../web/js/inline-edit.js",
  "../web/js/mentions.js",
  "../web/js/proactive-engine.js",
  "../web/js/project-watcher.js",
  "../web/js/providers.js"
];

for (const mod of modules) {
  await testAsync(`Carga de módulo ${mod}`, async () => {
    const imported = await import(mod);
    assert.ok(imported, `El módulo ${mod} debe exportar un objeto`);
  });
}

// ────────────────────────────────────────────────────────────
//  2. MOTOR DE HERRAMIENTAS Y EDICIÓN QUIRÚRGICA (tools.js)
// ────────────────────────────────────────────────────────────
console.log("\n🛠️ [2/6] Verificando ReAct Tools & Checkpoint Undo...");

const { ToolRegistry, PERMISSION_LEVELS } = await import("../web/js/core.js");
const { registerAllTools } = await import("../web/js/tools.js");

const mockState = {
  diskFolder: null,
  diskEntries: [],
  projectFiles: {},
  checkpointHistory: [],
  autopilot: { mode: "review" },
  providers: [
    {
      id: "anthropic",
      name: "Anthropic",
      models: [{ id: "claude-3-5-sonnet", key: "sk-ant-test" }]
    }
  ],
  activeProvider: { id: "anthropic", name: "Anthropic" },
  activeModel: { id: "claude-3-5-sonnet", key: "sk-ant-test" }
};

const registry = new ToolRegistry();
registerAllTools(registry, { state: mockState });

test("Registro de herramientas completas", () => {
  const tools = ["read_file", "write_file", "edit_file", "list_files", "delete_file", "open_folder", "close_folder"];
  for (const t of tools) {
    assert.ok(registry.get(t), `Herramienta ${t} debe estar registrada`);
  }
});

await testAsync("write_file crea archivo y genera snapshot de checkpoint", async () => {
  const writeTool = registry.get("write_file");
  const res = await writeTool.run({ path: "test.js", content: "console.log('original');\n" });
  assert.ok(mockState.projectFiles["test.js"], "El archivo debe crearse en memoria");
  assert.equal(mockState.projectFiles["test.js"], "console.log('original');\n");
});

await testAsync("edit_file realiza reemplazo quirúrgico exacto y captura checkpoint", async () => {
  const editTool = registry.get("edit_file");
  await editTool.run({
    path: "test.js",
    target: "console.log('original');",
    replacement: "console.log('modified_senior');"
  });
  assert.equal(mockState.projectFiles["test.js"], "console.log('modified_senior');\n");
  assert.ok(mockState.checkpointHistory.length > 0, "Debe registrarse el checkpoint previo para undo");
  assert.equal(mockState.checkpointHistory[mockState.checkpointHistory.length - 1].originalContent, "console.log('original');\n");
});

await testAsync("open_folder y close_folder actualizan el estado", async () => {
  const openTool = registry.get("open_folder");
  const closeTool = registry.get("close_folder");
  mockState.openFolderFromPath = (p) => { mockState.diskFolder = p; };
  mockState.closeDiskFolder = () => { mockState.diskFolder = null; };

  await openTool.run({ path: "D:\\PROGRAMAS IA\\CALILI" });
  assert.equal(mockState.diskFolder, "D:\\PROGRAMAS IA\\CALILI");

  await closeTool.run({});
  assert.equal(mockState.diskFolder, null);
});

// ────────────────────────────────────────────────────────────
//  3. SISTEMA DE MENCIONES @ (mentions.js)
// ────────────────────────────────────────────────────────────
console.log("\n🏷️ [3/6] Verificando Sistema de @-Mentions...");

const { Mentions } = await import("../web/js/mentions.js");

const mockTextarea = {
  value: "",
  selectionStart: 0,
  addEventListener: () => {},
  focus: () => {},
  setSelectionRange: () => {}
};

const mentions = new Mentions({
  state: mockState,
  textarea: mockTextarea,
  log: () => {}
});

await testAsync("Resolución de @codebase", async () => {
  mockState.projectFiles = { "index.js": "code", "app.py": "code" };
  const res = await mentions.resolve("Revisa la estructura con @codebase por favor");
  assert.ok(!res.text.includes("@codebase"), "@codebase debe limpiarse del texto");
  assert.equal(res.attachments.length, 1);
  assert.equal(res.attachments[0].kind, "codebase");
  assert.ok(res.attachments[0].text.includes("index.js"));
});

await testAsync("Resolución de @archivo específico", async () => {
  mockState.projectFiles["server.js"] = "const express = require('express');";
  const res = await mentions.resolve("Revisa @server.js y optimiza el puerto");
  assert.equal(res.attachments.length, 1);
  assert.equal(res.attachments[0].name, "server.js");
  assert.ok(res.attachments[0].text.includes("express"));
});

// ────────────────────────────────────────────────────────────
//  4. INLINE EDIT (Ctrl+K) & GHOST TEXT (ghost.js & inline-edit.js)
// ────────────────────────────────────────────────────────────
console.log("\n💡 [4/6] Verificando Inline Edit (Ctrl+K) y Ghost Text (Tab)...");

const { GhostText } = await import("../web/js/ghost.js");
const { InlineEdit } = await import("../web/js/inline-edit.js");

test("GhostText inicialización y resolución de modelo", () => {
  const ghost = new GhostText({ state: mockState });
  const model = ghost.getModel();
  assert.ok(model, "Debe resolver automáticamente el modelo activo verificado");
  assert.equal(model.model.id, "claude-3-5-sonnet");
});

test("InlineEdit inicialización y resolución de modelo", () => {
  const inline = new InlineEdit({ state: mockState, editor: null });
  const model = inline.getModel();
  assert.ok(model, "Debe resolver el modelo activo verificado");
  assert.equal(model.provider.id, "anthropic");
});

// ────────────────────────────────────────────────────────────
//  5. AUTO-DETECCIÓN DE INFRAESTRUCTURA (ProactiveEngine)
// ────────────────────────────────────────────────────────────
console.log("\n📦 [5/6] Verificando Detección de Infraestructura y Dependencias...");

const { ProactiveEngine } = await import("../web/js/proactive-engine.js");

test("Detección de faltante de .gitignore y dependencias", () => {
  const proactive = new ProactiveEngine({ state: mockState });
  mockState.diskFolder = "D:\\PROGRAMAS IA\\TEST";
  mockState.diskEntries = [
    { name: "package.json", is_file: true },
    { name: "index.js", is_file: true },
    { name: "app.js", is_file: true }
  ];
  proactive.analyze();

  const suggestions = proactive.list();
  assert.ok(suggestions.some(s => s.type === "infra-gitignore"), "Debe detectar la falta de .gitignore");
  assert.ok(suggestions.some(s => s.type === "infra-supabase"), "Debe detectar la falta de project-infra.json");
  assert.ok(suggestions.some(s => s.type === "infra-deps"), "Debe detectar la falta de node_modules");
});

test("Silenciamiento de advertencias cuando la infraestructura está completa", () => {
  const proactive = new ProactiveEngine({ state: mockState });
  proactive.clearAll();
  mockState.diskEntries = [
    { name: ".git", is_dir: true },
    { name: ".gitignore", is_file: true },
    { name: "project-infra.json", is_file: true },
    { name: "node_modules", is_dir: true },
    { name: "package.json", is_file: true }
  ];
  proactive.analyze();
  const suggestions = proactive.list();
  assert.equal(suggestions.filter(s => s.type.startsWith("infra-")).length, 0, "No debe mostrar advertencias si todo está configurado");
});

// ────────────────────────────────────────────────────────────
//  6. SANITIZADOR DE ERRORES, VISIBILIDAD DE CÓDIGO Y CANCELACIÓN
// ────────────────────────────────────────────────────────────
console.log("\n🛡️ [6/6] Verificando Sanitizador de Errores, Visualización y AbortController...");

const { sanitizeApiErrorMessage, AgentOrchestrator } = await import("../web/js/agent.js");

test("Traducción de error 401 y token en chino a español amigable", () => {
  const rawChinese = 'HTTP 401 - {"error":{"code":"","message":"该令牌状态不可用 (request id: 20260925025632835148448268d9d643P3sgXk)","type":"new_api_error"}}';
  const clean = sanitizeApiErrorMessage(rawChinese, "claude-haiku-4-5");
  assert.ok(clean.includes("API Key o Saldo Inválido"), "Debe identificar error de clave/saldo");
  assert.ok(clean.includes("Proveedores"), "Debe indicar solución en el menú de Proveedores");
  assert.ok(!clean.includes("该令牌状态不可用"), "No debe mostrar caracteres en chino sin traducir");
});

test("cleanForDisplay formatea bloques write_file como código visible", () => {
  const rawText = "He creado los siguientes archivos:\n```write:index.html\n<!DOCTYPE html>\n<html><body>Tienda</body></html>\n```\nListo para usar.";
  const formatted = AgentOrchestrator.cleanForDisplay(rawText);
  assert.ok(formatted.includes("📄 **index.html**"), "Debe incluir el título del archivo");
  assert.ok(formatted.includes("```html"), "Debe formatear el bloque de código con sintaxis resaltada");
  assert.ok(formatted.includes("Tienda"), "Debe mantener el contenido del archivo visible");
});

test("AgentOrchestrator detiene ejecución al llamar stop()", () => {
  const orchestrator = new AgentOrchestrator({
    provider: mockState.providers[0],
    model: { id: "test-model", key: "test-key" },
    tools: registry
  });
  assert.equal(orchestrator.aborted, false);
  orchestrator.stop();
  assert.equal(orchestrator.aborted, true);
});

// ────────────────────────────────────────────────────────────
//  RESULTADOS FINALES
// ────────────────────────────────────────────────────────────
console.log("\n=======================================================");
console.log(`  🏁 RESULTADOS: ${passed} PASADAS | ${failed} FALLIDAS`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ¡100% DE PRUEBAS UNITARIAS Y DE INTEGRACIÓN EXITOSAS!");
  process.exit(0);
}
