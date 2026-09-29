// web/js/cinematic-studio-ui.js
// v59.2 — Fase 1. Exporta `CinematicStudioUI` (nombre que app.js espera).
// 6 etapas: Guion · Biblia · Clips · Post · Montaje · Exportar

import { CinematicProject, FORMATS, RESOLUTIONS, CLIP_STATUS } from "./cinematic-project.js";

const TABS = [
  { id: "script",   label: "Guion" },
  { id: "bible",    label: "Biblia" },
  { id: "clips",    label: "Clips" },
  { id: "post",     label: "Post" },
  { id: "timeline", label: "Montaje" },
  { id: "export",   label: "Exportar" },
];

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

function fmtDur(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export class CinematicStudioUI {
  constructor(opts = {}) {
    this.opts = opts;
    this.state = opts.state || {};
    this.log = opts.log || (() => {});
    this.termWrite = opts.termWrite || (() => {});
    this.project = new CinematicProject();
    this.activeTab = "script";
    this._root = null;
    this._hostSelector = null;
  }

  // app.js llama esto tras el constructor
  init() {
    this._resolveHost();
    this.log("Cinematic Studio Fase 1 cargado");
  }

  // app.js llama esto al mostrar la vista de estudio
  renderStudioView() {
    if (!this._resolveHost()) {
      console.warn("[cinematic] No se encontró host para renderStudioView");
      return;
    }
    this._root.innerHTML = "";
    this._root.classList.add("cs-root");
    this._root.appendChild(this._renderHeader());
    this._root.appendChild(this._renderTabs());
    const body = el("div", { class: "cs-body" });
    body.appendChild(this._renderTab());
    this._root.appendChild(body);
  }

  // Legacy: otras partes de app.js lo llaman al pulsar "Generar video"
  openGenerateVideoModal(/* opts */) {
    alert(
      "Generación de video: Fase 3 pendiente.\n\n" +
      "El motor de generación aún no está integrado. Cuando esté listo, " +
      "esta acción enviará el clip seleccionado al proveedor configurado."
    );
  }

  _resolveHost() {
    const selectors = [
      "#view-studio",
      "#cinematic-studio-view",
      "#cinematic-studio",
      "[data-view='studio']",
      "[data-cinematic-studio]",
      ".cinematic-studio-container",
    ];
    for (const s of selectors) {
      const node = document.querySelector(s);
      if (node) { this._root = node; this._hostSelector = s; return true; }
    }
    return !!this._root;
  }

  // ─── Render ─────────────────────────────────────────
  _renderHeader() {
    const s = this.project.stats();
    const titleInput = el("input", {
      class: "cs-title-input",
      type: "text",
      value: this.project.data.title,
      placeholder: "Título del proyecto",
      oninput: (e) => { this.project.data.title = e.target.value; this.project.save(); },
    });
    const fmtSel = el("select", {
      class: "cs-select",
      onchange: (e) => { this.project.data.format = e.target.value; this.project.save(); },
    }, FORMATS.map(f => el("option", { value: f.id, selected: this.project.data.format === f.id }, f.label)));
    const resSel = el("select", {
      class: "cs-select",
      onchange: (e) => { this.project.data.resolution = e.target.value; this.project.save(); },
    }, RESOLUTIONS.map(r => el("option", { value: r.id, selected: this.project.data.resolution === r.id }, r.label)));

    return el("div", { class: "cs-header" }, [
      el("div", { class: "cs-header-row" }, [
        titleInput,
        el("div", { class: "cs-header-meta" }, [
          el("label", { class: "cs-field" }, [el("span", {}, "Formato"), fmtSel]),
          el("label", { class: "cs-field" }, [el("span", {}, "Resolución"), resSel]),
        ]),
      ]),
      el("div", { class: "cs-stats" }, [
        el("span", { class: "cs-stat" }, `${s.scriptWords} palabras`),
        el("span", { class: "cs-stat" }, `${s.characters} personajes`),
        el("span", { class: "cs-stat" }, `${s.scenes} escenas`),
        el("span", { class: "cs-stat" }, `${s.clips} clips`),
        el("span", { class: "cs-stat" + (s.byStatus.ready ? " cs-stat-ready" : "") },
           `${s.byStatus.ready} listos · ${fmtDur(s.readyDurationSec)}`),
      ]),
    ]);
  }

  _renderTabs() {
    const bar = el("div", { class: "cs-tabs" });
    for (const t of TABS) {
      bar.appendChild(el("button", {
        class: "cs-tab" + (this.activeTab === t.id ? " cs-tab-active" : ""),
        onclick: () => { this.activeTab = t.id; this.renderStudioView(); },
      }, t.label));
    }
    return bar;
  }

  _renderTab() {
    switch (this.activeTab) {
      case "script":   return this._tabScript();
      case "bible":    return this._tabBible();
      case "clips":    return this._tabClips();
      case "post":     return this._tabPost();
      case "timeline": return this._tabTimeline();
      case "export":   return this._tabExport();
      default:         return el("div", {}, "—");
    }
  }

  _tabScript() {
    const ta = el("textarea", {
      class: "cs-textarea cs-script",
      placeholder: "Pega aquí el guion (texto plano). Escenas, diálogos, acotaciones…",
      oninput: (e) => {
        this.project.data.script = e.target.value;
        this.project.save();
        const stats = this._root.querySelector(".cs-stats");
        if (stats) stats.children[0].textContent = `${this.project.stats().scriptWords} palabras`;
      },
    });
    ta.value = this.project.data.script || "";
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [
        el("h3", {}, "1 · Guion"),
        el("span", { class: "cs-badge cs-badge-info" }, "Fase 2 pendiente: desglose automático"),
      ]),
      el("p", { class: "cs-help" },
        "El texto se guarda tal cual. En Fase 2 el agente lo leerá y propondrá escenas + clips editables."),
      ta,
    ]);
  }

  _tabBible() {
    const list = el("div", { class: "cs-list" });
    for (const c of this.project.data.characters) {
      list.appendChild(el("div", { class: "cs-card" }, [
        el("div", { class: "cs-card-head" }, [
          el("input", {
            class: "cs-input cs-input-name",
            value: c.name,
            placeholder: "Nombre",
            onchange: (e) => { this.project.updateCharacter(c.id, { name: e.target.value }); this.renderStudioView(); },
          }),
          el("button", {
            class: "cs-btn cs-btn-danger cs-btn-sm",
            onclick: () => {
              if (confirm(`¿Eliminar a "${c.name}"?`)) { this.project.removeCharacter(c.id); this.renderStudioView(); }
            },
          }, "×"),
        ]),
        el("label", { class: "cs-field-block" }, [
          el("span", {}, "Descripción / rasgos"),
          el("textarea", {
            class: "cs-textarea cs-textarea-sm",
            placeholder: "Ej: 35 años, cicatriz en ceja izquierda, viste gabardina gris",
            onchange: (e) => this.project.updateCharacter(c.id, { description: e.target.value }),
          }, c.description || ""),
        ]),
        el("label", { class: "cs-field-block" }, [
          el("span", {}, "Voz (para TTS — Fase 4)"),
          el("input", {
            class: "cs-input",
            value: c.voice || "",
            placeholder: "Ej: masculina, grave, acento neutro",
            onchange: (e) => this.project.updateCharacter(c.id, { voice: e.target.value }),
          }),
        ]),
        el("div", { class: "cs-refs" }, [
          el("span", { class: "cs-badge cs-badge-warn" }, "Refs de rostro/vestuario: Fase 3"),
        ]),
      ]));
    }
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [
        el("h3", {}, "2 · Biblia de personajes"),
        el("span", { class: "cs-badge cs-badge-info" }, "Fase 3 pendiente: refs"),
      ]),
      el("p", { class: "cs-help" },
        "Cada personaje tendrá refs de rostro y vestuario reutilizables en cada clip. Ahora se guarda la ficha."),
      list,
      el("button", {
        class: "cs-btn cs-btn-primary",
        onclick: () => { this.project.addCharacter({ name: "Nuevo personaje" }); this.renderStudioView(); },
      }, "+ Añadir personaje"),
    ]);
  }

  _tabClips() {
    const list = el("div", { class: "cs-list" });
    if (this.project.data.scenes.length === 0) {
      list.appendChild(el("div", { class: "cs-empty" },
        "No hay escenas todavía. Se crearán en Fase 2 cuando el agente desglose el guion. " +
        "Mientras tanto puedes añadir una manualmente para probar la estructura."));
    }
    for (const s of this.project.data.scenes) {
      const sceneClips = this.project.data.clips.filter(c => c.sceneId === s.id);
      list.appendChild(el("div", { class: "cs-card cs-card-scene" }, [
        el("div", { class: "cs-card-head" }, [
          el("span", { class: "cs-scene-num" }, `#${s.number}`),
          el("input", {
            class: "cs-input",
            value: s.slug,
            placeholder: "Slug (ej: INT. OFICINA — DÍA)",
            onchange: (e) => this.project.updateScene(s.id, { slug: e.target.value }),
          }),
          el("button", {
            class: "cs-btn cs-btn-danger cs-btn-sm",
            onclick: () => {
              if (confirm(`¿Eliminar escena #${s.number} y sus ${sceneClips.length} clips?`)) {
                this.project.removeScene(s.id); this.renderStudioView();
              }
            },
          }, "×"),
        ]),
        el("div", { class: "cs-card-row" }, [
          el("span", { class: "cs-badge" }, `${sceneClips.length} clip(s)`),
          el("button", {
            class: "cs-btn cs-btn-sm",
            onclick: () => { this.project.addClip({ sceneId: s.id, durationSec: 10 }); this.renderStudioView(); },
          }, "+ Añadir clip"),
        ]),
        ...sceneClips.map(c => this._clipRow(c)),
      ]));
    }
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [
        el("h3", {}, "3 · Clips"),
        el("span", { class: "cs-badge cs-badge-warn" }, "Fase 3 pendiente: generación"),
      ]),
      el("p", { class: "cs-help" },
        "La duración máxima por clip la impone el motor (5–15 s típico). Aquí se prepara el desglose."),
      list,
      el("button", {
        class: "cs-btn cs-btn-primary",
        onclick: () => { this.project.addScene({ number: this.project.data.scenes.length + 1, slug: "Nueva escena" }); this.renderStudioView(); },
      }, "+ Añadir escena manual"),
    ]);
  }

  _clipRow(c) {
    const label = {
      [CLIP_STATUS.DRAFT]: "borrador", [CLIP_STATUS.QUEUED]: "en cola",
      [CLIP_STATUS.RUNNING]: "generando", [CLIP_STATUS.READY]: "listo", [CLIP_STATUS.ERROR]: "error",
    }[c.status] || c.status;
    return el("div", { class: "cs-clip-row" }, [
      el("span", { class: "cs-clip-order" }, String(c.order).padStart(2, "0")),
      el("input", {
        class: "cs-input cs-input-flex",
        value: c.prompt,
        placeholder: "Prompt del clip",
        onchange: (e) => this.project.updateClip(c.id, { prompt: e.target.value }),
      }),
      el("input", {
        class: "cs-input cs-input-num", type: "number", min: "1", max: "60",
        value: c.durationSec, title: "Duración objetivo (s)",
        onchange: (e) => this.project.updateClip(c.id, { durationSec: +e.target.value }),
      }),
      el("span", { class: "cs-clip-status cs-clip-status-" + c.status }, label),
      el("button", {
        class: "cs-btn cs-btn-danger cs-btn-sm",
        onclick: () => { this.project.removeClip(c.id); this.renderStudioView(); },
      }, "×"),
    ]);
  }

  _tabPost() {
    const ready = this.project.data.clips.filter(c => c.status === CLIP_STATUS.READY);
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [
        el("h3", {}, "4 · Post-producción"),
        el("span", { class: "cs-badge cs-badge-info" }, "Fase 4 pendiente"),
      ]),
      el("p", { class: "cs-help" }, "Subtítulos SRT y doblaje TTS por clip. Requiere clip generado (Fase 3)."),
      el("div", { class: "cs-empty" },
        ready.length === 0
          ? "No hay clips listos todavía."
          : `${ready.length} clip(s) listos — editor SRT/TTS llega en Fase 4.`),
    ]);
  }

  _tabTimeline() {
    const ready = this.project.data.clips.filter(c => c.status === CLIP_STATUS.READY);
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [
        el("h3", {}, "5 · Montaje"),
        el("span", { class: "cs-badge cs-badge-info" }, "Fase 5 pendiente"),
      ]),
      el("p", { class: "cs-help" },
        "Concatenación con ffmpeg (en el .exe) para formar episodios o películas."),
      el("div", { class: "cs-empty" },
        ready.length === 0
          ? "No hay clips listos para montar."
          : `${ready.length} clip(s) listos — concatenación ffmpeg llega en Fase 5.`),
    ]);
  }

  _tabExport() {
    const exportBtn = el("button", {
      class: "cs-btn cs-btn-primary",
      onclick: () => {
        const blob = new Blob([this.project.exportJSON()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(this.project.data.title || "proyecto").replace(/[^\w\-]+/g, "_")}.cinematic.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    }, "⬇️ Descargar proyecto (.json)");

    const importBtn = el("button", {
      class: "cs-btn",
      onclick: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            this.project.importJSON(await file.text());
            this.renderStudioView();
            alert("Proyecto importado.");
          } catch (e) { alert("Error: " + e.message); }
        };
        input.click();
      },
    }, "⬆️ Importar proyecto (.json)");

    const resetBtn = el("button", {
      class: "cs-btn cs-btn-danger",
      onclick: () => {
        if (confirm("¿Borrar TODOS los datos del proyecto actual?")) {
          this.project.reset();
          this.renderStudioView();
        }
      },
    }, "🗑️ Reiniciar proyecto");

    const jsonArea = el("textarea", { class: "cs-textarea cs-json", readonly: "readonly" });
    jsonArea.value = this.project.exportJSON();

    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [el("h3", {}, "6 · Exportar / Importar")]),
      el("p", { class: "cs-help" },
        "El proyecto se guarda en este navegador. Exporta el .json para respaldarlo o moverlo."),
      el("div", { class: "cs-actions" }, [exportBtn, importBtn, resetBtn]),
      el("details", { class: "cs-details" }, [
        el("summary", {}, "Ver JSON actual"),
        jsonArea,
      ]),
    ]);
  }
}