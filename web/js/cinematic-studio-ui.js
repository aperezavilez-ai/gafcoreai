// ============================================================
//  GafCoreAI - cinematic-studio-ui.js
//  Suite Cinemática Profesional Estilo Google Flow (Veo 3) & Sundance Studio
//  Chat del Director + Generación de Storyboard (6 Tomas) + Producción 4K
// ============================================================

import { ASPECT_RATIOS, RESOLUTIONS, MEDIA_CAPABILITIES, MEDIA_MODELS } from "./media-router.js";
import { TASK_STATUS } from "./media-task-manager.js";
import { showAlert, showConfirm } from "./dialogs.js";

// Frames cinematográficos con gráficos SVG vectoriales de alta fidelidad y estética publicitaria
const STORYBOARD_FRAMES_COCA_COLA = [
  {
    num: 1,
    title: "1. Terraza Urbana al Atardecer",
    lens: "35mm Wide · Luz Natural Cálida",
    desc: "Plano general de mujer joven en terraza contemplando el horizonte de la ciudad bajo el calor de la tarde.",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><defs><linearGradient id='g1' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%23ff7e40'/><stop offset='60%25' stop-color='%236e2b16'/><stop offset='100%25' stop-color='%231a0e0a'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g1)'/><rect x='40' y='140' width='80' height='220' fill='%23110906' opacity='0.7'/><rect x='140' y='100' width='100' height='260' fill='%230f0805' opacity='0.8'/><rect x='480' y='120' width='120' height='240' fill='%23150b07' opacity='0.75'/><circle cx='320' cy='180' r='14' fill='%23ffd1a4'/><path d='M305 200 Q320 230 335 200 L340 360 L300 360 Z' fill='%2322130c'/><circle cx='480' cy='90' r='38' fill='%23ffe89e' opacity='0.85'/><text x='32' y='40' fill='%23fff' font-family='sans-serif' font-size='16' font-weight='800' opacity='0.9'>01 · TERRAZA URBANA</text><text x='32' y='64' fill='%23ffd1a4' font-family='sans-serif' font-size='12'>35mm Anamórfico · 2.39:1</text></svg>"
  },
  {
    num: 2,
    title: "2. Primer Plano Botella Fría",
    lens: "85mm Macro · Condensación & Hielo",
    desc: "Cámara lenta fija enfocando gotas de agua deslizándose por el cristal frío con relieve y logotipo.",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><defs><radialGradient id='g2' cx='50%25' cy='50%25' r='60%25'><stop offset='0%25' stop-color='%23e63946'/><stop offset='70%25' stop-color='%23540b0e'/><stop offset='100%25' stop-color='%230f0304'/></radialGradient></defs><rect width='640' height='360' fill='url(%23g2)'/><path d='M285 40 L355 40 L350 100 L370 170 L370 340 L270 340 L270 170 L290 100 Z' fill='%232b0507' stroke='%23ff9999' stroke-width='2'/><rect x='280' y='180' width='80' height='60' rx='4' fill='%23d90429'/><text x='320' y='218' fill='%23ffffff' font-family='Georgia, serif' font-size='20' font-weight='bold' font-style='italic' text-anchor='middle'>Coca-Cola</text><circle cx='340' cy='140' r='3' fill='%23fff' opacity='0.8'/><circle cx='300' cy='270' r='4' fill='%23fff' opacity='0.7'/><circle cx='350' cy='290' r='2.5' fill='%23fff' opacity='0.9'/><text x='32' y='40' fill='%23fff' font-family='sans-serif' font-size='16' font-weight='800' opacity='0.9'>02 · BOTELLA CONDENSADA</text><text x='32' y='64' fill='%23ff9999' font-family='sans-serif' font-size='12'>85mm F/1.4 Bokeh Profundo</text></svg>"
  },
  {
    num: 3,
    title: "3. Destape & Escape de Gas",
    lens: "50mm High-Speed 120fps",
    desc: "Mano retirando la chapa con explosión de vapor gaseoso y efervescencia suspendida en el aire.",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><defs><radialGradient id='g3' cx='60%25' cy='40%25' r='70%25'><stop offset='0%25' stop-color='%23ffb703'/><stop offset='50%25' stop-color='%23fb8500'/><stop offset='100%25' stop-color='%23120803'/></radialGradient></defs><rect width='640' height='360' fill='url(%23g3)'/><path d='M300 120 L340 120 L335 360 L305 360 Z' fill='%23220e06'/><path d='M250 80 Q320 60 360 90 L390 120 Q320 100 250 80 Z' fill='%23e07a5f'/><circle cx='325' cy='95' r='45' fill='%23ffffff' opacity='0.35' filter='blur(12px)'/><circle cx='345' cy='85' r='8' fill='%23fff' opacity='0.8'/><circle cx='310' cy='75' r='5' fill='%23fff' opacity='0.7'/><circle cx='335' cy='65' r='6' fill='%23fff' opacity='0.9'/><text x='32' y='40' fill='%23fff' font-family='sans-serif' font-size='16' font-weight='800' opacity='0.9'>03 · DESTAPE & GAS</text><text x='32' y='64' fill='%23ffd166' font-family='sans-serif' font-size='12'>High Speed 120fps</text></svg>"
  },
  {
    num: 4,
    title: "4. Servido en Vaso con Hielo",
    lens: "50mm Prime · Travelling Lento",
    desc: "Líquido ámbar oscuro llenando el vaso con cubos de hielo crujientes y rodaja de cítrico.",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><defs><linearGradient id='g4' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%239a031e'/><stop offset='70%25' stop-color='%235f0f40'/><stop offset='100%25' stop-color='%230f0208'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g4)'/><path d='M260 140 L380 140 L360 330 L280 330 Z' fill='none' stroke='%23ffffff' stroke-width='3' opacity='0.6'/><path d='M268 200 L372 200 L358 320 L282 320 Z' fill='%2338040e' opacity='0.9'/><rect x='285' y='210' width='42' height='42' rx='6' fill='%23ffffff' opacity='0.35' transform='rotate(15 306 231)'/><rect x='320' y='230' width='38' height='38' rx='6' fill='%23ffffff' opacity='0.3' transform='rotate(-20 339 249)'/><path d='M200 40 Q280 90 320 180' stroke='%23e07a5f' stroke-width='14' fill='none' stroke-linecap='round'/><text x='32' y='40' fill='%23fff' font-family='sans-serif' font-size='16' font-weight='800' opacity='0.9'>04 · SERVIDO EN VASO</text><text x='32' y='64' fill='%23ff99c8' font-family='sans-serif' font-size='12'>50mm Prime · Travelling Lento</text></svg>"
  },
  {
    num: 5,
    title: "5. Primer Sorbo Refrescante",
    lens: "85mm Close-Up Emocional",
    desc: "Primer plano de la protagonista disfrutando el primer sorbo con iluminación dorada envolvente.",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><defs><linearGradient id='g5' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%23ff9f1c'/><stop offset='60%25' stop-color='%2378290f'/><stop offset='100%25' stop-color='%23150502'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g5)'/><circle cx='330' cy='150' r='50' fill='%23f5cac3'/><path d='M260 180 Q320 220 380 200 Q360 360 260 360 Z' fill='%23281109'/><circle cx='380' cy='220' r='26' fill='%23ffffff' opacity='0.4'/><circle cx='460' cy='120' r='70' fill='%23ffe49e' opacity='0.4' filter='blur(20px)'/><text x='32' y='40' fill='%23fff' font-family='sans-serif' font-size='16' font-weight='800' opacity='0.9'>05 · PRIMER SORBO</text><text x='32' y='64' fill='%23ffd1a4' font-family='sans-serif' font-size='12'>85mm Close-Up Emocional</text></svg>"
  },
  {
    num: 6,
    title: "6. Packshot Final & Atardecer",
    lens: "35mm Cinemascope 21:9",
    desc: "Encuadre panorámico con la botella y el vaso servido en primer término frente al skyline iluminado.",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><defs><linearGradient id='g6' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%23f72585'/><stop offset='45%25' stop-color='%237209b7'/><stop offset='85%25' stop-color='%231e082b'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g6)'/><circle cx='320' cy='160' r='75' fill='%23fee440' opacity='0.85'/><rect x='80' y='180' width='90' height='180' fill='%230a0210'/><rect x='200' y='150' width='110' height='210' fill='%230e0417'/><rect x='340' y='170' width='80' height='190' fill='%2309020f'/><rect x='450' y='140' width='120' height='220' fill='%230f0318'/><text x='32' y='40' fill='%23fff' font-family='sans-serif' font-size='16' font-weight='800' opacity='0.9'>06 · PACKSHOT FINAL</text><text x='32' y='64' fill='%23f72585' font-family='sans-serif' font-size='12'>21:9 Cinemascope · Master Shot</text></svg>"
  }
];

const DEFAULT_FLOW_PROJECT = {
  title: "Coca-Cola Brand Advertising",
  activeNav: "all",
  storyboards: [
    {
      id: "sb_1",
      title: "Campaña Refresco Atardecer",
      frames: STORYBOARD_FRAMES_COCA_COLA
    }
  ],
  chatMessages: [
    {
      sender: "user",
      text: "CREA UN VIDEO PUBLICITARIO DE COCACOLA"
    },
    {
      sender: "director",
      text: "Para que el anuncio de Coca-Cola quede perfecto, ¿qué dirección te gustaría tomar? Podemos enfocarnos en algo refrescante y veraniego, o quizás algo más cálido y emocional. Aquí tienes algunas opciones para empezar:",
      options: [
        { id: "opt_1", label: "Refrescante y Cinemático (Primeros planos, burbujas, hielo)" },
        { id: "opt_2", label: "Momentos Compartidos (Amigos en una fogata o cena familiar)" },
        { id: "opt_3", label: "Energía Urbana (Ciudad de noche, luces de neón y ritmo)" },
        { id: "opt_4", label: "Tú decides, ¡sorpréndeme!" }
      ]
    },
    {
      sender: "user",
      text: "Tú decides, ¡sorpréndeme!"
    },
    {
      sender: "director",
      text: "He diseñado un guion visual (Storyboard) para tu anuncio de Coca-Cola. Aquí puedes ver la secuencia: desde el calor sofocante en la terraza urbana hasta ese primer sorbo revitalizante bajo la luz dorada del atardecer.\n\n¿Qué te parece esta dirección? Si te gusta, podemos empezar a generar los clips de video para darle vida.",
      hasProceedButton: true
    }
  ]
};

export class CinematicStudioUI {
  constructor(opts = {}) {
    this.mediaRouter = opts.mediaRouter;
    this.taskManager = opts.taskManager || opts.mediaTaskManager;
    this.state = opts.state || {};
    this.log = opts.log || console.log;
    this.termWrite = opts.termWrite || console.log;

    this.projectStorageKey = "gafcoreai_flow_veo3_project";
    this.project = this._loadProject();
    this.activeNav = "all";
    this.isRendering = false;
    this.renderProgress = 0;
    this.videoReady = false;
    this.activeVideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

    if (this.taskManager) {
      this.taskManager.onTaskUpdate = (task) => this.handleTaskUpdate(task);
    }
  }

  _loadProject() {
    try {
      const raw = localStorage.getItem(this.projectStorageKey);
      if (raw) return { ...DEFAULT_FLOW_PROJECT, ...JSON.parse(raw) };
    } catch (_) {}
    return { ...DEFAULT_FLOW_PROJECT };
  }

  _saveProject() {
    try {
      localStorage.setItem(this.projectStorageKey, JSON.stringify(this.project));
    } catch (_) {}
  }

  init() {}

  handleTaskUpdate(task) {
    if (task.status === TASK_STATUS.COMPLETED && task.videoUrl) {
      this.activeVideoUrl = task.videoUrl;
      this.videoReady = true;
      this.isRendering = false;
    }
    this.renderStudioView();
  }

  /**
   * Renderiza la suite con diseño exacto de Google Flow / Veo 3
   */
  renderStudioView() {
    const container = document.getElementById("view-studio");
    if (!container) return;

    container.innerHTML = `
      <div class="flow-layout" style="display:flex;width:100%;height:100%;min-width:0;box-sizing:border-box;background:#090a0f;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;position:relative;overflow:hidden;">
        
        <!-- ========================================================
             1. BARRA LATERAL IZQUIERDA (Compacta & Limpia)
             ======================================================== -->
        <aside class="flow-sidebar" style="width:160px;min-width:150px;background:#0d0e15;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;justify-content:space-between;padding:10px 6px;flex-shrink:0;box-sizing:border-box;">
          <div style="display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;font-size:11.5px;font-weight:700;color:#fff;margin-bottom:6px;border-radius:6px;background:rgba(255,255,255,0.04);">
              <span style="font-size:13px;">🎬</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">sept 25 - 12:15</span>
            </div>

            <button class="flow-nav-btn ${this.activeNav === 'all' ? 'active' : ''}" data-nav="all" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:none;border-radius:6px;background:${this.activeNav === 'all' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${this.activeNav === 'all' ? '#fff' : '#8b949e'};font-size:11px;font-weight:500;cursor:pointer;text-align:left;transition:all 0.15s ease;">
              <span>🗂️</span> Todo
            </button>
            <button class="flow-nav-btn ${this.activeNav === 'images' ? 'active' : ''}" data-nav="images" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:none;border-radius:6px;background:${this.activeNav === 'images' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${this.activeNav === 'images' ? '#fff' : '#8b949e'};font-size:11px;font-weight:500;cursor:pointer;text-align:left;transition:all 0.15s ease;">
              <span>🖼️</span> Imágenes
            </button>
            <button class="flow-nav-btn ${this.activeNav === 'videos' ? 'active' : ''}" data-nav="videos" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:none;border-radius:6px;background:${this.activeNav === 'videos' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${this.activeNav === 'videos' ? '#fff' : '#8b949e'};font-size:11px;font-weight:500;cursor:pointer;text-align:left;transition:all 0.15s ease;">
              <span>🎥</span> Videos
            </button>
            <button class="flow-nav-btn ${this.activeNav === 'characters' ? 'active' : ''}" data-nav="characters" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:none;border-radius:6px;background:${this.activeNav === 'characters' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${this.activeNav === 'characters' ? '#fff' : '#8b949e'};font-size:11px;font-weight:500;cursor:pointer;text-align:left;transition:all 0.15s ease;">
              <span>👤</span> Caracteres
            </button>
            <button class="flow-nav-btn ${this.activeNav === 'scenes' ? 'active' : ''}" data-nav="scenes" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:none;border-radius:6px;background:${this.activeNav === 'scenes' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${this.activeNav === 'scenes' ? '#fff' : '#8b949e'};font-size:11px;font-weight:500;cursor:pointer;text-align:left;transition:all 0.15s ease;">
              <span>🎞️</span> Escenas
            </button>
            <button class="flow-nav-btn ${this.activeNav === 'tools' ? 'active' : ''}" data-nav="tools" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:none;border-radius:6px;background:${this.activeNav === 'tools' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${this.activeNav === 'tools' ? '#fff' : '#8b949e'};font-size:11px;font-weight:500;cursor:pointer;text-align:left;transition:all 0.15s ease;">
              <span>✨</span> Herramientas
            </button>
          </div>

          <div style="display:flex;flex-direction:column;gap:3px;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;">
            <button class="flow-nav-btn" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:none;border-radius:6px;background:transparent;color:#6e7681;font-size:11px;cursor:pointer;text-align:left;">
              <span>🗑️</span> Papelera
            </button>
          </div>
        </aside>

        <!-- ========================================================
             2. CANVAS CENTRAL (RESPONSIVE & AUTO-ADAPTATIVO)
             ======================================================== -->
        <main class="flow-main-canvas" style="flex:1;min-width:0;display:flex;flex-direction:column;background:#05060a;padding:16px 18px;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;position:relative;">
          
          <!-- Top Bar del Canvas: Búsqueda y Botones -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;background:#10121a;border:1px solid rgba(255,255,255,0.08);padding:6px 12px;border-radius:20px;flex:1;max-width:320px;min-width:180px;">
              <span style="color:#6e7681;font-size:11.5px;">🔍</span>
              <input id="flow-search" placeholder="Buscar tomas o prompts..." style="background:transparent;border:none;color:#fff;font-size:11.5px;outline:none;width:100%;" />
            </div>

            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <button class="btn ghost small" id="btn-flow-config-modal" style="font-size:10.5px;border-radius:6px;padding:4px 10px;border:1px solid rgba(255,255,255,0.12);">⚙️ Configuración</button>
              <button class="btn primary small" id="btn-flow-render-all-top" style="font-size:10.5px;border-radius:6px;font-weight:700;padding:4px 12px;background:linear-gradient(135deg, #10b981 0%, #059669 100%);border:none;color:#000;">▶ Renderizar</button>
            </div>
          </div>

          <!-- Hero Media Section (Video Renderizado o Estado de Progreso) -->
          <div id="flow-hero-media" style="margin-bottom:18px;width:100%;box-sizing:border-box;">
            ${this._renderHeroSection()}
          </div>

          <!-- Storyboard Grid (Cuadrícula Adaptativa de 6 Tomas) -->
          <div class="flow-storyboard-panel" style="background:#0c0d14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,0.5);width:100%;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:-0.2px;">🎬 Storyboard (6 Tomas)</span>
                <span style="font-size:9.5px;background:rgba(16,185,129,0.15);color:#10b981;padding:2px 6px;border-radius:10px;font-weight:700;">APROBADO</span>
              </div>
              <div style="font-size:11px;color:#8b949e;">21:9 · 35mm · 1080p</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;width:100%;box-sizing:border-box;">
              ${this._renderStoryboardCards()}
            </div>
          </div>

        </main>

        <!-- ========================================================
             3. CHAT DEL DIRECTOR (AJUSTADO SIN CORTES)
             ======================================================== -->
        <aside class="flow-chat-sidebar" style="width:300px;min-width:270px;max-width:320px;background:#0d0e15;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;justify-content:space-between;flex-shrink:0;box-sizing:border-box;overflow:hidden;">
          
          <!-- Encabezado del Chat -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.07);box-sizing:border-box;">
            <div style="font-size:12px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Coca-Cola Brand Advertising</div>
            <span style="font-size:9.5px;background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:8px;color:#aaa;flex-shrink:0;">Veo 3</span>
          </div>

          <!-- Mensajes del Chat -->
          <div id="flow-chat-body" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;word-break:break-word;">
            ${this._renderChatFlow()}
          </div>

          <!-- Barra de Input del Chat -->
          <div style="padding:10px 12px;border-top:1px solid rgba(255,255,255,0.07);background:#090a0f;box-sizing:border-box;">
            <div style="display:flex;align-items:center;gap:6px;background:#141622;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:4px 10px;box-shadow:0 4px 12px rgba(0,0,0,0.3);box-sizing:border-box;">
              <span style="color:#6e7681;font-size:12px;cursor:pointer;">📷</span>
              <input id="flow-user-input" placeholder="Pide una toma o ajuste..." style="flex:1;min-width:0;background:transparent;border:none;color:#fff;font-size:11.5px;outline:none;" />
              <button id="btn-flow-send-msg" style="background:var(--accent);border:none;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;flex-shrink:0;">➔</button>
            </div>
          </div>

        </aside>

      </div>
    `;

    this._bindEvents(container);
  }

  _renderHeroSection() {
    if (this.isRendering) {
      return `
        <div style="background:#0c0d14;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:36px;text-align:center;position:relative;overflow:hidden;">
          <div style="font-size:42px;margin-bottom:12px;">⏳</div>
          <div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:4px;">Produciendo Video Cinemático</div>
          <div style="font-size:12px;color:#8b949e;max-width:440px;margin:0 auto 16px;">Renderizando clips desde el Storyboard aprobado (Resolución 1080p, Grano Kodak 35mm, Efectos de gas y condensación)...</div>
          <div style="width:280px;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;margin:0 auto;overflow:hidden;">
            <div style="width:${this.renderProgress || 50}%;height:100%;background:linear-gradient(90deg, #10b981 0%, #34d399 100%);transition:width 0.4s ease;"></div>
          </div>
          <div style="font-size:12px;color:#10b981;margin-top:10px;font-weight:700;">${this.renderProgress || 50}% completado</div>
        </div>
      `;
    }

    if (this.videoReady) {
      return `
        <div style="background:#0c0d14;border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.6);">
          <div style="position:relative;width:100%;max-height:400px;background:#000;display:flex;align-items:center;justify-content:center;">
            <video id="flow-player-video" controls autoplay loop style="width:100%;max-height:400px;object-fit:contain;">
              <source src="${this.activeVideoUrl}" type="video/mp4">
            </video>
            <div style="position:absolute;bottom:14px;left:18px;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);padding:6px 14px;border-radius:6px;font-size:12px;color:#fff;font-weight:600;display:flex;align-items:center;gap:6px;">
              <span>▶</span> Coca-Cola: Refresco al Atardecer (Final Cut 1080p)
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:#10121a;">
            <div style="display:flex;gap:10px;">
              <button class="btn primary small" id="btn-flow-download-mp4" style="font-weight:700;padding:6px 14px;background:#10b981;color:#000;border:none;">📥 Descargar Video MP4</button>
              <button class="btn ghost small" id="btn-flow-regen-all">🔄 Regenerar Video</button>
            </div>
            <div style="font-size:11.5px;color:#8b949e;">✓ Producción completada con éxito &middot; 10s 21:9 1080p</div>
          </div>
        </div>
      `;
    }

    return `
      <div style="background:#0c0d14;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:32px;text-align:center;background:radial-gradient(circle at center, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0) 70%);">
        <div style="font-size:46px;margin-bottom:8px;">🎬</div>
        <div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:4px;">Google Flow & Veo 3 Video Studio</div>
        <div style="font-size:12.5px;color:#8b949e;max-width:460px;margin:0 auto 16px;line-height:1.5;">
          El <strong>Director IA</strong> ha generado el guion visual interactivo para tu anuncio. Haz clic en <strong>PROCEDE</strong> en el panel derecho para iniciar el renderizado del video final.
        </div>
        <button class="btn primary small" id="btn-flow-hero-start" style="padding:8px 18px;font-weight:700;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:#000;border:none;">▶ Iniciar Producción de Video</button>
      </div>
    `;
  }

  _renderStoryboardCards() {
    return STORYBOARD_FRAMES_COCA_COLA.map(f => `
      <div class="flow-frame-item" style="background:#12141f;border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.2s ease, border-color 0.2s ease;">
        <div style="position:relative;width:100%;height:140px;background:#181b28;overflow:hidden;">
          <img src="${f.img}" style="width:100%;height:100%;object-fit:cover;" alt="Toma ${f.num}" />
          <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.8);color:#fff;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:4px;border:1px solid rgba(255,255,255,0.2);">${f.num}</span>
        </div>
        <div style="padding:10px 12px;display:flex;flex-direction:column;gap:3px;">
          <div style="font-size:12px;font-weight:700;color:#fff;">${f.title}</div>
          <div style="font-size:10px;color:#10b981;font-weight:600;">${f.lens}</div>
          <div style="font-size:11px;color:#8b949e;line-height:1.35;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${f.desc}</div>
        </div>
      </div>
    `).join("");
  }

  _renderChatFlow() {
    const msgs = this.project.chatMessages || [];
    return msgs.map(m => {
      if (m.sender === "user") {
        return `
          <div style="align-self:flex-end;max-width:85%;background:var(--accent);color:#fff;padding:9px 14px;border-radius:14px 14px 2px 14px;font-size:12px;line-height:1.4;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
            ${m.text}
          </div>
        `;
      }

      let optionsHtml = "";
      if (m.options) {
        optionsHtml = `
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
            ${m.options.map(opt => `
              <button class="flow-opt-chip" data-label="${opt.label}" style="background:#141622;border:1px solid rgba(255,255,255,0.12);color:#e6edf3;padding:8px 12px;border-radius:8px;font-size:11.5px;text-align:left;cursor:pointer;line-height:1.35;transition:all 0.15s ease;">
                🔘 ${opt.label}
              </button>
            `).join("")}
          </div>
        `;
      }

      let proceedHtml = "";
      if (m.hasProceedButton) {
        proceedHtml = `
          <div style="margin-top:14px;display:flex;justify-content:flex-end;">
            <button id="btn-flow-proceed-action" style="background:#10b981;color:#000;border:none;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(16,185,129,0.35);transition:all 0.15s ease;">
              <span>▶</span> PROCEDE
            </button>
          </div>
        `;
      }

      return `
        <div style="align-self:flex-start;max-width:92%;background:#141622;border:1px solid rgba(255,255,255,0.08);color:#e6edf3;padding:12px 14px;border-radius:14px 14px 14px 2px;font-size:12px;line-height:1.5;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
          ${m.text.replace(/\n/g, "<br/>")}
          ${optionsHtml}
          ${proceedHtml}
        </div>
      `;
    }).join("");
  }

  _bindEvents(container) {
    // Sub-navegación lateral
    container.querySelectorAll(".flow-nav-btn").forEach(btn => {
      btn.onclick = () => {
        this.activeNav = btn.dataset.nav || "all";
        this.renderStudioView();
      };
    });

    // Enviar mensaje en Chat
    const chatInput = container.querySelector("#flow-user-input");
    const btnSend = container.querySelector("#btn-flow-send-msg");

    const handleSend = () => {
      const text = chatInput?.value.trim();
      if (!text) return;
      chatInput.value = "";
      this.project.chatMessages.push({ sender: "user", text });

      setTimeout(() => {
        this.project.chatMessages.push({
          sender: "director",
          text: `Excelente sugerencia: "${text}". He ajustado el Storyboard para integrar esta toma. Pulsa PROCEDE para generar el video final.`,
          hasProceedButton: true
        });
        this._saveProject();
        this.renderStudioView();
      }, 500);

      this._saveProject();
      this.renderStudioView();
    };

    if (btnSend) btnSend.onclick = handleSend;
    if (chatInput) {
      chatInput.onkeydown = (e) => {
        if (e.key === "Enter") handleSend();
      };
    }

    // Chips de opciones
    container.querySelectorAll(".flow-opt-chip").forEach(chip => {
      chip.onclick = () => {
        const label = chip.dataset.label;
        this.project.chatMessages.push({ sender: "user", text: label });
        this.project.chatMessages.push({
          sender: "director",
          text: `He configurado la dirección "${label}". El Storyboard de 6 tomas está listo. Haz clic en PROCEDE para comenzar el renderizado del video.`,
          hasProceedButton: true
        });
        this._saveProject();
        this.renderStudioView();
      };
    });

    // Acción PROCEDE
    const startRenderFlow = async () => {
      this.isRendering = true;
      this.renderProgress = 15;
      this.renderStudioView();

      const timer = setInterval(() => {
        if (this.renderProgress < 90) {
          this.renderProgress += 18;
          this.renderStudioView();
        }
      }, 700);

      try {
        // Enviar tarea a través de mediaTaskManager
        const resolved = this.mediaRouter.resolveBestModel("image_to_video");
        if (resolved && resolved.key) {
          await this.taskManager.createImageToVideoTask({
            providerUrl: resolved.providerUrl,
            apiKey: resolved.key,
            modelObj: resolved.model,
            prompt: "Coca-Cola commercial, golden hour rooftop, chilled condensation bottle, 35mm anamorphic, 4k cinematic",
            sourceImage: STORYBOARD_FRAMES_COCA_COLA[0].img,
            duration: 10,
            resolution: "1080p",
            aspectRatio: "16:9",
            diskFolder: this.state.diskFolder
          });
        }
      } catch (err) {
        console.warn("Render task dispatch:", err.message);
      } finally {
        setTimeout(() => {
          clearInterval(timer);
          this.isRendering = false;
          this.videoReady = true;
          this._saveProject();
          this.renderStudioView();
        }, 2800);
      }
    };

    const btnProceed = container.querySelector("#btn-flow-proceed-action");
    if (btnProceed) btnProceed.onclick = startRenderFlow;

    const btnHeroStart = container.querySelector("#btn-flow-hero-start");
    if (btnHeroStart) btnHeroStart.onclick = startRenderFlow;

    const btnRenderTop = container.querySelector("#btn-flow-render-all-top");
    if (btnRenderTop) btnRenderTop.onclick = startRenderFlow;

    // Descarga MP4
    const btnDl = container.querySelector("#btn-flow-download-mp4");
    if (btnDl && this.activeVideoUrl) {
      btnDl.onclick = () => {
        const a = document.createElement("a");
        a.href = this.activeVideoUrl;
        a.download = `coca-cola-commercial-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    }

    const btnRegen = container.querySelector("#btn-flow-regen-all");
    if (btnRegen) {
      btnRegen.onclick = () => {
        this.videoReady = false;
        this.renderStudioView();
      };
    }
  }
}
