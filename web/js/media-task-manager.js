// ============================================================
//  GafCoreAI - media-task-manager.js
//  Gestor de Tareas Asíncronas Multimedia, Polling & Persistencia
// ============================================================

import { safeFetch } from "./providers.js";
import { tauri as tauriBridge } from "./tauri-bridge.js";

export const TASK_STATUS = {
  PENDING: "Pendiente...",
  PREPARING: "Preparando...",
  SENDING: "Enviando solicitud a la API...",
  GENERATING: "Generando video...",
  PROCESSING: "Procesando frames cinematográficos...",
  DOWNLOADING: "Descargando archivo .mp4...",
  SAVING: "Guardando en carpeta del proyecto...",
  COMPLETED: "Completado exitosamente",
  FAILED: "Error en la generación",
  CANCELLED: "Cancelado por el usuario"
};

export class MediaTaskManager {
  constructor(opts = {}) {
    this.storageKey = "gafcoreai_cinematic_tasks";
    this.tasks = this._loadTasks();
    this.activePollers = new Map();
    this.onTaskUpdate = opts.onTaskUpdate || (() => {});
  }

  _loadTasks() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _saveTasks() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tasks.slice(0, 100)));
    } catch (e) {}
  }

  getTasks() {
    return this.tasks;
  }

  getHistory() {
    return this.tasks;
  }

  getTask(taskId) {
    return this.tasks.find(t => t.id === taskId);
  }

  createTask(params = {}) {
    const taskId = "task_media_" + Date.now();
    const taskRecord = {
      id: taskId,
      type: params.type || "image_to_video",
      model: params.modelId || "minimax-video-01",
      prompt: params.prompt || "",
      duration: params.parameters?.duration || 5,
      resolution: params.parameters?.resolution || "1080p",
      aspectRatio: params.parameters?.aspectRatio || "16:9",
      sourceImage: params.imageUrl || null,
      status: TASK_STATUS.PENDING || "pending",
      createdAt: new Date().toISOString(),
      externalTaskId: null,
      videoUrl: null,
      localPath: null,
      error: null
    };
    this.tasks.unshift(taskRecord);
    this._saveTasks();
    this.onTaskUpdate(taskRecord);
    return taskRecord;
  }

  updateTaskStatus(taskId, status, extra = {}) {
    const task = this.getTask(taskId);
    if (!task) return null;
    task.status = status;
    if (extra.progress !== undefined) task.progress = extra.progress;
    if (extra.externalTaskId) task.externalTaskId = extra.externalTaskId;
    if (extra.videoUrl) task.videoUrl = extra.videoUrl;
    if (extra.localPath) task.localPath = extra.localPath;
    if (extra.error) task.error = extra.error;
    this._saveTasks();
    this.onTaskUpdate(task);
    return task;
  }

  /**
   * Crea y despacha una tarea real de Image-to-Video
   */
  async createImageToVideoTask({
    providerUrl,
    apiKey,
    modelObj,
    prompt,
    sourceImage,
    duration = 5,
    resolution = "1080p",
    aspectRatio = "16:9",
    diskFolder = null
  }) {
    if (!providerUrl) throw new Error("Falta URL del proveedor multimedia");
    if (!apiKey) throw new Error("Falta API Key para el modelo de video seleccionado");
    if (!sourceImage) throw new Error("Se requiere una imagen de origen para Image-to-Video");

    const taskId = "vid-" + Date.now();
    const taskRecord = {
      id: taskId,
      type: "image_to_video",
      model: modelObj.id,
      prompt,
      duration,
      resolution,
      aspectRatio,
      sourceImage: sourceImage.slice(0, 300) + (sourceImage.length > 300 ? "...[base64]" : ""),
      status: TASK_STATUS.SENDING,
      progressText: "Enviando solicitud inicial...",
      createdAt: new Date().toISOString(),
      remoteTaskId: null,
      videoUrl: null,
      localPath: null,
      error: null
    };

    this.tasks.unshift(taskRecord);
    this._saveTasks();
    this.onTaskUpdate(taskRecord);

    try {
      const endpoint = (providerUrl.replace(/\/$/, "") + (modelObj.endpointCreate || "/v1/video/generations"));
      
      const payload = {
        model: modelObj.id,
        prompt: prompt,
        first_frame_image: sourceImage,
        duration: parseInt(duration, 10),
        resolution: resolution,
        aspect_ratio: aspectRatio,
        fps: modelObj.fps || 24
      };

      const res = await safeFetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errDetails = "HTTP " + res.status;
        try {
          const errJson = await res.json();
          errDetails = errJson.message || errJson.error || JSON.stringify(errJson);
        } catch (_) {}
        throw new Error(`Error en API de Video (${res.status}): ${errDetails}`);
      }

      const data = await res.json();
      const remoteTaskId = data.task_id || data.id || data.job_id;

      if (!remoteTaskId && data.video_url) {
        // Retorno directo sin polling (síncrono)
        taskRecord.status = TASK_STATUS.DOWNLOADING;
        taskRecord.videoUrl = data.video_url;
        this._saveTasks();
        this.onTaskUpdate(taskRecord);
        await this._downloadAndSaveVideo(taskRecord, data.video_url, diskFolder);
        return taskRecord;
      }

      if (!remoteTaskId) {
        throw new Error("La API no devolvió un task_id válido");
      }

      taskRecord.remoteTaskId = remoteTaskId;
      taskRecord.status = TASK_STATUS.GENERATING;
      taskRecord.progressText = "Generando video en el servidor de IA (Task ID: " + remoteTaskId + ")...";
      this._saveTasks();
      this.onTaskUpdate(taskRecord);

      // Iniciar polling asíncrono
      this._startPolling(taskRecord, {
        providerUrl,
        apiKey,
        modelObj,
        diskFolder
      });

      return taskRecord;
    } catch (e) {
      taskRecord.status = TASK_STATUS.FAILED;
      taskRecord.error = e.message;
      this._saveTasks();
      this.onTaskUpdate(taskRecord);
      throw e;
    }
  }

  _startPolling(taskRecord, { providerUrl, apiKey, modelObj, diskFolder }) {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutos (5s intervalo)
    const intervalMs = 5000;

    const queryUrl = modelObj.endpointQuery.includes("?")
      ? `${providerUrl.replace(/\/$/, "")}${modelObj.endpointQuery}&task_id=${taskRecord.remoteTaskId}`
      : `${providerUrl.replace(/\/$/, "")}${modelObj.endpointQuery}?task_id=${taskRecord.remoteTaskId}`;

    const timer = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(timer);
        taskRecord.status = TASK_STATUS.FAILED;
        taskRecord.error = "Tiempo de espera agotado (timeout de 10 minutos)";
        this._saveTasks();
        this.onTaskUpdate(taskRecord);
        return;
      }

      try {
        const res = await safeFetch(queryUrl, {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) return;

        const data = await res.json();
        const status = (data.status || data.state || "").toLowerCase();

        if (status === "processing" || status === "generating" || status === "queue") {
          taskRecord.status = TASK_STATUS.PROCESSING;
          taskRecord.progressText = `Procesando tomas cinematográficas... (intento ${attempts})`;
          this.onTaskUpdate(taskRecord);
        } else if (status === "success" || status === "completed" || data.file_id || data.video_url || data.download_url) {
          clearInterval(timer);
          this.activePollers.delete(taskRecord.id);

          const videoUrl = data.video_url || data.download_url || data.url;
          taskRecord.status = TASK_STATUS.DOWNLOADING;
          taskRecord.videoUrl = videoUrl;
          this._saveTasks();
          this.onTaskUpdate(taskRecord);

          await this._downloadAndSaveVideo(taskRecord, videoUrl, diskFolder);
        } else if (status === "failed" || status === "error") {
          clearInterval(timer);
          this.activePollers.delete(taskRecord.id);
          taskRecord.status = TASK_STATUS.FAILED;
          taskRecord.error = data.error_message || data.error || "Fallo en la generación de video en el proveedor";
          this._saveTasks();
          this.onTaskUpdate(taskRecord);
        }
      } catch (pollErr) {
        console.warn("[media-task-manager] Error en polling:", pollErr.message);
      }
    }, intervalMs);

    this.activePollers.set(taskRecord.id, timer);
  }

  async _downloadAndSaveVideo(taskRecord, videoUrl, diskFolder) {
    taskRecord.status = TASK_STATUS.SAVING;
    taskRecord.progressText = "Guardando archivo en almacenamiento local...";
    this.onTaskUpdate(taskRecord);

    try {
      const fileName = `shot-${taskRecord.id}.mp4`;
      let localPath = fileName;

      if (diskFolder && tauriBridge && window.__TAURI__) {
        const assetsDir = diskFolder.replace(/[\\\/]$/, "") + "\\assets\\videos";
        try { await tauriBridge.createDir(assetsDir); } catch (_) {}
        localPath = `${assetsDir}\\${fileName}`;

        // Descarga directa con safeFetch
        const r = await safeFetch(videoUrl);
        if (r.ok) {
          const blob = await r.blob();
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64data = reader.result.split(",")[1];
              if (tauriBridge.writeFileBase64) {
                await tauriBridge.writeFileBase64(localPath, base64data);
              }
            } catch (_) {}
          };
          reader.readAsDataURL(blob);
        }
      }

      taskRecord.localPath = localPath;
      taskRecord.status = TASK_STATUS.COMPLETED;
      taskRecord.progressText = "¡Video generado y listo para reproducir!";
      this._saveTasks();
      this.onTaskUpdate(taskRecord);
    } catch (e) {
      taskRecord.status = TASK_STATUS.COMPLETED; // Completado remotamente aunque falle guardado en disco
      taskRecord.localPath = null;
      this._saveTasks();
      this.onTaskUpdate(taskRecord);
    }
  }

  cancelTask(taskId) {
    if (this.activePollers.has(taskId)) {
      clearInterval(this.activePollers.get(taskId));
      this.activePollers.delete(taskId);
    }
    const task = this.getTask(taskId);
    if (task && task.status !== TASK_STATUS.COMPLETED) {
      task.status = TASK_STATUS.CANCELLED;
      this._saveTasks();
      this.onTaskUpdate(task);
    }
  }
}
