// ============================================================
//  GafCoreAI - cinematic-studio-ui.js
//  Interfaz Visual del Estudio Cinemático, Modal de Confirmación & Player
// ============================================================

import { ASPECT_RATIOS, RESOLUTIONS } from "./media-router.js";
import { TASK_STATUS } from "./media-task-manager.js";
import { showAlert, showConfirm } from "./dialogs.js";

export class CinematicStudioUI {
  constructor(opts = {}) {
    this.mediaRouter = opts.mediaRouter;
    this.taskManager = opts.taskManager || opts.mediaTaskManager;
    this.state = opts.state || {};
    this.log = opts.log || console.log;
    this.termWrite = opts.termWrite || console.log;
    this.currentSourceImage = null;
    this.currentPrompt = "";
    this.activeTask = null;
    
    // Escuchar actualizaciones de tareas
    if (this.taskManager) {
      this.taskManager.onTaskUpdate = (task) => this.handleTaskUpdate(task);
    }
  }

  init() {
    // Escuchar cambios de archivos de imagen desde el input global si aplica
    const imgInput = document.getElementById("image-input");
    if (imgInput) {
      imgInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file && this.state.activeMainTab === "studio") {
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.openGenerateVideoModal({ imageBase64: evt.target.result });
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  /**
   * Abre el Modal de Confirmación previo a la generación de Video Real
   */
  async openGenerateVideoModal({ imageBase64, imageUrl, prompt = "", preferredModel = null } = {}) {
    this.currentSourceImage = imageBase64 || imageUrl || null;
    this.currentPrompt = prompt || "";

    const modal = document.getElementById("modal-custom");
    if (!modal) return;

    const availableModels = this.mediaRouter.getModelsForCapability("image_to_video");

    modal.classList.remove("hidden");
    modal.querySelector("#custom-title").textContent = "🎬 Generador Cinemático: Image → Video";

    const thumbHtml = this.currentSourceImage
      ? `<img id="cinema-thumb-img" src="${this.currentSourceImage}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Preview" />`
      : `<div id="cinema-dropzone" style="text-align:center;padding:16px;cursor:pointer;">
          <div style="font-size:32px;margin-bottom:6px;">📷</div>
          <div style="font-size:12px;font-weight:600;color:var(--accent);">Subir Imagen</div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Haz clic o arrastra aquí</div>
         </div>`;

    const body = modal.querySelector("#custom-body");
    body.innerHTML = `
      <div class="cinema-modal-grid" style="display:grid;grid-template-columns:180px 1fr;gap:14px;">
        <div class="cinema-thumb-box" style="background:var(--bg-2);border:1px dashed var(--border);border-radius:6px;overflow:hidden;max-height:220px;display:flex;align-items:center;justify-content:center;position:relative;">
          ${thumbHtml}
        </div>
        <div class="cinema-config-form" style="display:flex;flex-direction:column;gap:8px;">
          <label style="font-size:11px;color:var(--text-dim);">Prompt Descriptivo de la Toma:</label>
          <textarea id="cinema-prompt" rows="3" placeholder="Ej: Cámara dolly lento hacia adelante, luz natural suave, óptica 35mm..." style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:6px;font-size:12px;resize:vertical;">${this.currentPrompt}</textarea>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Modelo de Video:</label>
              <select id="cinema-model" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                ${availableModels.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Duración:</label>
              <select id="cinema-duration" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                <option value="5">5 Segundos (Toma Estándar)</option>
                <option value="10">10 Segundos (Toma Extendida)</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Formato / Aspect Ratio:</label>
              <select id="cinema-ratio" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                ${Object.values(ASPECT_RATIOS).map(r => `<option value="${r.id}">${r.icon} ${r.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Resolución:</label>
              <select id="cinema-res" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                ${Object.values(RESOLUTIONS).map(r => `<option value="${r.id}">${r.name}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div id="cinema-status-box" style="margin-top:12px;padding:8px 12px;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;font-size:12px;display:none;">
        <span id="cinema-status-text">Listo para generar</span>
      </div>
    `;

    // Handler para subir imagen si estaba vacía
    const dropzone = modal.querySelector("#cinema-dropzone");
    if (dropzone) {
      dropzone.onclick = () => {
        const tempInput = document.createElement("input");
        tempInput.type = "file";
        tempInput.accept = "image/*";
        tempInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              this.currentSourceImage = evt.target.result;
              const box = modal.querySelector(".cinema-thumb-box");
              if (box) {
                box.innerHTML = `<img src="${this.currentSourceImage}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Preview" />`;
              }
            };
            reader.readAsDataURL(file);
          }
        };
        tempInput.click();
      };
    }

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
      if (!this.currentSourceImage) {
        showAlert("Por favor selecciona una imagen de origen haciendo clic en el recuadro de imagen.", "Imagen Requerida");
        return;
      }

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
        if (typeof window.__gafSwitchMainTab === "function") {
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
      <div class="studio-layout" style="display:grid;grid-template-columns:320px 1fr;height:100%;background:var(--bg-0);">
        <!-- Panel Izquierdo: Control & Tomas -->
        <div class="studio-sidebar" style="border-right:1px solid var(--border);padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;background:var(--bg-1);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--text);">🎬 Tomas Cinemáticas</h3>
            <button class="btn primary small" id="btn-studio-new-shot" style="font-weight:600;padding:4px 10px;">+ Nueva Toma</button>
          </div>
          
          <div id="studio-active-card" style="background:var(--bg-2);border:1px solid var(--border);border-radius:6px;padding:12px;display:${this.activeTask ? 'block' : 'none'};">
            <div style="font-size:10.5px;color:var(--accent);font-weight:bold;letter-spacing:0.5px;">⚡ TOMA EN PROCESO</div>
            <div id="studio-active-status" style="font-size:12px;font-weight:600;margin-top:4px;color:var(--text);">${this.activeTask ? this.activeTask.status : ''}</div>
            <div id="studio-active-progress" style="font-size:11px;color:var(--text-dim);margin-top:4px;">${this.activeTask ? this.activeTask.progressText : ''}</div>
          </div>

          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Historial de Renders</div>
            <div id="studio-history-list" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>
        </div>

        <!-- Panel Derecho: Monitor 4K & Reproductor -->
        <div class="studio-main" style="display:flex;flex-direction:column;height:100%;padding:16px;overflow-y:auto;background:var(--bg-0);">
          <div id="studio-player-container" style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--bg-1);border-radius:8px;border:1px solid var(--border);min-height:360px;position:relative;">
            <div id="studio-empty-state" style="text-align:center;color:var(--text-dim);padding:30px;">
              <div style="font-size:52px;margin-bottom:12px;">🎬</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">Estudio Cinemático GafCoreAI</div>
              <div style="font-size:12.5px;color:var(--text-dim);max-width:420px;margin:0 auto 16px;line-height:1.5;">
                Genera tomas cinematográficas con óptica de 35mm, grano Kodak y relaciones de aspecto 21:9 Cinemascope o 16:9 usando modelos nativos sin costos inflados.
              </div>
              <button class="btn primary" id="btn-studio-empty-cta" style="padding:8px 18px;font-size:13px;font-weight:600;">+ Crear Primera Toma de Video</button>
            </div>
          </div>

          <div id="studio-actions-bar" style="margin-top:14px;display:none;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--bg-1);border:1px solid var(--border);border-radius:8px;">
            <div id="studio-shot-meta" style="font-size:12px;color:var(--text-dim);"></div>
            <div style="display:flex;gap:8px;">
              <button id="btn-studio-download" class="btn ghost small" style="font-weight:600;">📥 Descargar MP4</button>
              <button id="btn-studio-regen" class="btn primary small" style="font-weight:600;">🔄 Regenerar Toma</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const triggerImagePicker = () => {
      const tempInput = document.createElement("input");
      tempInput.type = "file";
      tempInput.accept = "image/*";
      tempInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.openGenerateVideoModal({ imageBase64: evt.target.result });
          };
          reader.readAsDataURL(file);
        }
      };
      tempInput.click();
    };

    const btnNew = container.querySelector("#btn-studio-new-shot");
    if (btnNew) btnNew.onclick = triggerImagePicker;

    const btnEmptyCta = container.querySelector("#btn-studio-empty-cta");
    if (btnEmptyCta) btnEmptyCta.onclick = triggerImagePicker;

    this.renderHistory();

    // Si ya existe una toma previa completada con video, cargarla automáticamente en el monitor
    const tasks = (this.taskManager && typeof this.taskManager.getTasks === "function") ? this.taskManager.getTasks() : [];
    const lastDone = tasks.find(t => t.status === TASK_STATUS.COMPLETED && t.videoUrl);
    if (lastDone) {
      this.renderPlayer(lastDone.videoUrl, lastDone);
    }
  }

  renderPlayer(videoUrl, task = {}) {
    const container = document.getElementById("studio-player-container");
    const actionsBar = document.getElementById("studio-actions-bar");
    const shotMeta = document.getElementById("studio-shot-meta");
    if (!container) return;

    container.innerHTML = `
      <video id="studio-video" controls autoplay loop style="max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,0.5);">
        <source src="${videoUrl}" type="video/mp4">
        Tu navegador no soporta reproducción de video HTML5.
      </video>
    `;

    if (actionsBar) actionsBar.style.display = "flex";
    if (shotMeta) {
      shotMeta.innerHTML = `<strong>Toma:</strong> ${task.id || 'Clip'} &middot; <strong>Resolución:</strong> ${task.resolution || '1080p'} &middot; <strong>Formato:</strong> ${task.aspectRatio || '16:9'} &middot; <strong>Duración:</strong> ${task.duration || 5}s`;
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

    const tasks = (this.taskManager && typeof this.taskManager.getTasks === "function") ? this.taskManager.getTasks() : [];
    if (!tasks.length) {
      list.innerHTML = `<div style="font-size:11.5px;color:var(--text-mute);padding:8px 4px;">No hay tomas generadas aún. Pulsa "+ Nueva Toma" para comenzar.</div>`;
      return;
    }

    list.innerHTML = "";
    tasks.forEach(task => {
      const item = document.createElement("div");
      item.className = "studio-history-item";
      item.style.cssText = "padding:10px;background:var(--bg-2);border:1px solid var(--border);border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background 0.15s ease;";
      item.innerHTML = `
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px;">
          <div style="font-size:12px;font-weight:600;color:var(--text);">${task.id} (${task.duration}s &middot; ${task.aspectRatio || '16:9'})</div>
          <div style="font-size:11px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${task.prompt || 'Sin prompt'}</div>
        </div>
        <div style="font-size:11px;color:${task.status === TASK_STATUS.COMPLETED ? 'var(--ok)' : 'var(--text-mute)'};font-weight:bold;flex-shrink:0;">
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
