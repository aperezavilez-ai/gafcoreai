// ============================================================
//  GafCoreAI - cinematic-studio-ui.js
//  Interfaz Visual del Estudio Cinemático, Modal de Confirmación & Player
// ============================================================

import { ASPECT_RATIOS, RESOLUTIONS } from "./media-router.js";
import { TASK_STATUS } from "./media-task-manager.js";
import { showAlert, showConfirm } from "./dialogs.js";

export class CinematicStudioUI {
  constructor({ mediaRouter, taskManager, state }) {
    this.mediaRouter = mediaRouter;
    this.taskManager = taskManager;
    this.state = state;
    this.currentSourceImage = null;
    this.currentPrompt = "";
    this.activeTask = null;
    
    // Escuchar actualizaciones de tareas
    this.taskManager.onTaskUpdate = (task) => this.handleTaskUpdate(task);
  }

  /**
   * Abre el Modal de Confirmación previo a la generación de Video Real
   */
  async openGenerateVideoModal({ imageBase64, prompt = "", preferredModel = null }) {
    this.currentSourceImage = imageBase64;
    this.currentPrompt = prompt;

    const modal = document.getElementById("modal-custom");
    if (!modal) return;

    const availableModels = this.mediaRouter.getModelsForCapability("image_to_video");
    const bestResolution = "1080p";
    const bestRatio = "16:9";

    modal.classList.remove("hidden");
    modal.querySelector("#custom-title").textContent = "🎬 Generador Cinemático: Image → Video";

    const body = modal.querySelector("#custom-body");
    body.innerHTML = `
      <div class="cinema-modal-grid" style="display:grid;grid-template-columns:180px 1fr;gap:14px;">
        <div class="cinema-thumb-box" style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:6px;overflow:hidden;max-height:220px;display:flex;align-items:center;justify-content:center;">
          <img src="${imageBase64}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Preview" />
        </div>
        <div class="cinema-config-form" style="display:flex;flex-direction:column;gap:8px;">
          <label style="font-size:11px;color:var(--text-dim);">Prompt Descriptivo de la Toma:</label>
          <textarea id="cinema-prompt" rows="3" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:4px;padding:6px;font-size:12px;resize:vertical;">${prompt || "Cinematic camera movement, natural light, 35mm film texture"}</textarea>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Modelo de Video:</label>
              <select id="cinema-model" style="width:100%;background:#1e1e24;border:1px solid rgba(255,255,255,0.15);color:#fff;padding:4px;border-radius:4px;">
                ${availableModels.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Duración:</label>
              <select id="cinema-duration" style="width:100%;background:#1e1e24;border:1px solid rgba(255,255,255,0.15);color:#fff;padding:4px;border-radius:4px;">
                <option value="5">5 Segundos (Toma Estándar)</option>
                <option value="10">10 Segundos (Toma Extendida)</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Formato / Relación:</label>
              <select id="cinema-ratio" style="width:100%;background:#1e1e24;border:1px solid rgba(255,255,255,0.15);color:#fff;padding:4px;border-radius:4px;">
                ${Object.values(ASPECT_RATIOS).map(r => `<option value="${r.id}">${r.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Resolución:</label>
              <select id="cinema-res" style="width:100%;background:#1e1e24;border:1px solid rgba(255,255,255,0.15);color:#fff;padding:4px;border-radius:4px;">
                ${Object.values(RESOLUTIONS).map(r => `<option value="${r.id}">${r.name}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div id="cinema-status-box" style="margin-top:12px;padding:8px 12px;background:rgba(255,255,255,0.05);border-radius:4px;font-size:12px;display:none;">
        <span id="cinema-status-text">Listo para generar</span>
      </div>
    `;

    const actions = modal.querySelector("#custom-actions");
    actions.innerHTML = "";

    const btnCancel = document.createElement("button");
    btnCancel.className = "btn ghost";
    btnCancel.textContent = "Cancelar";
    btnCancel.onclick = () => modal.classList.add("hidden");
    actions.appendChild(btnCancel);

    const btnGenerate = document.createElement("button");
    btnGenerate.className = "btn primary";
    btnGenerate.innerHTML = "▶ GENERAR VIDEO";
    btnGenerate.onclick = async () => {
      const selectedModelId = document.getElementById("cinema-model").value;
      const userPrompt = document.getElementById("cinema-prompt").value.trim();
      const duration = parseInt(document.getElementById("cinema-duration").value, 10);
      const ratio = document.getElementById("cinema-ratio").value;
      const res = document.getElementById("cinema-res").value;

      const resolved = this.mediaRouter.resolveBestModel("image_to_video", selectedModelId);
      if (!resolved || !resolved.key) {
        showAlert(
          "No se encontró una API Key configurada para el modelo seleccionado (" + selectedModelId + ").\nPor favor abre 'Proveedores' en la barra superior y agrega tu clave API.",
          "API Key Requerida"
        );
        return;
      }

      btnGenerate.disabled = true;
      btnGenerate.textContent = "Despachando...";
      const statusBox = document.getElementById("cinema-status-box");
      const statusText = document.getElementById("cinema-status-text");
      if (statusBox) statusBox.style.display = "block";
      if (statusText) statusText.textContent = "Enviando solicitud a la API...";

      try {
        const enhancedPrompt = this.mediaRouter.enhancePromptCinematic(userPrompt, { aspectRatio: ratio });
        
        const task = await this.taskManager.createImageToVideoTask({
          providerUrl: resolved.providerUrl,
          apiKey: resolved.key,
          modelObj: resolved.model,
          prompt: enhancedPrompt,
          sourceImage: this.currentSourceImage,
          duration,
          resolution: res,
          aspectRatio: ratio,
          diskFolder: this.state.diskFolder
        });

        this.activeTask = task;
        modal.classList.add("hidden");
        
        // Cambiar a la vista de Estudio Cinemático
        if (window.__gafSwitchMainTab) {
          window.__gafSwitchMainTab("studio");
        }
        this.renderStudioView();
      } catch (err) {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = "▶ GENERAR VIDEO";
        if (statusText) statusText.textContent = "Error: " + err.message;
        showAlert("Error al iniciar generación: " + err.message, "Fallo de Generación");
      }
    };
    actions.appendChild(btnGenerate);
  }

  handleTaskUpdate(task) {
    const statusLabel = document.getElementById("studio-active-status");
    if (statusLabel) {
      statusLabel.textContent = task.status;
    }
    const progressLabel = document.getElementById("studio-active-progress");
    if (progressLabel) {
      progressLabel.textContent = task.progressText || "";
    }

    if (task.status === TASK_STATUS.COMPLETED && task.videoUrl) {
      this.renderPlayer(task.videoUrl, task);
    }
    this.renderHistory();
  }

  /**
   * Renderiza el contenido de la pestaña principal del Estudio Cinemático
   */
  renderStudioView() {
    const container = document.getElementById("view-studio");
    if (!container) return;

    container.innerHTML = `
      <div class="studio-layout" style="display:grid;grid-template-columns:300px 1fr;height:100%;background:var(--bg-main);">
        <!-- Panel Izquierdo: Control & Tomas -->
        <div class="studio-sidebar" style="border-right:1px solid rgba(255,255,255,0.1);padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:14px;display:flex;align-items:center;gap:6px;">🎬 Tomas Cinemáticas</h3>
            <button class="btn primary small" id="btn-studio-new-shot">+ Nueva Toma</button>
          </div>
          
          <div id="studio-active-card" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:10px;display:${this.activeTask ? 'block' : 'none'};">
            <div style="font-size:11px;color:var(--primary);font-weight:bold;">TOMA ACTIVA</div>
            <div id="studio-active-status" style="font-size:12px;font-weight:600;margin-top:2px;">${this.activeTask ? this.activeTask.status : ''}</div>
            <div id="studio-active-progress" style="font-size:11px;color:var(--text-dim);margin-top:4px;">${this.activeTask ? this.activeTask.progressText : ''}</div>
          </div>

          <div style="font-size:12px;font-weight:bold;color:var(--text-dim);margin-top:6px;">HISTORIAL DE RENDERS</div>
          <div id="studio-history-list" style="display:flex;flex-direction:column;gap:6px;"></div>
        </div>

        <!-- Panel Derecho: Monitor 4K & Reproductor -->
        <div class="studio-main" style="display:flex;flex-direction:column;height:100%;padding:14px;overflow-y:auto;">
          <div id="studio-player-container" style="flex:1;display:flex;align-items:center;justify-content:center;background:#09090b;border-radius:8px;border:1px solid rgba(255,255,255,0.08);min-height:360px;position:relative;">
            <div id="studio-empty-state" style="text-align:center;color:var(--text-dim);">
              <div style="font-size:48px;margin-bottom:8px;">🎬</div>
              <div style="font-size:14px;font-weight:600;">Monitor de Producción Cinemática</div>
              <div style="font-size:12px;margin-top:4px;">Selecciona o genera una toma para previsualizar en tiempo real</div>
            </div>
          </div>

          <div id="studio-actions-bar" style="margin-top:12px;display:none;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:6px;">
            <div id="studio-shot-meta" style="font-size:12px;color:var(--text-dim);"></div>
            <div style="display:flex;gap:8px;">
              <button id="btn-studio-download" class="btn ghost small">📥 Descargar MP4</button>
              <button id="btn-studio-regen" class="btn primary small">🔄 Regenerar Toma</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const btnNew = container.querySelector("#btn-studio-new-shot");
    if (btnNew) {
      btnNew.onclick = () => {
        const fileInput = document.getElementById("image-input");
        if (fileInput) fileInput.click();
      };
    }

    this.renderHistory();
  }

  renderPlayer(videoUrl, task = {}) {
    const container = document.getElementById("studio-player-container");
    const actionsBar = document.getElementById("studio-actions-bar");
    const shotMeta = document.getElementById("studio-shot-meta");
    if (!container) return;

    container.innerHTML = `
      <video id="studio-video" controls autoplay loop style="max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.6);">
        <source src="${videoUrl}" type="video/mp4">
        Tu navegador no soporta reproducción de video HTML5.
      </video>
    `;

    if (actionsBar) actionsBar.style.display = "flex";
    if (shotMeta) {
      shotMeta.innerHTML = `<strong>Toma:</strong> ${task.id || 'Clip'} | <strong>Resolución:</strong> ${task.resolution || '1080p'} | <strong>Aspect Ratio:</strong> ${task.aspectRatio || '16:9'} | <strong>Duración:</strong> ${task.duration || 5}s`;
    }

    const btnDl = document.getElementById("btn-studio-download");
    if (btnDl) {
      btnDl.onclick = () => {
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = `cinematic-shot-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    }

    const btnRegen = document.getElementById("btn-studio-regen");
    if (btnRegen && task.sourceImage) {
      btnRegen.onclick = () => {
        this.openGenerateVideoModal({
          imageBase64: task.sourceImage,
          prompt: task.prompt
        });
      };
    }
  }

  renderHistory() {
    const list = document.getElementById("studio-history-list");
    if (!list) return;

    const tasks = this.taskManager.getTasks();
    if (!tasks.length) {
      list.innerHTML = `<div style="font-size:11px;color:var(--text-mute);">No hay tomas generadas aún.</div>`;
      return;
    }

    list.innerHTML = "";
    tasks.forEach(task => {
      const item = document.createElement("div");
      item.className = "studio-history-item";
      item.style.cssText = "padding:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;";
      item.innerHTML = `
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">
          <div style="font-size:12px;font-weight:600;color:#fff;">${task.id} (${task.duration}s)</div>
          <div style="font-size:11px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;">${task.prompt || 'Sin prompt'}</div>
        </div>
        <div style="font-size:11px;color:${task.status === TASK_STATUS.COMPLETED ? 'var(--ok, #4ade80)' : 'var(--text-mute)'};font-weight:bold;">
          ${task.status === TASK_STATUS.COMPLETED ? '✓ Listo' : '...'}
        </div>
      `;
      item.onclick = () => {
        if (task.videoUrl) {
          this.renderPlayer(task.videoUrl, task);
        }
      };
      list.appendChild(item);
    });
  }
}
