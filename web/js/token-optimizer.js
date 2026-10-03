// ============================================================
//  GafCoreAI - Token Optimizer Engine (v1.0)
//  Compresor de contexto, verificador de hash antiobsolescencia y
//  analizador de ahorro de tokens en tiempo real.
// ============================================================

import { computeFastHash } from "./synaptic-graph.js";

export class TokenOptimizer {
  constructor(synapticGraph) {
    this.graph = synapticGraph;
    this.sessionTokensSaved = 0;
  }

  /**
   * Genera un bloque de contexto ultracompacto para inyectar al LLM
   */
  buildCompactContext(taskText, workspaceInfo = {}) {
    if (!this.graph) return "";
    return this._formatSubgraph(this.graph.getRelevantSubgraph(taskText, workspaceInfo, 6));
  }

  /**
   * Version con busqueda semantica (embeddings del RAG si estan configurados).
   */
  async buildCompactContextSemantic(taskText, workspaceInfo = {}, embedder = null) {
    if (!this.graph) return "";
    if (!embedder || typeof this.graph.getRelevantSubgraphSemantic !== "function") return this.buildCompactContext(taskText, workspaceInfo);
    return this._formatSubgraph(await this.graph.getRelevantSubgraphSemantic(taskText, workspaceInfo, 6, embedder));
  }

  _formatSubgraph({ nodes, edges }) {
    if (!nodes || nodes.length === 0) return "";

    let ctx = "\n\n🧠 [CONOCIMIENTO SINÁPTICO RELEVANTE (0 TOKENS REPETIDOS)]\n";
    
    nodes.forEach(n => {
      if (n.type === "rule") {
        ctx += `• Regla: ${n.label} | ${JSON.stringify(n.data)}\n`;
      } else if (n.type === "error_fix") {
        ctx += `• Solución Previa: Error [${n.data.errorType}] -> Aplicar: ${n.data.fixProposal} (vía ${n.data.toolName})\n`;
      } else if (n.type === "project") {
        ctx += `• Proyecto Activo: ${n.label} | Ruta: ${n.data.diskPath || n.id} | Schema: ${n.data.schema || "default"}\n`;
      } else if (n.type === "file") {
        ctx += `• Archivo Indexado: ${n.label} (Hash: ${n.hash || "ok"})\n`;
      }
    });

    if (edges.length > 0) {
      ctx += "Conexiones verificadas:\n";
      edges.forEach(e => {
        ctx += `  - ${e.source} --(${e.relation}, peso: ${e.weight.toFixed(2)})--> ${e.target}\n`;
      });
    }

    // Estimar tokens ahorrados por no enviar texto sin estructurar ni releer archivos
    const estimatedSaved = 1200;
    this.sessionTokensSaved += estimatedSaved;
    if (this.graph.metrics) {
      this.graph.metrics.tokensSavedEstimate += estimatedSaved;
    }

    return ctx;
  }

  /**
   * Verifica si el contenido de un archivo no ha cambiado mediante hash
   */
  isContentUnchanged(filePath, content) {
    if (!this.graph || !filePath || !content) return false;
    const hash = computeFastHash(content);
    const nodeId = `file:${filePath}`;
    const node = this.graph.getNode(nodeId);

    if (node && node.hash === hash) {
      // Archivo no ha cambiado: nos ahorramos inyectarlo completo al prompt
      const tokenSavings = Math.round(content.length / 4);
      this.sessionTokensSaved += tokenSavings;
      if (this.graph.metrics) {
        this.graph.metrics.tokensSavedEstimate += tokenSavings;
        this.graph.metrics.cacheHits += 1;
      }
      return { unchanged: true, hash, node, tokenSavings };
    }

    // Si cambió o es nuevo, indexar o actualizar en el grafo
    this.graph.addNode({
      id: nodeId,
      type: "file",
      label: filePath.split(/[\\\/]/).pop(),
      content,
      data: { path: filePath, length: content.length }
    });

    return { unchanged: false, hash };
  }

  /**
   * Obtiene el acumulado de métricas de ahorro
   */
  getSavingsReport() {
    const totalTokens = this.graph ? this.graph.metrics.tokensSavedEstimate : this.sessionTokensSaved;
    // Estimación económica ($0.002 por cada 1K tokens en modelos premium)
    const costSavedUsd = ((totalTokens / 1000) * 0.002).toFixed(4);
    
    return {
      totalTokensSaved: totalTokens,
      sessionTokensSaved: this.sessionTokensSaved,
      costSavedUsd: `$${costSavedUsd} USD`,
      cacheHits: this.graph ? this.graph.metrics.cacheHits : 0,
      errorFixesApplied: this.graph ? this.graph.metrics.errorFixesApplied : 0
    };
  }

  /**
   * Compresión Contextual de Observaciones de Herramientas (Hermes Pattern)
   * Destila salidas masivas reteniendo encabezados, fallos y estructura clave.
   */
  compressObservation(toolName, output, maxChars = 12000) {
    if (!output || typeof output !== "string" || output.length <= maxChars) {
      return output || "";
    }

    const savedChars = output.length - maxChars;
    this.sessionTokensSaved += Math.round(savedChars / 4);

    if (toolName === "list_files") {
      const lines = output.split("\n");
      if (lines.length > 80) {
        const head = lines.slice(0, 50).join("\n");
        const tail = lines.slice(-20).join("\n");
        return `${head}\n\n... [${lines.length - 70} archivos intermedios comprimidos / total: ${lines.length} archivos] ...\n\n${tail}`;
      }
    }

    if (toolName === "read_file") {
      const lines = output.split("\n");
      if (lines.length > 150) {
        const head = lines.slice(0, 80).join("\n");
        const tail = lines.slice(-40).join("\n");
        return `${head}\n\n/* ... [${lines.length - 120} líneas omitidas por compresión contextual (usa rangos si requieres más)] ... */\n\n${tail}`;
      }
    }

    if (toolName === "run_command") {
      const lines = output.split("\n");
      if (lines.length > 100) {
        const head = lines.slice(0, 30).join("\n");
        const tail = lines.slice(-50).join("\n");
        return `${head}\n\n... [${lines.length - 80} líneas de log omitidas] ...\n\n${tail}`;
      }
    }

    // Recorte balanceado por caracteres
    const half = Math.floor(maxChars / 2);
    return output.slice(0, half) + `\n\n... [${savedChars} caracteres comprimidos para optimizar contexto] ...\n\n` + output.slice(-half);
  }
}
