// ============================================================
//  GafCoreAI - Synaptic Knowledge Graph Engine (v1.0)
//  Red sináptica de nodos, relaciones, pesos reforzados y memoria
//  de causa-efecto para optimización extrema de tokens y latencia.
// ============================================================

/**
 * Función rápida de Hash de cadenas (para Browser y Node)
 */
export function computeFastHash(str) {
  if (!str) return "0";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36) + "_" + str.length;
}

/**
 * Firma estable de un error: primera linea util sin rutas, cadenas ni numeros,
 * para que el mismo fallo en otro archivo o puerto coincida.
 */
export function errorSignature(message) {
  const line = String(message || "").split(/\r?\n/).map(s => s.trim()).find(s => s.length > 3) || "";
  return line.toLowerCase()
    .replace(/[a-z]:[\\/][^\s'"`]*/gi, "<path>")
    .replace(/(?:\.{0,2}\/)?(?:[\w.-]+\/)+[\w.-]+/g, "<path>")
    .replace(/(["'`])(?:(?!\1).)*\1/g, "<str>")
    .replace(/\b0x[0-9a-f]+\b/g, "<n>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .trim();
}

const STOPWORDS = new Set("el la los las un una unos unas de del al y o en con por para que se su sus es son lo le les mi tu como mas pero sin sobre este esta esto ese esa the a an of to and or in on for with is are be it this that".split(" "));

function normalizeWord(w) {
  return w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function tokenize(text) {
  return String(text || "").toLowerCase().split(/[^a-z0-9áéíóúñü_]+/i)
    .map(normalizeWord)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function nodeText(node) {
  let data = "";
  try { data = node.data ? Object.values(node.data).filter(v => typeof v === "string").join(" ") : ""; } catch (_) {}
  return (node.label || "") + " " + (node.id || "") + " " + data;
}

// Solapamiento de terminos con prefijo de 5 letras como raiz (crear/creando, proyecto/proyectos).
export function lexicalSimilarity(queryTokens, text) {
  if (!queryTokens.length) return 0;
  const stems = new Set(tokenize(text).map(w => w.slice(0, 5)));
  if (!stems.size) return 0;
  let hits = 0;
  for (const q of new Set(queryTokens)) if (stems.has(q.slice(0, 5))) hits++;
  return hits / Math.sqrt(new Set(queryTokens).size * Math.min(stems.size, 40));
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

export class SynapticGraph {
  constructor(opts = {}) {
    this.storageKey = opts.storageKey || "gafcore_synaptic_graph_v1";
    this.nodes = new Map(); // id -> { id, type, label, data, hash, hits, updatedAt, immutable }
    this.edges = new Map(); // key `${source}->${target}` -> { source, target, relation, weight, successes, failures, updatedAt }
    this.metrics = {
      tokensSavedEstimate: 0,
      cacheHits: 0,
      queriesProcessed: 0,
      errorFixesApplied: 0
    };
    
    this.load();
    this.bootstrapGafcoreEcosystem();
  }

  // ────────────────────────────────────────────────────────
  //  GESTIÓN DE NODOS
  // ────────────────────────────────────────────────────────
  addNode(node) {
    if (!node || !node.id) return null;
    const existing = this.nodes.get(node.id);
    const updated = {
      id: node.id,
      type: node.type || "generic",
      label: node.label || node.id,
      data: node.data || {},
      hash: node.hash || (node.content ? computeFastHash(node.content) : (existing ? existing.hash : "")),
      hits: existing ? existing.hits + 1 : 1,
      updatedAt: Date.now(),
      immutable: !!node.immutable
    };
    this.nodes.set(node.id, updated);
    this.saveDebounced();
    return updated;
  }

  getNode(id) {
    const node = this.nodes.get(id);
    if (node) {
      node.hits = (node.hits || 0) + 1;
    }
    return node || null;
  }

  hasNode(id) {
    return this.nodes.has(id);
  }

  removeNode(id) {
    const node = this.nodes.get(id);
    if (node && node.immutable) return false;
    this.nodes.delete(id);
    // Eliminar aristas conectadas
    for (const [key, edge] of this.edges.entries()) {
      if (edge.source === id || edge.target === id) {
        this.edges.delete(key);
      }
    }
    this.saveDebounced();
    return true;
  }

  // ────────────────────────────────────────────────────────
  //  GESTIÓN DE ARISTAS (SINAPSIS) Y APRENDIZAJE POR REFUERZO
  // ────────────────────────────────────────────────────────
  connect(sourceId, targetId, relation = "related_to", initialWeight = 1.0) {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return null;
    const key = `${sourceId}->${targetId}`;
    const existing = this.edges.get(key);
    
    const edge = {
      source: sourceId,
      target: targetId,
      relation,
      weight: existing ? existing.weight : initialWeight,
      successes: existing ? existing.successes : 0,
      failures: existing ? existing.failures : 0,
      updatedAt: Date.now()
    };
    this.edges.set(key, edge);
    this.saveDebounced();
    return edge;
  }

  recordSuccess(sourceId, targetId, relation = "related_to") {
    const key = `${sourceId}->${targetId}`;
    let edge = this.edges.get(key);
    if (!edge) {
      edge = this.connect(sourceId, targetId, relation, 1.0);
    }
    if (edge) {
      edge.successes += 1;
      edge.weight = Math.min(10.0, edge.weight + 0.15);
      edge.updatedAt = Date.now();
      this.saveDebounced();
    }
  }

  recordFailure(sourceId, targetId, relation = "related_to") {
    const key = `${sourceId}->${targetId}`;
    const edge = this.edges.get(key);
    if (edge) {
      edge.failures += 1;
      edge.weight = Math.max(0.05, edge.weight - 0.10);
      edge.updatedAt = Date.now();
      this.saveDebounced();
    }
  }

  // Ids con prefijo "tipo:nombre" (agent:Coder, task_type:code, tool:read_file).
  ensureNode(id) {
    if (!this.nodes.has(id)) {
      const sep = id.indexOf(":");
      this.addNode({ id, type: sep > 0 ? id.slice(0, sep) : "generic", label: sep > 0 ? id.slice(sep + 1) : id });
    }
    return this.nodes.get(id);
  }

  // Refuerzo que crea nodos y arista si faltan (recordFailure solo no hace nada sin arista previa).
  reinforce(sourceId, targetId, relation, success) {
    this.ensureNode(sourceId);
    this.ensureNode(targetId);
    if (!this.edges.has(`${sourceId}->${targetId}`)) this.connect(sourceId, targetId, relation, 1.0);
    if (success) this.recordSuccess(sourceId, targetId, relation);
    else this.recordFailure(sourceId, targetId, relation);
  }

  getEdgeWeight(sourceId, targetId, fallback = 1.0) {
    const edge = this.edges.get(`${sourceId}->${targetId}`);
    return edge ? edge.weight : fallback;
  }

  exportEdges(filter) {
    const out = [];
    for (const edge of this.edges.values()) {
      if (!filter || filter(edge)) out.push({ ...edge });
    }
    return out;
  }

  // Ultimo en escribir gana, comparando updatedAt. Devuelve true si se aplico.
  mergeRemoteEdge(remote) {
    if (!remote || !remote.source || !remote.target) return false;
    const ts = typeof remote.updatedAt === "number" ? remote.updatedAt : Date.parse(remote.updatedAt);
    if (!Number.isFinite(ts)) return false;
    const key = `${remote.source}->${remote.target}`;
    const local = this.edges.get(key);
    if (local && local.updatedAt >= ts) return false;
    this.ensureNode(remote.source);
    this.ensureNode(remote.target);
    this.edges.set(key, {
      source: remote.source,
      target: remote.target,
      relation: remote.relation || "related_to",
      weight: Math.max(0.05, Math.min(10, Number(remote.weight) || 1)),
      successes: Math.max(0, parseInt(remote.successes, 10) || 0),
      failures: Math.max(0, parseInt(remote.failures, 10) || 0),
      updatedAt: ts
    });
    this.saveDebounced();
    return true;
  }

  // ────────────────────────────────────────────────────────
  //  MEMORIA DE CAUSA-EFECTO PARA ERRORES Y PARCHES
  // ────────────────────────────────────────────────────────
  registerErrorFix({ pattern, errorType, rootCause, fixProposal, toolName, patchCode, signature }) {
    const id = `error_fix:${computeFastHash(signature || pattern || errorType)}`;
    const node = this.addNode({
      id,
      type: "error_fix",
      label: `Fix: ${errorType || pattern.slice(0, 30)}`,
      data: {
        pattern: String(pattern),
        signature: signature || "",
        errorType: errorType || "general_error",
        rootCause: rootCause || "",
        fixProposal: fixProposal || "",
        toolName: toolName || "edit_file",
        patchCode: patchCode || ""
      }
    });

    if (toolName && this.nodes.has(`tool:${toolName}`)) {
      this.connect(id, `tool:${toolName}`, "resolved_by", 2.0);
    }
    return node;
  }

  // Aprende una correccion observada: el error `errorMessage` de `toolName`
  // se resolvio tras ejecutar `fixSteps` (descripciones cortas de acciones).
  learnErrorFix({ errorMessage, toolName, fixSteps = [] }) {
    const signature = errorSignature(errorMessage);
    if (signature.length < 8 || !fixSteps.length) return null;
    return this.registerErrorFix({
      pattern: signature,
      signature,
      errorType: `${toolName || "tool"}: ${signature.slice(0, 50)}`,
      rootCause: String(errorMessage).split(/\r?\n/)[0].slice(0, 200),
      fixProposal: "Se resolvio antes con: " + fixSteps.slice(0, 5).join("; "),
      toolName: toolName || "edit_file"
    });
  }

  lookupErrorFix(errorMessage) {
    if (!errorMessage || typeof errorMessage !== "string") return null;
    const msgLower = errorMessage.toLowerCase();
    const sig = errorSignature(errorMessage);

    for (const [id, node] of this.nodes.entries()) {
      if (node.type !== "error_fix" || !node.data || !node.data.pattern) continue;
      const pat = node.data.pattern.toLowerCase();
      if ((node.data.signature && node.data.signature === sig) || msgLower.includes(pat)) {
        node.hits = (node.hits || 0) + 1;
        this.metrics.errorFixesApplied += 1;
        this.metrics.tokensSavedEstimate += 2500; // Ahorro estimado de un ciclo de análisis
        return {
          nodeId: id,
          ...node.data,
          appliedCount: this.metrics.errorFixesApplied
        };
      }
    }
    return null;
  }

  // ────────────────────────────────────────────────────────
  //  ANCLAJE INMUTABLE DEL ECOSISTEMA GAFCORE
  // ────────────────────────────────────────────────────────
  bootstrapGafcoreEcosystem() {
    // Reglas maestras inmutables
    this.addNode({
      id: "ecosystem:gafcore_supabase",
      type: "rule",
      label: "Infraestructura Supabase Self-Hosted ($0/mes)",
      data: {
        publicUrl: "https://supabase.gafcore.com",
        localKongUrl: "http://127.0.0.1:54321",
        directDbUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        studioUrl: "http://localhost:54323",
        projectsHubUrl: "http://localhost:4000",
        isolationRequirement: "Cada proyecto requiere project-infra.json con su schema dedicado"
      },
      immutable: true
    });

    // Herramientas esenciales
    const coreTools = [
      { name: "open_folder", desc: "Abre y escanea directorios en D:\\PROGRAMAS IA" },
      { name: "list_files", desc: "Indexa árbol de archivos de proyectos" },
      { name: "read_file", desc: "Lee código fuente con hash caching" },
      { name: "write_file", desc: "Crea archivos y registra checkpoints" },
      { name: "edit_file", desc: "Aplica modificaciones quirúrgicas" },
      { name: "run_cmd", desc: "Ejecuta comandos en terminal PowerShell" },
      { name: "search_files", desc: "Búsqueda semántica y por texto" }
    ];

    coreTools.forEach(t => {
      this.addNode({
        id: `tool:${t.name}`,
        type: "tool",
        label: t.name,
        data: { description: t.desc },
        immutable: true
      });
    });

    // Errores comunes pre-cargados del ecosistema
    this.registerErrorFix({
      pattern: "EADDRINUSE",
      errorType: "Puerto en uso",
      rootCause: "Un proceso anterior sigue ocupando el puerto de desarrollo local",
      fixProposal: "Detener el proceso en el puerto usando taskkill o cambiar a un puerto libre",
      toolName: "run_cmd"
    });

    this.registerErrorFix({
      pattern: "supabase.co",
      errorType: "Intento de conexión a nube de pago",
      rootCause: "El código intenta conectar con la nube pública oficial de Supabase",
      fixProposal: "Reemplazar URL con https://supabase.gafcore.com y credenciales locales",
      toolName: "edit_file"
    });
  }

  // ────────────────────────────────────────────────────────
  //  RECUPERADOR DE SUBGRAFO RELEVANTE (CONTEXTO ULTRACOMPACTO)
  // ────────────────────────────────────────────────────────
  getRelevantSubgraph(queryText, workspaceInfo = {}, maxNodes = 8, semanticScores = null) {
    this.metrics.queriesProcessed += 1;
    const q = (queryText || "").toLowerCase();
    const qTokens = tokenize(q);
    const scoredNodes = [];

    for (const [id, node] of this.nodes.entries()) {
      let score = 0;
      score += 2.5 * lexicalSimilarity(qTokens, nodeText(node));
      if (semanticScores && semanticScores.has(id)) score += 4.0 * Math.max(0, semanticScores.get(id) - 0.2);
      const labelLower = (node.label || "").toLowerCase();
      const typeLower = (node.type || "").toLowerCase();

      // Reglas inmutables tienen peso base
      if (node.immutable) score += 0.5;

      // Coincidencias en label o ID
      if (q.includes(labelLower) || (node.id && q.includes(node.id.toLowerCase()))) {
        score += 3.0;
      }

      // Si la consulta menciona palabras clave de tipo
      if (q.includes("error") && node.type === "error_fix") score += 2.5;
      if ((q.includes("supabase") || q.includes("bd") || q.includes("base de datos")) && id.includes("supabase")) score += 4.0;
      if ((q.includes("proyecto") || q.includes("carpeta")) && node.type === "project") score += 2.0;

      // Ponderación por popularidad de hits
      score += Math.min(1.0, (node.hits || 0) * 0.05);

      if (score > 0.4) {
        scoredNodes.push({ node, score });
      }
    }

    // Ordenar de mayor a menor relevancia
    scoredNodes.sort((a, b) => b.score - a.score);
    const topNodes = scoredNodes.slice(0, maxNodes).map(s => s.node);

    // Encontrar aristas relevantes entre estos nodos
    const topIds = new Set(topNodes.map(n => n.id));
    const relevantEdges = [];
    for (const edge of this.edges.values()) {
      if (topIds.has(edge.source) && topIds.has(edge.target) && edge.weight >= 0.5) {
        relevantEdges.push(edge);
      }
    }

    return {
      nodes: topNodes,
      edges: relevantEdges
    };
  }

  /**
   * Igual que getRelevantSubgraph pero suma similitud por embeddings.
   * `embedder` debe exponer embed(text) y embedBatch(texts) (Embeddings de rag.js).
   * Si falla o tarda, cae a la version lexica.
   */
  async getRelevantSubgraphSemantic(queryText, workspaceInfo = {}, maxNodes = 8, embedder = null, timeoutMs = 4000) {
    if (!embedder || !queryText) return this.getRelevantSubgraph(queryText, workspaceInfo, maxNodes);
    try {
      if (!this._embedCache) this._embedCache = new Map();
      const qTokens = tokenize(queryText);
      const candidates = [...this.nodes.values()]
        .map(n => ({ n, s: lexicalSimilarity(qTokens, nodeText(n)) + (n.immutable ? 0.1 : 0) + Math.min(0.2, (n.hits || 0) * 0.01) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 40)
        .map(c => c.n);
      const missing = candidates.filter(n => !this._embedCache.has(computeFastHash(nodeText(n))));
      const work = (async () => {
        const qVec = await embedder.embed(String(queryText).slice(0, 2000));
        if (missing.length) {
          const vecs = await embedder.embedBatch(missing.map(n => nodeText(n).slice(0, 1000)));
          missing.forEach((n, i) => { if (vecs[i]) this._embedCache.set(computeFastHash(nodeText(n)), vecs[i]); });
        }
        return qVec;
      })();
      const qVec = await withTimeout(work, timeoutMs);
      const scores = new Map();
      for (const n of candidates) {
        const v = this._embedCache.get(computeFastHash(nodeText(n)));
        if (v) scores.set(n.id, cosine(qVec, v));
      }
      return this.getRelevantSubgraph(queryText, workspaceInfo, maxNodes, scores);
    } catch (_) {
      return this.getRelevantSubgraph(queryText, workspaceInfo, maxNodes);
    }
  }

  // ────────────────────────────────────────────────────────
  //  PODA SINÁPTICA Y RECOLECCIÓN DE BASURA (GARBAGE COLLECTION)
  // ────────────────────────────────────────────────────────
  prune(maxTotalNodes = 500) {
    if (this.nodes.size <= maxTotalNodes) return 0;
    
    // Obtener nodos no inmutables ordenados por menor hit y fecha más antigua
    const candidates = [];
    for (const [id, node] of this.nodes.entries()) {
      if (!node.immutable) {
        candidates.push({ id, score: (node.hits || 0) + (node.updatedAt / 1e12) });
      }
    }

    candidates.sort((a, b) => a.score - b.score);
    const toRemoveCount = this.nodes.size - maxTotalNodes;
    let removed = 0;

    for (let i = 0; i < toRemoveCount && i < candidates.length; i++) {
      if (this.removeNode(candidates[i].id)) {
        removed++;
      }
    }
    return removed;
  }

  // ────────────────────────────────────────────────────────
  //  PERSISTENCIA Y CARGA
  // ────────────────────────────────────────────────────────
  save() {
    try {
      const data = {
        version: 1,
        savedAt: Date.now(),
        metrics: this.metrics,
        nodes: Array.from(this.nodes.values()),
        edges: Array.from(this.edges.values())
      };
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    } catch (e) {
      // Ignorar errores de cuota silenciosamente
    }
  }

  saveDebounced() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.save(), 500);
  }

  load() {
    try {
      if (typeof localStorage === "undefined") return;
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.nodes)) {
        data.nodes.forEach(n => this.nodes.set(n.id, n));
      }
      if (data && Array.isArray(data.edges)) {
        data.edges.forEach(e => this.edges.set(`${e.source}->${e.target}`, e));
      }
      if (data && data.metrics) {
        this.metrics = { ...this.metrics, ...data.metrics };
      }
    } catch (e) {
      // Si el JSON está dañado, se reinicia limpio
    }
  }

  getStats() {
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      tokensSavedEstimate: this.metrics.tokensSavedEstimate,
      errorFixesApplied: this.metrics.errorFixesApplied,
      queriesProcessed: this.metrics.queriesProcessed
    };
  }
}
