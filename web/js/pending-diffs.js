// ============================================================
//  GafCoreAI - Cambios pendientes (pending diffs)
// ============================================================

export class PendingDiffs {
  constructor({ state, log, termWrite, onNotify }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.onNotify = onNotify || (() => {});
    if (!this.state.pendingChanges) {
      this.state.pendingChanges = new Map();
    }
  }

  add(path, newContent, source) {
    const old = (this.state.projectFiles && this.state.projectFiles[path] !== undefined)
      ? this.state.projectFiles[path]
      : null;

    this.state.pendingChanges.set(path, {
      path,
      oldContent: old,
      newContent: String(newContent || ""),
      source: source || "agent",
      ts: Date.now()
    });

    this.log("Pendiente: " + path + (old === null ? " (nuevo)" : " (modificado)"));
    this.notify();
  }

  has(path) {
    return this.state.pendingChanges.has(path);
  }

  get(path) {
    return this.state.pendingChanges.get(path);
  }

  getEffective(path) {
    if (this.state.pendingChanges.has(path)) {
      return this.state.pendingChanges.get(path).newContent;
    }
    return this.state.projectFiles ? this.state.projectFiles[path] : undefined;
  }

  accept(path) {
    const c = this.state.pendingChanges.get(path);
    if (!c) return false;

    if (!this.state.projectFiles) this.state.projectFiles = {};
    this.state.projectFiles[path] = c.newContent;
    this.state.pendingChanges.delete(path);

    // Guardar al disco si aplica
    this.maybeWriteToDisk(path, c.newContent);

    this.termWrite("✓ Aceptado: " + path, "success");
    this.notify();
    return true;
  }

  reject(path) {
    if (!this.state.pendingChanges.has(path)) return false;
    this.state.pendingChanges.delete(path);
    this.termWrite("✗ Rechazado: " + path, "warn");
    this.notify();
    return true;
  }

  acceptAll() {
    const paths = Array.from(this.state.pendingChanges.keys());
    paths.forEach(p => this.accept(p));
    if (paths.length) this.termWrite("✓✓ " + paths.length + " cambios aplicados", "success");
    return paths.length;
  }

  rejectAll() {
    const paths = Array.from(this.state.pendingChanges.keys());
    paths.forEach(p => this.reject(p));
    if (paths.length) this.termWrite("✗✗ " + paths.length + " cambios descartados", "warn");
    return paths.length;
  }

  async maybeWriteToDisk(path, content) {
    if (!this.state.diskFolder) return;
    if (typeof window === "undefined" || !window.__TAURI__) return;
    try {
      const invoke = window.__TAURI__.core ? window.__TAURI__.core.invoke : window.__TAURI__.invoke;
      if (!invoke) return;
      const sep = this.state.diskFolder.includes("\\") ? "\\" : "/";
      const cleanPath = String(path || "").replace(/^[\\\/]+/, "");
      const fullPath = this.state.diskFolder + sep + cleanPath;
      await invoke("write_file", { path: fullPath, content: String(content || "") });
      this.log("Escrito al disco: " + fullPath);
    } catch (e) {
      this.log("Error escribiendo al disco: " + e.message);
    }
  }

  clear() {
    this.state.pendingChanges.clear();
    this.notify();
  }

  get count() {
    return this.state.pendingChanges.size;
  }

  notify() {
    try { this.onNotify(); } catch (e) { console.warn(e); }
  }
}