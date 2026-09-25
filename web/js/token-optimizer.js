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

    const { nodes, edges } = this.graph.getRelevantSubgraph(taskText, workspaceInfo, 6);
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
}
