// ============================================================
//  GafCoreAI - Proactive Engine
//  Se anticipa a lo que el usuario necesita
// ============================================================

export class ProactiveEngine {
  constructor({ state, log, termWrite, live }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.live = live;
    this.suggestions = [];      // sugerencias pendientes
    this.dismissed = new Set(); // sugerencias descartadas
    this.onSuggestion = null;   // callback para mostrar en UI
  }

  /**
   * Sugerencia desde el watcher
   */
  push(suggestion) {
    const key = suggestion.type + "::" + (suggestion.message || "").slice(0, 40);
    if (this.dismissed.has(key)) return;
    if (this.suggestions.find(s => s.key === key)) return;

    suggestion.key = key;
    suggestion.ts = Date.now();
    this.suggestions.push(suggestion);
    if (this.suggestions.length > 20) this.suggestions.shift();

    if (this.termWrite) {
      this.termWrite("💡 Sugerencia: " + suggestion.message, "warn");
    }

    if (this.onSuggestion) {
      try { this.onSuggestion(suggestion); } catch (e) {}
    }
  }

  /**
   * Analiza el estado actual y genera sugerencias
   */
  analyze() {
    const s = this.state;

    // 1) Sin modelo verificado
    if (!s.activeProvider || !s.activeModel) {
      const verified = (s.providers || []).some(p =>
        (p.groups || []).some(g => g.key)
      );
      if (!verified) {
        this.push({
          type: "setup",
          message: "Configura al menos 1 API key en Proveedores para empezar",
          action: "open-providers",
          severity: "error"
        });
      }
    }

    // 2) Sin carpeta abierta
    if (!s.diskFolder) {
      this.push({
        type: "workflow",
        message: "Abre una carpeta de proyecto para que el agente pueda trabajar en tu disco",
        action: "open-folder",
        severity: "info"
      });
    }

    // 3) Carpeta abierta pero RAG no indexado
    if (s.diskFolder && s.rag && !s.rag.indexed) {
      this.push({
        type: "workflow",
        message: "Indexa el proyecto para respuestas con contexto real",
        action: "index-rag",
        severity: "info"
      });
    }

    // 4) Cambios pendientes acumulados
    if (s.pendingChanges && s.pendingChanges.size > 5) {
      this.push({
        type: "review",
        message: s.pendingChanges.size + " cambios pendientes de aprobar",
        action: "review-pending",
        severity: "warn"
      });
    }

    // 5) Modo revisar con muchas tareas
    if (s.autopilot && s.autopilot.isReview() && s.history && s.history.length > 10) {
      this.push({
        type: "mode",
        message: "Considera activar Modo AUTO para no aprobar cada cambio",
        action: "toggle-autopilot",
        severity: "info"
      });
    }

    // 6) Falta configurar Supabase o GitHub
    if (!localStorage.getItem("gafcoreai_github")) {
      this.push({
        type: "connect",
        message: "Conecta GitHub para clonar y publicar proyectos",
        action: "open-connections",
        severity: "info"
      });
    }
  }

  dismiss(key) {
    this.dismissed.add(key);
    this.suggestions = this.suggestions.filter(s => s.key !== key);
  }

  clearAll() {
    this.suggestions = [];
  }

  list() {
    return this.suggestions.slice();
  }
}