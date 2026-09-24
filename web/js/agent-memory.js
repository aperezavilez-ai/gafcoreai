// ============================================================
//  GafCoreAI - Memoria compartida entre agentes
//  Con locks por archivo para evitar que se pisen
// ============================================================

export class AgentMemory {
  constructor() {
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

  // ── Handoffs (cuando un agente pasa contexto a otro) ──
  addHandoff(from, to, payload, taskId) {
    const entry = { from, to, payload, ts: Date.now(), taskId: taskId || null };
    this.handoffs.push(entry);
    if (this.handoffs.length > 100) this.handoffs.shift();
    this.save();
    return entry;
  }

  getHandoffs(limit) {
    const n = limit || 20;
    return this.handoffs.slice(-n);
  }

  // ── Contexto para inyectar en un agente ──
  buildContext(agentName) {
    let ctx = "\n\n=== MEMORIA COMPARTIDA DEL EQUIPO ===\n";

    const facts = this.getFacts(15);
    if (facts.length) {
      ctx += "\nHechos descubiertos:\n";
      facts.forEach(f => { ctx += `- [${f.agent}] ${f.fact}\n`; });
    }

    const decisions = this.getDecisions(8);
    if (decisions.length) {
      ctx += "\nDecisiones tomadas:\n";
      decisions.forEach(d => { ctx += `- [${d.agent}] ${d.decision}${d.reason ? " (" + d.reason + ")" : ""}\n`; });
    }

    const locks = this.getLockedFiles();
    const activeLocks = locks.filter(l => l.holder !== agentName);
    if (activeLocks.length) {
      ctx += "\nArchivos bloqueados por otros agentes (NO modificar):\n";
      activeLocks.forEach(l => { ctx += `- ${l.path} (en uso por ${l.holder})\n`; });
    }

    const handoffs = this.getHandoffs(10).filter(h => h.to === agentName);
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
      localStorage.setItem("gafcoreai_agent_memory", JSON.stringify({
        facts: this.facts.slice(-200),
        decisions: this.decisions.slice(-100),
        handoffs: this.handoffs.slice(-100)
      }));
    } catch (e) {}
  }

  load() {
    try {
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
    localStorage.removeItem("gafcoreai_agent_memory");
  }

  getStats() {
    return {
      facts: this.facts.length,
      decisions: this.decisions.length,
      handoffs: this.handoffs.length,
      activeLocks: this.fileLocks.size,
      activeTasks: this.getActiveTasks().length
    };
  }
}