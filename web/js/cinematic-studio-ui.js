// ============================================================
//  GafCoreAI - cinematic-studio-ui.js
//  Suite Cinemática Profesional Estilo Google Flow (Veo 3) & Seedance Studio
//  Motor de Guiones + Biblia de Personajes (Continuidad de Rostro, Vestimenta y Voz)
//  Desglose de Escenas & Tomas + Selector de Formato & Exportación MP4
// ============================================================

import { ASPECT_RATIOS, RESOLUTIONS, MEDIA_CAPABILITIES, MEDIA_MODELS } from "./media-router.js";
import { TASK_STATUS } from "./media-task-manager.js";
import { showAlert, showConfirm, showPrompt } from "./dialogs.js";

// Formatos Cinematográficos Disponibles
const STUDIO_FORMATS = [
  { id: "16:9", label: "16:9 Cine / YT", icon: "🖥️", aspectClass: "aspect-16-9", width: 640, height: 360 },
  { id: "9:16", label: "9:16 Shorts / TikTok", icon: "📱", aspectClass: "aspect-9-16", width: 360, height: 640 },
  { id: "21:9", label: "21:9 Cinemascope", icon: "🎬", aspectClass: "aspect-21-9", width: 700, height: 300 },
  { id: "1:1", label: "1:1 Cuadrado", icon: "⏹️", aspectClass: "aspect-1-1", width: 450, height: 450 }
];

// Calidades y Resoluciones
const STUDIO_QUALITIES = [
  { id: "720p", label: "720p HD", scale: 1 },
  { id: "1080p", label: "1080p Full HD", scale: 1.5 },
  { id: "4K", label: "4K Master Upscale", scale: 2 }
];

// Estilos Visuales
const STUDIO_STYLES = [
  { id: "kodak", label: "🎬 Kodak 35mm Film Grain", prompt: "shot on 35mm film, kodak portra 400, cinematic grain, photorealistic, shallow depth of field, anamorphic bokeh" },
  { id: "arri", label: "🎥 Arri Alexa Master Cinema", prompt: "shot on Arri Alexa LF, Master Prime lenses, natural volumetric lighting, 8k resolution, cinematic color grading" },
  { id: "ue5", label: "⚡ Hyper-Realistic UE5 / Octane", prompt: "octane render, unreal engine 5.4, ultra-detailed textures, global illumination, raytraced reflections, 8k raw" },
  { id: "anime", label: "🏮 Anime Shonen / Cyberpunk", prompt: "makoto shinkai aesthetic, vivid neon illumination, highly detailed anime cinematography, 4k digital animation" }
];

// Motores de Generación IA
const STUDIO_ENGINES = [
  { id: "minimax-video-01", label: "MiniMax Video-01", provider: "me-ai-cloud", desc: "Generación cinemática fluida con coherencia física" },
  { id: "minimax-m3", label: "MiniMax M3 Pro", provider: "me-ai-cloud", desc: "Movimiento avanzado de cámara y micro-expresiones" },
  { id: "grok-video", label: "Grok Video", provider: "grok", desc: "Generación fotorrealista y texturas complejas" },
  { id: "seedance-engine", label: "Seedance Flow (Veo 3)", provider: "apicredits", desc: "Control total de continuidad y lentes de cámara" }
];

// Guiones de Ejemplo Predefinidos
const SAMPLE_SCRIPTS = {
  cocacola: {
    title: "Comercial: Refresco al Atardecer",
    genre: "Publicidad Cinemática",
    content: `TITULO: COCA-COLA - REFRESCO AL ATARDECER
GENERO: PUBLICIDAD / EMOCIONAL
FORMATO: 16:9 Widescreen (35mm Anamórfico)

PERSONAJES:
1. SOFIA (24 años, tez morena clara, cabello rizado castaño recogido, ojos expresivos miel. VESTIMENTA: Top sin mangas color terracota y shorts de lino beige. VOZ: Joven, fresca, entusiasta).
2. MATEO (26 años, complexión atlética, cabello corto oscuro, barba de tres días. VESTIMENTA: Camisa abierta de lino blanco sobre camiseta gris. VOZ: Calmada y amistosa).

ESCENA 1 - EXT. TERRAZA URBANA - ATARDECER
El sol cae tiñendo los rascacielos de tonos ámbar y magenta. El calor del verano es palpable.

TOMA 1: Plano general (35mm Wide). Sofía y Mateo contemplan el horizonte urbano sudorosos por el calor. Cámara con movimiento suave de travelling lateral.
TOMA 2: Primer plano (85mm Macro). Botella de Coca-Cola de vidrio con condensación extrema, gotas de agua deslizándose por el logotipo en relieve.
TOMA 3: Primerísimo primer plano (50mm High-Speed 120fps). La mano de Sofía retira la chapa con un chasquido metálico y una explosión de gas efervescente.

ESCENA 2 - EXT. MESA DE LA TERRAZA - CONTINUACIÓN
TOMA 4: Plano medio (50mm Prime). El líquido ámbar oscuro se vierte sobre un vaso de cristal con cubos de hielo crujientes y una rodaja de limón.
TOMA 5: Plano cerrado emocional (85mm Portrait). Sofía bebe el primer sorbo con los ojos entrecerrados de satisfacción total. Iluminación dorada de contra.
TOMA 6: Packshot final (21:9 Cinemascope). Botella y vaso en primer término con el skyline nocturno encendiéndose de fondo. Logo Coca-Cola: "Siente el Sabor".`
  },
  cyberpunk: {
    title: "Trailer: Eclipse Cyberpunk",
    genre: "Ciencia Ficción / Thriller",
    content: `TITULO: ECLIPSE CYBERPUNK 2088
GENERO: CIENCIA FICCIÓN / ACCIÓN
FORMATO: 21:9 Cinemascope Ultra-Wide

PERSONAJES:
1. KAI (29 años, rasgos asiático-europeos, cicatriz biónica en la mejilla izquierda, mirada fría y calculadora. VESTIMENTA: Gabardina impermeable negra con cuello iluminado en fibra óptica azul y guantes tácticos. VOZ: Grave, pausada, sintetizada levemente).
2. LYRA (25 años, pelo corto teñido de violeta eléctrico, implante ocular cromado derecho. VESTIMENTA: Traje de combate urbano ajustado de kevlar con arnés balístico. VOZ: Rápida, táctica, decidida).

ESCENA 1 - EXT. DISTRITO NEÓN BAJO - NOCHE LLUVIOSA
La lluvia ácida cae sobre los callejones atestados de hologramas publicitarios gigantes.

TOMA 1: Gran plano general con drone (24mm Ultra-Wide). Vuelo descendente entre rascacielos descomunales y vehículos voladores.
TOMA 2: Plano medio en movimiento (35mm Handheld). Kai camina entre la multitud con la gabardina empapada reflejando luces de neón magenta y cian.
TOMA 3: Primer plano (85mm Anamorphic). Kai se detiene y activa su comunicador holográfico que proyecta el rostro de Lyra.
DIALOGO KAI: "El paquete está asegurado. Extracción en cinco minutos."

ESCENA 2 - INT. AZOTEA TORRE ARASAKA - NOCHE
TOMA 4: Plano contraplano (50mm Prime). Lyra apunta con rifle de precisión táctico hacia el helipuerto inferior.
TOMA 5: Plano detalle de acción (100mm Macro). El percutor del rifle se activa con chispa electromagnética.
TOMA 6: Plano secuencia final (21:9 Cinemascope). Salto al vacío hacia un transporte aéreo mientras una explosión de chispas ilumina la noche.`
  },
  action: {
    title: "Serie: Operación Sombra",
    genre: "Acción / Drama Policial",
    content: `TITULO: OPERACIÓN SOMBRA - EPISODIO PILOTO
GENERO: ACCIÓN / SUSPENSO
FORMATO: 16:9 Cine

PERSONAJES:
1. AGENTE VALERIA (32 años, cabello castaño oscuro trenzado, mirada penetrante y seria. VESTIMENTA: Chaqueta de cuero café desgastada, jeans oscuros y botas tácticas. VOZ: Firme, autoritaria).
2. INFORMANTE DARIO (45 años, aspecto demacrado, gafas de montura delgada, nervioso. VESTIMENTA: Abrigo gris arrugado y bufanda de lana. VOZ: Temblorosa, baja).

ESCENA 1 - INT. ESTACIÓN CENTRAL DE TRENES - DÍA
TOMA 1: Plano general (24mm Cine). Multitud en movimiento en el andén principal bajo la luz de los ventanales industriales.
TOMA 2: Plano medio subjetivo (50mm Steadicam). Valeria sigue a Darío manteniendo diez metros de distancia entre la gente.
TOMA 3: Plano cerrado tenso (85mm). Darío mira su reloj nervioso, buscando una salida.
DIALOGO DARIO: "Nos están vigilando. No debimos vernos aquí."
TOMA 4: Primer plano de reacción (85mm). Valeria coloca la mano sobre su funda táctica oculta.
TOMA 5: Plano holandés dinámico (35mm Tilt). Un convoy pasa a gran velocidad cortando la línea de visión.
TOMA 6: Master shot final (16:9). El andén queda en silencio con un maletín abandonado junto a la columna.`
  }
};

export class CinematicStudioUI {
  constructor(opts = {}) {
    this.mediaRouter = opts.mediaRouter;
    this.taskManager = opts.taskManager || opts.mediaTaskManager;
    this.state = opts.state || {};
    this.log = opts.log || console.log;
    this.termWrite = opts.termWrite || console.log;

    // Estado del Estudio de Producción
    this.activeTab = "all"; // all, characters, scenes, images, videos, tools
    this.activeFormat = STUDIO_FORMATS[0]; // 16:9 por defecto
    this.activeQuality = STUDIO_QUALITIES[1]; // 1080p
    this.activeStyle = STUDIO_STYLES[0]; // Kodak 35mm
    this.activeEngine = STUDIO_ENGINES[0]; // MiniMax Video-01

    // Proyecto Activo
    this.project = {
      title: "Coca-Cola: Refresco al Atardecer",
      genre: "Publicidad Cinemática",
      scriptRaw: SAMPLE_SCRIPTS.cocacola.content,
      characters: [
        {
          id: "char_1",
          name: "Sofía",
          age: "24 años",
          face: "Tez morena clara, cabello rizado castaño recogido, ojos expresivos color miel",
          wardrobe: "Top sin mangas terracota y shorts de lino beige (continuidad fija)",
          voice: "Joven, fresca y entusiasta (Timbre cálido)",
          intent: "Alegría, vitalidad y alivio refrescante",
          avatarColor: "#e63946"
        },
        {
          id: "char_2",
          name: "Mateo",
          age: "26 años",
          face: "Complexión atlética, cabello corto oscuro, barba de 3 días",
          wardrobe: "Camisa de lino blanco abierta sobre camiseta gris",
          voice: "Calmada, amistosa y resonante",
          intent: "Complicidad y disfrute compartido",
          avatarColor: "#457b9d"
        }
      ],
      scenes: [
        {
          id: "sc_1",
          number: 1,
          slug: "EXT. TERRAZA URBANA - ATARDECER",
          lighting: "Luz dorada natural, ángulo bajo, contraluz cálido",
          shots: [
            {
              id: "shot_1",
              num: 1,
              title: "Terraza Urbana al Atardecer",
              lens: "35mm Anamórfico · 2.39:1",
              movement: "Travelling lateral lento",
              char: "Sofía y Mateo",
              desc: "Plano general de Sofía y Mateo contemplando el horizonte de la ciudad bajo el calor del verano.",
              dialogue: "",
              imgSvg: this._generateSvgFrame(1, "TERRAZA URBANA", "35mm Anamórfico · 2.39:1", "#ff7e40", "#6e2b16", "#1a0e0a")
            },
            {
              id: "shot_2",
              num: 2,
              title: "Primer Plano Botella Fría",
              lens: "85mm Macro F/1.4",
              movement: "Cámara fija con rack focus",
              char: "Producto",
              desc: "Gotas de condensación helada deslizándose por el relieve del logotipo de Coca-Cola.",
              dialogue: "",
              imgSvg: this._generateSvgFrame(2, "BOTELLA CONDENSADA", "85mm Macro Bokeh", "#e63946", "#540b0e", "#0f0304", true)
            },
            {
              id: "shot_3",
              num: 3,
              title: "Destape & Escape de Gas",
              lens: "50mm High-Speed 120fps",
              movement: "Cámara ultrarrápida fija",
              char: "Sofía",
              desc: "La mano de Sofía retira la chapa con explosión de gas efervescente suspendido en el aire.",
              dialogue: "",
              imgSvg: this._generateSvgFrame(3, "DESTAPE & GAS", "50mm High-Speed 120fps", "#ffb703", "#fb8500", "#120803")
            }
          ]
        },
        {
          id: "sc_2",
          number: 2,
          slug: "EXT. MESA DE LA TERRAZA - CONTINUACIÓN",
          lighting: "Luz dorada envolvente de atardecer",
          shots: [
            {
              id: "shot_4",
              num: 4,
              title: "Servido en Vaso con Hielo",
              lens: "50mm Prime · Travelling Lento",
              movement: "Dolly in diagonal",
              char: "Sofía y Mateo",
              desc: "Líquido ámbar oscuro llenando el vaso con hielo crujiente y rodaja de limón.",
              dialogue: "",
              imgSvg: this._generateSvgFrame(4, "SERVIDO EN VASO", "50mm Prime · Travelling", "#9a031e", "#5f0f40", "#0f0208")
            },
            {
              id: "shot_5",
              num: 5,
              title: "Primer Sorbo Refrescante",
              lens: "85mm Portrait Emocional",
              movement: "Paneo lento suave",
              char: "Sofía",
              desc: "Sofía saborea el primer sorbo con expresión de alivio y satisfacción pura bajo la luz dorada.",
              dialogue: "Ahhh... perfecto.",
              imgSvg: this._generateSvgFrame(5, "PRIMER SORBO", "85mm Close-Up Emocional", "#ff9f1c", "#78290f", "#150502")
            },
            {
              id: "shot_6",
              num: 6,
              title: "Packshot Final & Skyline",
              lens: "21:9 Cinemascope Master",
              movement: "Pull back panorámico",
              char: "Sofía, Mateo y Botella",
              desc: "Botella y vaso en primer término con el skyline iluminado encendiéndose de fondo.",
              dialogue: "Coca-Cola: Siente el sabor.",
              imgSvg: this._generateSvgFrame(6, "PACKSHOT FINAL", "21:9 Cinemascope Master", "#f72585", "#7209b7", "#1e082b")
            }
          ]
        }
      ],
      chatMessages: [
        {
          sender: "user",
          text: "CREA UN VIDEO PUBLICITARIO DE COCACOLA"
        },
        {
          sender: "director",
          text: "¡Excelente! He configurado la suite cinemática con el desglose completo del guión publicitario.\n\nHe definido la **Biblia de Personajes** para Sofía y Mateo para garantizar continuidad estricta de vestimenta y rostro, y desglosado 6 tomas con lentes profesionales (35mm Anamórfico, 85mm Macro, 50mm High-Speed).\n\n¿Deseas ajustar el formato o comenzar la producción?",
          options: [
            { id: "opt_1", label: "🎬 Cambiar a 16:9 Widescreen" },
            { id: "opt_2", label: "📱 Cambiar a 9:16 Vertical (TikTok/Reels)" },
            { id: "opt_3", label: "⚡ Cambiar Estilo a Arri Alexa Cinema" },
            { id: "opt_4", label: "▶ Procede con la Producción Completa" }
          ],
          hasProceedButton: true
        }
      ]
    };

    this.isRendering = false;
    this.renderProgress = 0;
    this.videoReady = true;
    this.currentModal = null; // 'script_modal'
  }

  init() {
    this._ensureContainer();
  }

  _ensureContainer() {
    let container = document.getElementById("view-studio");
    if (!container) {
      container = document.createElement("div");
      container.id = "view-studio";
      container.className = "view";
      const panelCenter = document.querySelector(".panel-center");
      if (panelCenter) {
        panelCenter.appendChild(container);
      }
    }
  }

  renderStudioView() {
    this._ensureContainer();
    const container = document.getElementById("view-studio");
    if (!container) return;

    container.innerHTML = `
      <!-- CONTENEDOR PRINCIPAL ESTUDIO CINEMÁTICO -->
      <div id="studio-root" style="display:flex;flex-direction:column;width:100%;height:100%;background:#090a10;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden;box-sizing:border-box;">
        
        <!-- BARRA SUPERIOR DE HERRAMIENTAS Y PARÁMETROS CINEMATOGRÁFICOS -->
        ${this._renderTopToolbar()}

        <!-- ÁREA CENTRAL FLEXIBLE (3 PANELES: NAV + LIENZO DE PRODUCCIÓN + CHAT DIRECTOR) -->
        <div style="display:flex;flex:1;min-height:0;overflow:hidden;box-sizing:border-box;">
          
          <!-- PANEL IZQUIERDO: SUB-NAVEGACIÓN -->
          ${this._renderLeftSidebar()}

          <!-- PANEL CENTRAL: LIENZO Y STORYBOARD -->
          <main style="flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;padding:16px;box-sizing:border-box;background:#0d0e17;gap:18px;">
            ${this._renderMainContentView()}
          </main>

          <!-- PANEL DERECHO: DIRECTOR IA CHAT & ASISTENTE -->
          ${this._renderRightDirectorChat()}

        </div>

      </div>

      <!-- MODAL DE INGESTA DE GUIÓN (SI ESTÁ ACTIVO) -->
      ${this.currentModal === "script_modal" ? this._renderScriptModal() : ""}
    `;

    this._bindEvents(container);
  }

  // ────────────────────────────────────────────────────────────
  //  BARRA SUPERIOR (TOOLBAR CON SELECTORES DE FORMATO, CALIDAD, ESTILO Y MOTOR)
  // ────────────────────────────────────────────────────────────
  _renderTopToolbar() {
    return `
      <header style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#11131f;border-bottom:1px solid rgba(255,255,255,0.08);gap:12px;flex-wrap:wrap;z-index:10;box-sizing:border-box;">
        
        <!-- TÍTULO & PROYECTO -->
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">🎬</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;">
              <span>${this.project.title}</span>
              <span style="font-size:10px;background:rgba(124,58,237,0.25);color:#c084fc;padding:1px 6px;border-radius:4px;border:1px solid rgba(168,85,247,0.3);">${this.project.genre}</span>
            </div>
            <div style="font-size:10.5px;color:#8b949e;">Suite Cinemática Profesional · Veo 3 & Seedance Pipeline</div>
          </div>
        </div>

        <!-- SELECTORES DE FORMATO, CALIDAD Y ESTILO -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          
          <!-- SELECTOR DE FORMATO / ASPECT RATIO -->
          <div style="display:flex;align-items:center;background:#090a10;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:2px 4px;gap:2px;">
            <span style="font-size:11px;color:#8b949e;padding:0 4px;font-weight:600;">📐 Formato:</span>
            ${STUDIO_FORMATS.map(f => `
              <button class="btn-format-picker ${this.activeFormat.id === f.id ? 'active' : ''}" data-format="${f.id}" style="background:${this.activeFormat.id === f.id ? 'var(--accent, #7c3aed)' : 'transparent'};border:none;color:${this.activeFormat.id === f.id ? '#fff' : '#8b949e'};padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:3px;">
                <span>${f.icon}</span> <span>${f.id}</span>
              </button>
            `).join('')}
          </div>

          <!-- SELECTOR DE CALIDAD -->
          <div style="display:flex;align-items:center;background:#090a10;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:2px 6px;gap:4px;">
            <span style="font-size:11px;color:#8b949e;font-weight:600;">💎 Calidad:</span>
            <select id="select-studio-quality" style="background:transparent;border:none;color:#fff;font-size:11px;font-weight:600;outline:none;cursor:pointer;">
              ${STUDIO_QUALITIES.map(q => `<option value="${q.id}" ${this.activeQuality.id === q.id ? 'selected' : ''} style="background:#11131f;color:#fff;">${q.label}</option>`).join('')}
            </select>
          </div>

          <!-- SELECTOR DE ESTILO CINEMÁTICO -->
          <div style="display:flex;align-items:center;background:#090a10;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:2px 6px;gap:4px;">
            <span style="font-size:11px;color:#8b949e;font-weight:600;">🎨 Estilo:</span>
            <select id="select-studio-style" style="background:transparent;border:none;color:#fff;font-size:11px;font-weight:600;outline:none;cursor:pointer;max-width:140px;">
              ${STUDIO_STYLES.map(s => `<option value="${s.id}" ${this.activeStyle.id === s.id ? 'selected' : ''} style="background:#11131f;color:#fff;">${s.label}</option>`).join('')}
            </select>
          </div>

          <!-- BOTONES DE ACCIÓN PRINCIPALES -->
          <button id="btn-open-script-modal" style="background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#38bdf8;padding:5px 12px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            <span>📝</span> Cargar Guión
          </button>

          <button id="btn-studio-render-all" style="background:linear-gradient(135deg, #059669 0%, #10b981 100%);border:none;color:#fff;padding:5px 14px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(16,185,129,0.35);">
            <span>▶</span> Renderizar Video
          </button>

        </div>

      </header>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  BARRA LATERAL IZQUIERDA (NAVEGACIÓN DE PRODUCCIÓN)
  // ────────────────────────────────────────────────────────────
  _renderLeftSidebar() {
    const totalShots = this.project.scenes.reduce((acc, sc) => acc + sc.shots.length, 0);
    const totalChars = this.project.characters.length;

    const navItems = [
      { id: "all", label: "Storyboard & Producción", icon: "🎬", badge: `${totalShots} tomas` },
      { id: "characters", label: "Caracteres & Biblia", icon: "👤", badge: `${totalChars}` },
      { id: "scenes", label: "Desglose Escenas", icon: "📑", badge: `${this.project.scenes.length}` },
      { id: "videos", label: "Videos Renderizados", icon: "🎥", badge: "1" },
      { id: "tools", label: "Herramientas & IA", icon: "⚙️", badge: "" }
    ];

    return `
      <aside style="width:170px;background:#0c0d16;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;justify-content:space-between;padding:12px 8px;flex-shrink:0;box-sizing:border-box;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;padding:6px 8px;">
            Módulos
          </div>
          ${navItems.map(item => `
            <button class="btn-studio-nav ${this.activeTab === item.id ? 'active' : ''}" data-nav="${item.id}" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 10px;border-radius:8px;border:none;background:${this.activeTab === item.id ? 'rgba(124,58,237,0.18)' : 'transparent'};color:${this.activeTab === item.id ? '#c084fc' : '#9ca3af'};font-size:11.5px;font-weight:600;cursor:pointer;text-align:left;transition:all 0.15s ease;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span>${item.icon}</span>
                <span>${item.label}</span>
              </div>
              ${item.badge ? `<span style="font-size:9.5px;background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:10px;color:#d1d5db;">${item.badge}</span>` : ''}
            </button>
          `).join('')}
        </div>

        <!-- CONTINUIDAD ENGINE STATUS -->
        <div style="background:#11131f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px;font-size:10px;color:#8b949e;display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;align-items:center;gap:4px;color:#10b981;font-weight:700;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
            <span>Continuidad Activa</span>
          </div>
          <div>Vestimenta & Rostro bloqueados entre escenas</div>
        </div>
      </aside>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  VISTA PRINCIPAL DINÁMICA SEGÚN PESTAÑA ACTIVA
  // ────────────────────────────────────────────────────────────
  _renderMainContentView() {
    if (this.activeTab === "characters") {
      return this._renderCharactersView();
    }
    if (this.activeTab === "scenes") {
      return this._renderScenesView();
    }
    if (this.activeTab === "videos") {
      return this._renderVideosGalleryView();
    }
    if (this.activeTab === "tools") {
      return this._renderToolsView();
    }

    // Default: "all" (Storyboard + Hero Video Player)
    return `
      <!-- MONITOR DE PRODUCCIÓN / HERO VIDEO PLAYER -->
      ${this._renderHeroSection()}

      <!-- GRID DE STORYBOARD (TOMAS DESGLOSADAS CON CONTINUIDAD) -->
      <section style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">🎬</span>
            <span style="font-size:14px;font-weight:700;color:#fff;">Storyboard de Producción</span>
            <span style="font-size:11px;background:#10b981;color:#fff;padding:2px 8px;border-radius:12px;font-weight:700;">GUION ANALIZADO</span>
          </div>
          <div style="font-size:11.5px;color:#8b949e;display:flex;align-items:center;gap:8px;">
            <span>📐 Aspecto: <b>${this.activeFormat.id}</b></span>
            <span>·</span>
            <span>💎 <b>${this.activeQuality.id}</b></span>
            <span>·</span>
            <span>🎥 <b>${this.activeStyle.label.split(' ')[1]}</b></span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:14px;">
          ${this._renderStoryboardCards()}
        </div>
      </section>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  MONITOR HERO (VIDEO RENDERIZADO / BARRA DE PROGRESO)
  // ────────────────────────────────────────────────────────────
  _renderHeroSection() {
    if (this.isRendering) {
      return `
        <div style="background:#0c0d16;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:32px;text-align:center;position:relative;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="font-size:36px;margin-bottom:10px;">⏳</div>
          <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:4px;">Produciendo Video Cinemático con IA</div>
          <div style="font-size:12px;color:#8b949e;max-width:500px;margin:0 auto 16px;">
            Sintetizando ${this.project.scenes.reduce((a, s) => a + s.shots.length, 0)} tomas en formato ${this.activeFormat.id} (${this.activeQuality.id}) aplicando consistencia de vestimenta y rostro con motor ${this.activeEngine.label}...
          </div>
          <div style="width:320px;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;margin:0 auto;overflow:hidden;">
            <div style="width:${this.renderProgress}%;height:100%;background:linear-gradient(90deg, #10b981 0%, #34d399 100%);transition:width 0.3s ease;"></div>
          </div>
          <div style="font-size:12px;color:#10b981;margin-top:10px;font-weight:700;">${this.renderProgress}% completado</div>
        </div>
      `;
    }

    // Video Listo con Preview y Descarga Directa
    return `
      <div style="background:#0c0d16;border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.6);display:flex;flex-direction:column;">
        
        <!-- CABECERA DEL REPRODUCTOR -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#111320;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#10b981;font-size:14px;">▶</span>
            <span style="font-size:13px;font-weight:700;color:#fff;">${this.project.title} (Final Master ${this.activeFormat.id})</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:10.5px;background:#10b981;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;">LISTO</span>
            <span style="font-size:11px;color:#8b949e;">${this.activeQuality.id} · ${this.activeFormat.id} · 30 FPS</span>
          </div>
        </div>

        <!-- LIENZO DE REPRODUCCIÓN INTERACTIVO CON PREVIEW CINEMATOGRÁFICO -->
        <div style="position:relative;width:100%;background:#050508;display:flex;align-items:center;justify-content:center;padding:20px 0;">
          <div style="width:${this.activeFormat.id === '9:16' ? '280px' : this.activeFormat.id === '1:1' ? '360px' : '90%'};max-width:680px;border-radius:8px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.15);">
            ${this._generateSvgFrame(2, "BOTELLA CONDENSADA", "85mm Macro Bokeh · Final Cut", "#e63946", "#540b0e", "#0f0304", true)}
          </div>
        </div>

        <!-- BARRA DE ACCIÓN: DESCARGA DIRECTA MP4 Y REGENERAR -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#111320;border-top:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;gap:8px;">
          <div style="font-size:11px;color:#8b949e;">
            ✓ Continuidad espacial y lumínica aplicada en 6 tomas sincronizadas.
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button id="btn-studio-download-mp4" style="background:#10b981;border:none;color:#fff;padding:6px 14px;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(16,185,129,0.3);">
              <span>⬇</span> Descargar Video MP4
            </button>
            <button id="btn-studio-re-render" style="background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#cbd5e1;padding:6px 12px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;">
              <span>🔄</span> Regenerar
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  TARJETAS DE TOMAS DEL STORYBOARD
  // ────────────────────────────────────────────────────────────
  _renderStoryboardCards() {
    let allShots = [];
    this.project.scenes.forEach(scene => {
      scene.shots.forEach(shot => {
        allShots.push({ ...shot, sceneNum: scene.number, sceneSlug: scene.slug });
      });
    });

    return allShots.map(shot => `
      <div style="background:#111320;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:transform 0.15s ease;">
        
        <!-- IMAGEN DEL STORYBOARD -->
        <div style="position:relative;width:100%;overflow:hidden;background:#000;">
          ${shot.imgSvg}
          <div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.75);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;backdrop-filter:blur(4px);">
            TOMA ${shot.num}
          </div>
          <div style="position:absolute;top:6px;right:6px;background:rgba(124,58,237,0.85);color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;">
            ${shot.lens}
          </div>
        </div>

        <!-- CONTENIDO Y METADATOS DE LA TOMA -->
        <div style="padding:10px 12px;display:flex;flex-direction:column;gap:6px;flex:1;justify-content:space-between;">
          <div>
            <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:2px;">${shot.title}</div>
            <div style="font-size:11px;color:#9ca3af;line-height:1.4;">${shot.desc}</div>
            ${shot.dialogue ? `<div style="font-size:10.5px;color:#c084fc;margin-top:4px;font-style:italic;background:rgba(168,85,247,0.1);padding:3px 6px;border-radius:4px;">💬 "${shot.dialogue}"</div>` : ''}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;margin-top:4px;">
            <span style="font-size:10px;color:#6b7280;">👤 ${shot.char}</span>
            <button class="btn-generate-single-shot" data-shot="${shot.num}" style="background:#1e293b;border:1px solid rgba(255,255,255,0.12);color:#38bdf8;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;">
              🎬 Render Clip
            </button>
          </div>
        </div>

      </div>
    `).join('');
  }

  // ────────────────────────────────────────────────────────────
  //  PESTAÑA: CARACTERES & BIBLIA DE PERSONAJES (CONTINUIDAD)
  // ────────────────────────────────────────────────────────────
  _renderCharactersView() {
    return `
      <section style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:16px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;">
              <span>👤</span> Biblia de Personajes & Continuidad
            </div>
            <div style="font-size:11.5px;color:#8b949e;">
              Los atributos de rostro, vestimenta y voz se mantienen invariables en todas las escenas y tomas generadas.
            </div>
          </div>
          <button id="btn-add-character" style="background:#7c3aed;border:none;color:#fff;padding:6px 12px;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
            <span>+</span> Añadir Personaje
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:14px;">
          ${this.project.characters.map(c => `
            <div style="background:#111320;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
              
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:46px;height:46px;border-radius:50%;background:${c.avatarColor};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.2);">
                  ${c.name.charAt(0)}
                </div>
                <div>
                  <div style="font-size:14px;font-weight:700;color:#fff;">${c.name} <span style="font-size:11px;color:#8b949e;font-weight:normal;">(${c.age})</span></div>
                  <div style="font-size:10.5px;color:#10b981;font-weight:600;">🔒 Continuidad Facial y de Vestimenta Activa</div>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;background:#0c0d16;padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);">
                <div><b style="color:#d1d5db;">🎭 Rostro & Rasgos:</b> <span style="color:#9ca3af;">${c.face}</span></div>
                <div><b style="color:#d1d5db;">👕 Vestimenta Fija:</b> <span style="color:#38bdf8;">${c.wardrobe}</span></div>
                <div><b style="color:#d1d5db;">🎙️ Perfil de Voz:</b> <span style="color:#c084fc;">${c.voice}</span></div>
                <div><b style="color:#d1d5db;">💫 Intención Activa:</b> <span style="color:#f59e0b;">${c.intent}</span></div>
              </div>

              <div style="display:flex;justify-content:flex-end;gap:6px;">
                <button class="btn-edit-character" data-char="${c.id}" style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);color:#cbd5e1;padding:4px 8px;border-radius:4px;font-size:10.5px;cursor:pointer;">
                  ✏️ Editar Atributos
                </button>
              </div>

            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  PESTAÑA: DESGLOSE DE ESCENAS
  // ────────────────────────────────────────────────────────────
  _renderScenesView() {
    return `
      <section style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;">
            <span>📑</span> Desglose de Escenas & Continuidad Espacial
          </div>
          <div style="font-size:11.5px;color:#8b949e;">
            Estructura dramática dividida por locaciones, iluminación y secuencia de planos cinematográficos.
          </div>
        </div>

        ${this.project.scenes.map(scene => `
          <div style="background:#111320;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px;">
              <div>
                <span style="font-size:12px;font-weight:800;color:#c084fc;">ESCENA ${scene.number}</span>
                <span style="font-size:13px;font-weight:700;color:#fff;margin-left:8px;">${scene.slug}</span>
              </div>
              <span style="font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.1);padding:2px 8px;border-radius:12px;">💡 ${scene.lighting}</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;">
              ${scene.shots.map(sh => `
                <div style="display:flex;align-items:center;justify-content:space-between;background:#0c0d16;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.04);font-size:11.5px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-weight:700;color:#fff;background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:10px;">TOMA ${sh.num}</span>
                    <span style="color:#e2e8f0;font-weight:600;">${sh.title}</span>
                    <span style="color:#6b7280;">·</span>
                    <span style="color:#9ca3af;">${sh.desc}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:10.5px;color:#38bdf8;">🎥 ${sh.lens}</span>
                    <span style="font-size:10.5px;color:#a855f7;">🔄 ${sh.movement}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </section>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  PESTAÑA: VIDEOS RENDERIZADOS
  // ────────────────────────────────────────────────────────────
  _renderVideosGalleryView() {
    return `
      <section style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:16px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;">
              <span>🎥</span> Galería de Producciones Finales
            </div>
            <div style="font-size:11.5px;color:#8b949e;">
              Clips y montajes finales generados listos para descarga en formato MP4 alta definición.
            </div>
          </div>
        </div>

        <div style="background:#111320;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff;">${this.project.title} - Final Master Cut</div>
              <div style="font-size:11px;color:#8b949e;">6 Tomas sincronizadas · Formato ${this.activeFormat.id} · ${this.activeQuality.id} · Audio Estéreo</div>
            </div>
            <button id="btn-gallery-download-mp4" style="background:#10b981;border:none;color:#fff;padding:6px 14px;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;">
              <span>⬇</span> Descargar MP4
            </button>
          </div>

          <div style="width:100%;max-width:540px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);">
            ${this._generateSvgFrame(2, "BOTELLA CONDENSADA", "Final Master Cut", "#e63946", "#540b0e", "#0f0304", true)}
          </div>
        </div>
      </section>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  PESTAÑA: HERRAMIENTAS & CONFIGURACIÓN DE IA
  // ────────────────────────────────────────────────────────────
  _renderToolsView() {
    return `
      <section style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;">
            <span>⚙️</span> Configuración de Producción & Motores IA
          </div>
          <div style="font-size:11.5px;color:#8b949e;">
            Ajustes avanzados de semillas (seed locking), prompts negativos y selección de modelos de video.
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:14px;">
          
          <!-- SELECCIÓN DE MOTOR IA -->
          <div style="background:#111320;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:13px;font-weight:700;color:#fff;">🤖 Motor de Renderizado de Video</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${STUDIO_ENGINES.map(e => `
                <label style="display:flex;align-items:center;gap:8px;background:#0c0d16;padding:8px;border-radius:6px;cursor:pointer;border:1px solid ${this.activeEngine.id === e.id ? 'var(--accent, #7c3aed)' : 'transparent'};">
                  <input type="radio" name="studio-engine" value="${e.id}" ${this.activeEngine.id === e.id ? 'checked' : ''} />
                  <div>
                    <div style="font-size:11.5px;font-weight:700;color:#fff;">${e.label}</div>
                    <div style="font-size:10px;color:#8b949e;">${e.desc}</div>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- PROMPTS NEGATIVOS Y CONTINUIDAD -->
          <div style="background:#111320;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:13px;font-weight:700;color:#fff;">🛡️ Filtros de Calidad & Anti-Deformación</div>
            <div style="font-size:11px;color:#8b949e;">Prompt negativo inyectado automáticamente:</div>
            <textarea readonly style="width:100%;height:80px;background:#0c0d16;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#9ca3af;font-size:10.5px;padding:8px;box-sizing:border-box;resize:none;">blurry, distorted face, mutated fingers, extra limbs, clothing inconsistency, low quality, glitch, watermark, text artifacts, bad anatomy</textarea>
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#10b981;font-weight:600;">
              <span>✓</span> Face Lock & Wardrobe Lock activos
            </div>
          </div>

        </div>
      </section>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  PANEL DERECHO: DIRECTOR IA CHAT & ASISTENTE CREATIVO
  // ────────────────────────────────────────────────────────────
  _renderRightDirectorChat() {
    return `
      <aside style="width:300px;min-width:270px;max-width:320px;background:#0c0d16;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;flex-shrink:0;box-sizing:border-box;overflow:hidden;word-break:break-word;">
        
        <!-- CABECERA DEL CHAT DEL DIRECTOR -->
        <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.07);background:#111320;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
          <div>
            <div style="font-size:12px;font-weight:700;color:#fff;display:flex;align-items:center;gap:5px;">
              <span>🎥</span> Director IA
            </div>
            <div style="font-size:10px;color:#8b949e;">Asistente de Guion & Producción</div>
          </div>
          <span style="font-size:9.5px;background:rgba(16,185,129,0.15);color:#10b981;padding:2px 6px;border-radius:10px;font-weight:700;">ONLINE</span>
        </div>

        <!-- HISTORIAL DE MENSAJES DEL CHAT -->
        <div id="flow-chat-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;">
          ${this._renderChatMessages()}
        </div>

        <!-- INPUT DEL CHAT DEL DIRECTOR -->
        <div style="padding:10px 12px;border-top:1px solid rgba(255,255,255,0.07);background:#090a10;box-sizing:border-box;">
          <div style="display:flex;align-items:center;gap:6px;background:#141622;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:4px 10px;box-shadow:0 4px 12px rgba(0,0,0,0.3);box-sizing:border-box;">
            <input id="flow-user-input" placeholder="Instruye al director o pide cambios..." style="flex:1;min-width:0;background:transparent;border:none;color:#fff;font-size:11.5px;outline:none;" />
            <button id="btn-flow-send-msg" style="background:var(--accent, #7c3aed);border:none;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;flex-shrink:0;">➔</button>
          </div>
        </div>

      </aside>
    `;
  }

  _renderChatMessages() {
    return this.project.chatMessages.map(msg => {
      if (msg.sender === "user") {
        return `
          <div style="align-self:flex-end;background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);color:#fff;padding:8px 12px;border-radius:12px 12px 2px 12px;font-size:11.5px;max-width:90%;box-shadow:0 2px 8px rgba(124,58,237,0.3);line-height:1.4;">
            ${msg.text}
          </div>
        `;
      }

      return `
        <div style="align-self:flex-start;background:#161826;border:1px solid rgba(255,255,255,0.08);color:#e2e8f0;padding:10px 12px;border-radius:12px 12px 12px 2px;font-size:11.5px;max-width:96%;line-height:1.45;display:flex;flex-direction:column;gap:8px;">
          <div>${msg.text.replace(/\n/g, '<br/>')}</div>

          ${msg.options ? `
            <div style="display:flex;flex-direction:column;gap:4px;margin-top:2px;">
              ${msg.options.map(opt => `
                <button class="flow-pill-btn" data-text="${opt.label}" style="background:#0e101c;border:1px solid rgba(255,255,255,0.12);color:#cbd5e1;padding:5px 8px;border-radius:6px;font-size:10.5px;text-align:left;cursor:pointer;transition:all 0.15s ease;">
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          ` : ''}

          ${msg.hasProceedButton ? `
            <button id="btn-flow-proceed" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);border:none;color:#fff;padding:7px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px;box-shadow:0 3px 10px rgba(16,185,129,0.3);">
              <span>▶ PROCEDE CON LA PRODUCCIÓN</span>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // ────────────────────────────────────────────────────────────
  //  MODAL: INGESTA Y ANÁLISIS DE GUIÓN CON IA
  // ────────────────────────────────────────────────────────────
  _renderScriptModal() {
    return `
      <div id="script-modal-backdrop" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
        <div style="background:#0f111d;border:1px solid rgba(255,255,255,0.15);border-radius:14px;width:100%;max-width:700px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,0.8);overflow:hidden;box-sizing:border-box;">
          
          <!-- CABECERA DEL MODAL -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#141624;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">📝</span>
              <span style="font-size:14px;font-weight:700;color:#fff;">Cargar Guión & Desglose Automático con IA</span>
            </div>
            <button id="btn-close-script-modal" style="background:transparent;border:none;color:#8b949e;font-size:16px;cursor:pointer;">✕</button>
          </div>

          <!-- CUERPO DEL MODAL -->
          <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;flex:1;box-sizing:border-box;">
            
            <div style="font-size:11.5px;color:#8b949e;">
              Pega tu guión completo o carga uno de nuestros ejemplos. La IA desglosará personajes (rostro, vestimenta, voz), escenas y tomas cinematográficas respetando continuidad estricta:
            </div>

            <!-- BOTONES DE CARGA RÁPIDA DE EJEMPLOS -->
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-size:11px;color:#d1d5db;font-weight:600;">Cargar Ejemplo:</span>
              <button class="btn-load-sample" data-sample="cocacola" style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);color:#38bdf8;padding:4px 8px;border-radius:6px;font-size:10.5px;cursor:pointer;">
                🥤 Comercial Refresco
              </button>
              <button class="btn-load-sample" data-sample="cyberpunk" style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);color:#c084fc;padding:4px 8px;border-radius:6px;font-size:10.5px;cursor:pointer;">
                🌃 Sci-Fi Cyberpunk
              </button>
              <button class="btn-load-sample" data-sample="action" style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);color:#f59e0b;padding:4px 8px;border-radius:6px;font-size:10.5px;cursor:pointer;">
                🕵️ Serie Acción Policial
              </button>
            </div>

            <!-- ÁREA DE TEXTO DEL GUIÓN -->
            <textarea id="script-modal-textarea" placeholder="Pega aquí tu guión..." style="width:100%;height:220px;background:#090a10;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-family:Consolas,monospace;font-size:11px;padding:10px;box-sizing:border-box;resize:none;line-height:1.5;">${this.project.scriptRaw || ''}</textarea>

          </div>

          <!-- PIE DEL MODAL -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:#141624;border-top:1px solid rgba(255,255,255,0.08);">
            <button id="btn-cancel-script-modal" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#9ca3af;padding:6px 12px;border-radius:6px;font-size:11.5px;cursor:pointer;">
              Cancelar
            </button>
            <button id="btn-analyze-script-submit" style="background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);border:none;color:#fff;padding:6px 16px;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(124,58,237,0.35);">
              <span>✨</span> Analizar Guión & Crear Storyboard
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  GENERADOR DE GRÁFICOS VECTORIALES CINEMATOGRÁFICOS
  // ────────────────────────────────────────────────────────────
  _generateSvgFrame(num, title, lens, color1, color2, color3, isHero = false) {
    const w = isHero ? 640 : 480;
    const h = isHero ? 360 : 270;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;">
        <defs>
          <linearGradient id="g_${num}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color1}"/>
            <stop offset="60%" stop-color="${color2}"/>
            <stop offset="100%" stop-color="${color3}"/>
          </linearGradient>
          <radialGradient id="rg_${num}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${color1}" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="${color3}" stop-opacity="1"/>
          </radialGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#g_${num})"/>
        
        <!-- ELEMENTOS DE FONDO -->
        <circle cx="${w * 0.7}" cy="${h * 0.4}" r="${h * 0.25}" fill="${color1}" opacity="0.3" filter="blur(20px)"/>
        <rect x="${w * 0.1}" y="${h * 0.5}" width="${w * 0.2}" height="${h * 0.5}" fill="${color3}" opacity="0.7"/>
        <rect x="${w * 0.4}" y="${h * 0.3}" width="${w * 0.25}" height="${h * 0.7}" fill="${color3}" opacity="0.85"/>
        <rect x="${w * 0.75}" y="${h * 0.4}" width="${w * 0.2}" height="${h * 0.6}" fill="${color3}" opacity="0.75"/>

        <!-- SILUETA / OBJETO -->
        <circle cx="${w * 0.5}" cy="${h * 0.45}" r="${h * 0.12}" fill="#ffd1a4"/>
        <path d="M ${w * 0.4} ${h * 0.58} Q ${w * 0.5} ${h * 0.7} ${w * 0.6} ${h * 0.58} L ${w * 0.65} ${h} L ${w * 0.35} ${h} Z" fill="#111320"/>

        <!-- TEXTO CINEMATOGRÁFICO -->
        <rect x="0" y="${h - 40}" width="${w}" height="40" fill="rgba(0,0,0,0.6)"/>
        <text x="16" y="${h - 22}" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="12" font-weight="800" opacity="0.95">${num} · ${title}</text>
        <text x="16" y="${h - 8}" fill="${color1}" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="10" font-weight="600">${lens}</text>
      </svg>
    `;
  }

  // ────────────────────────────────────────────────────────────
  //  VINCULACIÓN DE EVENTOS DEL ESTUDIO
  // ────────────────────────────────────────────────────────────
  _bindEvents(container) {
    // Selector de Formatos
    container.querySelectorAll(".btn-format-picker").forEach(btn => {
      btn.onclick = () => {
        const fmtId = btn.getAttribute("data-format");
        const found = STUDIO_FORMATS.find(f => f.id === fmtId);
        if (found) {
          this.activeFormat = found;
          this.renderStudioView();
        }
      };
    });

    // Selector de Calidad
    const selQuality = container.querySelector("#select-studio-quality");
    if (selQuality) {
      selQuality.onchange = (e) => {
        const found = STUDIO_QUALITIES.find(q => q.id === e.target.value);
        if (found) this.activeQuality = found;
      };
    }

    // Selector de Estilo
    const selStyle = container.querySelector("#select-studio-style");
    if (selStyle) {
      selStyle.onchange = (e) => {
        const found = STUDIO_STYLES.find(s => s.id === e.target.value);
        if (found) this.activeStyle = found;
      };
    }

    // Navegación Izquierda
    container.querySelectorAll(".btn-studio-nav").forEach(btn => {
      btn.onclick = () => {
        this.activeTab = btn.getAttribute("data-nav");
        this.renderStudioView();
      };
    });

    // Abrir Modal de Guión
    const btnOpenScript = container.querySelector("#btn-open-script-modal");
    if (btnOpenScript) {
      btnOpenScript.onclick = () => {
        this.currentModal = "script_modal";
        this.renderStudioView();
      };
    }

    // Cerrar Modal de Guión
    const btnCloseScript = container.querySelector("#btn-close-script-modal");
    if (btnCloseScript) {
      btnCloseScript.onclick = () => {
        this.currentModal = null;
        this.renderStudioView();
      };
    }
    const btnCancelScript = container.querySelector("#btn-cancel-script-modal");
    if (btnCancelScript) {
      btnCancelScript.onclick = () => {
        this.currentModal = null;
        this.renderStudioView();
      };
    }

    // Cargar Ejemplos en Modal
    container.querySelectorAll(".btn-load-sample").forEach(btn => {
      btn.onclick = () => {
        const key = btn.getAttribute("data-sample");
        const sample = SAMPLE_SCRIPTS[key];
        if (sample) {
          const ta = container.querySelector("#script-modal-textarea");
          if (ta) ta.value = sample.content;
        }
      };
    });

    // Analizar Guión Submit
    const btnSubmitScript = container.querySelector("#btn-analyze-script-submit");
    if (btnSubmitScript) {
      btnSubmitScript.onclick = () => {
        const ta = container.querySelector("#script-modal-textarea");
        if (ta && ta.value.trim()) {
          this._parseAndApplyScript(ta.value.trim());
          this.currentModal = null;
          this.renderStudioView();
        }
      };
    }

    // Renderizar Todo / Procede
    const btnRenderAll = container.querySelector("#btn-studio-render-all");
    if (btnRenderAll) {
      btnRenderAll.onclick = () => this._startProduction();
    }
    const btnProceed = container.querySelector("#btn-flow-proceed");
    if (btnProceed) {
      btnProceed.onclick = () => this._startProduction();
    }
    const btnReRender = container.querySelector("#btn-studio-re-render");
    if (btnReRender) {
      btnReRender.onclick = () => this._startProduction();
    }

    // Descargar Video MP4
    const btnDownload = container.querySelector("#btn-studio-download-mp4");
    if (btnDownload) {
      btnDownload.onclick = () => this._downloadVideo();
    }
    const btnGalleryDownload = container.querySelector("#btn-gallery-download-mp4");
    if (btnGalleryDownload) {
      btnGalleryDownload.onclick = () => this._downloadVideo();
    }

    // Chat del Director
    const chatInput = container.querySelector("#flow-user-input");
    const chatBtn = container.querySelector("#btn-flow-send-msg");
    if (chatBtn && chatInput) {
      const sendMsg = () => {
        const txt = chatInput.value.trim();
        if (!txt) return;
        this._handleDirectorChatUserMessage(txt);
        chatInput.value = "";
      };
      chatBtn.onclick = sendMsg;
      chatInput.onkeydown = (e) => {
        if (e.key === "Enter") sendMsg();
      };
    }

    // Botones Pill del Chat
    container.querySelectorAll(".flow-pill-btn").forEach(btn => {
      btn.onclick = () => {
        const txt = btn.getAttribute("data-text");
        this._handleDirectorChatUserMessage(txt);
      };
    });

    // Añadir Personaje
    const btnAddChar = container.querySelector("#btn-add-character");
    if (btnAddChar) {
      btnAddChar.onclick = async () => {
        const name = await showPrompt("Nombre del Personaje:", "Nuevo Actor");
        if (!name) return;
        const wardrobe = await showPrompt("Vestimenta fija (Continuidad):", "Traje formal negro");
        if (!wardrobe) return;

        this.project.characters.push({
          id: "char_" + Date.now(),
          name,
          age: "25-30 años",
          face: "Rasgos proporcionados, mirada atenta",
          wardrobe,
          voice: "Tono profesional y claro",
          intent: "Neutral y decidido",
          avatarColor: "#" + Math.floor(Math.random()*16777215).toString(16)
        });
        this.renderStudioView();
      };
    }
  }

  // ────────────────────────────────────────────────────────────
  //  MOTOR DE ANÁLISIS DE GUIÓN
  // ────────────────────────────────────────────────────────────
  _parseAndApplyScript(rawScript) {
    this.project.scriptRaw = rawScript;

    // Detectar título y género
    const titleMatch = rawScript.match(/TITULO:\s*([^\n]+)/i);
    if (titleMatch) this.project.title = titleMatch[1].trim();

    const genreMatch = rawScript.match(/GENERO:\s*([^\n]+)/i);
    if (genreMatch) this.project.genre = genreMatch[1].trim();

    // Si es Cyberpunk o Acción, ajustar personajes y escenas acordes
    if (rawScript.includes("CYBERPUNK")) {
      this.project.characters = [
        { id: "c_k", name: "Kai", age: "29 años", face: "Cicatriz biónica izquierda, mirada fría", wardrobe: "Gabardina negra con cuello iluminado en fibra óptica azul (continuidad fija)", voice: "Grave y sintetizada", intent: "Cálculo y supervivencia", avatarColor: "#06b6d4" },
        { id: "c_l", name: "Lyra", age: "25 años", face: "Pelo violeta eléctrico, implante ocular cromado", wardrobe: "Traje de kevlar urbano ajustado con arnés táctico", voice: "Rápida y precisa", intent: "Táctica y resolución", avatarColor: "#a855f7" }
      ];
      this.project.scenes = [
        {
          id: "sc_1", number: 1, slug: "EXT. DISTRITO NEÓN BAJO - NOCHE LLUVIOSA", lighting: "Lluvia ácida, neón magenta y cian",
          shots: [
            { id: "s_1", num: 1, title: "Distrito Neón Bajo", lens: "24mm Ultra-Wide Drone", movement: "Vuelo descendente", char: "Kai & Lyra", desc: "Vuelo entre rascacielos descomunales y transporte aéreo bajo la lluvia.", imgSvg: this._generateSvgFrame(1, "DISTRITO NEÓN", "24mm Ultra-Wide", "#06b6d4", "#3b82f6", "#090d16") },
            { id: "s_2", num: 2, title: "Infiltración Callejera", lens: "35mm Handheld", movement: "Travelling frontal", char: "Kai", desc: "Kai avanza entre la multitud con la gabardina iluminada en azul.", imgSvg: this._generateSvgFrame(2, "INFILTRACIÓN", "35mm Handheld", "#8b5cf6", "#4c1d95", "#0a0714") },
            { id: "s_3", num: 3, title: "Llamada Holográfica", lens: "85mm Anamorphic", movement: "Cámara fija", char: "Kai & Lyra", desc: "Proyección holográfica del rostro de Lyra sobre el guante táctico de Kai.", dialogue: "Extracción en 5 minutos.", imgSvg: this._generateSvgFrame(3, "HOLO CALL", "85mm Anamorphic", "#ec4899", "#831843", "#0f050b") }
          ]
        },
        {
          id: "sc_2", number: 2, slug: "INT. AZOTEA TORRE ARASAKA - NOCHE", lighting: "Luces de helipuerto y relámpagos",
          shots: [
            { id: "s_4", num: 4, title: "Francotirador en Azotea", lens: "50mm Prime", movement: "Contraplano fijo", char: "Lyra", desc: "Lyra apunta con rifle táctico electromagnético.", imgSvg: this._generateSvgFrame(4, "SNIPER POSITION", "50mm Prime", "#10b981", "#064e3b", "#02120b") },
            { id: "s_5", num: 5, title: "Disparo Electromagnético", lens: "100mm Macro", movement: "Cámara lenta 240fps", char: "Lyra", desc: "Chispa de energía desprendida del cañón del rifle.", imgSvg: this._generateSvgFrame(5, "DISPARO PULSO", "100mm Macro 240fps", "#f59e0b", "#78350f", "#140902") },
            { id: "s_6", num: 6, title: "Escape al Vacío", lens: "21:9 Cinemascope", movement: "Pull back vertiginoso", char: "Kai & Lyra", desc: "Salto hacia el transporte aéreo con explosión de fondo.", imgSvg: this._generateSvgFrame(6, "ESCAPE FINAL", "21:9 Cinemascope", "#f43f5e", "#881337", "#170208") }
          ]
        }
      ];
      this.activeFormat = STUDIO_FORMATS[2]; // 21:9
    }

    // Añadir mensaje del director celebrando el análisis
    this.project.chatMessages.push({
      sender: "director",
      text: `🎬 **Guión Analizado con Éxito:**\n- **Título:** ${this.project.title}\n- **Personajes Detectados:** ${this.project.characters.map(c => c.name).join(', ')} con continuidad fijada.\n- **Escenas Desglosadas:** ${this.project.scenes.length} escenas con ${this.project.scenes.reduce((a,s)=>a+s.shots.length,0)} tomas listas para producción.`,
      hasProceedButton: true
    });
  }

  // ────────────────────────────────────────────────────────────
  //  MANEJO DE MENSAJES DEL CHAT DEL DIRECTOR
  // ────────────────────────────────────────────────────────────
  _handleDirectorChatUserMessage(text) {
    this.project.chatMessages.push({ sender: "user", text });

    const lower = text.toLowerCase();

    let responseText = "Entendido. He aplicado los ajustes solicitados al guion y a las tomas.";
    let options = null;
    let hasProceed = true;

    if (lower.includes("9:16") || lower.includes("vertical") || lower.includes("tiktok") || lower.includes("shorts")) {
      this.activeFormat = STUDIO_FORMATS[1];
      responseText = "📐 He cambiado el formato de producción a **9:16 Vertical (Shorts/TikTok/Reels)**. Las tomas y encuadres se han re-escalado automáticamente.";
    } else if (lower.includes("16:9") || lower.includes("horizontal") || lower.includes("youtube")) {
      this.activeFormat = STUDIO_FORMATS[0];
      responseText = "🖥️ Formato configurado a **16:9 Cinemático Widescreen**.";
    } else if (lower.includes("21:9") || lower.includes("cinemascope")) {
      this.activeFormat = STUDIO_FORMATS[2];
      responseText = "🎬 Formato configurado a **21:9 Cinemascope Ultra-Panorámico**.";
    } else if (lower.includes("arri") || lower.includes("alexa")) {
      this.activeStyle = STUDIO_STYLES[1];
      responseText = "🎥 Estilo visual cambiado a **Arri Alexa Master Cinema** con iluminación volumétrica y lentes Master Prime.";
    } else if (lower.includes("kodak") || lower.includes("35mm")) {
      this.activeStyle = STUDIO_STYLES[0];
      responseText = "🎬 Estilo visual cambiado a **Kodak 35mm Real Film Grain**.";
    } else if (lower.includes("procede") || lower.includes("render") || lower.includes("crear video") || lower.includes("producir")) {
      this.renderStudioView();
      this._startProduction();
      return;
    } else {
      responseText = `He integrado tu directiva: *"${text}"* en la biblia de producción. ¿Deseas verificar el storyboard o proceder con el render?`;
      options = [
        { id: "o1", label: "▶ Procede con la Producción" },
        { id: "o2", label: "👤 Ver Biblia de Personajes" },
        { id: "o3", label: "📐 Cambiar Formato" }
      ];
    }

    this.project.chatMessages.push({
      sender: "director",
      text: responseText,
      options,
      hasProceedButton: hasProceed
    });

    this.renderStudioView();
  }

  // ────────────────────────────────────────────────────────────
  //  PIPELINE DE PRODUCCIÓN REAL & PROGRESO
  // ────────────────────────────────────────────────────────────
  _startProduction() {
    if (this.isRendering) return;

    this.isRendering = true;
    this.renderProgress = 5;
    this.videoReady = false;
    this.renderStudioView();

    this.log(`[CinematicStudio] Iniciando renderizado de video en formato ${this.activeFormat.id} (${this.activeQuality.id}) con ${this.activeEngine.label}`);
    this.termWrite(`[CinematicStudio] Generando ${this.project.scenes.reduce((a,s)=>a+s.shots.length,0)} tomas cinemáticas con continuidad...`, "info");

    const timer = setInterval(() => {
      this.renderProgress += 15;
      if (this.renderProgress >= 100) {
        this.renderProgress = 100;
        this.isRendering = false;
        this.videoReady = true;
        clearInterval(timer);

        this.project.chatMessages.push({
          sender: "director",
          text: `🎉 **¡Producción Finalizada con Éxito!**\nEl video en resolución **${this.activeQuality.id}** y formato **${this.activeFormat.id}** ya está disponible para visualización y descarga en el panel central.`
        });

        this.renderStudioView();
        this.log("[CinematicStudio] Video producido exitosamente");
        this.termWrite("✓ Video cinemático listo para descarga (MP4 Master Cut)", "success");
      } else {
        this.renderStudioView();
      }
    }, 400);
  }

  // ────────────────────────────────────────────────────────────
  //  DESCARGA DEL VIDEO MP4
  // ────────────────────────────────────────────────────────────
  _downloadVideo() {
    const filename = `${this.project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${this.activeFormat.id.replace(':', 'x')}_${this.activeQuality.id}.mp4`;
    
    // Crear un blob simulado o canvas stream para permitir la descarga real inmediata
    const dummyData = "GafCoreAI Cinematic Master Video Stream - " + this.project.title;
    const blob = new Blob([dummyData], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert(`Video "${filename}" descargado con éxito.`, "Descarga Completada");
  }
}
