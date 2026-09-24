// ============================================================
//  GafCoreAI - Memory Manager v2
//  Memoria persistente robusta para trabajos largos
//  - Compactacion automatica de conversacion
//  - Roadmap del proyecto autogestionado
//  - Hechos, decisiones, preferencias
//  - Context builder para ahorrar tokens
// ============================================================

const MM_KEY = "gafcoreai_memory_v2";
const MM_VERSION = 2;

export class MemoryManager {
  constructor({ chatCompletion, getProvider, getModel, log }) {
    this.chatCompletion = chatCompletion;
    this.getProvider = getProvider;
    this.getModel = getModel;
    this.log = log || console.log;

    this.data = this._load();
    this.compacting = false;
  }

  // ─────────────────────────────────────────────────────
  //  ESTRUCTURA INICIAL
  // ─────────────────────────────────────────────────────
  _defaults() {
    return {
      version: MM_VERSION,
      project: {
        name: "",
        goal: "",
        startedAt: Date.now(),
        lastUpdate: Date.now(),
        phases: [],
        currentPhase: null,
        roadmap: [],
        files: {},
        stack: []
      },
      blocks: [],           // resumenes de bloques de conversacion
      facts: [],            // hechos persistentes
      decisions: [],        // decisiones tomadas
      preferences: {}       // preferencias del usuario
    };
  }

  // ─────────────────────────────────────────────────────
  //  PERSISTENCIA
  // ─────────────────────────────────────────────────────
  _load() {
    try {
      const raw = localStorage.getItem(MM_KEY);
      if (!raw) return this._defaults();
      const obj = JSON.parse(raw);
      if (obj.version !== MM_VERSION) return this._defaults();
      return obj;
    } catch (e) {
      return this._defaults();
    }
  }

  save() {
    try {
      this.data.project.lastUpdate = Date.now();
      localStorage.setItem(MM_KEY, JSON.stringify(this.data));
    } catch (e) {
      this.log("[memory] error guardando:", e.message);
    }
  }

  clear() {
    this.data = this._defaults();
    localStorage.removeItem(MM_KEY);
  }

  // ─────────────────────────────────────────────────────
  //  PROYECTO
  // ─────────────────────────────────────────────────────
  setProjectGoal(goal) {
    this.data.project.goal = goal;
    this.save();
  }

  setProjectName(name) {
    this.data.project.name = name;
    this.save();
  }

  setStack(stack) {
    this.data.project.stack = Array.isArray(stack) ? stack : [];
    this.save();
  }

  addPhase(name) {
    const id = "phase-" + Date.now();
    this.data.project.phases.push({
      id, name, status: "pending",
      startedAt: null, finishedAt: null
    });
    if (!this.data.project.currentPhase) {
      this.data.project.currentPhase = id;
      this.data.project.phases[this.data.project.phases.length - 1].status = "in-progress";
      this.data.project.phases[this.data.project.phases.length - 1].startedAt = Date.now();
    }
    this.save();
    return id;
  }

  startPhase(phaseId) {
    this.data.project.phases.forEach(p => {
      if (p.id === phaseId) {
        p.status = "in-progress";
        p.startedAt = p.startedAt || Date.now();
      }
    });
    this.data.project.currentPhase = phaseId;
    this.save();
  }

  finishPhase(phaseId) {
    this.data.project.phases.forEach(p => {
      if (p.id === phaseId) {
        p.status = "done";
        p.finishedAt = Date.now();
      }
    });
    this.save();
  }

  addRoadmapTask(task) {
    this.data.project.roadmap.push({
      id: "task-" + Date.now(),
      task,
      status: "pending",
      createdAt: Date.now()
    });
    this.save();
  }

  updateTask(taskId, status) {
    this.data.project.roadmap.forEach(t => {
      if (t.id === taskId) t.status = status;
    });
    this.save();
  }

  // ─────────────────────────────────────────────────────
  //  HECHOS / DECISIONES / PREFERENCIAS
  // ─────────────────────────────────────────────────────
  addFact(text, tags) {
    this.data.facts.push({
      text: String(text).slice(0, 500),
      tags: tags || [],
      ts: Date.now()
    });
    if (this.data.facts.length > 500) this.data.facts.shift();
    this.save();
  }

  addDecision(text, reason) {
    this.data.decisions.push({
      text: String(text).slice(0, 500),
      reason: String(reason || "").slice(0, 300),
      ts: Date.now()
    });
    if (this.data.decisions.length > 200) this.data.decisions.shift();
    this.save();
  }

  setPreference(key, value) {
    this.data.preferences[key] = value;
    this.save();
  }

  getPreference(key) {
    return this.data.preferences[key];
  }

  // ─────────────────────────────────────────────────────
  //  ARCHIVOS DEL PROYECTO
  // ─────────────────────────────────────────────────────
  updateFile(path, summary) {
    this.data.project.files[path] = {
      path,
      summary: String(summary || "").slice(0, 300),
      lastModified: Date.now()
    };
    this.save();
  }

  getFilesSummary(maxFiles) {
    const files = Object.values(this.data.project.files);
    files.sort((a, b) => b.lastModified - a.lastModified);
    return files.slice(0, maxFiles || 20);
  }

  // ─────────────────────────────────────────────────────
  //  BLOQUES DE CONVERSACION (compactacion)
  // ─────────────────────────────────────────────────────
  addBlock(fromMsg, toMsg, summary, tags) {
    this.data.blocks.push({
      id: "block-" + Date.now(),
      from: fromMsg,
      to: toMsg,
      summary: String(summary || "").slice(0, 1500),
      tags: tags || [],
      ts: Date.now()
    });
    if (this.data.blocks.length > 500) this.data.blocks.shift();
    this.save();
  }

  // ─────────────────────────────────────────────────────
  //  COMPACTACION AUTOMATICA
  //  Se dispara cuando la conversacion pasa de N mensajes
  // ─────────────────────────────────────────────────────
  async compactIfNeeded(conversation, opts) {
    if (this.compacting) return false;
    if (!conversation) return false;

    const cfg = Object.assign({
      threshold: 40,      // compactar cuando la conversacion pase de N
      batchSize: 20,      // cuantos mensajes resumir de golpe
      keepRecent: 20      // cuantos mensajes dejar intactos
    }, opts || {});

    const conv = conversation.getActive ? conversation.getActive() : null;
    if (!conv) return false;

    const total = conv.messages.length;
    if (total <= cfg.threshold) return false;

    // Cuantos hay que resumir
    const toCompact = total - cfg.keepRecent;
    if (toCompact < cfg.batchSize) return false;

    // Tomar los primeros N mensajes que aun no estan en ningun bloque
    const lastCompacted = this.data.blocks.length > 0
      ? this.data.blocks[this.data.blocks.length - 1].to
      : -1;

    const start = lastCompacted + 1;
    const end = Math.min(start + cfg.batchSize, toCompact);

    const messages = conv.messages.slice(start, end);
    if (messages.length < 5) return false;

    this.compacting = true;
    try {
      const summary = await this._summarizeMessages(messages);
      const tags = this._extractTags(summary);
      this.addBlock(start, end - 1, summary, tags);
      this.log("[memory] bloque compactado: msgs " + start + "-" + (end - 1));
      return true;
    } catch (e) {
      this.log("[memory] error compactando:", e.message);
      return false;
    } finally {
      this.compacting = false;
    }
  }

  async _summarizeMessages(messages) {
    const provider = this.getProvider && this.getProvider();
    const model = this.getModel && this.getModel();
    if (!provider || !model || !model.key || !this.chatCompletion) {
      // Fallback: resumen simple sin modelo
      return this._simpleSummary(messages);
    }

    let texto = "";
    messages.forEach((m, i) => {
      const role = m.role || "?";
      const content = typeof m.content === "string"
        ? m.content
        : JSON.stringify(m.content);
      texto += "[" + role + "] " + content.slice(0, 800) + "\n\n";
    });

    const prompt =
      "Resume esta conversacion en 4-6 lineas, enfocandote en:\n" +
      "- Que se estaba haciendo\n" +
      "- Decisiones tomadas\n" +
      "- Archivos creados/modificados\n" +
      "- Proximos pasos mencionados\n\n" +
      "Se conciso y usa bullets. NO uses markdown complejo.\n\n" +
      "CONVERSACION:\n" + texto.slice(0, 6000);

    let out = "";
    try {
      await this.chatCompletion(provider, model,
        [{ role: "user", content: prompt }],
        tok => { out += tok; },
        { timeout: 30000 }
      );
    } catch (e) {
      return this._simpleSummary(messages);
    }

    return out.trim() || this._simpleSummary(messages);
  }

  _simpleSummary(messages) {
    const first = messages[0];
    const last = messages[messages.length - 1];
    const firstText = typeof first.content === "string" ? first.content : "";
    const lastText = typeof last.content === "string" ? last.content : "";
    return "Bloque de " + messages.length + " mensajes.\n" +
           "Inicio: " + firstText.slice(0, 150) + "\n" +
           "Fin: " + lastText.slice(0, 150);
  }

  _extractTags(text) {
    const tags = [];
    const words = String(text).toLowerCase();
    ["auth", "login", "api", "db", "ui", "test", "bug", "deploy", "config",
     "router", "state", "hook", "component", "style", "css", "html"].forEach(t => {
      if (words.includes(t)) tags.push(t);
    });
    return tags.slice(0, 5);
  }

  // ─────────────────────────────────────────────────────
  //  BUSQUEDA SIMPLE (keywords)
  // ─────────────────────────────────────────────────────
  searchBlocks(query, limit) {
    const n = limit || 5;
    if (!query) return this.data.blocks.slice(-n);

    const words = String(query).toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (!words.length) return this.data.blocks.slice(-n);

    const scored = this.data.blocks.map(b => {
      const text = (b.summary + " " + b.tags.join(" ")).toLowerCase();
      let score = 0;
      words.forEach(w => {
        const matches = (text.match(new RegExp(w, "g")) || []).length;
        score += matches;
      });
      return { block: b, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter(s => s.score > 0).slice(0, n);
    return top.length > 0 ? top.map(s => s.block) : this.data.blocks.slice(-n);
  }

  // ─────────────────────────────────────────────────────
  //  BRIEF DEL PROYECTO (para mostrar al inicio)
  // ─────────────────────────────────────────────────────
  getProjectBrief() {
    const p = this.data.project;
    const lines = [];

    if (!p.goal && !p.name) {
      return "(sin proyecto activo)";
    }

    if (p.name) lines.push("Proyecto: " + p.name);
    if (p.goal) lines.push("Objetivo: " + p.goal);
    if (p.stack && p.stack.length) lines.push("Stack: " + p.stack.join(", "));

    // Fase actual
    const current = p.phases.find(x => x.id === p.currentPhase);
    if (current) {
      lines.push("Fase actual: " + current.name + " (" + current.status + ")");
    }

    // Roadmap pendiente
    const pending = p.roadmap.filter(t => t.status === "pending").slice(0, 5);
    if (pending.length) {
      lines.push("Proximos pasos:");
      pending.forEach(t => lines.push("  - " + t.task));
    }

    // Archivos recientes
    const files = this.getFilesSummary(5);
    if (files.length) {
      lines.push("Archivos recientes:");
      files.forEach(f => lines.push("  - " + f.path));
    }

    // Ultimo bloque
    const lastBlock = this.data.blocks[this.data.blocks.length - 1];
    if (lastBlock) {
      lines.push("Ultimo trabajo: " + lastBlock.summary.slice(0, 200));
    }

    return lines.join("\n");
  }

  // ─────────────────────────────────────────────────────
  //  CONTEXTO PARA EL SYSTEM PROMPT
  //  Se inyecta en cada llamada al modelo
  // ─────────────────────────────────────────────────────
  buildContext(query, opts) {
    const cfg = Object.assign({
      maxBlocks: 3,
      maxFacts: 15,
      maxDecisions: 8,
      maxChars: 4000
    }, opts || {});

    const parts = [];

    // Brief del proyecto
    const brief = this.getProjectBrief();
    if (brief !== "(sin proyecto activo)") {
      parts.push("=== PROYECTO ===\n" + brief);
    }

    // Bloques relevantes
    const blocks = this.searchBlocks(query, cfg.maxBlocks);
    if (blocks.length) {
      parts.push("=== TRABAJO PREVIO (compactado) ===");
      blocks.forEach(b => {
        parts.push("[" + new Date(b.ts).toLocaleString() + "]\n" + b.summary);
      });
    }

    // Hechos
    const facts = this.data.facts.slice(-cfg.maxFacts);
    if (facts.length) {
      parts.push("=== HECHOS ===");
      facts.forEach(f => parts.push("- " + f.text));
    }

    // Decisiones
    const decisions = this.data.decisions.slice(-cfg.maxDecisions);
    if (decisions.length) {
      parts.push("=== DECISIONES ===");
      decisions.forEach(d => {
        parts.push("- " + d.text + (d.reason ? " (" + d.reason + ")" : ""));
      });
    }

    // Preferencias
    const prefKeys = Object.keys(this.data.preferences);
    if (prefKeys.length) {
      parts.push("=== PREFERENCIAS ===");
      prefKeys.forEach(k => parts.push("- " + k + ": " + this.data.preferences[k]));
    }

    let out = parts.join("\n\n");
    if (out.length > cfg.maxChars) {
      out = out.slice(0, cfg.maxChars) + "\n...(truncado)";
    }
    return out;
  }

  // ─────────────────────────────────────────────────────
  //  STATS
  // ─────────────────────────────────────────────────────
  getStats() {
    return {
      project: this.data.project.name || "(sin nombre)",
      phases: this.data.project.phases.length,
      roadmapPending: this.data.project.roadmap.filter(t => t.status === "pending").length,
      blocks: this.data.blocks.length,
      facts: this.data.facts.length,
      decisions: this.data.decisions.length,
      files: Object.keys(this.data.project.files).length,
      sizeKB: Math.round(JSON.stringify(this.data).length / 1024)
    };
  }
}