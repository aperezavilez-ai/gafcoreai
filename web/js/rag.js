// ============================================================
//  GafCoreAI - RAG (busqueda semantica del repositorio)
// ============================================================
import { Embeddings } from "./embeddings.js";
import { tauri } from "./tauri-bridge.js";

const RAG_STORAGE_KEY = "gafcoreai_rag_index";
const RAG_CONFIG_KEY = "gafcoreai_rag_config";

const DEFAULT_RAG_CONFIG = {
  chunkSize: 1200,     // caracteres por chunk
  chunkOverlap: 200,   // overlap entre chunks
  topK: 5,             // chunks a recuperar
  maxFileSize: 200000, // ignorar archivos mayores a 200 KB
  useEmbeddings: true, // false -> usar BM25 (keywords)
  excludeDirs: ["node_modules", ".git", "target", "dist", "build", ".next", "out", ".cache", "__pycache__", "venv", ".venv", "vendor"]
};

const TEXT_EXTENSIONS = [
  "txt","md","markdown","json","js","jsx","mjs","cjs","ts","tsx","html","htm",
  "css","scss","sass","less","py","rb","php","java","c","cpp","h","hpp","cs",
  "go","rs","swift","kt","scala","sh","bash","zsh","ps1","bat","cmd",
  "yml","yaml","toml","ini","env","sql","xml","csv","log","vue","svelte",
  "dockerfile","makefile","gitignore","graphql","proto","lua","r","dart"
];

export class RAG {
  constructor({ state, log, termWrite, onProgress }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.onProgress = onProgress || (() => {});

    this.embeddings = new Embeddings({ log: this.log });
    this.config = this.loadConfig();
    this.index = [];         // [{ path, chunkIndex, text, embedding? }]
    this.fileHashes = {};    // path -> hash del contenido
    this.indexed = false;
    this.indexing = false;
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(RAG_CONFIG_KEY);
      if (raw) return Object.assign({}, DEFAULT_RAG_CONFIG, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULT_RAG_CONFIG);
  }

  saveConfig() {
    localStorage.setItem(RAG_CONFIG_KEY, JSON.stringify(this.config));
  }

  isTextFile(name) {
    const lower = (name || "").toLowerCase();
    if (TEXT_EXTENSIONS.includes(lower)) return true;
    const ext = lower.split(".").pop();
    return TEXT_EXTENSIONS.includes(ext);
  }

  shouldSkip(path) {
    const parts = path.split(/[\/\\]/);
    return parts.some(p => this.config.excludeDirs.includes(p));
  }

  hashContent(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h |= 0;
    }
    return "h" + h + ":" + str.length;
  }

  /**
   * Divide texto en chunks con overlap
   */
  chunkText(text, path) {
    const chunks = [];
    const size = this.config.chunkSize;
    const overlap = this.config.chunkOverlap;
    const step = Math.max(1, size - overlap);

    for (let i = 0; i < text.length; i += step) {
      const slice = text.slice(i, i + size);
      if (slice.trim().length < 20) continue;
      chunks.push({
        path,
        chunkIndex: chunks.length,
        start: i,
        text: slice
      });
      if (i + size >= text.length) break;
    }
    return chunks;
  }

  /**
   * Indexa un solo archivo (recibe path + content)
   */
  async indexFile(path, content) {
    if (!content) return 0;
    if (content.length > this.config.maxFileSize) return 0;
    if (!this.isTextFile(path)) return 0;
    if (this.shouldSkip(path)) return 0;

    const hash = this.hashContent(content);
    if (this.fileHashes[path] === hash) return 0; // no cambio

    this.fileHashes[path] = hash;

    // Quitar chunks viejos de este archivo
    this.index = this.index.filter(c => c.path !== path);

    const chunks = this.chunkText(content, path);
    this.index.push(...chunks);
    return chunks.length;
  }

  /**
   * Indexa TODOS los archivos disponibles
   */
  async indexAll({ includeProject = true, includeDisk = true, includeRepo = true } = {}) {
    if (this.indexing) {
      this.termWrite("⚠ Ya hay una indexacion en curso", "warn");
      return;
    }

    this.indexing = true;
    this.termWrite("");
    this.termWrite("📚 Iniciando indexacion del proyecto...", "head");
    this.termWrite("", "normal");

    const files = []; // [{ path, content }]

    // 1) Proyecto del agente (memoria)
    if (includeProject && this.state.projectFiles) {
      Object.keys(this.state.projectFiles).forEach(p => {
        if (this.isTextFile(p) && !this.shouldSkip(p)) {
          files.push({ path: p, content: this.state.projectFiles[p] });
        }
      });
    }

    // 2) Disco real
    if (includeDisk && this.state.diskFolder && tauri.isTauri) {
      try {
        const diskFiles = await this.scanDiskFolder(this.state.diskFolder, 0);
        diskFiles.forEach(f => files.push(f));
      } catch (e) {
        this.termWrite("✘ Error escaneando disco: " + e.message, "error");
      }
    }

    // 3) Repo de GitHub
    if (includeRepo && this.state.repo) {
      this.termWrite("📥 Descargando archivos del repo (max 50)...", "dim");
      const repoFiles = await this.downloadRepoFiles();
      repoFiles.forEach(f => files.push(f));
    }

    this.termWrite("📂 " + files.length + " archivos para indexar", "normal");

    if (!files.length) {
      this.termWrite("⚠ No hay archivos para indexar. Abre una carpeta o carga un repo primero.", "warn");
      this.indexing = false;
      return;
    }

    // Chunkear todo
    this.index = [];
    let totalChunks = 0;
    for (const f of files) {
      const added = await this.indexFile(f.path, f.content);
      totalChunks += added;
    }

    this.termWrite("✂ " + this.index.length + " chunks generados", "dim");

    // Generar embeddings si esta configurado
    if (this.config.useEmbeddings && this.embeddings.isConfigured()) {
      try {
        await this.generateAllEmbeddings();
      } catch (e) {
        this.termWrite("⚠ Error embeddings: " + e.message, "warn");
        this.termWrite("  Continuando en modo BM25 (keywords)", "dim");
      }
    } else {
      this.termWrite("💡 Sin embeddings configurados, usando BM25 (keywords)", "dim");
      this.termWrite("  Configura en 📚 Indexar > Configuracion para mejor precision", "dim");
    }

    this.indexed = true;
    this.indexing = false;
    this.saveIndex();

    this.termWrite("");
    this.termWrite("✅ Indexacion completa: " + this.index.length + " chunks de " + files.length + " archivos", "success");
    this.termWrite("", "normal");

    this.onProgress({ done: true, chunks: this.index.length, files: files.length });
  }

  async scanDiskFolder(folder, depth) {
    if (depth > 5) return [];
    const out = [];
    try {
      const entries = await tauri.listDir(folder);
      for (const e of entries) {
        if (this.shouldSkip(e.path)) continue;
        if (e.is_dir) {
          const sub = await this.scanDiskFolder(e.path, depth + 1);
          sub.forEach(f => out.push(f));
        } else if (e.is_file && this.isTextFile(e.name)) {
          if (e.size > this.config.maxFileSize) continue;
          try {
            const content = await tauri.readFile(e.path);
            out.push({ path: e.path, content });
          } catch (err) { /* skip */ }
        }
      }
    } catch (e) { /* skip */ }
    return out;
  }

  async downloadRepoFiles() {
    const out = [];
    if (!this.state.repo || !this.state.repo.tree) return out;
    const cfg = JSON.parse(localStorage.getItem("gafcoreai_github") || "{}");

    const files = this.state.repo.tree
      .filter(f => this.isTextFile(f.path) && !this.shouldSkip(f.path) && (f.size || 0) < this.config.maxFileSize)
      .slice(0, 50);

    for (const f of files) {
      try {
        const headers = { "Accept": "application/vnd.github+json" };
        if (cfg.token) headers["Authorization"] = "Bearer " + cfg.token;
        const url = "https://api.github.com/repos/" + this.state.repo.owner + "/" + this.state.repo.name +
          "/contents/" + f.path + "?ref=" + this.state.repo.branch;
        const r = await fetch(url, { headers });
        if (!r.ok) continue;
        const data = await r.json();
        const content = data.content ? atob(data.content.replace(/\n/g, "")) : "";
        if (content) out.push({ path: f.path, content });
      } catch (e) { /* skip */ }
    }
    return out;
  }

  async generateAllEmbeddings() {
    if (!this.index.length) return;
    this.termWrite("🔮 Generando embeddings (esto tarda)...", "dim");

    const texts = this.index.map(c => c.text);
    const total = texts.length;
    const BATCH = 50;

    for (let i = 0; i < total; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      try {
        const vecs = await this.embeddings.embedBatch(batch);
        for (let j = 0; j < vecs.length; j++) {
          this.index[i + j].embedding = vecs[j];
        }
        const pct = Math.round(((i + batch.length) / total) * 100);
        this.onProgress({ pct, done: false });
        this.termWrite("  " + pct + "% (" + (i + batch.length) + "/" + total + ")", "dim");
      } catch (e) {
        this.termWrite("  ✘ Error en batch " + i + ": " + e.message, "error");
        throw e;
      }
    }
  }

  /**
   * Busqueda semantica
   */
  async search(query, topK) {
    if (!this.index.length) return [];
    const k = topK || this.config.topK;

    // Si hay embeddings, usar similitud coseno
    if (this.config.useEmbeddings && this.embeddings.isConfigured() && this.index[0].embedding) {
      try {
        const qVec = await this.embeddings.embed(query);
        if (qVec) {
          const scored = this.index
            .filter(c => c.embedding)
            .map(c => ({
              ...c,
              score: Embeddings.cosine(qVec, c.embedding)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
          return scored;
        }
      } catch (e) {
        this.log("Error busqueda vectorial, usando BM25: " + e.message);
      }
    }

    // Fallback: BM25 simplificado
    return this.searchBM25(query, k);
  }

  searchBM25(query, k) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (!terms.length) return [];

    const scored = this.index.map(chunk => {
      const text = chunk.text.toLowerCase();
      let score = 0;
      for (const term of terms) {
        const matches = (text.match(new RegExp(this.escapeRegex(term), "g")) || []).length;
        score += matches;
      }
      // Bonus si el path contiene el termino
      const pathLower = chunk.path.toLowerCase();
      for (const term of terms) {
        if (pathLower.includes(term)) score += 3;
      }
      return { ...chunk, score };
    });

    return scored
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Devuelve el contexto formateado para inyectar en el prompt
   */
  async buildContext(query, topK) {
    const results = await this.search(query, topK);
    if (!results.length) return "";

    let ctx = "\n\n--- CONTEXTO DEL PROYECTO (fragmentos relevantes) ---\n\n";
    results.forEach((c, i) => {
      ctx += "[" + (i + 1) + "] " + c.path + " (chunk " + c.chunkIndex + ")\n";
      ctx += "```\n" + c.text.slice(0, 1500) + "\n```\n\n";
    });
    ctx += "--- FIN DEL CONTEXTO ---\n";
    return ctx;
  }

  saveIndex() {
    try {
      // Guardar solo si no es enorme (limite localStorage ~5MB)
      const serialized = JSON.stringify({
        index: this.index.map(c => ({
          path: c.path,
          chunkIndex: c.chunkIndex,
          text: c.text,
          embedding: c.embedding || null
        })),
        fileHashes: this.fileHashes,
        ts: Date.now()
      });

      if (serialized.length > 4_500_000) {
        this.log("Indice muy grande para localStorage (" + Math.round(serialized.length/1024) + " KB), no se guardara");
        return;
      }

      localStorage.setItem(RAG_STORAGE_KEY, serialized);
      this.log("Indice guardado: " + Math.round(serialized.length / 1024) + " KB");
    } catch (e) {
      this.log("Error guardando indice: " + e.message);
    }
  }

  loadIndex() {
    try {
      const raw = localStorage.getItem(RAG_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.index = data.index || [];
      this.fileHashes = data.fileHashes || {};
      this.indexed = this.index.length > 0;
      return this.indexed;
    } catch (e) {
      this.log("Error cargando indice: " + e.message);
      return false;
    }
  }

  clear() {
    this.index = [];
    this.fileHashes = {};
    this.indexed = false;
    localStorage.removeItem(RAG_STORAGE_KEY);
    this.log("Indice RAG limpiado");
  }

  getStats() {
    const files = new Set(this.index.map(c => c.path));
    const withEmb = this.index.filter(c => c.embedding).length;
    return {
      chunks: this.index.length,
      files: files.size,
      withEmbeddings: withEmb,
      mode: withEmb > 0 ? "vectorial" : "BM25",
      indexed: this.indexed,
      indexing: this.indexing,
      embeddingsConfigured: this.embeddings.isConfigured()
    };
  }
}