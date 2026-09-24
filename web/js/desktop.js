// ============================================================
//  GafCoreAI - Deteccion universal de escritorio
//  Envuelve todas las capacidades nativas con fallback seguro
// ============================================================

export const Desktop = {
  /**
   * Detecta si corremos dentro de Tauri (app de escritorio)
   * Chequea multiples senales para no fallar
   */
  isDesktop() {
    if (typeof window === "undefined") return false;
    if (window.__TAURI__) return true;
    if (window.__TAURI_INTERNALS__) return true;
    if (window.__TAURI_IPC__) return true;
    // Fallback: userAgent custom (si el WebView lo expone)
    if (navigator.userAgent && navigator.userAgent.includes("GafCoreAI")) return true;
    return false;
  },

  isWeb() {
    return !this.isDesktop();
  },

  /**
   * Chequea si un plugin especifico esta disponible
   */
  has(pluginName) {
    if (!this.isDesktop()) return false;
    if (!window.__TAURI__) return false;
    return !!window.__TAURI__[pluginName];
  },

  /**
   * Devuelve el core de Tauri o null
   */
  core() {
    if (!this.isDesktop()) return null;
    if (window.__TAURI__ && window.__TAURI__.core) return window.__TAURI__.core;
    if (window.__TAURI__ && window.__TAURI__.invoke) return { invoke: window.__TAURI__.invoke };
    return null;
  },

  /**
   * Wrapper generico para invoke con error claro
   */
  async invoke(cmd, args) {
    const c = this.core();
    if (!c || !c.invoke) {
      throw new Error("Comando '" + cmd + "' solo disponible en escritorio");
    }
    return await c.invoke(cmd, args);
  },

  /**
   * Dialogo abrir carpeta. Retorna null si cancela o no hay plugin.
   */
  async pickFolder() {
    if (this.isDesktop()) {
      try {
        const dialog = window.__TAURI__.dialog;
        if (dialog && dialog.open) {
          return await dialog.open({
            directory: true,
            multiple: false,
            title: "Selecciona una carpeta del proyecto"
          });
        }
      } catch (e) {
        console.error("[Desktop] pickFolder error:", e);
      }
    }
    // Soporte Web nativo con File System Access API
    if (typeof window !== "undefined" && window.showDirectoryPicker) {
      try {
        return await window.showDirectoryPicker();
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  /**
   * Dialogo abrir archivo
   */
  async pickFile(filters) {
    if (!this.isDesktop()) return null;
    try {
      const dialog = window.__TAURI__.dialog;
      if (!dialog || !dialog.open) return null;
      return await dialog.open({
        directory: false,
        multiple: false,
        title: "Selecciona un archivo",
        filters: filters || []
      });
    } catch (e) {
      return null;
    }
  },

  /**
   * Escuchar eventos del backend
   */
  async listen(event, handler) {
    if (!this.isDesktop()) return null;
    try {
      const ev = window.__TAURI__.event;
      if (!ev || !ev.listen) return null;
      return await ev.listen(event, handler);
    } catch (e) {
      return null;
    }
  },

  /**
   * Mostrar mensaje nativo (fallback a alert web)
   */
  async message(msg, title) {
    if (this.isDesktop() && window.__TAURI__.dialog && window.__TAURI__.dialog.message) {
      try {
        return await window.__TAURI__.dialog.message(String(msg), {
          title: title || "GafCoreAI",
          kind: "info"
        });
      } catch (e) {}
    }
    alert(msg);
  }
};

export function isDesktop() {
  return Desktop.isDesktop();
}

export function isWeb() {
  return Desktop.isWeb();
}