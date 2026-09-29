// ============================================================
//  GafCoreAI - Cliente de embeddings
// ============================================================
import { safeFetch } from "./providers.js";
import { getSecret, setSecret, removeSecret } from "./secrets.js";

const EMBED_CONFIG_KEY = "gafcoreai_embed_config";

const DEFAULT_EMBED_CONFIG = {
  provider: "openai-compatible",
  url: "https://api.openai.com/v1",
  key: "",
  model: "text-embedding-3-small",
  dimensions: 1536
};

export class Embeddings {
  constructor({ log }) {
    this.log = log || console.log;
    this.config = this.loadConfig();
    this.cache = new Map(); // hash(text) -> embedding
  }

  loadConfig() {
    try {
      const raw = getSecret(EMBED_CONFIG_KEY);
      if (raw) return Object.assign({}, DEFAULT_EMBED_CONFIG, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULT_EMBED_CONFIG);
  }

  saveConfig() {
    setSecret(EMBED_CONFIG_KEY, JSON.stringify(this.config));
  }

  setConfig(cfg) {
    Object.assign(this.config, cfg);
    this.saveConfig();
    this.cache.clear();
  }

  isConfigured() {
    return !!(this.config.key && this.config.url && this.config.model);
  }

  /**
   * Genera embedding de un texto
   */
  async embed(text) {
    if (!this.isConfigured()) {
      throw new Error("Embeddings no configurados");
    }
    if (!text || typeof text !== "string") return null;

    // Truncar a ~8000 chars (limite de tokens)
    const input = text.slice(0, 8000);

    // Cache
    const key = this.hash(input);
    if (this.cache.has(key)) return this.cache.get(key);

    const url = this.config.url.replace(/\/$/, "") + "/embeddings";

    const res = await safeFetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + this.config.key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.config.model,
        input: input
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error("HTTP " + res.status + (errText ? " - " + errText.slice(0, 200) : ""));
    }

    const data = await res.json();
    const vec = data.data && data.data[0] && data.data[0].embedding;
    if (!vec || !Array.isArray(vec)) {
      throw new Error("Respuesta invalida del servidor de embeddings");
    }

    // Cache (limite 500 entradas)
    if (this.cache.size > 500) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, vec);

    return vec;
  }

  /**
   * Embedding en batch (para indexacion mas rapida)
   */
  async embedBatch(texts) {
    if (!this.isConfigured()) {
      throw new Error("Embeddings no configurados");
    }
    if (!texts || !texts.length) return [];

    // OpenAI permite hasta 2048 inputs por batch
    const BATCH_SIZE = 100;
    const results = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE).map(t => (t || "").slice(0, 8000));

      const url = this.config.url.replace(/\/$/, "") + "/embeddings";

      const res = await safeFetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + this.config.key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.config.model,
          input: batch
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error("HTTP " + res.status + (errText ? " - " + errText.slice(0, 200) : ""));
      }

      const data = await res.json();
      const vectors = (data.data || []).map(d => d.embedding);
      results.push(...vectors);

      this.log("Embeddings: " + (i + batch.length) + "/" + texts.length);
    }

    return results;
  }

  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return "e" + h + ":" + str.length;
  }

  /**
   * Similitud coseno entre 2 vectores
   */
  static cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}