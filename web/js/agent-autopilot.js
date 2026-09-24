// ============================================================
//  GafCoreAI - Agent Autopilot
//  Modo automatico: aplica cambios directamente al disco
// ============================================================

const AUTOPILOT_KEY = "gafcoreai_autopilot_mode";

export class AgentAutopilot {
  constructor({ state, log, termWrite, live }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.live = live;
    this.mode = localStorage.getItem(AUTOPILOT_KEY) || "review"; // "review" | "auto"
  }

  isAuto() { return this.mode === "auto"; }
  isReview() { return this.mode === "review"; }

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem(AUTOPILOT_KEY, mode);
    this.termWrite("🎛️ Modo del agente: " + (mode === "auto" ? "AUTOMATICO" : "REVISAR"), "success");
  }

  toggle() {
    this.setMode(this.isAuto() ? "review" : "auto");
    return this.mode;
  }

  /**
   * Decide si un cambio se aplica directo o se queda pendiente
   */
  async applyChange(path, content, reason) {
    if (this.isAuto()) {
      // Aplicar directo al disco + a memoria
      return await this.applyDirect(path, content, reason);
    } else {
      // Cola de pendientes
      if (this.state.pendingDiffs) {
        this.state.pendingDiffs.add(path, content, reason);
        if (this.live) this.live.filePending(path);
      }
      return { ok: true, pending: true };
    }
  }

  /**
   * Aplica al disco real
   */
  async applyDirect(path, content, reason) {
    // 1) Guardar en memoria
    if (!this.state.projectFiles) this.state.projectFiles = {};
    this.state.projectFiles[path] = content;

    // 2) Guardar al disco si hay carpeta
    if (this.state.diskFolder) {
      try {
        const folder = this.state.diskFolder;
        const sep = folder.includes("\\") ? "\\" : "/";
        let fullPath;
        if (/^[A-Za-z]:[\\\/]|^\//.test(path)) {
          fullPath = path;
        } else {
          fullPath = folder + sep + path;
        }

        const { invoke } = window.__TAURI__.core;
        await invoke("write_file", { path: fullPath, content });
        this.termWrite("  💾 Guardado directo: " + fullPath, "success");
        if (this.live) this.live.fileDone(path, true);
      } catch (e) {
        this.termWrite("  ✗ Error escribiendo al disco: " + e.message, "error");
        if (this.live) this.live.fileDone(path, false);
        return { ok: false, error: e.message };
      }
    } else {
      if (this.live) this.live.fileDone(path, true);
    }

    return { ok: true, applied: true };
  }
}