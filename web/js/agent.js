// ============================================================
//  GafCoreAI - agent.js (v6 - colaborativo + skills + harness)
// ============================================================
import { MultiAgentOrchestrator, AGENT_ROLES } from "./core.js";
import { SKILL_CATALOG, buildSkillsPrompt } from "./skills.js";
import { AgentMemory } from "./agent-memory.js";
import { Harness } from "./harness.js";

export class AgentOrchestrator {
  constructor(opts) {
    this.liveView = opts.liveView || null;
    this.provider = opts.provider;
    this.model = opts.model;
    this.terminal = opts.terminal;
    this.onProgress = opts.onProgress;
    this.onStep = opts.onStep || (() => {});
    this.onToken = opts.onToken || (() => {});
    this.tools = opts.tools;
    this.cache = opts.cache;
    this.memory = opts.memory;
    this.checkpoints = [];
    this.globalTimeout = 420000;

    // Harness + memoria compartida
    this.harness = new Harness({ log: (m) => this.term(m), termWrite: (m, k) => this.term(m) });
    this.teamMemory = new AgentMemory();
    this.currentTaskId = "task-" + Date.now();
    this.teamMemory.startTask(this.currentTaskId, "orchestrator");

    // Multi-agent
    this.multi = new MultiAgentOrchestrator({
      provider: this.provider,
      model: this.model,
      tools: this.tools,
      cache: this.cache,
      memory: this.memory,
      terminal: this.terminal,
      onProgress: this.onProgress,
      onStep: this.onStep
    });
    if (this.multi) this.multi.onToken = (roleName, token) => {
      if (this.onToken) this.onToken(roleName, token);
    };
  }

  term(msg) {
    if (this.terminal) this.terminal.writeln(msg);
  }
  progress(pct) {
    if (this.onProgress) this.onProgress(pct);
  }

  static cleanForDisplay(text) {
    if (!text) return "";
    let s = text;
    s = s.replace(/```write:([^\n]+)\n[\s\S]*?```/g, (m, path) =>
      "📝 **Archivo generado:** `" + path.trim() + "`\n");
    // Limpiar tool tags en todos los formatos sin afectar el texto del agente
    s = s.replace(/<tool\b[^>]*>[\s\S]*?<\/tool>/gi, "");
    s = s.replace(/<tool=[^>\n]*>[\s\S]*?<\/tool>/gi, "");
    s = s.replace(/<tool=[^>\n]*\/?>/gi, "");
    s = s.replace(/<tool=[^>\n]+(?:<\/tool>)?/gi, "");
    s = s.replace(/<tool>[^<]*<\/tool>/gi, "");
    s = s.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "");
    s = s.replace(/<function[\s\S]*?<\/function>/gi, "");
    s = s.replace(/<parameter[^>]*>[\s\S]*?<\/parameter>/gi, "");
    s = s.replace(/<path>[\s\S]*?<\/path>/gi, "");
    s = s.replace(/<recursive>[\s\S]*?<\/recursive>/gi, "");
    s = s.replace(/```(?:tool|tool_call|call):[^\n]*\n[\s\S]*?```/gi, "");
    s = s.replace(/```read:[^\n]+\n?\s*```/gi, "");
    s = s.replace(/\{\s*"tool_calls"\s*:[\s\S]*?\}\s*\}/g, "");
    s = s.replace(/^\s*(?:path|recursive|url|query|cmd|content|file)\s*:\s*.*$/gm, "");
    s = s.replace(/\n{3,}/g, "\n\n").trim();
    return s;
  }

  // ═══════════════════════════════════════════════════
  //  RUN PRINCIPAL
  // ═══════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  //  CLASIFICADOR INTELIGENTE
  // ═══════════════════════════════════════════════════════════
  _classifyTask(text) {
    const t = (text || "").trim().toLowerCase();

    // Trivial: saludos simples
    if (/^(hola|hey|hi|hello|buenas|que tal|gracias|ok|vale|si|no|adios|chao|nos vemos)$/i.test(t)) {
      return "trivial";
    }

    if (t.length < 3) return "trivial";

    // CONTINUACION / ACCION INMEDIATA
    if (/^(continua|continúa|procede|sigue|adelante|aplica|aplicar|arregla|arreglar|hazlo|ejecuta|ejecutar|avanza)\b/i.test(t)) {
      return "code";
    }

    // FORENSE / ANALISIS PROFUNDO - disparadores
    if (/\b(analiza|analizar|audita|auditar|revisa|revisar|inspecciona|examinar|forense|forensic|milimetrico|profundo|detallado|exhaustivo|completo|todo el proyecto|todo el codigo|revisa el proyecto|encuentra|detecta|diagnostica|verifica|valida|testea|encuentra errores|busca bugs|cuellos de botella|optimiza|por que|porque|no entra|falla|error)\b/i.test(t)) {
      return "analysis";
    }

    // CODE - disparadores de creacion/modificacion
    if (/\b(crea|crear|genera|generar|haz|hacer|implementa|implementar|construye|construir|programa|programar|escribe|escribir|desarrolla|desarrollar|corrige|corregir|arregla|arreglar|refactoriza|refactorizar|añade|anade|agregar|modifica|modificar|fix|bug|debug|soluciona)\b/i.test(t)) {
      return "code";
    }

    // Conversacional explicito
    if (/\b(haremos|vamos a|quiero|necesito|podemos|empecemos|iniciemos|arranquemos|propone|propon|sugiere|sugerir|dime|opinas|piensas|idea)\b/i.test(t)) {
      return "conversational";
    }

    // Default: analysis si hay carpeta abierta, sino conversacional
    return context && context.diskFolder ? "analysis" : "conversational";
  }

  // ═══════════════════════════════════════════════════════════
  //  RESPUESTA DIRECTA INTELIGENTE
  // ═══════════════════════════════════════════════════════════
  async _smartDirect(userTask, tipo, context) {
    this.progress(30);

    const provider = this.provider;
    const model = this.model;

    // Detectar si hay proyecto abierto para dar mejor contexto
    const filesCount = context && context.files ? context.files.length : 0;
    const diskFolder = context && context.diskFolder ? context.diskFolder : null;

    let systemPrompt;
    if (tipo === "trivial") {
      systemPrompt = "Responde amablemente y directo en 1-2 lineas, ofreciendo tu ayuda tecnica.";
    } else {
      systemPrompt = `Eres GafCoreAI, un asistente de programacion senior altamente capaz.
Responde de forma clara, tecnica y completa. Explica lo necesario con precision y proporciona soluciones directas.`;
    }

    // Añadir contexto del proyecto si existe
    let contextInfo = "";
    if (diskFolder) {
      contextInfo = "\n\n[Contexto: proyecto abierto en '" + diskFolder + "', " + filesCount + " archivos]";
    }

    let respuesta = "";
    try {
      const mod = await import("./providers.js");
      await mod.chatCompletion(provider, model, [
        { role: "system", content: systemPrompt + contextInfo },
        { role: "user", content: userTask }
      ], tok => {
        respuesta += tok;
        // Stream en vivo
        if (this.onToken) {
          try { this.onToken("GafCoreAI", tok); } catch (e) {}
        }
      });
    } catch (e) {
      respuesta = "Hola. Estoy listo. ¿Que necesitas?";
      if (this.onToken) {
        try { this.onToken("GafCoreAI", respuesta); } catch (e) {}
      }
    }

    this.progress(100);
    this.term("Respuesta directa: " + respuesta.length + " chars");

    return {
      phase1: [], phase2: [], phase3: [],
      all: [{ role: "GafCoreAI", responseText: respuesta.trim(), toolResults: [] }],
      taskId: "direct-" + Date.now(),
      teamStats: {},
      harnessStats: {},
      isDirect: true,
      tipo: tipo
    };
  }

  async run(userTask, context = {}) {
    // ════════════════════════════════════════════════════════
    //  CLASIFICADOR INTELIGENTE (criterio senior)
    //  Solo activa los 6 agentes si la tarea REALMENTE lo amerita
    // ════════════════════════════════════════════════════════
    const tipo = this._classifyTask(userTask);
    this.term("Tipo de tarea: " + tipo);

    if (tipo === "trivial" || tipo === "conversational") {
      return await this._smartDirect(userTask, tipo, context);
    }
    // analysis y code -> FORENSE COMPLETO con todos los agentes y herramientas
    if (this.liveView) {
      this.liveView.startSession(userTask);
      this.liveView.focus();
    }

    if (this.cache) {
      this.cache.clear();
      this.term("[cache] limpiada");
    }

    this.term("═══════════════════════════════════════════");
    this.term("  Tarea: " + userTask);
    this.term("  Task ID: " + this.currentTaskId);
    this.term("═══════════════════════════════════════════");
    this.progress(5);

    // Detectar skills utiles para la tarea
    const usefulSkills = this.detectSkills(userTask);
    if (usefulSkills.length) {
      this.term("");
      this.term("🎯 Skills detectadas: " + usefulSkills.join(", "), "dim");
    }

    // ── FASE 1: Explorer + Analyst + Security (paralelo) ──
    this.term("");
    this.term("▶ FASE 1: Explorer + Analyst + Security (paralelo)");
    this.onStep({ phase: "Fase 1/3: Analizando proyecto..." });
    this.progress(15);

    if (this.liveView) {
      this.liveView.setPhase("🔍", "Fase 1: Analizando proyecto", "Explorer + Analyst + Security");
      this.liveView.renderAgents([
        { name: "Explorer", status: "running" },
        { name: "Analyst",  status: "running" },
        { name: "Security", status: "running" }
      ]);
    }

    const phase1 = await this.runPhaseParallel(
      "fase1",
      [AGENT_ROLES.EXPLORER, AGENT_ROLES.ANALYST, AGENT_ROLES.SECURITY],
      userTask,
      JSON.stringify(context).slice(0, 2000)
    );

    if (this.liveView) {
      this.liveView.renderAgents([
        { name: "Explorer", status: "done" },
        { name: "Analyst",  status: "done" },
        { name: "Security", status: "done" }
      ]);
    }
    this.progress(45);
    this.checkpoint("phase1", phase1);

    // ── FASE 2: Coder (individual, con locks de archivos) ──
    this.term("");
    this.term("▶ FASE 2: Coder");
    this.onStep({ phase: "Fase 2/3: Generando codigo..." });
    if (this.liveView) {
      this.liveView.setPhase("💻", "Fase 2: Generando codigo", "Coder");
      this.liveView.renderAgents([
        { name: "Explorer", status: "done" },
        { name: "Analyst",  status: "done" },
        { name: "Security", status: "done" },
        { name: "Coder",    status: "running" }
      ]);
    }

    const phase2 = await this.runPhaseParallel(
      "fase2",
      [AGENT_ROLES.CODER],
      userTask,
      this.summarize(phase1)
    );

    if (this.liveView) {
      this.liveView.renderAgents([
        { name: "Explorer", status: "done" },
        { name: "Analyst",  status: "done" },
        { name: "Security", status: "done" },
        { name: "Coder",    status: "done" }
      ]);
    }
    this.progress(75);
    this.checkpoint("phase2", phase2);

    // ── FASE 3: Reviewer + Tester (paralelo) ──
    this.term("");
    this.term("▶ FASE 3: Reviewer + Tester (paralelo)");
    this.onStep({ phase: "Fase 3/3: Revisando..." });
    if (this.liveView) {
      this.liveView.setPhase("🧪", "Fase 3: Verificando", "Reviewer + Tester");
      this.liveView.renderAgents([
        { name: "Explorer", status: "done" },
        { name: "Analyst",  status: "done" },
        { name: "Security", status: "done" },
        { name: "Coder",    status: "done" },
        { name: "Reviewer", status: "running" },
        { name: "Tester",   status: "running" }
      ]);
    }

    const phase3 = await this.runPhaseParallel(
      "fase3",
      [AGENT_ROLES.REVIEWER, AGENT_ROLES.TESTER],
      userTask,
      this.summarize(phase2)
    );

    if (this.liveView) {
      this.liveView.renderAgents([
        { name: "Explorer", status: "done" },
        { name: "Analyst",  status: "done" },
        { name: "Security", status: "done" },
        { name: "Coder",    status: "done" },
        { name: "Reviewer", status: "done" },
        { name: "Tester",   status: "done" }
      ]);
    }
    this.progress(100);
    this.checkpoint("phase3", phase3);

    this.term("");
    this.term("✔ Tarea completada");
    this.teamMemory.finishTask(this.currentTaskId, "done");

    if (this.liveView) {
      this.liveView.endSession(true);
    }

    return {
      phase1, phase2, phase3,
      all: [...phase1, ...phase2, ...phase3],
      taskId: this.currentTaskId,
      teamStats: this.teamMemory.getStats(),
      harnessStats: this.harness.getStats()
    };
  }

  // ═══════════════════════════════════════════════════
  //  FASE PARALELA (envuelta con harness + memoria)
  // ═══════════════════════════════════════════════════
  async runPhaseParallel(phaseName, agents, task, context) {
    // Inyectar contexto de equipo + skills
    const enrichedContext = this.enrichContext(context, agents);

    const promises = agents.map(role =>
      this.harness.run(
        phaseName + ":" + role.name,
        () => this.runSingleAgent(role, task, enrichedContext),
        { retries: 1, timeout: 120000 }
      ).catch(e => ({
        role: role.name,
        error: e.message,
        responseText: "(error: " + e.message + ")"
      }))
    );

    const results = await Promise.all(promises);

    results.forEach(r => {
      const cached = r.fromCache ? " [cache]" : "";
      const err = r.error ? " [ERROR]" : "";
      this.term("  ✔ " + r.role + cached + err);
    });

    return results;
  }

  enrichContext(baseContext, agents) {
    const agentNames = agents.map(a => a.name);
    let enriched = baseContext || "";

    // Memoria compartida (solo lo que aplica a estos agentes)
    agentNames.forEach(name => {
      const memCtx = this.teamMemory.buildContext(name);
      if (memCtx) enriched += memCtx;
    });

    return enriched;
  }

  // ═══════════════════════════════════════════════════
  //  AGENTE INDIVIDUAL (envuelto con skills)
  // ═══════════════════════════════════════════════════
  async runSingleAgent(role, task, context) {
    if (this.liveView) this.liveView.agentStart(role.name);
    // Inyectar skills del agente en el system prompt
    const skillsPrompt = buildSkillsPrompt(role.name);

    // Guardar el system prompt original y temporalmente extender
    const originalSystem = role.system;
    if (skillsPrompt) {
      role.system = originalSystem + skillsPrompt;
    }

    try {
      const result = await this.multi.runSingle(role, task, context);

      if (this.liveView) this.liveView.agentDone(role.name);

      // Marcar archivos tocados por el agente
      if (this.liveView && result.toolResults) {
        result.toolResults.forEach(t => {
          if (t.path && t.name === "write_file") {
            this.liveView.filePending(t.path);
          }
        });
      }

      // Extraer hechos y decisiones del resultado
      if (result.responseText && !result.error) {
        const summary = AgentOrchestrator.cleanForDisplay(result.responseText).slice(0, 400);
        this.teamMemory.addFact(role.name, summary, this.currentTaskId);
      }

      return result;
    } finally {
      role.system = originalSystem;
    }
  }

  // ═══════════════════════════════════════════════════
  //  DETECCION DE SKILLS
  // ═══════════════════════════════════════════════════
  detectSkills(task) {
    const t = (task || "").toLowerCase();
    const useful = [];

    if (/busca|investiga|actualizado|noticias|web|url/.test(t)) useful.push("web_search", "read_url");
    if (/analiza|revisa|complejidad|deuda|smell/.test(t)) useful.push("analyze_complexity");
    if (/seguridad|vulnerab|inyecc|xss|cve/.test(t)) useful.push("security_scan");
    if (/bug|error|edge|race|null/.test(t)) useful.push("detect_bugs");
    if (/crea|escribe|implementa|programa/.test(t)) useful.push("write_code");
    if (/test|prueba|unitario/.test(t)) useful.push("write_tests", "run_tests");
    if (/documenta|readme|comentario/.test(t)) useful.push("write_docs");
    if (/git|commit|push|branch/.test(t)) useful.push("git_ops");
    if (/deploy|publica|despliega/.test(t)) useful.push("deploy");

    return [...new Set(useful)];
  }

  // ═══════════════════════════════════════════════════
  //  CHECKPOINTS
  // ═══════════════════════════════════════════════════
  checkpoint(name, data) {
    const cp = { name, ts: Date.now(), data };
    this.checkpoints.push(cp);
    this.term("  [checkpoint] " + name);
    return cp;
  }

  summarize(results) {
    if (!results || !results.length) return "";
    return results.map(r => "[" + r.role + "]: " +
      AgentOrchestrator.cleanForDisplay(r.responseText || "").slice(0, 600)
    ).join("\n\n");
  }

  undoLast() {
    const cp = this.checkpoints.pop();
    if (!cp) return false;
    this.term("↶ Deshacer: " + cp.name);
    return cp;
  }
}