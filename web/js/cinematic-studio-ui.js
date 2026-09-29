// web/js/cinematic-studio-ui.js
// v59.8 — Fase 2: preview de clips debajo del guion.

import { CinematicProject, FORMATS, RESOLUTIONS, CLIP_STATUS } from "./cinematic-project.js";
import { parseScriptFile } from "./cinematic-script-parser.js";
import { analyzeScript } from "./cinematic-breakdown.js";

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
    this._busy = false;
    this._progress = null;
  }

  init() { this._resolveHost(); this.log("Cinematic Studio Fase 2.1 cargado"); }

  renderStudioView() {
    if (!this._resolveHost()) return;
    this._root.innerHTML = "";
    this._root.classList.add("cs-root");
    this._root.appendChild(this._renderHeader());
    this._root.appendChild(this._renderTabs());
    const body = el("div", { class: "cs-body" });
    if (this._progress) body.appendChild(this._renderProgress());
    body.appendChild(this._renderTab());
    this._root.appendChild(body);
  }

  openGenerateVideoModal() {
    alert("Generación de video: Fase 3 pendiente.");
  }

  _resolveHost() {
    const sels = ["#view-studio","#cinematic-studio-view","#cinematic-studio","[data-view='studio']","[data-cinematic-studio]",".cinematic-studio-container"];
    for (const s of sels) { const n = document.querySelector(s); if (n) { this._root = n; return true; } }
    return !!this._root;
  }

  _renderProgress() {
    const p = this._progress;
    if (!p) return el("span");
    const pct = p.total > 0 ? Math.round((p.step / p.total) * 100) : 0;
    return el("div", { class: "cs-progress" }, [
      el("div", { class: "cs-progress-bar" }, [
        el("div", { class: "cs-progress-fill", style: `width:${pct}%` }),
      ]),
      el("span", { class: "cs-progress-text" }, p.message || ""),
    ]);
  }

  _renderHeader() {
    const s = this.project.stats();
    const titleInput = el("input", {
      class: "cs-title-input", type: "text", value: this.project.data.title,
      placeholder: "Título del proyecto",
      oninput: (e) => { this.project.data.title = e.target.value; this.project.save(); },
    });
    const fmtSel = el("select", { class: "cs-select",
      onchange: (e) => { this.project.data.format = e.target.value; this.project.save(); } },
      FORMATS.map(f => el("option", { value: f.id, selected: this.project.data.format === f.id }, f.label)));
    const resSel = el("select", { class: "cs-select",
      onchange: (e) => { this.project.data.resolution = e.target.value; this.project.save(); } },
      RESOLUTIONS.map(r => el("option", { value: r.id, selected: this.project.data.resolution === r.id }, r.label)));

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

  // ─── TAB GUION con preview de clips ─────────────────
  _tabScript() {
    const ta = el("textarea", {
      class: "cs-textarea cs-script",
      placeholder: "Pega el guion como texto plano, o usa el botón '📄 Subir guion' de arriba.",
      oninput: (e) => {
        this.project.data.script = e.target.value;
        this.project.save();
        const stats = this._root.querySelector(".cs-stats");
        if (stats) stats.children[0].textContent = `${this.project.stats().scriptWords} palabras`;
      },
    });
    ta.value = this.project.data.script || "";

    const uploadBtn = el("button", {
      class: "cs-btn cs-btn-primary",
      disabled: this._busy || false,
      onclick: () => this._handleUpload(),
    }, "📄 Subir guion (.docx / .txt / .fdx)");

    const analyzeBtn = el("button", {
      class: "cs-btn cs-btn-accent",
      disabled: this._busy || !(this.project.data.script || "").trim(),
      onclick: () => this._handleAnalyze(),
    }, this._busy ? "⏳ Analizando…" : "🧠 Analizar con IA → desglosar en clips");

    const hasResults = this.project.data.scenes.length > 0;

    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [
        el("h3", {}, "1 · Guion"),
        el("span", { class: "cs-badge cs-badge-ready" }, "Fase 2 activa"),
      ]),
      el("p", { class: "cs-help" },
        "Sube un .docx de Word (o .txt/.fountain/.fdx). La IA lo analiza y genera automáticamente " +
        "personajes (Biblia) y escenas con clips. Verás el desglose justo debajo."),
      el("div", { class: "cs-actions" }, [uploadBtn, analyzeBtn]),
      ta,

      // ↓↓↓ NUEVO: PREVIEW DE CLIPS DEBAJO DEL GUION ↓↓↓
      hasResults
        ? this._renderClipsPreview()
        : this._renderClipsPreviewEmpty(),
    ]);
  }

  _renderClipsPreviewEmpty() {
    return el("div", { class: "cs-preview-empty" }, [
      el("div", { class: "cs-preview-empty-icon" }, "🎬"),
      el("div", { class: "cs-preview-empty-title" }, "Aquí aparecerán los clips generados"),
      el("div", { class: "cs-preview-empty-text" },
        "Cuando pulses «🧠 Analizar con IA», verás debajo las escenas detectadas con sus clips, " +
        "los personajes y las duraciones. Podrás editarlos antes de pasar a generación de video."),
    ]);
  }

  _renderClipsPreview() {
    const s = this.project.stats();
    const totalDur = this.project.data.clips.reduce((acc, c) => acc + (c.durationSec || 0), 0);

    const summary = el("div", { class: "cs-preview-summary" }, [
      el("span", { class: "cs-preview-badge" }, `${s.scenes} escenas`),
      el("span", { class: "cs-preview-badge" }, `${s.clips} clips`),
      el("span", { class: "cs-preview-badge" }, `${s.characters} personajes`),
      el("span", { class: "cs-preview-badge cs-preview-badge-accent" }, `≈ ${fmtDur(totalDur)} de video`),
      el("button", {
        class: "cs-btn cs-btn-sm",
        style: "margin-left:auto",
        onclick: () => { this.activeTab = "clips"; this.renderStudioView(); },
      }, "Ver detalle en Clips →"),
    ]);

    const list = el("div", { class: "cs-preview-list" });

    for (const scene of this.project.data.scenes) {
      const clips = this.project.data.clips.filter(c => c.sceneId === scene.id);
      const sceneCard = el("div", { class: "cs-preview-scene" }, [
        el("div", { class: "cs-preview-scene-head" }, [
          el("span", { class: "cs-preview-scene-num" }, `Escena ${scene.number}`),
          el("span", { class: "cs-preview-scene-slug" }, scene.slug || "—"),
          el("span", { class: "cs-preview-scene-count" }, `${clips.length} clip(s)`),
        ]),
        scene.action
          ? el("div", { class: "cs-preview-scene-action" }, scene.action)
          : null,
      ]);

      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        sceneCard.appendChild(el("div", { class: "cs-preview-clip" }, [
          el("span", { class: "cs-preview-clip-num" }, `${scene.number}.${i + 1}`),
          el("span", { class: "cs-preview-clip-prompt" }, c.prompt || "(sin prompt)"),
          el("span", { class: "cs-preview-clip-dur" }, `${c.durationSec}s`),
          el("span", { class: "cs-clip-status cs-clip-status-" + c.status },
            { [CLIP_STATUS.DRAFT]: "borrador", [CLIP_STATUS.READY]: "listo" }[c.status] || c.status),
        ]));
      }

      list.appendChild(sceneCard);
    }

    return el("div", { class: "cs-preview" }, [
      el("div", { class: "cs-preview-head" }, [
        el("h4", {}, "🎬 Clips generados"),
      ]),
      summary,
      list,
    ]);
  }

  async _handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".docx,.txt,.md,.fountain,.fdx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      this._busy = true;
      this._progress = { step: 0, total: 1, message: `Cargando ${file.name}…` };
      this.renderStudioView();

      try {
        const res = await parseScriptFile(file);
        this.project.data.script = res.text;
        if (!this.project.data.title || this.project.data.title === "Sin título") {
          this.project.data.title = res.originalName.replace(/\.[^.]+$/, "");
        }
        this.project.save();
        this._progress = null;
        this._busy = false;
        this.renderStudioView();
        let msg = `✅ ${res.originalName} cargado (${res.chars} chars, ${res.source})`;
        if (res.warnings?.length) msg += "\n\n⚠️ " + res.warnings.join("\n⚠️ ");
        alert(msg);
      } catch (e) {
        this._busy = false;
        this._progress = null;
        this.renderStudioView();
        alert("Error al cargar archivo:\n\n" + e.message);
      }
    };
    input.click();
  }

  async _handleAnalyze() {
    const script = (this.project.data.script || "").trim();
    if (!script) { alert("No hay guion cargado."); return; }

    const hasData = this.project.data.characters.length > 0 || this.project.data.scenes.length > 0;
    if (hasData && !confirm(
      "Ya tienes personajes/escenas. ¿Reemplazar con el nuevo análisis?\n\n" +
      "(Cancelar = conservar los actuales, no se hará nada.)"
    )) return;

    this._busy = true;
    this._progress = { step: 0, total: 1, message: "Enviando guion al modelo…" };
    this.renderStudioView();

    try {
      const result = await analyzeScript(script, {
        onProgress: (p) => {
          this._progress = p;
          this.renderStudioView();
        },
      });

      this.project.data.characters = [];
      this.project.data.scenes = [];
      this.project.data.clips = [];
      this.project.data.timeline = [];

      if (result.title && result.title !== "Sin título") this.project.data.title = result.title;
      if (result.logline) this.project.data.logline = result.logline;

      const nameToId = new Map();
      for (const c of result.characters) {
        const created = this.project.addCharacter({ name: c.name, description: c.description, voice: c.voice });
        nameToId.set(c.name.toLowerCase(), created.id);
      }

      let totalClips = 0;
      for (const s of result.scenes) {
        const charIds = (s.characterIds || [])
          .map(n => nameToId.get(String(n).toLowerCase()))
          .filter(Boolean);
        const scene = this.project.addScene({
          number: s.number,
          slug: s.slug,
          location: s.location,
          timeOfDay: s.timeOfDay,
          action: s.action,
          characterIds: charIds,
        });
        for (const cl of s.clips) {
          this.project.addClip({
            sceneId: scene.id,
            prompt: cl.prompt,
            durationSec: cl.durationSec,
          });
          totalClips++;
        }
      }

      this.project.save();
      this._busy = false;
      this._progress = null;
      // Nos quedamos en Guion para que veas el preview debajo
      this.activeTab = "script";
      this.renderStudioView();
      alert(
        `✅ Análisis completo\n\n` +
        `Personajes: ${result.characters.length}\n` +
        `Escenas: ${result.scenes.length}\n` +
        `Clips propuestos: ${totalClips}\n\n` +
        `Los clips aparecen debajo del guion. También en la pestaña «Clips» para editarlos.`
      );
    } catch (e) {
      this._busy = false;
      this._progress = null;
      this.renderStudioView();
      alert("Error en el análisis:\n\n" + e.message);
    }
  }

  // ─── Resto de tabs ─────────────────────────────────
  _tabBible() {
    const list = el("div", { class: "cs-list" });
    for (const c of this.project.data.characters) {
      list.appendChild(el("div", { class: "cs-card" }, [
        el("div", { class: "cs-card-head" }, [
          el("input", { class: "cs-input cs-input-name", value: c.name, placeholder: "Nombre",
            onchange: (e) => { this.project.updateCharacter(c.id, { name: e.target.value }); this.renderStudioView(); } }),
          el("button", { class: "cs-btn cs-btn-danger cs-btn-sm",
            onclick: () => { if (confirm(`¿Eliminar a "${c.name}"?`)) { this.project.removeCharacter(c.id); this.renderStudioView(); } } }, "×"),
        ]),
        el("label", { class: "cs-field-block" }, [
          el("span", {}, "Descripción / rasgos"),
          el("textarea", { class: "cs-textarea cs-textarea-sm",
            placeholder: "Rasgos físicos, vestuario, edad…",
            onchange: (e) => this.project.updateCharacter(c.id, { description: e.target.value }) }, c.description || ""),
        ]),
        el("label", { class: "cs-field-block" }, [
          el("span", {}, "Voz (para TTS — Fase 4)"),
          el("input", { class: "cs-input", value: c.voice || "",
            placeholder: "Ej: masculina, grave, neutro",
            onchange: (e) => this.project.updateCharacter(c.id, { voice: e.target.value }) }),
        ]),
        el("div", { class: "cs-refs" }, [
          el("span", { class: "cs-badge cs-badge-warn" }, "Refs de rostro/vestuario: Fase 3"),
        ]),
      ]));
    }
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [el("h3", {}, "2 · Biblia de personajes")]),
      el("p", { class: "cs-help" }, "Los personajes detectados por la IA aparecen aquí."),
      list,
      el("button", { class: "cs-btn cs-btn-primary",
        onclick: () => { this.project.addCharacter({ name: "Nuevo personaje" }); this.renderStudioView(); } }, "+ Añadir personaje"),
    ]);
  }

  _tabClips() {
    const list = el("div", { class: "cs-list" });
    if (this.project.data.scenes.length === 0) {
      list.appendChild(el("div", { class: "cs-empty" },
        "No hay escenas. Sube un guion y pulsa «🧠 Analizar con IA» en la pestaña Guion."));
    }
    for (const s of this.project.data.scenes) {
      const sceneClips = this.project.data.clips.filter(c => c.sceneId === s.id);
      list.appendChild(el("div", { class: "cs-card cs-card-scene" }, [
        el("div", { class: "cs-card-head" }, [
          el("span", { class: "cs-scene-num" }, `#${s.number}`),
          el("input", { class: "cs-input", value: s.slug, placeholder: "Slug",
            onchange: (e) => this.project.updateScene(s.id, { slug: e.target.value }) }),
          el("button", { class: "cs-btn cs-btn-danger cs-btn-sm",
            onclick: () => { if (confirm(`¿Eliminar escena #${s.number} y sus ${sceneClips.length} clips?`)) { this.project.removeScene(s.id); this.renderStudioView(); } } }, "×"),
        ]),
        s.action ? el("div", { class: "cs-help cs-scene-action" }, s.action) : null,
        el("div", { class: "cs-card-row" }, [
          el("span", { class: "cs-badge" }, `${sceneClips.length} clip(s)`),
          el("button", { class: "cs-btn cs-btn-sm",
            onclick: () => { this.project.addClip({ sceneId: s.id, durationSec: 10 }); this.renderStudioView(); } }, "+ Añadir clip"),
        ]),
        ...sceneClips.map(c => this._clipRow(c)),
      ]));
    }
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [el("h3", {}, "3 · Clips")]),
      el("p", { class: "cs-help" }, "Cada clip = 5–15 s. Edita prompts y duraciones aquí."),
      list,
      el("button", { class: "cs-btn cs-btn-primary",
        onclick: () => { this.project.addScene({ number: this.project.data.scenes.length + 1, slug: "Nueva escena" }); this.renderStudioView(); } }, "+ Añadir escena manual"),
    ]);
  }

  _clipRow(c) {
    const label = {
      [CLIP_STATUS.DRAFT]: "borrador", [CLIP_STATUS.QUEUED]: "en cola",
      [CLIP_STATUS.RUNNING]: "generando", [CLIP_STATUS.READY]: "listo", [CLIP_STATUS.ERROR]: "error",
    }[c.status] || c.status;
    return el("div", { class: "cs-clip-row" }, [
      el("span", { class: "cs-clip-order" }, String(c.order).padStart(2, "0")),
      el("textarea", { class: "cs-textarea cs-clip-prompt", rows: "2",
        value: c.prompt, placeholder: "Prompt cinematográfico del clip",
        onchange: (e) => this.project.updateClip(c.id, { prompt: e.target.value }) }, c.prompt || ""),
      el("input", { class: "cs-input cs-input-num", type: "number", min: "1", max: "60",
        value: c.durationSec, title: "Duración objetivo (s)",
        onchange: (e) => this.project.updateClip(c.id, { durationSec: +e.target.value }) }),
      el("span", { class: "cs-clip-status cs-clip-status-" + c.status }, label),
      el("button", { class: "cs-btn cs-btn-danger cs-btn-sm",
        onclick: () => { this.project.removeClip(c.id); this.renderStudioView(); } }, "×"),
    ]);
  }

  _tabPost() {
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [el("h3", {}, "4 · Post-producción"), el("span", { class: "cs-badge cs-badge-info" }, "Fase 4")]),
      el("p", { class: "cs-help" }, "Subtítulos SRT y doblaje TTS por clip (Fase 4)."),
      el("div", { class: "cs-empty" }, "Pendiente Fase 4."),
    ]);
  }

  _tabTimeline() {
    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [el("h3", {}, "5 · Montaje"), el("span", { class: "cs-badge cs-badge-info" }, "Fase 5")]),
      el("p", { class: "cs-help" }, "Concatenación ffmpeg (Fase 5)."),
      el("div", { class: "cs-empty" }, "Pendiente Fase 5."),
    ]);
  }

  _tabExport() {
    const exportBtn = el("button", { class: "cs-btn cs-btn-primary",
      onclick: () => {
        const blob = new Blob([this.project.exportJSON()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(this.project.data.title || "proyecto").replace(/[^\w\-]+/g, "_")}.cinematic.json`;
        a.click();
        URL.revokeObjectURL(url);
      } }, "⬇️ Descargar proyecto (.json)");

    const importBtn = el("button", { class: "cs-btn",
      onclick: () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = ".json,application/json";
        input.onchange = async () => {
          const file = input.files?.[0]; if (!file) return;
          try { this.project.importJSON(await file.text()); this.renderStudioView(); alert("Importado."); }
          catch (e) { alert("Error: " + e.message); }
        };
        input.click();
      } }, "⬆️ Importar proyecto (.json)");

    const resetBtn = el("button", { class: "cs-btn cs-btn-danger",
      onclick: () => { if (confirm("¿Borrar TODOS los datos del proyecto actual?")) { this.project.reset(); this.renderStudioView(); } } }, "🗑️ Reiniciar proyecto");

    const jsonArea = el("textarea", { class: "cs-textarea cs-json", readonly: "readonly" });
    jsonArea.value = this.project.exportJSON();

    return el("div", { class: "cs-panel" }, [
      el("div", { class: "cs-panel-head" }, [el("h3", {}, "6 · Exportar / Importar")]),
      el("div", { class: "cs-actions" }, [exportBtn, importBtn, resetBtn]),
      el("details", { class: "cs-details" }, [el("summary", {}, "Ver JSON actual"), jsonArea]),
    ]);
  }
}