// ============================================================
//  GafCoreAI - cinematic-studio-ui.js
//  Suite Completa de Producción de Series & Cine (Sundance / Runway Level)
//  Guion, Personajes, Locaciones, Director Engine, Image & Video Pipeline
// ============================================================

import { ASPECT_RATIOS, RESOLUTIONS, MEDIA_CAPABILITIES } from "./media-router.js";
import { TASK_STATUS } from "./media-task-manager.js";
import { showAlert, showConfirm } from "./dialogs.js";

const DEFAULT_PROJECT = {
  title: "Mi Serie Cinemática",
  genre: "Drama / Ciencia Ficción",
  synopsis: "Una historia cinematográfica creada con GafCoreAI Cinematic Studio.",
  script: `ESCENA 01 - INT. CALLE NOCTURNA - NOCHE

Un silencio pesado envuelve la avenida iluminada únicamente por letreros de neón parpadeantes y el reflejo de la lluvia sobre el asfalto.

MARCUS (35 años, mirada intensa, cazadora de cuero oscura) camina a paso lento con las manos en los bolsillos. Se detiene bajo la luz azulada de un escaparate y mira su reloj.

MARCUS
(en voz baja)
El tiempo se está acabando...

Una sombra cruza al fondo del callejón. Marcus levanta la mirada alerta.`,
  characters: [
    {
      id: "char_1",
      name: "Marcus",
      role: "Protagonista",
      description: "Hombre de 35 años, cabello rapado, mirada penetrante, cazadora de cuero y camisa oscura.",
      imageUrl: ""
    }
  ],
  locations: [
    {
      id: "loc_1",
      name: "Callejón Neón",
      type: "EXTERIOR NOCHE",
      description: "Calle urbana empapada por lluvia, reflejos de neón cian y magenta, atmósfera densa y fría.",
      imageUrl: ""
    }
  ],
  shots: []
};

export class CinematicStudioUI {
  constructor(opts = {}) {
    this.mediaRouter = opts.mediaRouter;
    this.taskManager = opts.taskManager || opts.mediaTaskManager;
    this.state = opts.state || {};
    this.log = opts.log || console.log;
    this.termWrite = opts.termWrite || console.log;
    
    this.activeTab = "director"; // "director", "script", "characters", "locations"
    this.currentSourceImage = null;
    this.currentPrompt = "";
    this.activeTask = null;
    this.activeShotId = null;

    this.projectStorageKey = "gafcoreai_cinema_project_data";
    this.project = this._loadProject();

    // Escuchar actualizaciones asíncronas de tareas multimedia
    if (this.taskManager) {
      this.taskManager.onTaskUpdate = (task) => this.handleTaskUpdate(task);
    }
  }

  _loadProject() {
    try {
      const raw = localStorage.getItem(this.projectStorageKey);
      if (raw) {
        const p = JSON.parse(raw);
        return { ...DEFAULT_PROJECT, ...p };
      }
    } catch (_) {}
    return { ...DEFAULT_PROJECT };
  }

  _saveProject() {
    try {
      localStorage.setItem(this.projectStorageKey, JSON.stringify(this.project));
    } catch (_) {}
  }

  init() {
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

  handleTaskUpdate(task) {
    const statusLabel = document.getElementById("studio-active-status");
    if (statusLabel) statusLabel.textContent = task.status;
    const progressLabel = document.getElementById("studio-active-progress");
    if (progressLabel) progressLabel.textContent = task.progressText || "";

    if (task.status === TASK_STATUS.COMPLETED && task.videoUrl) {
      this.renderPlayer(task.videoUrl, task);
    }
    this.renderHistory();
  }

  /**
   * Renderiza la vista principal del Estudio Cinemático con todas sus herramientas
   */
  renderStudioView() {
    const container = document.getElementById("view-studio");
    if (!container) return;

    container.innerHTML = `
      <div class="cinema-studio-container" style="display:flex;flex-direction:column;height:100%;background:var(--bg-0);color:var(--text);font-family:inherit;">
        <!-- Barra de Herramientas Superior del Estudio Cinemático -->
        <div class="cinema-topbar" style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:var(--bg-1);border-bottom:1px solid var(--border);flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--accent);">
              <span>🎬</span>
              <span>Estudio Cinemático</span>
            </div>
            <div style="display:flex;gap:4px;background:var(--bg-2);padding:2px 4px;border-radius:6px;border:1px solid var(--border);">
              <button class="cinema-tab-btn ${this.activeTab === 'director' ? 'active' : ''}" data-cinema-tab="director" style="border:none;background:${this.activeTab === 'director' ? 'var(--accent)' : 'transparent'};color:${this.activeTab === 'director' ? '#fff' : 'var(--text)'};padding:4px 10px;border-radius:4px;font-size:11.5px;font-weight:600;cursor:pointer;">🎥 Director & Tomas</button>
              <button class="cinema-tab-btn ${this.activeTab === 'script' ? 'active' : ''}" data-cinema-tab="script" style="border:none;background:${this.activeTab === 'script' ? 'var(--accent)' : 'transparent'};color:${this.activeTab === 'script' ? '#fff' : 'var(--text)'};padding:4px 10px;border-radius:4px;font-size:11.5px;font-weight:600;cursor:pointer;">📜 Guion & Historia</button>
              <button class="cinema-tab-btn ${this.activeTab === 'characters' ? 'active' : ''}" data-cinema-tab="characters" style="border:none;background:${this.activeTab === 'characters' ? 'var(--accent)' : 'transparent'};color:${this.activeTab === 'characters' ? '#fff' : 'var(--text)'};padding:4px 10px;border-radius:4px;font-size:11.5px;font-weight:600;cursor:pointer;">🎭 Personajes & Actores</button>
              <button class="cinema-tab-btn ${this.activeTab === 'locations' ? 'active' : ''}" data-cinema-tab="locations" style="border:none;background:${this.activeTab === 'locations' ? 'var(--accent)' : 'transparent'};color:${this.activeTab === 'locations' ? '#fff' : 'var(--text)'};padding:4px 10px;border-radius:4px;font-size:11.5px;font-weight:600;cursor:pointer;">🏛️ Locaciones</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cinema-proj-title" value="${this.project.title}" title="Título del Proyecto" style="background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:12px;width:180px;" />
            <button class="btn primary small" id="btn-cinema-new-shot-top" style="font-weight:600;padding:4px 12px;">+ Nueva Toma de Video</button>
          </div>
        </div>

        <!-- Área de Contenido Dinámico según la pestaña activa -->
        <div id="cinema-subview-content" style="flex:1;min-height:0;overflow:hidden;">
          ${this._renderCurrentTabContent()}
        </div>
      </div>
    `;

    this._bindEvents(container);
  }

  _renderCurrentTabContent() {
    if (this.activeTab === "script") return this._renderScriptTab();
    if (this.activeTab === "characters") return this._renderCharactersTab();
    if (this.activeTab === "locations") return this._renderLocationsTab();
    return this._renderDirectorTab();
  }

  // ────────────────────────────────────────────────────────────
  // 🎥 VISTA DIRECTOR & MONITOR (TOMAS + PLAYER + CONTROLES)
  // ────────────────────────────────────────────────────────────
  _renderDirectorTab() {
    return `
      <div class="studio-layout" style="display:grid;grid-template-columns:330px 1fr;height:100%;background:var(--bg-0);">
        <!-- Panel Izquierdo: Lista de Tomas & Historial -->
        <div class="studio-sidebar" style="border-right:1px solid var(--border);padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;background:var(--bg-1);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--text);">🎬 Tomas del Proyecto</h3>
            <button class="btn primary small" id="btn-studio-new-shot" style="font-weight:600;padding:4px 10px;">+ Crear Toma</button>
          </div>

          <div id="studio-active-card" style="background:var(--bg-2);border:1px solid var(--border);border-radius:6px;padding:12px;display:${this.activeTask ? 'block' : 'none'};">
            <div style="font-size:10px;color:var(--accent);font-weight:bold;letter-spacing:0.5px;">⚡ RENDER EN PROCESO</div>
            <div id="studio-active-status" style="font-size:12px;font-weight:600;margin-top:4px;color:var(--text);">${this.activeTask ? this.activeTask.status : ''}</div>
            <div id="studio-active-progress" style="font-size:11px;color:var(--text-dim);margin-top:4px;">${this.activeTask ? this.activeTask.progressText : ''}</div>
          </div>

          <div>
            <div style="font-size:10.5px;font-weight:700;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Historial de Renders & Tomas</div>
            <div id="studio-history-list" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>
        </div>

        <!-- Panel Derecho: Monitor de Video & Panel de Control de Toma -->
        <div class="studio-main" style="display:flex;flex-direction:column;height:100%;padding:16px;overflow-y:auto;background:var(--bg-0);">
          <div id="studio-player-container" style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--bg-1);border-radius:8px;border:1px solid var(--border);min-height:340px;position:relative;overflow:hidden;">
            <div id="studio-empty-state" style="text-align:center;color:var(--text-dim);padding:30px;">
              <div style="font-size:48px;margin-bottom:10px;">🎬</div>
              <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">Monitor de Producción Cinemática</div>
              <div style="font-size:12px;color:var(--text-dim);max-width:440px;margin:0 auto 16px;line-height:1.5;">
                Configura los parámetros cinematográficos (Acción del Actor, Lente 35mm, Iluminación, Movimiento Dolly/Pan) y genera video real mediante tus APIs sin coste adicional.
              </div>
              <button class="btn primary" id="btn-studio-empty-cta" style="padding:8px 18px;font-size:13px;font-weight:600;">+ Configurar y Renderizar Toma</button>
            </div>
          </div>

          <!-- Mensaje / Alerta de Estado o Error de la Toma -->
          <div id="studio-error-box" style="display:none;margin-top:12px;padding:10px 14px;background:rgba(239,90,90,0.12);border:1px solid #ef5a5a;border-radius:6px;font-size:12px;color:#ff8e8e;">
            <strong>⚠️ Reporte de la API:</strong> <span id="studio-error-message"></span>
          </div>

          <!-- Barra de Acciones del Monitor -->
          <div id="studio-actions-bar" style="margin-top:12px;display:none;justify-content:space-between;align-items:center;padding:10px 16px;background:var(--bg-1);border:1px solid var(--border);border-radius:8px;">
            <div id="studio-shot-meta" style="font-size:12px;color:var(--text-dim);"></div>
            <div style="display:flex;gap:8px;">
              <button id="btn-studio-download" class="btn ghost small" style="font-weight:600;">📥 Descargar MP4</button>
              <button id="btn-studio-regen" class="btn primary small" style="font-weight:600;">🔄 Regenerar Toma</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ────────────────────────────────────────────────────────────
  // 📜 VISTA GUION & HISTORIA (SCREENPLAY EDITOR)
  // ────────────────────────────────────────────────────────────
  _renderScriptTab() {
    return `
      <div style="display:grid;grid-template-columns:300px 1fr;height:100%;background:var(--bg-0);">
        <div style="border-right:1px solid var(--border);padding:14px;background:var(--bg-1);display:flex;flex-direction:column;gap:12px;overflow-y:auto;">
          <h3 style="margin:0;font-size:13px;font-weight:700;color:var(--text);">📜 Estructura de la Serie</h3>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="font-size:11px;color:var(--text-dim);">Género / Tono:</label>
            <input id="script-genre" value="${this.project.genre || ''}" placeholder="Ej: Thriller Cyberpunk..." style="background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:6px;border-radius:4px;font-size:12px;" />
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="font-size:11px;color:var(--text-dim);">Sinopsis de la Historia:</label>
            <textarea id="script-synopsis" rows="4" placeholder="Sinopsis general de la serie o película..." style="background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:6px;border-radius:4px;font-size:12px;resize:vertical;">${this.project.synopsis || ''}</textarea>
          </div>
          <button class="btn ghost small" id="btn-save-script-meta" style="margin-top:4px;">💾 Guardar Cambios</button>
        </div>

        <div style="display:flex;flex-direction:column;height:100%;padding:16px;background:var(--bg-0);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-size:13px;font-weight:700;color:var(--text);">Editor de Guion Cinematográfico (Formato Estándar)</div>
            <div style="display:flex;gap:8px;">
              <button class="btn primary small" id="btn-script-to-shot" style="font-weight:600;">🎬 Crear Toma desde Guion</button>
            </div>
          </div>
          <textarea id="script-text-editor" style="flex:1;width:100%;font-family:'Courier New', Courier, monospace;font-size:13.5px;line-height:1.6;padding:16px;background:var(--bg-1);border:1px solid var(--border);color:var(--text);border-radius:6px;resize:none;" placeholder="Escribe tu guion aquí (ESCENA, PERSONAJES, ACCIÓN DEL ACTOR, DIÁLOGOS)...">${this.project.script || ''}</textarea>
        </div>
      </div>
    `;
  }

  // ────────────────────────────────────────────────────────────
  // 🎭 VISTA PERSONAJES & ACTORES
  // ────────────────────────────────────────────────────────────
  _renderCharactersTab() {
    const chars = this.project.characters || [];
    return `
      <div style="display:flex;flex-direction:column;height:100%;padding:16px;overflow-y:auto;background:var(--bg-0);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div>
            <h3 style="margin:0;font-size:14px;font-weight:700;color:var(--text);">🎭 Biblia de Personajes & Actores</h3>
            <p style="margin:2px 0 0;font-size:11.5px;color:var(--text-dim);">Registra la apariencia, vestuario y rasgos de tus personajes para mantener consistencia en cada toma.</p>
          </div>
          <button class="btn primary small" id="btn-add-character" style="font-weight:600;">+ Nuevo Personaje</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:14px;">
          ${chars.map((c, i) => `
            <div class="char-card" style="background:var(--bg-1);border:1px solid var(--border);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;gap:12px;align-items:center;">
                <div style="width:54px;height:54px;border-radius:50%;background:var(--bg-2);border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden;flex-shrink:0;">
                  ${c.imageUrl ? `<img src="${c.imageUrl}" style="width:100%;height:100%;object-fit:cover;" />` : '👤'}
                </div>
                <div style="overflow:hidden;">
                  <div style="font-size:13px;font-weight:700;color:var(--text);">${c.name}</div>
                  <div style="font-size:11px;color:var(--accent);font-weight:600;">${c.role || 'Personaje'}</div>
                </div>
              </div>
              <div style="font-size:11.5px;color:var(--text-dim);line-height:1.4;background:var(--bg-2);padding:8px;border-radius:4px;border:1px solid var(--border);">
                ${c.description}
              </div>
              <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:auto;">
                <button class="btn ghost small btn-char-toma" data-index="${i}" style="font-size:11px;">🎬 Crear Toma con ${c.name}</button>
                <button class="btn ghost small btn-char-del" data-index="${i}" style="font-size:11px;color:#ef5a5a;">✕</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // ────────────────────────────────────────────────────────────
  // 🏛️ VISTA LOCACIONES
  // ────────────────────────────────────────────────────────────
  _renderLocationsTab() {
    const locs = this.project.locations || [];
    return `
      <div style="display:flex;flex-direction:column;height:100%;padding:16px;overflow-y:auto;background:var(--bg-0);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div>
            <h3 style="margin:0;font-size:14px;font-weight:700;color:var(--text);">🏛️ Catálogo de Locaciones & Escenarios</h3>
            <p style="margin:2px 0 0;font-size:11.5px;color:var(--text-dim);">Registra los escenarios donde transcurre la trama para mantener coherencia de ambientación e iluminación.</p>
          </div>
          <button class="btn primary small" id="btn-add-location" style="font-weight:600;">+ Nueva Locación</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:14px;">
          ${locs.map((l, i) => `
            <div class="loc-card" style="background:var(--bg-1);border:1px solid var(--border);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:13px;font-weight:700;color:var(--text);">${l.name}</div>
                <span style="font-size:10px;background:var(--bg-2);padding:2px 6px;border-radius:4px;color:var(--accent);font-weight:600;">${l.type || 'EXTERIOR'}</span>
              </div>
              <div style="font-size:11.5px;color:var(--text-dim);line-height:1.4;background:var(--bg-2);padding:8px;border-radius:4px;border:1px solid var(--border);">
                ${l.description}
              </div>
              <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:auto;">
                <button class="btn ghost small btn-loc-del" data-index="${i}" style="font-size:11px;color:#ef5a5a;">✕ Eliminar</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // ────────────────────────────────────────────────────────────
  // MODAL DIRECTOR ENGINE (CONFIGURADOR AVANZADO DE TOMA)
  // ────────────────────────────────────────────────────────────
  async openGenerateVideoModal({ imageBase64, imageUrl, prompt = "", characterName = "", locationName = "" } = {}) {
    this.currentSourceImage = imageBase64 || imageUrl || null;
    this.currentPrompt = prompt || "";

    const modal = document.getElementById("modal-custom");
    if (!modal) return;

    const availableModels = this.mediaRouter.getModelsForCapability("image_to_video");
    modal.classList.remove("hidden");
    modal.querySelector("#custom-title").textContent = "🎬 Director Engine: Configurar Toma de Video";

    const characters = this.project.characters || [];
    const locations = this.project.locations || [];

    const thumbHtml = this.currentSourceImage
      ? `<img id="cinema-thumb-img" src="${this.currentSourceImage}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Preview" />`
      : `<div id="cinema-dropzone" style="text-align:center;padding:16px;cursor:pointer;">
          <div style="font-size:32px;margin-bottom:6px;">📷</div>
          <div style="font-size:12px;font-weight:600;color:var(--accent);">Subir Imagen de Referencia</div>
          <div style="font-size:10.5px;color:var(--text-dim);margin-top:2px;">Haz clic para seleccionar</div>
         </div>`;

    const body = modal.querySelector("#custom-body");
    body.innerHTML = `
      <div class="cinema-modal-grid" style="display:grid;grid-template-columns:200px 1fr;gap:14px;max-height:65vh;overflow-y:auto;">
        <!-- Columna Izquierda: Imagen / Referencia Visual -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="cinema-thumb-box" style="background:var(--bg-2);border:1px dashed var(--border);border-radius:6px;overflow:hidden;height:180px;display:flex;align-items:center;justify-content:center;position:relative;">
            ${thumbHtml}
          </div>
          <label style="font-size:11px;color:var(--text-dim);">Personaje Asignado:</label>
          <select id="cinema-shot-char" style="background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
            <option value="">-- Sin personaje específico --</option>
            ${characters.map(c => `<option value="${c.name}" ${characterName === c.name ? 'selected' : ''}>${c.name} (${c.role})</option>`).join("")}
          </select>
          <label style="font-size:11px;color:var(--text-dim);">Locación:</label>
          <select id="cinema-shot-loc" style="background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
            <option value="">-- Sin locación específica --</option>
            ${locations.map(l => `<option value="${l.name}" ${locationName === l.name ? 'selected' : ''}>${l.name}</option>`).join("")}
          </select>
        </div>

        <!-- Columna Derecha: Parámetros del Director Cinemático -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <label style="font-size:11px;color:var(--text-dim);font-weight:700;">Acción del Actor / Descripción de la Escena:</label>
          <textarea id="cinema-shot-action" rows="2" placeholder="Ej: Camina a paso lento mirando la lluvia bajo las luces de neón, expresión pensativa y desafiante..." style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:6px;font-size:12px;resize:vertical;">${this.currentPrompt}</textarea>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Tipo de Plano:</label>
              <select id="cinema-shot-framing" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                <option value="Wide shot, full cinematic scene">Plano General (Wide)</option>
                <option value="Medium full shot">Plano Americano (3/4)</option>
                <option value="Medium shot" selected>Plano Medio (Medium)</option>
                <option value="Close-up shot, detailed facial emotion">Primer Plano (Close-up)</option>
                <option value="Extreme close-up shot on eyes and expression">Plano Detalle (Extreme Close-up)</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Lente & Óptica:</label>
              <select id="cinema-shot-lens" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                <option value="35mm anamorphic lens, shallow depth of field" selected>35mm Anamórfico (Cine Sundance)</option>
                <option value="50mm prime lens, beautiful bokeh">50mm F/1.4 (Luz Natural / Bokeh)</option>
                <option value="24mm wide angle lens, deep depth of field">24mm Gran Angular (Inmersivo)</option>
                <option value="85mm portrait telephoto lens">85mm Teleobjetivo (Retrato)</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Movimiento de Cámara:</label>
              <select id="cinema-shot-movement" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                <option value="Smooth slow dolly in forward" selected>Travelling / Dolly Lento Adelante</option>
                <option value="Smooth camera pan right to left">Panorámica Lateral (Pan)</option>
                <option value="Steadicam tracking shot following actor">Steadycam (Seguimiento)</option>
                <option value="Handheld camera with organic micro-movements">Cámara en Mano Orgánica</option>
                <option value="Static tripod shot, subtle atmospheric motion">Cámara Fija (Trípode)</option>
                <option value="Aerial drone cinematic glide">Drone / Vuelo Aéreo</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Iluminación & Atmósfera:</label>
              <select id="cinema-shot-lighting" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                <option value="Natural cinematic lighting, soft shadows" selected>Luz Natural Suave</option>
                <option value="Golden hour sunset warm backlighting">Golden Hour / Atardecer Cálido</option>
                <option value="Cyberpunk neon lighting, cyan and magenta reflections">Neón / Cyberpunk Reflectivo</option>
                <option value="Dramatic chiaroscuro moody lighting">Claroscuro Dramático (Noir)</option>
                <option value="Night ambient moonlight with practical street lamps">Nocturno / Luz de Luna</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Modelo de Video:</label>
              <select id="cinema-model" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                ${availableModels.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Formato / Ratio:</label>
              <select id="cinema-ratio" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                ${Object.values(ASPECT_RATIOS).map(r => `<option value="${r.id}">${r.icon} ${r.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-dim);">Duración:</label>
              <select id="cinema-duration" style="width:100%;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:5px;border-radius:4px;font-size:11.5px;">
                <option value="5">5s (Estándar)</option>
                <option value="10">10s (Extendida)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div id="cinema-status-box" style="margin-top:12px;padding:8px 12px;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;font-size:12px;display:none;">
        <span id="cinema-status-text">Listo</span>
      </div>
    `;

    // Dropzone de imagen
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
    btnGenerate.innerHTML = "▶ RENDERIZAR TOMA";
    btnGenerate.onclick = async () => {
      if (!this.currentSourceImage) {
        showAlert("Por favor selecciona una imagen de origen o haz clic en el recuadro de imagen.", "Imagen Requerida");
        return;
      }

      const selectedModelId = document.getElementById("cinema-model").value;
      const actionText = document.getElementById("cinema-shot-action").value.trim();
      const charVal = document.getElementById("cinema-shot-char").value;
      const locVal = document.getElementById("cinema-shot-loc").value;
      const framing = document.getElementById("cinema-shot-framing").value;
      const lens = document.getElementById("cinema-shot-lens").value;
      const movement = document.getElementById("cinema-shot-movement").value;
      const lighting = document.getElementById("cinema-shot-lighting").value;
      const duration = parseInt(document.getElementById("cinema-duration").value, 10);
      const ratio = document.getElementById("cinema-ratio").value;

      // Construcción del Prompt Cinemático Completo
      let fullPromptParts = [];
      if (charVal) fullPromptParts.push(`Character: ${charVal}`);
      if (locVal) fullPromptParts.push(`Location: ${locVal}`);
      if (actionText) fullPromptParts.push(actionText);
      fullPromptParts.push(framing, lens, movement, lighting, "Kodak Vision3 500T film look, highly detailed 4k cinematic quality");
      const finalPrompt = fullPromptParts.join(", ");

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
        const task = await this.taskManager.createImageToVideoTask({
          providerUrl: resolved.providerUrl,
          apiKey: resolved.key,
          modelObj: resolved.model,
          prompt: finalPrompt,
          sourceImage: this.currentSourceImage,
          duration,
          resolution: "1080p",
          aspectRatio: ratio,
          diskFolder: this.state.diskFolder
        });

        this.activeTask = task;
        modal.classList.add("hidden");
        this.activeTab = "director";
        this.renderStudioView();
      } catch (err) {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = "▶ RENDERIZAR TOMA";
        if (statusText) statusText.textContent = "Error: " + err.message;
        showAlert("Error al iniciar generación: " + err.message, "Fallo de Generación");
      }
    };
    actions.appendChild(btnGenerate);
  }

  renderPlayer(videoUrl, task = {}) {
    const container = document.getElementById("studio-player-container");
    const actionsBar = document.getElementById("studio-actions-bar");
    const shotMeta = document.getElementById("studio-shot-meta");
    const errBox = document.getElementById("studio-error-box");
    if (!container) return;

    if (errBox) errBox.style.display = "none";

    container.innerHTML = `
      <video id="studio-video" controls autoplay loop style="max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,0.5);">
        <source src="${videoUrl}" type="video/mp4">
        Tu navegador no soporta reproducción de video HTML5.
      </video>
    `;

    if (actionsBar) actionsBar.style.display = "flex";
    if (shotMeta) {
      shotMeta.innerHTML = `<strong>Toma:</strong> ${task.id || 'Clip'} &middot; <strong>Formato:</strong> ${task.aspectRatio || '16:9'} &middot; <strong>Duración:</strong> ${task.duration || 5}s`;
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
      list.innerHTML = `<div style="font-size:11.5px;color:var(--text-mute);padding:8px 4px;">No hay tomas generadas aún. Pulsa "+ Crear Toma" para comenzar.</div>`;
      return;
    }

    list.innerHTML = "";
    tasks.forEach(task => {
      const item = document.createElement("div");
      item.className = "studio-history-item";
      item.style.cssText = "padding:10px;background:var(--bg-2);border:1px solid var(--border);border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background 0.15s ease;";
      
      let statusBadge = `<span style="color:var(--text-mute);font-size:11px;">...</span>`;
      if (task.status === TASK_STATUS.COMPLETED) {
        statusBadge = `<span style="color:var(--ok);font-size:11px;font-weight:bold;">✓ Listo</span>`;
      } else if (task.status === TASK_STATUS.FAILED) {
        statusBadge = `<span style="color:#ef5a5a;font-size:11px;font-weight:bold;">❌ Error</span>`;
      }

      item.innerHTML = `
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px;">
          <div style="font-size:12px;font-weight:600;color:var(--text);">${task.id} (${task.duration || 5}s &middot; ${task.aspectRatio || '16:9'})</div>
          <div style="font-size:11px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${task.prompt || 'Sin prompt'}</div>
        </div>
        <div style="flex-shrink:0;">${statusBadge}</div>
      `;

      item.onclick = () => {
        if (task.videoUrl) {
          this.renderPlayer(task.videoUrl, task);
        } else if (task.status === TASK_STATUS.FAILED) {
          const errBox = document.getElementById("studio-error-box");
          const errMsg = document.getElementById("studio-error-message");
          if (errBox && errMsg) {
            errBox.style.display = "block";
            errMsg.textContent = task.error || "La API no pudo generar el video. Verifica tu saldo o configuración de clave.";
          }
        }
      };
      list.appendChild(item);
    });
  }

  _bindEvents(container) {
    // Pestañas de subnavegación
    container.querySelectorAll(".cinema-tab-btn").forEach(btn => {
      btn.onclick = () => {
        this.activeTab = btn.dataset.cinemaTab;
        this.renderStudioView();
      };
    });

    // Título del proyecto
    const projTitleInput = container.querySelector("#cinema-proj-title");
    if (projTitleInput) {
      projTitleInput.onchange = (e) => {
        this.project.title = e.target.value.trim() || "Mi Serie Cinemática";
        this._saveProject();
      };
    }

    // Botones de crear toma
    const triggerShotModal = () => {
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

    const btnTop = container.querySelector("#btn-cinema-new-shot-top");
    if (btnTop) btnTop.onclick = triggerShotModal;

    const btnSide = container.querySelector("#btn-studio-new-shot");
    if (btnSide) btnSide.onclick = triggerShotModal;

    const btnEmpty = container.querySelector("#btn-studio-empty-cta");
    if (btnEmpty) btnEmpty.onclick = triggerShotModal;

    // Guardar Guion
    const scriptEditor = container.querySelector("#script-text-editor");
    if (scriptEditor) {
      scriptEditor.oninput = (e) => {
        this.project.script = e.target.value;
        this._saveProject();
      };
    }

    const btnSaveScript = container.querySelector("#btn-save-script-meta");
    if (btnSaveScript) {
      btnSaveScript.onclick = () => {
        this.project.genre = container.querySelector("#script-genre")?.value || "";
        this.project.synopsis = container.querySelector("#script-synopsis")?.value || "";
        this._saveProject();
        showAlert("Historia y Guion guardados correctamente.", "Guion Guardado");
      };
    }

    // Crear Toma desde Guion
    const btnScriptToShot = container.querySelector("#btn-script-to-shot");
    if (btnScriptToShot) {
      btnScriptToShot.onclick = () => {
        const scriptContent = this.project.script || "";
        this.openGenerateVideoModal({ prompt: scriptContent.slice(0, 150) });
      };
    }

    // Agregar Personaje
    const btnAddChar = container.querySelector("#btn-add-character");
    if (btnAddChar) {
      btnAddChar.onclick = () => {
        const name = prompt("Nombre del personaje:");
        if (!name) return;
        const role = prompt("Rol en la historia (ej: Protagonista, Detective):", "Protagonista");
        const desc = prompt("Descripción física y vestuario:", "30 años, cazadora oscura, mirada desafiante");
        this.project.characters.push({
          id: "char_" + Date.now(),
          name: name.trim(),
          role: role || "Personaje",
          description: desc || "Sin descripción",
          imageUrl: ""
        });
        this._saveProject();
        this.renderStudioView();
      };
    }

    // Botones de personaje
    container.querySelectorAll(".btn-char-del").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        this.project.characters.splice(idx, 1);
        this._saveProject();
        this.renderStudioView();
      };
    });

    container.querySelectorAll(".btn-char-toma").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        const charObj = this.project.characters[idx];
        if (charObj) {
          this.openGenerateVideoModal({
            characterName: charObj.name,
            prompt: `${charObj.name} (${charObj.description})`
          });
        }
      };
    });

    // Agregar Locación
    const btnAddLoc = container.querySelector("#btn-add-location");
    if (btnAddLoc) {
      btnAddLoc.onclick = () => {
        const name = prompt("Nombre de la locación:");
        if (!name) return;
        const type = prompt("Tipo (INT/EXT, ej: EXTERIOR NOCHE):", "EXTERIOR NOCHE");
        const desc = prompt("Descripción del ambiente e iluminación:", "Calle empapada con reflejos de neón y sombras densas");
        this.project.locations.push({
          id: "loc_" + Date.now(),
          name: name.trim(),
          type: type || "EXTERIOR",
          description: desc || "Sin descripción",
          imageUrl: ""
        });
        this._saveProject();
        this.renderStudioView();
      };
    }

    container.querySelectorAll(".btn-loc-del").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        this.project.locations.splice(idx, 1);
        this._saveProject();
        this.renderStudioView();
      };
    });

    // Historial y reproductor inicial
    this.renderHistory();

    const tasks = (this.taskManager && typeof this.taskManager.getTasks === "function") ? this.taskManager.getTasks() : [];
    const lastDone = tasks.find(t => t.status === TASK_STATUS.COMPLETED && t.videoUrl);
    if (lastDone && this.activeTab === "director") {
      this.renderPlayer(lastDone.videoUrl, lastDone);
    }
  }
}
