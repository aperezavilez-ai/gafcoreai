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

  // ────────────────────────────────────────────────────────
  //  MEMORIA DE CAUSA-EFECTO PARA ERRORES Y PARCHES
  // ────────────────────────────────────────────────────────
  registerErrorFix({ pattern, errorType, rootCause, fixProposal, toolName, patchCode }) {
    const id = `error_fix:${computeFastHash(pattern || errorType)}`;
    const node = this.addNode({
      id,
      type: "error_fix",
      label: `Fix: ${errorType || pattern.slice(0, 30)}`,
      data: {
        pattern: String(pattern),
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

  lookupErrorFix(errorMessage) {
    if (!errorMessage || typeof errorMessage !== "string") return null;
    const msgLower = errorMessage.toLowerCase();

    for (const [id, node] of this.nodes.entries()) {
      if (node.type !== "error_fix" || !node.data || !node.data.pattern) continue;
      const pat = node.data.pattern.toLowerCase();
      if (msgLower.includes(pat)) {
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
  getRelevantSubgraph(queryText, workspaceInfo = {}, maxNodes = 8) {
    this.metrics.queriesProcessed += 1;
    const q = (queryText || "").toLowerCase();
    const scoredNodes = [];

    for (const [id, node] of this.nodes.entries()) {
      let score = 0;
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
