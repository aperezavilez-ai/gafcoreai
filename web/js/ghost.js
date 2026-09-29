// ============================================================
//  GafCoreAI - Ghost Text (autocompletado predictivo con IA)
//  Usa Monaco InlineCompletionsProvider
// ============================================================
import { chatCompletion } from "./providers.js";
import { getSecret, setSecret, removeSecret } from "./secrets.js";

const GHOST_CONFIG_KEY = "gafcoreai_ghost_config";

const GHOST_CONFIG_DEFAULT = {
  enabled: false,
  modelId: "",
  maxLines: 3,
  contextLines: 40
};

export class GhostText {
  constructor({ state, log, termWrite }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.config = this.loadConfig();
    this.cache = new Map();
    this.lastRequestId = 0;
    this.inFlight = null;
    this.registered = false;
  }

  loadConfig() {
    try {
      const raw = getSecret(GHOST_CONFIG_KEY);
      if (raw) return Object.assign({}, GHOST_CONFIG_DEFAULT, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, GHOST_CONFIG_DEFAULT);
  }

  saveConfig() {
    setSecret(GHOST_CONFIG_KEY, JSON.stringify(this.config));
  }

  isEnabled() {
    return this.config.enabled !== false && !!this.getModel();
  }

  setEnabled(v) {
    this.config.enabled = !!v;
    this.saveConfig();
    this.log("Ghost: " + (this.config.enabled ? "ON" : "OFF"));
  }

  setModel(id) {
    this.config.modelId = id;
    this.saveConfig();
  }

  setMaxLines(n) {
    this.config.maxLines = Math.max(1, Math.min(8, parseInt(n) || 3));
    this.saveConfig();
  }

  getModel() {
    if (this.config.modelId) {
      const parts = this.config.modelId.split("::");
      const provId = parts[0], modelId = parts[1];
      const provider = (this.state.providers || []).find(p => p.id === provId);
      if (provider) {
        const model = (provider.models || []).find(m => m.id === modelId && m.key);
        if (model) return { provider, model };
      }
    }
    if (typeof this.state.resolveAutoModel === "function") {
      const resolved = this.state.resolveAutoModel();
      if (resolved && resolved.provider && resolved.model && resolved.model.key) {
        return resolved;
      }
    }
    if (this.state.activeProvider && this.state.activeModel && this.state.activeModel.key) {
      return { provider: this.state.activeProvider, model: this.state.activeModel };
    }
    return null;
  }

  // ============================================================
  //  Registrar el provider de Monaco
  // ============================================================
  register() {
    if (this.registered) return;
    if (typeof monaco === "undefined") {
      this.log("Ghost: monaco no disponible");
      return;
    }

    const languages = [
      "javascript", "typescript", "javascriptreact", "typescriptreact",
      "python", "java", "go", "rust", "c", "cpp", "csharp",
      "php", "ruby", "html", "css", "scss", "less",
      "json", "yaml", "markdown", "sql", "shell", "plaintext"
    ];

    const self = this;

    languages.forEach(lang => {
      try {
        monaco.languages.registerInlineCompletionsProvider(lang, {
          provideInlineCompletions: async (model, position, context, token) => {
            if (!self.isEnabled()) return { items: [] };
            if (token && token.isCancellationRequested) return { items: [] };

            try {
              const text = await self.generateCompletion(model, position, token);
              if (!text) return { items: [] };

              return {
                items: [{
                  insertText: text,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  )
                }]
              };
            } catch (e) {
              if (!e.message || !e.message.includes("cancel")) {
                console.warn("Ghost generate error:", e);
              }
              return { items: [] };
            }
          },
          freeInlineCompletions: () => {}
        });
      } catch (e) {
        console.warn("Ghost: error registrando", lang, e);
      }
    });

    this.registered = true;
    this.log("Ghost: registrado para " + languages.length + " lenguajes");
  }

  // ============================================================
  //  Generar completion
  // ============================================================
  async generateCompletion(editorModel, position, cancellationToken) {
    const modelInfo = this.getModel();
    if (!modelInfo) return "";

    // Contexto: ultimas N lineas hasta la posicion
    const startLine = Math.max(1, position.lineNumber - this.config.contextLines);
    let prefix = "";
    try {
      const range = new monaco.Range(startLine, 1, position.lineNumber, position.column);
      prefix = editorModel.getValueInRange(range);
    } catch (e) {
      return "";
    }

    if (!prefix || prefix.trim().length < 10) return "";

    // Cache por hash del prefijo (para no consultar dos veces lo mismo)
    const cacheKey = this.hash(prefix.slice(-1200));
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Cancelar peticion anterior si existe
    if (this.inFlight) {
      try { this.inFlight.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    this.inFlight = controller;

    const requestId = ++this.lastRequestId;

    const sysPrompt =
      "Eres un autocompletador de codigo. Continua EXACTAMENTE el codigo que te doy con reglas ESTRICTAS:\n" +
      "- Devuelve SOLO el codigo que sigue, sin explicaciones\n" +
      "- Maximo " + this.config.maxLines + " lineas\n" +
      "- NO uses bloques markdown (nada de ```)\n" +
      "- NO agregues texto explicativo\n" +
      "- Empieza DIRECTAMENTE con el codigo\n" +
      "- Respeta el estilo e indentacion del codigo previo\n" +
      "- Si el codigo esta completo, devuelve cadena vacia";

    const messages = [
      { role: "system", content: sysPrompt },
      { role: "user", content: "Codigo previo:\n\n" + prefix + "\n\n[FIN]\n\nTu continuacion (solo codigo):" }
    ];

    let text = "";
    try {
      text = await chatCompletion(
        modelInfo.provider,
        modelInfo.model,
        messages,
        () => {},
        { timeout: 10000, signal: controller.signal }
      );
    } catch (e) {
      this.inFlight = null;
      return "";
    }

    if (requestId !== this.lastRequestId) return "";
    this.inFlight = null;

    // Limpiar el resultado
    let clean = (text || "").trim();
    clean = clean.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/\n?```$/, "");
    clean = clean.trim();

    // Limitar lineas
    const lines = clean.split("\n").slice(0, this.config.maxLines);
    clean = lines.join("\n");

    if (!clean) return "";

    // Evitar duplicar el ultimo char ya existente
    // Cache (max 300 entradas)
    if (this.cache.size > 300) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, clean);

    return clean;
  }

  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return "g" + h;
  }

  clearCache() {
    this.cache.clear();
    this.log("Ghost: cache limpiado");
  }

  getStats() {
    return { cacheSize: this.cache.size, enabled: this.config.enabled };
  }
}