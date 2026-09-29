// web/js/cinematic-project.js
// v59 — Fase 1: modelo de datos del Estudio Cinematográfico.
// Persistencia: localStorage (clave única). Sin mentir, sin magia.
// Formato del proyecto documentado en DEFAULT_PROJECT.

const STORAGE_KEY = "gafcoreai_cinematic_project_v1";
const SCHEMA_VERSION = 1;

export const FORMATS = [
  { id: "16:9",  label: "16:9 — Cine / TV horizontal" },
  { id: "9:16",  label: "9:16 — Vertical (Reels/Shorts)" },
  { id: "21:9",  label: "21:9 — Cinemascope" },
  { id: "1:1",   label: "1:1 — Cuadrado" },
];

export const RESOLUTIONS = [
  { id: "720p",  label: "720p (informativo — depende del motor)" },
  { id: "1080p", label: "1080p (recomendado)" },
  { id: "4K",    label: "4K (informativo — solo si el motor lo soporta)" },
];

export const CLIP_STATUS = {
  DRAFT:    "draft",     // creado, sin generar
  QUEUED:   "queued",    // en cola (Fase 3)
  RUNNING:  "running",   // generando (Fase 3)
  READY:    "ready",     // clip .mp4 en disco
  ERROR:    "error",     // falló la generación
};

export const DEFAULT_PROJECT = {
  schemaVersion: SCHEMA_VERSION,
  id: crypto.randomUUID(),
  title: "Sin título",
  logline: "",
  format: "16:9",
  resolution: "1080p",
  language: "es",

  // Guion crudo (texto libre por ahora; parser LLM = Fase 2)
  script: "",

  // Biblia de personajes — cada uno con refs reutilizables por clip
  // { id, name, description, voice, refs: { face: dataURL|null, outfits: [{ act, note, dataURL }] } }
  characters: [],

  // Escenas detectadas/creadas manualmente
  // { id, number, slug, location, timeOfDay, characterIds: [], action, clipIds: [] }
  scenes: [],

  // Clips — la unidad real de generación (5–15s según motor)
  // { id, sceneId, order, prompt, durationSec, provider, status, videoPath, srtPath, voicePath, createdAt, updatedAt }
  clips: [],

  // Timeline de montaje
  // { clipId, order, transitionIn: 'cut'|'fade'|'dissolve' }
  timeline: [],

  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export class CinematicProject {
  constructor() {
    this.data = this._load() || deepClone(DEFAULT_PROJECT);
    // Migración de schema en el futuro
    if (this.data.schemaVersion !== SCHEMA_VERSION) {
      this.data.schemaVersion = SCHEMA_VERSION;
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      console.warn("[cinematic] Error al cargar proyecto:", e);
      return null;
    }
  }

  save() {
    this.data.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("[cinematic] No se pudo guardar (¿quota excedida?):", e);
    }
  }

  reset() {
    this.data = deepClone(DEFAULT_PROJECT);
    this.data.id = crypto.randomUUID();
    this.save();
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !parsed.schemaVersion) {
      throw new Error("JSON inválido: no parece un proyecto de GafCoreAI Cinematic");
    }
    this.data = parsed;
    this.save();
  }

  // ─── Personajes ───────────────────────────────────────
  addCharacter({ name, description = "", voice = "" }) {
    const c = {
      id: crypto.randomUUID(),
      name: name || "Sin nombre",
      description,
      voice,
      refs: { face: null, outfits: [] },
    };
    this.data.characters.push(c);
    this.save();
    return c;
  }

  updateCharacter(id, patch) {
    const c = this.data.characters.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch);
    this.save();
    return c;
  }

  removeCharacter(id) {
    this.data.characters = this.data.characters.filter((x) => x.id !== id);
    this.save();
  }

  // ─── Escenas ──────────────────────────────────────────
  addScene({ number, slug = "", location = "", timeOfDay = "", action = "", characterIds = [] }) {
    const s = {
      id: crypto.randomUUID(),
      number: number ?? (this.data.scenes.length + 1),
      slug,
      location,
      timeOfDay,
      characterIds,
      action,
      clipIds: [],
    };
    this.data.scenes.push(s);
    this.save();
    return s;
  }

  updateScene(id, patch) {
    const s = this.data.scenes.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    this.save();
    return s;
  }

  removeScene(id) {
    // Los clips de esa escena quedan huérfanos → se eliminan también
    const scene = this.data.scenes.find((x) => x.id === id);
    if (scene) {
      this.data.clips = this.data.clips.filter((c) => c.sceneId !== id);
      this.data.timeline = this.data.timeline.filter((t) =>
        this.data.clips.some((c) => c.id === t.clipId)
      );
    }
    this.data.scenes = this.data.scenes.filter((x) => x.id !== id);
    this.save();
  }

  // ─── Clips ────────────────────────────────────────────
  addClip({ sceneId, prompt, durationSec = 10, provider = "minimax" }) {
    const clip = {
      id: crypto.randomUUID(),
      sceneId,
      order: this.data.clips.length + 1,
      prompt: prompt || "",
      durationSec,
      provider,
      status: CLIP_STATUS.DRAFT,
      videoPath: null,
      srtPath: null,
      voicePath: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.clips.push(clip);
    const scene = this.data.scenes.find((s) => s.id === sceneId);
    if (scene && !scene.clipIds.includes(clip.id)) scene.clipIds.push(clip.id);
    this.save();
    return clip;
  }

  updateClip(id, patch) {
    const c = this.data.clips.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch, { updatedAt: Date.now() });
    this.save();
    return c;
  }

  removeClip(id) {
    this.data.clips = this.data.clips.filter((c) => c.id !== id);
    this.data.timeline = this.data.timeline.filter((t) => t.clipId !== id);
    for (const s of this.data.scenes) {
      s.clipIds = s.clipIds.filter((cid) => cid !== id);
    }
    this.save();
  }

  // ─── Estadísticas honestas ────────────────────────────
  stats() {
    const byStatus = { draft: 0, queued: 0, running: 0, ready: 0, error: 0 };
    let totalSec = 0;
    for (const c of this.data.clips) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.status === CLIP_STATUS.READY) totalSec += c.durationSec || 0;
    }
    return {
      characters: this.data.characters.length,
      scenes: this.data.scenes.length,
      clips: this.data.clips.length,
      byStatus,
      readyDurationSec: totalSec,
      readyDurationMin: +(totalSec / 60).toFixed(2),
      scriptChars: (this.data.script || "").length,
      scriptWords: (this.data.script || "").trim().split(/\s+/).filter(Boolean).length,
    };
  }
}