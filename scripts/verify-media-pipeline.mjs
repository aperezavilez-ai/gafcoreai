// ============================================================
//  Test de Verificación: Pipeline Multimedia & Cinematic Studio
// ============================================================

import {
  MEDIA_CAPABILITIES,
  ASPECT_RATIOS,
  RESOLUTIONS,
  MEDIA_MODELS,
  MediaRouter
} from "../web/js/media-router.js";
import { MediaTaskManager, TASK_STATUS } from "../web/js/media-task-manager.js";
import { DEFAULT_PROVIDERS, migrateIfNeeded } from "../web/js/providers.js";
import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function assert(condition, desc) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FALLÓ: ${desc}`);
    failed++;
  }
}

console.log("\n============================================================");
console.log("🎬 Verificando Pipeline Multimedia & Cinematic Studio");
console.log("============================================================\n");

// 1. Constantes y Modelos
console.log("1. Modelos Multimedia y Capacidades:");
assert(MEDIA_CAPABILITIES.IMAGE_TO_VIDEO === "image_to_video", "Capability IMAGE_TO_VIDEO definida");
assert(MEDIA_MODELS.length >= 3, `Al menos 3 modelos registrados (${MEDIA_MODELS.length})`);

const minimaxVideo = MEDIA_MODELS.find(m => m.id === "minimax-video-01");
assert(minimaxVideo && minimaxVideo.providerId === "meai", "MiniMax Video-01 registrado para ME AI Cloud");
assert(minimaxVideo.capabilities.includes("image_to_video"), "MiniMax Video-01 soporta image_to_video");

const minimaxM3 = MEDIA_MODELS.find(m => m.id === "minimax-m3");
assert(minimaxM3 && minimaxM3.capabilities.includes("image_to_video"), "MiniMax M3 registrado y soporta image_to_video");

// 2. Enrutador Multimedia (MediaRouter)
console.log("\n2. MediaRouter:");
const mockProviders = [
  {
    id: "meai",
    name: "ME AI Cloud",
    url: "https://api.meai.cloud",
    groups: [
      { id: "meai-minimax-video-01", name: "minimax-video-01", key: "sk-mock-key-123", models: ["minimax-video-01"] }
    ]
  }
];

const router = new MediaRouter({
  getProviders: () => mockProviders,
  log: () => {}
});

const i2vModels = router.getModelsForCapability(MEDIA_CAPABILITIES.IMAGE_TO_VIDEO);
assert(i2vModels.length >= 2, `Modelos para IMAGE_TO_VIDEO: ${i2vModels.length}`);

const resolved = router.resolveModel("minimax-video-01");
assert(resolved && resolved.model.id === "minimax-video-01", "Resuelve modelo minimax-video-01");
assert(resolved.key === "sk-mock-key-123", "Obtiene la key del proveedor correspondiente");
assert(resolved.url === "https://api.meai.cloud", "Obtiene la URL base correcta");

// Test Sundance cinematic prompt enhancement
const enhanced = router.buildCinematicPrompt(
  "Cyberpunk neon street at night with rain reflections",
  { ratioId: "21:9", resolutionId: "1080p", duration: 5 }
);
assert(enhanced.enhancedPrompt.includes("35mm anamorphic"), "Agrega look cinematográfico 35mm anamorphic");
assert(enhanced.enhancedPrompt.includes("shallow depth of field"), "Agrega shallow depth of field");
assert(enhanced.enhancedPrompt.includes("21:9 aspect ratio"), "Refleja aspecto 21:9");

// 3. Gestor de Tareas Multimedia (MediaTaskManager)
console.log("\n3. MediaTaskManager:");
const taskManager = new MediaTaskManager({
  getProviderKey: () => "sk-mock-test",
  log: () => {},
  termWrite: () => {}
});

const task = taskManager.createTask({
  type: MEDIA_CAPABILITIES.IMAGE_TO_VIDEO,
  modelId: "minimax-video-01",
  providerId: "meai",
  prompt: "Camera dolly shot through misty forest",
  imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  parameters: { duration: 5, resolution: "1080p", aspectRatio: "21:9" }
});

assert(task && task.id && task.id.startsWith("task_media_"), `Tarea creada con ID: ${task.id}`);
assert(task.status === TASK_STATUS.PENDING, "Estado inicial es PENDING");

taskManager.updateTaskStatus(task.id, TASK_STATUS.GENERATING, { progress: 45, externalTaskId: "ext_12345" });
const updated = taskManager.getTask(task.id);
assert(updated.status === TASK_STATUS.GENERATING, "Estado actualizado a GENERATING");
assert(updated.externalTaskId === "ext_12345", "ExternalTaskId guardado");

const history = taskManager.getHistory();
assert(history.length >= 1 && history[0].id === task.id, "Historial registra la tarea correctamente");

// 4. Migración de Providers
console.log("\n4. Providers & Migración:");
const oldProviders = [
  {
    id: "meai",
    name: "ME AI Cloud",
    url: "https://api.meai.cloud",
    groups: [
      { id: "meai-minimax-m2.5", name: "minimax-m2.5", key: "sk-my-saved-key", models: ["minimax-m2.5"] }
    ]
  }
];

const migrated = migrateIfNeeded(oldProviders);
const meai = migrated.find(p => p.id === "meai");
assert(meai, "ME AI Cloud presente tras migración");
const hasM3 = meai.groups.some(g => g.models.includes("minimax-m3"));
assert(hasM3, "minimax-m3 añadido a ME AI Cloud en migración");
const m25 = meai.groups.find(g => g.models.includes("minimax-m2.5"));
assert(m25 && m25.key === "sk-my-saved-key", "Preserva las keys previas del usuario intactas");

// 5. Verificación de HTML UI
console.log("\n5. Verificación de UI (index.html):");
const html = fs.readFileSync(path.resolve("web/index.html"), "utf-8");
assert(html.includes('id="tab-studio"'), "Contiene tab #tab-studio");
assert(html.includes('id="view-studio"'), "Contiene contenedor #view-studio");
assert(html.includes('id="btn-studio-menu"'), "Contiene item #btn-studio-menu en menú de herramientas");
assert(html.includes('data-cmd="/video"'), "Contiene comando /video en slash menu");
assert(html.includes('data-cmd="/cinema"'), "Contiene comando /cinema en slash menu");

console.log("\n============================================================");
console.log(`Resultado: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
