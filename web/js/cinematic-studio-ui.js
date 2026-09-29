// web/js/cinematic-studio-ui.js
// v59 — Fase 1: UI de 6 etapas. Sin mentir. Sin botones falsos.
// Etapas: Guion · Biblia · Clips · Post · Montaje · Exportar
// Fases 2-5 pendientes (LLM breakdown, generación con refs, SRT/TTS, ffmpeg concat).

import { CinematicProject, FORMATS, RESOLUTIONS, CLIP_STATUS } from "./cinematic-project.js";

let project = null;
let activeTab = "script";
let rootEl = null;

const TABS = [
  { id: "script",   label: "Guion",     hint: "Pegar / editar guion" },
  { id: "bible",    label: "Biblia",    hint: "Personajes y refs" },
  { id: "clips",    label: "Clips",     hint: "Desglose y cola" },
  { id: "post",     label: "Post",      hint: "Subtítulos y voz" },
  { id: "timeline", label: "Montaje",   hint: "Orden y transiciones" },
  { id: "export",   label: "Exportar",  hint: "Descargar / importar" },
];

// ────────────────────────────────────────────────────────
// Utilidades DOM
// ────────────────────────────────────────────────────────
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ────────────────────────────────────────────────────────
// Render principal
// ────────────────────────────────────────────────────────
export function mountCinematicStudio(container) {
  if (!container) {
    console.warn("[cinematic] Contenedor no provisto");
    return;
  }
  rootEl = container;
  project = new CinematicProject();
  render();
}

function render() {
  rootEl.innerHTML = "";
  rootEl.classList.add("cs-root");

  rootEl.appendChild(renderHeader());
  rootEl.appendChild(renderTabs());
  const body = el("div", { class: "cs-body" });
  body.appendChild(renderActiveTab());
  rootEl.appendChild(body);
}

// ────────────────────────────────────────────────────────
// Header (título, formato, resolución, stats honestos)
// ────────────────────────────────────────────────────────
function renderHeader() {
  const s = project.stats();

  const titleInput = el("input", {
    class: "cs-title-input",
    type: "text",
    value: project.data.title,
    placeholder: "Título del proyecto",
    oninput: (e) => { project.data.title = e.target.value; project.save(); },
  });

  const formatSelect = el("select", {
    class: "cs-select",
    onchange: (e) => { project.data.format = e.target.value; project.save(); render(); },
  }, FORMATS.map(f => el("option", { value: f.id, selected: project.data.format === f.id }, f.label)));

  const resSelect = el("select", {
    class: "cs-select",
    onchange: (e) => { project.data.resolution = e.target.value; project.save(); render(); },
  }, RESOLUTIONS.map(r => el("option", { value: r.id, selected: project.data.resolution === r.id }, r.label)));

  const stats = el("div", { class: "cs-stats" }, [
    el("span", { class: "cs-stat" }, `${s.scriptWords} palabras`),
    el("span", { class: "cs-stat" }, `${s.characters} personajes`),
    el("span", { class: "cs-stat" }, `${s.scenes} escenas`),
    el("span", { class: "cs-stat" }, `${s.clips} clips`),
    el("span", { class: "cs-stat" + (s.byStatus.ready ? " cs-stat-ready" : "") },
       `${s.byStatus.ready} listos · ${fmtDuration(s.readyDurationSec)}`),
  ]);

  return el("div", { class: "cs-header" }, [
    el("div", { class: "cs-header-row" }, [
      titleInput,
      el("div", { class: "cs-header-meta" }, [
        el("label", { class: "cs-field" }, [el("span", {}, "Formato"), formatSelect]),
        el("label", { class: "cs-field" }, [el("span", {}, "Resolución"), resSelect]),
      ]),
    ]),
    stats,
  ]);
}

// ────────────────────────────────────────────────────────
// Tabs
// ────────────────────────────────────────────────────────
function renderTabs() {
  const bar = el("div", { class: "cs-tabs" });
  for (const t of TABS) {
    bar.appendChild(el("button", {
      class: "cs-tab" + (activeTab === t.id ? " cs-tab-active" : ""),
      title: t.hint,
      onclick: () => { activeTab = t.id; render(); },
    }, t.label));
  }
  return bar;
}

function renderActiveTab() {
  switch (activeTab) {
    case "script":   return renderScriptTab();
    case "bible":    return renderBibleTab();
    case "clips":    return renderClipsTab();
    case "post":     return renderPostTab();
    case "timeline": return renderTimelineTab();
    case "export":   return renderExportTab();
    default:         return el("div", {}, "Pestaña desconocida");
  }
}

// ────────────────────────────────────────────────────────
// TAB: Guion
// ────────────────────────────────────────────────────────
function renderScriptTab() {
  const ta = el("textarea", {
    class: "cs-textarea cs-script",
    placeholder: "Pega aquí el guion (texto plano). Escenas, diálogos, acotaciones…",
    oninput: (e) => {
      project.data.script = e.target.value;
      project.save();
      // Stats en vivo sin re-render completo
      const s = project.stats();
      const stats = rootEl.querySelector(".cs-stats");
      if (stats) {
        stats.children[0].textContent = `${s.scriptWords} palabras`;
      }
    },
  });
  ta.value = project.data.script || "";

  return el("div", { class: "cs-panel" }, [
    el("div", { class: "cs-panel-head" }, [
      el("h3", {}, "1 · Guion"),
      el("span", { class: "cs-badge cs-badge-info" }, "Fase 2 pendiente: desglose automático con LLM"),
    ]),
    el("p", { class: "cs-help" },
      "Por ahora este texto se guarda tal cual. En Fase 2 el agente lo leerá y propondrá escenas + clips editables."),
    ta,
  ]);
}

// ────────────────────────────────────────────────────────
// TAB: Biblia (personajes)
// ────────────────────────────────────────────────────────
function renderBibleTab() {
  const list = el("div", { class: "cs-list" });

  for (const c of project.data.characters) {
    const card = el("div", { class: "cs-card" }, [
      el("div", { class: "cs-card-head" }, [
        el("input", {
          class: "cs-input cs-input-name",
          value: c.name,
          placeholder: "Nombre",
          onchange: (e) => { project.updateCharacter(c.id, { name: e.target.value }); render(); },
        }),
        el("button", {
          class: "cs-btn cs-btn-danger cs-btn-sm",
          title: "Eliminar personaje",
          onclick: () => {
            if (confirm(`¿Eliminar a "${c.name}"?`)) {
              project.removeCharacter(c.id);
              render();
            }
          },
        }, "×"),
      ]),
      el("label", { class: "cs-field-block" }, [
        el("span", {}, "Descripción / rasgos"),
        el("textarea", {
          class: "cs-textarea cs-textarea-sm",
          placeholder: "Ej: 35 años, cicatriz en ceja izquierda, tono grave, viste gabardina gris",
          onchange: (e) => { project.updateCharacter(c.id, { description: e.target.value }); },
        }, c.description || ""),
      ]),
      el("label", { class: "cs-field-block" }, [
        el("span", {}, "Voz (nota para TTS — Fase 4)"),
        el("input", {
          class: "cs-input",
          value: c.voice || "",
          placeholder: "Ej: masculina, grave, acento neutro",
          onchange: (e) => { project.updateCharacter(c.id, { voice: e.target.value }); },
        }),
      ]),
      el("div", { class: "cs-refs" }, [
        el("span", { class: "cs-badge cs-badge-warn" }, "Refs de rostro/vestuario: Fase 3"),
      ]),
    ]);
    list.appendChild(card);
  }

  const addBtn = el("button", {
    class: "cs-btn cs-btn-primary",
    onclick: () => {
      project.addCharacter({ name: "Nuevo personaje" });
      render();
    },
  }, "+ Añadir personaje");

  return el("div", { class: "cs-panel" }, [
    el("div", { class: "cs-panel-head" }, [
      el("h3", {}, "2 · Biblia de personajes"),
      el("span", { class: "cs-badge cs-badge-info" }, "Fase 3 pendiente: refs de rostro/vestuario"),
    ]),
    el("p", { class: "cs-help" },
      "Cada personaje tendrá refs de rostro y vestuario que se reutilizarán en cada clip. Ahora se guarda la ficha; las refs llegan en Fase 3."),
    list,
    addBtn,
  ]);
}

// ────────────────────────────────────────────────────────
// TAB: Clips
// ────────────────────────────────────────────────────────
function renderClipsTab() {
  const list = el("div", { class: "cs-list" });

  if (project.data.scenes.length === 0) {
    list.appendChild(el("div", { class: "cs-empty" },
      "No hay escenas todavía. Se crearán en Fase 2 cuando el agente desglose el guion. " +
      "Mientras tanto, puedes añadir una manualmente para probar la estructura."));
  }

  for (const s of project.data.scenes) {
    const clipCount = project.data.clips.filter(c => c.sceneId === s.id).length;
    const sceneCard = el("div", { class: "cs-card cs-card-scene" }, [
      el("div", { class: "cs-card-head" }, [
        el("span", { class: "cs-scene-num" }, `#${s.number}`),
        el("input", {
          class: "cs-input",
          value: s.slug,
          placeholder: "Slug de escena (ej: INT. OFICINA — DÍA)",
          onchange: (e) => { project.updateScene(s.id, { slug: e.target.value }); },
        }),
        el("button", {
          class: "cs-btn cs-btn-danger cs-btn-sm",
          onclick: () => {
            if (confirm(`¿Eliminar escena #${s.number} y sus ${clipCount} clips?`)) {
              project.removeScene(s.id);
              render();
            }
          },
        }, "×"),
      ]),
      el("div", { class: "cs-card-row" }, [
        el("span", { class: "cs-badge" }, `${clipCount} clip(s)`),
        el("button", {
          class: "cs-btn cs-btn-sm",
          onclick: () => {
            project.addClip({ sceneId: s.id, prompt: "", durationSec: 10 });
            render();
          },
        }, "+ Añadir clip"),
      ]),
      ...project.data.clips.filter(c => c.sceneId === s.id).map(c => renderClipRow(c)),
    ]);
    list.appendChild(sceneCard);
  }

  const addSceneBtn = el("button", {
    class: "cs-btn cs-btn-primary",
    onclick: () => {
      project.addScene({
        number: project.data.scenes.length + 1,
        slug: "Nueva escena",
      });
      render();
    },
  }, "+ Añadir escena manual");

  return el("div", { class: "cs-panel" }, [
    el("div", { class: "cs-panel-head" }, [
      el("h3", {}, "3 · Clips"),
      el("span", { class: "cs-badge cs-badge-warn" }, "Fase 3 pendiente: generación con refs"),
    ]),
    el("p", { class: "cs-help" },
      "La duración máxima por clip la impone el motor (5–15 s típico). Aquí se prepara el desglose; generar el .mp4 es Fase 3."),
    list,
    addSceneBtn,
  ]);
}

function renderClipRow(c) {
  const statusLabel = {
    [CLIP_STATUS.DRAFT]:   "borrador",
    [CLIP_STATUS.QUEUED]:  "en cola",
    [CLIP_STATUS.RUNNING]: "generando",
    [CLIP_STATUS.READY]:   "listo",
    [CLIP_STATUS.ERROR]:   "error",
  }[c.status] || c.status;

  return el("div", { class: "cs-clip-row" }, [
    el("span", { class: "cs-clip-order" }, String(c.order).padStart(2, "0")),
    el("input", {
      class: "cs-input cs-input-flex",
      value: c.prompt,
      placeholder: "Prompt del clip (ej: plano medio, personaje mira por la ventana)",
      onchange: (e) => { project.updateClip(c.id, { prompt: e.target.value }); },
    }),
    el("input", {
      class: "cs-input cs-input-num",
      type: "number",
      min: "1", max: "60", step: "1",
      value: c.durationSec,
      title: "Duración objetivo (s)",
      onchange: (e) => { project.updateClip(c.id, { durationSec: +e.target.value }); },
    }),
    el("span", { class: "cs-clip-status cs-clip-status-" + c.status }, statusLabel),
    el("button", {
      class: "cs-btn cs-btn-danger cs-btn-sm",
      onclick: () => { project.removeClip(c.id); render(); },
    }, "×"),
  ]);
}

// ────────────────────────────────────────────────────────
// TAB: Post (SRT / TTS — placeholder honesto)
// ────────────────────────────────────────────────────────
function renderPostTab() {
  const readyClips = project.data.clips.filter(c => c.status === CLIP_STATUS.READY);

  return el("div", { class: "cs-panel" }, [
    el("div", { class: "cs-panel-head" }, [
      el("h3", {}, "4 · Post-producción"),
      el("span", { class: "cs-badge cs-badge-info" }, "Fase 4 pendiente"),
    ]),
    el("p", { class: "cs-help" },
      "Aquí se generarán subtítulos SRT y doblaje TTS por clip. Requiere que el clip exista (Fase 3)."),
    el("div", { class: "cs-empty" },
      readyClips.length === 0
        ? "No hay clips listos todavía. Cuando Fase 3 esté implementada, aquí aparecerán con editor de subtítulos y nota de voz."
        : `${readyClips.length} clip(s) listos — editor SRT/TTS llega en Fase 4.`),
  ]);
}

// ────────────────────────────────────────────────────────
// TAB: Montaje (timeline)
// ────────────────────────────────────────────────────────
function renderTimelineTab() {
  const readyClips = project.data.clips.filter(c => c.status === CLIP_STATUS.READY);

  return el("div", { class: "cs-panel" }, [
    el("div", { class: "cs-panel-head" }, [
      el("h3", {}, "5 · Montaje"),
      el("span", { class: "cs-badge cs-badge-info" }, "Fase 5 pendiente"),
    ]),
    el("p", { class: "cs-help" },
      "Aquí se concatenan los clips con ffmpeg (en el .exe) para formar episodios o películas. " +
      "El orden se toma de la lista de clips; las transiciones se definirán por clip."),
    el("div", { class: "cs-empty" },
      readyClips.length === 0
        ? "No hay clips listos para montar."
        : `${readyClips.length} clip(s) listos — concatenación ffmpeg llega en Fase 5.`),
  ]);
}

// ────────────────────────────────────────────────────────
// TAB: Exportar
// ────────────────────────────────────────────────────────
function renderExportTab() {
  const exportBtn = el("button", {
    class: "cs-btn cs-btn-primary",
    onclick: () => {
      const blob = new Blob([project.exportJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project.data.title || "proyecto").replace(/[^\w\-]+/g, "_")}.cinematic.json`;
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
        const text = await file.text();
        try {
          project.importJSON(text);
          render();
          alert("Proyecto importado correctamente.");
        } catch (e) {
          alert("Error al importar: " + e.message);
        }
      };
      input.click();
    },
  }, "⬆️ Importar proyecto (.json)");

  const resetBtn = el("button", {
    class: "cs-btn cs-btn-danger",
    onclick: () => {
      if (confirm("¿Borrar TODOS los datos del proyecto actual? Esta acción no se puede deshacer.")) {
        project.reset();
        render();
      }
    },
  }, "🗑️ Reiniciar proyecto");

  const jsonArea = el("textarea", {
    class: "cs-textarea cs-json",
    readonly: "readonly",
  });
  jsonArea.value = project.exportJSON();

  return el("div", { class: "cs-panel" }, [
    el("div", { class: "cs-panel-head" }, [el("h3", {}, "6 · Exportar / Importar")]),
    el("p", { class: "cs-help" },
      "El proyecto se guarda automáticamente en este navegador. Exporta el .json para respaldarlo o moverlo entre máquinas."),
    el("div", { class: "cs-actions" }, [exportBtn, importBtn, resetBtn]),
    el("details", { class: "cs-details" }, [
      el("summary", {}, "Ver JSON actual"),
      jsonArea,
    ]),
  ]);
}

// ────────────────────────────────────────────────────────
// Auto-mount si encuentra contenedor típico
// ────────────────────────────────────────────────────────
function tryAutoMount() {
  const candidates = [
    "#cinematic-studio-view",
    "#cinematic-studio",
    "[data-cinematic-studio]",
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) {
      mountCinematicStudio(el);
      return;
    }
  }
  // No fallar en silencio: avisar
  console.info("[cinematic] No se encontró contenedor de estudio cinematográfico. " +
               "Llama manualmente a mountCinematicStudio(el) cuando lo tengas.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", tryAutoMount, { once: true });
} else {
  tryAutoMount();
}

// Exponer global para integración manual
window.gafcoreCinematic = { mount: mountCinematicStudio };