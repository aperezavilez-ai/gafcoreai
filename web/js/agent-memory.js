// ============================================================
//  GafCoreAI - Memoria compartida entre agentes & Grafo Sináptico
//  Con locks por archivo y sincronización con SynapticGraph
// ============================================================

import { SynapticGraph, computeFastHash } from "./synaptic-graph.js";

export class AgentMemory {
  constructor(opts = {}) {
    this.synapticGraph = opts.synapticGraph || new SynapticGraph();
    // Estado compartido entre agentes
    this.facts = [];          // { agent, fact, ts, taskId }
    this.decisions = [];      // { agent, decision, reason, ts, taskId }
    this.fileLocks = new Map(); // path -> agentName
    this.tasks = new Map();   // taskId -> { agent, status, ts }
    this.handoffs = [];       // { from, to, payload, ts, taskId }
    this.load();
  }

  // ── Hechos descubiertos ────────────────────
  addFact(agent, fact, taskId) {
    const entry = { agent, fact, ts: Date.now(), taskId: taskId || null };
    this.facts.push(entry);
    if (this.facts.length > 200) this.facts.shift();
    
    // Sincronizar en el Grafo Sináptico
    if (this.synapticGraph && typeof fact === "string") {
      const factId = `fact:${computeFastHash(fact)}`;
      this.synapticGraph.addNode({
        id: factId,
        type: "fact",
        label: fact.slice(0, 40),
        data: { agent, fact, taskId }
      });
      if (agent) {
        this.synapticGraph.connect(`agent:${agent}`, factId, "discovered", 1.2);
      }
    }

    this.save();
    return entry;
  }

  getFacts(limit) {
    const n = limit || 40;
    return this.facts.slice(-n);
  }

  // ── Decisiones ─────────────────────────────
  addDecision(agent, decision, reason, taskId) {
    const entry = { agent, decision, reason: reason || "", ts: Date.now(), taskId: taskId || null };
    this.decisions.push(entry);
    if (this.decisions.length > 100) this.decisions.shift();

    // Sincronizar en el Grafo Sináptico
    if (this.synapticGraph && typeof decision === "string") {
      const decId = `decision:${computeFastHash(decision)}`;
      this.synapticGraph.addNode({
        id: decId,
        type: "decision",
        label: decision.slice(0, 40),
        data: { agent, decision, reason, taskId }
      });
      if (agent) {
        this.synapticGraph.connect(`agent:${agent}`, decId, "decided", 1.5);
      }
    }

    this.save();
    return entry;
  }

  getDecisions(limit) {
    const n = limit || 20;
    return this.decisions.slice(-n);
  }

  // ── Locks de archivos (evitar que dos agentes escriban el mismo archivo) ──
  lockFile(path, agentName) {
    if (this.fileLocks.has(path)) {
      const holder = this.fileLocks.get(path);
      if (holder === agentName) return { ok: true, alreadyOwn: true };
      return { ok: false, heldBy: holder };
    }
    this.fileLocks.set(path, agentName);
    return { ok: true };
  }

  unlockFile(path, agentName) {
    const holder = this.fileLocks.get(path);
    if (holder === agentName) {
      this.fileLocks.delete(path);
      return true;
    }
    return false;
  }

  unlockAll(agentName) {
    for (const [path, holder] of this.fileLocks.entries()) {
      if (holder === agentName) this.fileLocks.delete(path);
    }
  }

  getLockedFiles() {
    const out = [];
    for (const [path, holder] of this.fileLocks.entries()) {
      out.push({ path, holder });
    }
    return out;
  }

  // ── Tareas (para saber quien esta haciendo que) ──
  startTask(taskId, agentName) {
    this.tasks.set(taskId, { agent: agentName, status: "running", ts: Date.now() });
    this.save();
  }

  finishTask(taskId, status) {
    const t = this.tasks.get(taskId);
    if (t) {
      t.status = status || "done";
      t.finishedAt = Date.now();
      this.save();
    }
  }

  getActiveTasks() {
    const out = [];
    for (const [id, t] of this.tasks.entries()) {
      if (t.status === "running") out.push({ taskId: id, ...t });
    }
    return out;
  }

  // ── Handoffs (pasar contexto entre agentes) ──
  handoff(fromAgent, toAgent, payload, taskId) {
    const entry = {
      from: fromAgent,
      to: toAgent,
      payload,
      ts: Date.now(),
      taskId: taskId || null,
      consumed: false
    };
    this.handoffs.push(entry);
    if (this.handoffs.length > 100) this.handoffs.shift();
    this.save();
    return entry;
  }

  getPendingHandoffs(forAgent) {
    return this.handoffs.filter(h => h.to === forAgent && !h.consumed);
  }

  consumeHandoff(entry) {
    entry.consumed = true;
    this.save();
  }

  // ── Contexto para inyectar en prompts ───────
  buildContext(agentName) {
    let ctx = "=== MEMORIA COMPARTIDA ENTRE AGENTES ===\n";

    const facts = this.getFacts(15);
    if (facts.length) {
      ctx += "Hechos descubiertos:\n";
      facts.forEach(f => {
        ctx += `- [${f.agent || "anon"}] ${f.fact}\n`;
      });
    }

    const decisions = this.getDecisions(10);
    if (decisions.length) {
      ctx += "\nDecisiones tomadas:\n";
      decisions.forEach(d => {
        ctx += `- [${d.agent}] ${d.decision}${d.reason ? " (" + d.reason + ")" : ""}\n`;
      });
    }

    const locks = this.getLockedFiles();
    if (locks.length) {
      ctx += "\nArchivos en edicion por otros agentes (NO MODIFICAR):\n";
      locks.forEach(l => {
        if (l.holder !== agentName) {
          ctx += `- ${l.path} (bloqueado por ${l.holder})\n`;
        }
      });
    }

    const handoffs = this.getPendingHandoffs(agentName);
    if (handoffs.length) {
      ctx += "\nContexto recibido de otros agentes:\n";
      handoffs.forEach(h => {
        ctx += `- De ${h.from}: ${typeof h.payload === "string" ? h.payload.slice(0, 300) : JSON.stringify(h.payload).slice(0, 300)}\n`;
      });
    }

    ctx += "\n=== FIN MEMORIA ===\n";
    return ctx;
  }

  // ── Persistencia ───────────────────────────
  save() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("gafcoreai_agent_memory", JSON.stringify({
          facts: this.facts.slice(-200),
          decisions: this.decisions.slice(-100),
          handoffs: this.handoffs.slice(-100)
        }));
      }
    } catch (e) {}
  }

  load() {
    try {
      if (typeof localStorage === "undefined") return;
      const raw = localStorage.getItem("gafcoreai_agent_memory");
      if (!raw) return;
      const obj = JSON.parse(raw);
      this.facts = obj.facts || [];
      this.decisions = obj.decisions || [];
      this.handoffs = obj.handoffs || [];
    } catch (e) {}
  }

  clear() {
    this.facts = [];
    this.decisions = [];
    this.handoffs = [];
    this.fileLocks.clear();
    this.tasks.clear();
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("gafcoreai_agent_memory");
    }
  }

  getStats() {
    return {
      facts: this.facts.length,
      decisions: this.decisions.length,
      handoffs: this.handoffs.length,
      activeLocks: this.fileLocks.size,
      activeTasks: this.getActiveTasks().length,
      synapticGraph: this.synapticGraph ? this.synapticGraph.getStats() : null
    };
  }

  /**
   * Destilación de Memoria en Formato Markdown Estructurado (Hermes Pattern)
   */
  exportToMarkdown() {
    let md = "# 🧠 MEMORY.md - Memoria Persistente de Proyecto (GafCoreAI)\n\n";
    md += `*Última actualización:* ${new Date().toISOString()}\n\n`;

    const facts = this.getFacts(30);
    if (facts.length) {
      md += "## 📌 Hechos y Arquitectura Descubierta\n";
      facts.forEach(f => {
        md += `- **[${f.agent || "Core"}]**: ${f.fact}\n`;
      });
      md += "\n";
    }

    const decisions = this.getDecisions(20);
    if (decisions.length) {
      md += "## 🎯 Decisiones de Diseño y Reglas de Negocio\n";
      decisions.forEach(d => {
        md += `- **${d.decision}**\n  *Razón:* ${d.reason || "Decisión de optimización"}\n  *Por:* ${d.agent}\n`;
      });
      md += "\n";
    }

    if (this.synapticGraph) {
      const errorFixes = this.synapticGraph.findNodes(n => n.type === "error_fix");
      if (errorFixes.length) {
        md += "## ⚡ Soluciones de Errores Aprendidas\n";
        errorFixes.forEach(ef => {
          md += `- **Error:** \`${ef.data.errorType}\` -> **Solución:** ${ef.data.fixProposal} (vía \`${ef.data.toolName}\`)\n`;
        });
        md += "\n";
      }
    }

    return md;
  }

  /**
   * Sincroniza la memoria destilada a disco en el workspace activo
   */
  async syncToDisk(diskFolder, tauriBridge) {
    if (!diskFolder || !tauriBridge || typeof tauriBridge.writeFile !== "function") return false;
    try {
      const md = this.exportToMarkdown();
      const sep = diskFolder.includes("\\") ? "\\" : "/";
      const memPath = diskFolder.replace(/[\\\/]$/, "") + sep + "MEMORY.md";
      await tauriBridge.writeFile(memPath, md);
      return true;
    } catch (e) {
      return false;
    }
  }
}