// ============================================================
//  GafCoreAI - agent.js (v7 - Motor Autónomo ReAct Unificado + Multi-Agente)
// ============================================================
import { MultiAgentOrchestrator, AGENT_ROLES } from "./core.js";
import { SKILL_CATALOG, buildSkillsPrompt } from "./skills.js";
import { AgentMemory } from "./agent-memory.js";
import { Harness } from "./harness.js";

/**
 * Extrae rutas de disco (Windows o Unix) mencionadas en el texto del usuario
 */
export function extractDiskPath(text) {
  if (!text) return null;
  // Rutas de Windows con letra de unidad (ej: D:\PROGRAMAS IA\CALILI, C:/Users/...)
  const winMatch = text.match(/\b([a-zA-Z]:[\\\/][a-zA-Z0-9_\- \.\\\/]+)/);
  if (winMatch) {
    let p = winMatch[1].trim().replace(/[\.,;]+$/, "");
    return p;
  }
  // Rutas absolutas Unix (ej: /home/user/...)
  const unixMatch = text.match(/\b(\/[a-zA-Z0-9_\-\.\/]+)/);
  if (unixMatch && unixMatch[1].length > 2) {
    return unixMatch[1].trim().replace(/[\.,;]+$/, "");
  }
  return null;
}

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

  // ═══════════════════════════════════════════════════════════
  //  MOTOR AUTÓNOMO ReAct UNIFICADO (Razonamiento + Acción)
  // ═══════════════════════════════════════════════════════════
  async _runUnifiedReAct(userTask, context = {}) {
    this.progress(10);
    const provider = this.provider;
    const model = this.model;
    const diskFolder = context.diskFolder || (typeof window !== "undefined" && window.state ? window.state.diskFolder : null);
    const filesCount = context.files ? context.files.length : 0;

    const toolsDesc = this.tools ? this.tools.describeForPrompt([
      "list_files", "read_file", "write_file", "search_code", "delete_file", "search_web", "read_url"
    ]) : "";

    const systemPrompt = `Eres GafCoreAI, un Arquitecto de Software e Ingeniero de Inteligencia Artificial Senior de élite (al nivel de los asistentes autónomos más avanzados como Antigravity, Claude Code y Cursor).

# TUS PRINCIPIOS DE RAZONAMIENTO Y EJECUCIÓN
1. **Autonomía y Precisión Técnica:** Razona paso a paso. No des respuestas vagas, vacías ni simuladas. Basa todas tus afirmaciones en datos y archivos reales.
2. **Exploración Activa:** Si el usuario te pide analizar, inspeccionar o trabajar sobre un proyecto o carpeta, usa inmediatamente <tool>list_files</tool> para conocer la estructura real antes de suponer nada.
3. **Lectura Detallada:** Usa <tool>read_file</tool> para leer el código fuente relevante. Nunca inventes código o dependencias.
4. **Manejo de Incertidumbre:** Si un archivo o función no existe, indícalo claramente con honestidad y busca alternativas usando <tool>search_code</tool> o explorando otros directorios.
5. **Generación de Código Completa:** Si creas o modificas archivos, usa el formato \`\`\`write:ruta/del/archivo con el código completo y funcional (sin TODOs ni placeholders incompletos).
6. **Formato Markdown Elegante:** Explica siempre tus hallazgos, arquitectura, diagnóstico y decisiones técnicas usando formato Markdown profesional (títulos #, ##, listas estructuradas, negritas y bloques de código con lenguaje especificado).

# FORMATO DE HERRAMIENTAS
Para invocar herramientas usa:
<tool>nombre_herramienta|param1=valor1|param2=valor2</tool>

Ejemplos:
- <tool>list_files|path=${diskFolder || "."}|recursive=true</tool>
- <tool>read_file|path=src/index.js</tool>
- <tool>search_code|query=texto_a_buscar</tool>
- <tool>search_web|query=consulta</tool>
- <tool>read_url|url=https://...</tool>

Para crear/escribir archivos:
\`\`\`write:ruta/del/archivo.ext
contenido del archivo
\`\`\`
${toolsDesc}
`;

    let contextInfo = "";
    if (diskFolder) {
      contextInfo = `\n\n[Espacio de trabajo activo en disco: "${diskFolder}"]`;
    }
    if (context.repo) {
      contextInfo += `\n[Repositorio conectado: "${context.repo}"]`;
    }

    const messages = [
      { role: "system", content: systemPrompt + contextInfo },
      { role: "user", content: userTask }
    ];

    let fullResponse = "";
    const allToolResults = [];
    const MAX_TURNS = 8;
    const mod = await import("./providers.js");

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      this.progress(Math.min(90, 20 + turn * 12));
      let turnText = "";

      try {
        await mod.chatCompletion(provider, model, messages, tok => {
          turnText += tok;
          if (this.onToken) {
            try { this.onToken("GafCoreAI", tok); } catch (e) {}
          }
        });
      } catch (e) {
        this.term("Error al consultar modelo: " + e.message);
        const errMsg = `\n\n⚠️ **Error de conexión con el modelo (${model ? model.id : "desconocido"}):** ${e.message}\nPor favor verifica tu API key y conexión en Proveedores.`;
        fullResponse += errMsg;
        if (this.onToken) {
          try { this.onToken("GafCoreAI", errMsg); } catch (err) {}
        }
        break;
      }

      fullResponse += (turn > 0 ? "\n\n" : "") + turnText;

      // Parsear tool calls
      const toolCalls = this.tools ? this.tools.parseCalls(turnText) : [];
      if (!toolCalls.length) {
        // No hay herramientas pendientes, respuesta final completada
        break;
      }

      this.term(`[ReAct Turno ${turn + 1}] Ejecutando ${toolCalls.length} herramienta(s): ` + toolCalls.map(c => c.name).join(", "));
      const turnResults = [];

      for (const call of toolCalls) {
        try {
          const r = await this.tools.invoke(call.name, call.args);
          const rStr = typeof r === "string" ? r : JSON.stringify(r);
          turnResults.push({ name: call.name, args: call.args, result: rStr, ok: true });
          allToolResults.push({ name: call.name, path: call.args && call.args.path, result: rStr, ok: true });
          this.term(`  ✔ ${call.name} ${call.args && call.args.path ? call.args.path : ""} (${rStr.length} chars)`);
        } catch (e) {
          turnResults.push({ name: call.name, args: call.args, error: e.message, ok: false });
          allToolResults.push({ name: call.name, path: call.args && call.args.path, error: e.message, ok: false });
          this.term(`  ✘ ${call.name}: ${e.message}`);
        }
      }

      // Agregar mensajes a la historia para la siguiente iteración
      messages.push({ role: "assistant", content: turnText });

      const resultsBlock = turnResults.map(r => {
        if (r.ok) {
          const header = `=== Resultado de ${r.name}${r.args && r.args.path ? " (" + r.args.path + ")" : ""} ===`;
          const body = r.result.length > 20000 ? r.result.slice(0, 20000) + "\n...(truncado para optimizar contexto)" : r.result;
          return `${header}\n${body}`;
        } else {
          return `=== ERROR en ${r.name} ===\n${r.error}`;
        }
      }).join("\n\n");

      messages.push({
        role: "user",
        content: `${resultsBlock}\n\n[Analiza las observaciones reales anteriores. Si necesitas más información o archivos, invoca las herramientas correspondientes. Si ya cuentas con los datos necesarios, proporciona tu respuesta técnica completa, estructurada y detallada en Markdown.]`
      });
    }

    this.progress(100);

    return {
      phase1: [], phase2: [], phase3: [],
      all: [{ role: "GafCoreAI", responseText: fullResponse.trim(), toolResults: allToolResults }],
      taskId: "react-" + Date.now(),
      teamStats: this.teamMemory.getStats(),
      harnessStats: this.harness.getStats(),
      isDirect: true
    };
  }

  // ═══════════════════════════════════════════════════
  //  RUN PRINCIPAL
  // ═══════════════════════════════════════════════════
  async run(userTask, context = {}) {
    // 1. Detección automática de rutas en el prompt del usuario
    const extractedPath = extractDiskPath(userTask);
    if (extractedPath) {
      context.diskFolder = extractedPath;
      if (typeof window !== "undefined" && window.state) {
        window.state.diskFolder = extractedPath;
        if (typeof window.state.openFolderFromPath === "function") {
          try { window.state.openFolderFromPath(extractedPath); } catch (e) {}
        }
      }
      this.term("📂 Espacio de trabajo detectado: " + extractedPath);
    }

    // 2. Si el usuario solicita explícitamente el equipo de multi-agentes en cascada
    const isMultiAgentExplicit = /\b(equipo de agentes|multiagente|multi-agent|6 agentes|fase multiagente|auditoria multiagente)\b/i.test(userTask);
    if (isMultiAgentExplicit) {
      return await this._runMultiAgentWaterfall(userTask, context);
    }

    // 3. Ejecución ReAct Unificada Senior
    return await this._runUnifiedReAct(userTask, context);
  }

  // ═══════════════════════════════════════════════════
  //  FASE MULTI-AGENTE EN CASCADA (OPCIONAL/ESPECIALIZADO)
  // ═══════════════════════════════════════════════════
  async _runMultiAgentWaterfall(userTask, context = {}) {
    if (this.liveView) {
      this.liveView.startSession(userTask);
      this.liveView.focus();
    }

    if (this.cache) {
      this.cache.clear();
      this.term("[cache] limpiada");
    }

    this.term("═══════════════════════════════════════════");
    this.term("  Tarea Multi-Agente: " + userTask);
    this.term("  Task ID: " + this.currentTaskId);
    this.term("═══════════════════════════════════════════");
    this.progress(5);

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
    const skillsPrompt = buildSkillsPrompt(role.name);

    const originalSystem = role.system;
    if (skillsPrompt) {
      role.system = originalSystem + skillsPrompt;
    }

    try {
      const result = await this.multi.runSingle(role, task, context);

      if (this.liveView) this.liveView.agentDone(role.name);

      if (this.liveView && result.toolResults) {
        result.toolResults.forEach(t => {
          if (t.path && t.name === "write_file") {
            this.liveView.filePending(t.path);
          }
        });
      }

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