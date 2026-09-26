// ============================================================
//  GafCoreAI - agent.js (v7 - Motor Autónomo ReAct Unificado + Multi-Agente)
// ============================================================
import { MultiAgentOrchestrator, AGENT_ROLES } from "./core.js";
import { SKILL_CATALOG, buildSkillsPrompt } from "./skills.js";
import { AgentMemory } from "./agent-memory.js";
import { Harness } from "./harness.js";
import { TokenOptimizer } from "./token-optimizer.js";

/**
 * Extrae rutas de disco (Windows o Unix) mencionadas en el texto del usuario
 */
export function extractDiskPath(text) {
  if (!text) return null;
  // Rutas de Windows con o sin barra inmediata (ej: D:\PROGRAMAS IA\CALILI, D:PROGRAMAS IA/CALILI, C:/Users/...)
  const winMatch = text.match(/\b([a-zA-Z]:[\\\/]?[a-zA-Z0-9_\- \.\\\/]+)/);
  if (winMatch) {
    let p = winMatch[1].trim().replace(/[\.,;]+$/, "");
    if (/^[a-zA-Z]:[^\/\\]/.test(p)) {
      p = p.slice(0, 2) + "\\" + p.slice(2);
    }
    return p;
  }
  // Rutas absolutas Unix (ej: /home/user/...)
  const unixMatch = text.match(/\b(\/[a-zA-Z0-9_\-\.\/]+)/);
  if (unixMatch && unixMatch[1].length > 2) {
    return unixMatch[1].trim().replace(/[\.,;]+$/, "");
  }
  // Detección por nombre de proyecto explícito (ej: "abre proyecto taxi driv", "analiza el proyecto restaurante")
  const projMatch = text.match(/\b(?:proyecto|carpeta|folder|directorio|abre el proyecto|abrir el proyecto|analiza el proyecto)\s+([a-zA-Z0-9_\- ]{3,30})\b/i);
  if (projMatch) {
    const name = projMatch[1].trim();
    if (!["este", "un", "el", "la", "mi", "tu", "nuevo", "actual", "disco", "archivos", "codigo", "chat", "agente"].includes(name.toLowerCase())) {
      return "D:\\PROGRAMAS IA\\" + name.toUpperCase();
    }
  }
  return null;
}

export function sanitizeApiErrorMessage(rawError, modelId = "") {
  if (!rawError) return "Error desconocido al conectar con el modelo.";
  const str = String(rawError);

  if (str.includes("该令牌状态不可用") || str.includes("令牌已过期") || str.includes("余额不足") || str.includes("401") || str.includes("Unauthorized") || str.includes("invalid_api_key")) {
    return `⚠️ **API Key o Saldo Inválido (HTTP 401)**\nLa clave API configurada para el modelo \`${modelId || "activo"}\` no está disponible, expiró o no cuenta con saldo en el proveedor.\n👉 **Solución:** Abre el menú **Proveedores** arriba en la barra y actualiza la clave API correspondiente.`;
  }
  if (str.includes("402") || str.includes("Payment Required") || str.includes("not included in your free usage") || str.includes("add usage credits") || str.includes("upgrade for included usage")) {
    return `⚠️ **Modelo no disponible en plan gratuito / Requiere Créditos (HTTP 402)**\nEl modelo \`${modelId || "seleccionado"}\` requiere créditos de pago en tu cuenta de ME AI Cloud o no está incluido en tu plan actual.\n👉 **Solución:** Selecciona en el selector superior otro modelo habilitado (por ejemplo \`mimo-v2.5\`, \`deepseek-v4-pro\`, \`glm-5\`, \`kimi-k2.6\` o los modelos de APICredits).`;
  }
  if (str.includes("429") || str.includes("Rate limit") || str.includes("quota")) {
    return `⚠️ **Límite de Peticiones Alcanzado (HTTP 429)**\nSe ha superado la cuota de uso del modelo \`${modelId || "activo"}\` en este momento.\n👉 **Solución:** Espera unos segundos o selecciona otro modelo verificado.`;
  }
  if (str.includes("Failed to fetch") || str.includes("NetworkError") || str.includes("Network request failed")) {
    return `⚠️ **Error de Red / Conexión**\nNo se pudo establecer conexión con el servidor del proveedor de IA.\n👉 **Solución:** Verifica tu conexión a internet o el estado del proveedor.`;
  }
  return `⚠️ **Error de conexión con el modelo (${modelId || "desconocido"}):**\n${str.slice(0, 300)}\nPor favor verifica tu API key y conexión en Proveedores.`;
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
    this.aborted = false;
    this.currentController = null;

    // Harness + memoria compartida + Grafo Sináptico
    this.harness = new Harness({ log: (m) => this.term(m), termWrite: (m, k) => this.term(m) });
    this.teamMemory = new AgentMemory();
    this.tokenOptimizer = new TokenOptimizer(this.teamMemory.synapticGraph);
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

  stop() {
    this.aborted = true;
    if (this.currentController) {
      try { this.currentController.abort(); } catch (e) {}
    }
    this.term("⛔ Tarea abortada inmediatamente por el usuario.");
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
    // Formatear bloques de escritura como bloques de código visibles con el nombre del archivo
    s = s.replace(/```write:([^\n]+)\n([\s\S]*?)```/g, (m, path, code) => {
      const ext = (path.trim().split(".").pop() || "javascript").toLowerCase();
      return "📄 **" + path.trim() + "**\n```" + ext + "\n" + code + "\n```\n";
    });
    // Limpiar tool tags en todos los formatos sin afectar el texto del agente
    s = s.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "");
    s = s.replace(/<tool_call>/gi, "").replace(/<\/tool_call>/gi, "");
    s = s.replace(/<function\b[^>]*>[\s\S]*?<\/function>/gi, "");
    s = s.replace(/<function\b[^>]*\/?>/gi, "").replace(/<\/function>/gi, "");
    s = s.replace(/<parameter\b[^>]*>[\s\S]*?<\/parameter>/gi, "");
    s = s.replace(/<parameter\b[^>]*\/?>/gi, "").replace(/<\/parameter>/gi, "");
    s = s.replace(/<tool\b[^>]*>[\s\S]*?<\/tool>/gi, "");
    s = s.replace(/<tool=[^>\n]*\/?>/gi, "").replace(/<\/tool>/gi, "");
    s = s.replace(/<path>[\s\S]*?<\/path>/gi, "").replace(/<\/?path>/gi, "");
    s = s.replace(/<recursive>[\s\S]*?<\/recursive>/gi, "").replace(/<\/?recursive>/gi, "");
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
      "open_folder", "close_folder", "list_files", "read_file", "write_file", "edit_file", "run_command", "search_code", "delete_file", "search_web", "read_url"
    ]) : "";

    const systemPrompt = `Eres GafCoreAI, el Agente y Arquitecto de Software Senior integrado en la IDE GafCoreAI (al nivel de Antigravity, Claude Code y Cursor).
Cuentas con control total del entorno de desarrollo, el sistema de archivos del disco y la ejecución en terminal.

# ⚡ REGLAS CRÍTICAS DE INTELIGENCIA Y COMPORTAMIENTO (OBLIGATORIAS):

1. **PROHIBIDO EL RELLENO Y SALUDOS LARGOS:**
   - Si el usuario dice "hola", responde brevemente en 1 línea: "¡Hola! ¿En qué proyecto o tarea trabajamos hoy?".
   - PROHIBIDO listar tus herramientas, menús o habilidades si no te lo piden.
   - NUNCA inventes información ni des discursos genéricos.

2. **ACCIÓN INMEDIATA (HERRAMIENTAS PRIMERO):**
   - Cuando el usuario te pida abrir, analizar, buscar, modificar o crear un proyecto o archivo: **PROHIBIDO responder con frases pasivas sin invocar la herramienta en ese mismo turno.**
   - Si el usuario te pide abrir o analizar un proyecto específico que no está cargado:
     Invoca en el primer turno:
     <tool>open_folder|path=D:\\PROGRAMAS IA\\NOMBRE_PROYECTO</tool>
     <tool>list_files|path=D:\\PROGRAMAS IA\\NOMBRE_PROYECTO|recursive=true</tool>
   - Si ya hay una carpeta abierta en el espacio de trabajo activo, trabaja directamente sobre ella.

3. **UBICACIÓN DEL ECOSISTEMA DE TRABAJO:**
   - Los proyectos residen en \`D:\\PROGRAMAS IA\\<NOMBRE_PROYECTO>\`.

4. **EDICIÓN Y CREACIÓN DE ARCHIVOS:**
   - Para crear archivos completos:
\`\`\`write:ruta/archivo.ext
contenido completo
\`\`\`
   - Para modificaciones puntuales quirúrgicas:
     <tool>edit_file|path=ruta/archivo.ext|target=codigo_exacto_antiguo|replacement=codigo_nuevo</tool>

5. **RESPUESTAS TÉCNICAS DIRECTAS:**
   - Cita archivos, rutas y líneas exactas.
   - Diagnósticos con causa raíz real, explicaciones directas sin rodeos.

# HERRAMIENTAS DISPONIBLES:
- <tool>open_folder|path=D:\\PROGRAMAS IA\\nombre_proyecto</tool> (Abre y carga el proyecto en el explorador derecho)
- <tool>close_folder</tool> (Cierra el proyecto actual)
- <tool>list_files|path=D:\\PROGRAMAS IA\\...|recursive=true</tool> (Lista archivos en disco)
- <tool>read_file|path=ruta/archivo.ext</tool> (Lee el contenido real)
- <tool>edit_file|path=ruta/archivo.ext|target=bloque_antiguo|replacement=bloque_nuevo</tool>
- <tool>run_command|cmd=comando</tool> (Ejecuta en terminal)
- <tool>search_code|query=texto</tool>
- <tool>search_web|query=consulta</tool>
- <tool>read_url|url=https://...</tool>

${toolsDesc}
`;

    let contextInfo = "";
    if (diskFolder) {
      contextInfo = `\n\n[Espacio de trabajo activo en disco: "${diskFolder}"]`;
    }
    if (context.repo) {
      contextInfo += `\n[Repositorio conectado: "${context.repo}"]`;
    }

    // Inyección de conocimiento sináptico optimizado (0 tokens repetidos)
    if (this.tokenOptimizer) {
      const synapticCtx = this.tokenOptimizer.buildCompactContext(userTask, { diskFolder, repo: context.repo });
      if (synapticCtx) contextInfo += synapticCtx;
    }

    const knownErrorFix = this.teamMemory && this.teamMemory.synapticGraph ? this.teamMemory.synapticGraph.lookupErrorFix(userTask) : null;
    if (knownErrorFix) {
      this.term(`⚡ [Grafo Sináptico] Solución previa identificada para: ${knownErrorFix.errorType} -> ${knownErrorFix.fixProposal}`);
    }

    const mod = await import("./providers.js");
    const userContent = mod.buildUserContent(userTask, context.attachments);

    const messages = [
      { role: "system", content: systemPrompt + contextInfo }
    ];

    // Inyectar historial multi-turno previo si existe para memoria contextual continua
    if (context.history && Array.isArray(context.history) && context.history.length) {
      context.history.forEach(h => {
        if (h.role === "user") {
          const uContent = mod.buildUserContent(h.content, h.attachments);
          messages.push({ role: "user", content: uContent });
        } else if (h.role === "assistant" && h.content) {
          messages.push({ role: "assistant", content: h.content.slice(0, 3000) });
        }
      });
    }

    this.aborted = false;
    this.currentController = new AbortController();
    if (context.signal) {
      if (context.signal.aborted) {
        this.aborted = true;
        return {
          phase1: [], phase2: [], phase3: [],
          all: [{ role: "GafCoreAI", responseText: "⛔ Proceso cancelado antes de iniciar.", toolResults: [] }],
          taskId: "react-" + Date.now(),
          isDirect: true
        };
      }
      context.signal.addEventListener("abort", () => {
        this.stop();
      });
    }

    // Turno actual del usuario
    messages.push({ role: "user", content: userContent });

    let fullResponse = "";
    const allToolResults = [];
    const MAX_TURNS = 8;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (this.aborted || (context.signal && context.signal.aborted)) {
        this.term("⛔ Tarea cancelada por el usuario.");
        fullResponse += "\n\n⛔ **Proceso detenido y cancelado por el usuario.**";
        break;
      }

      this.progress(Math.min(90, 20 + turn * 12));
      let turnText = "";

      try {
        await mod.chatCompletion(provider, model, messages, tok => {
          if (this.aborted || (context.signal && context.signal.aborted)) return;
          turnText += tok;
          if (this.onToken) {
            try { this.onToken("GafCoreAI", tok); } catch (e) {}
          }
        }, { signal: this.currentController.signal });
      } catch (e) {
        if (this.aborted || (context.signal && context.signal.aborted) || e.name === "AbortError") {
          fullResponse += "\n\n⛔ **Proceso detenido y cancelado por el usuario.**";
          break;
        }
        const friendlyError = sanitizeApiErrorMessage(e.message, model ? model.id : "");
        this.term("Error al consultar modelo: " + e.message);
        fullResponse += "\n\n" + friendlyError;
        if (this.onToken) {
          try { this.onToken("GafCoreAI", "\n\n" + friendlyError); } catch (err) {}
        }
        break;
      }

      if (this.aborted || (context.signal && context.signal.aborted)) break;
      fullResponse += (turn > 0 ? "\n\n" : "") + turnText;

      // Parsear tool calls
      const toolCalls = this.tools ? this.tools.parseCalls(turnText) : [];
      if (!toolCalls.length) {
        // ── GUARDRAIL DE ACCIÓN REAL (Anti-Simulación "Listo") ──
        // Si el usuario pide aplicar cambios/fase/corrección y el modelo devuelve texto superficial sin emitir tool calls de escritura
        const isActionIntent = /\b(procede|aplica|corrige|modifica|ejecuta|fase\s*\d+|hazlo|crea|cambia|guarda|escribe)\b/i.test(userTask);
        const hasSimulatedCompletion = /\b(listo|tarea procesada|hecho|completado|cambios aplicados|fase \d+ aplicada|modificaciones aplicadas)\b/i.test(turnText);
        const hasWrittenFiles = allToolResults.some(t => t.name === "write_file" || t.name === "edit_file" || (t.args && t.args.content));

        if (isActionIntent && hasSimulatedCompletion && !hasWrittenFiles && turn < MAX_TURNS - 1) {
          this.term("⚠️ [Guardrail] El modelo simuló 'Listo' sin emitir tool calls de escritura. Forzando emisión real...", "warn");
          messages.push({ role: "assistant", content: turnText });
          messages.push({
            role: "user",
            content: "[GUARDRAIL DE SEGURIDAD GAFCOREAI]: Has respondido que la tarea está lista, pero NO has emitido ninguna llamada a herramientas de modificación de archivos (`write_file`, `edit_file` o bloque ```write:ruta```). Es OBLIGATORIO que emitas ahora mismo los bloques de código o tool calls para escribir físicamente los cambios en el disco."
          });
          continue;
        }

        // No hay herramientas pendientes, respuesta final completada
        break;
      }

      this.term(`[ReAct Turno ${turn + 1}] Ejecutando ${toolCalls.length} herramienta(s): ` + toolCalls.map(c => c.name).join(", "));
      const turnResults = [];

      for (const call of toolCalls) {
        if (this.aborted || (context.signal && context.signal.aborted)) {
          this.term("⛔ Ejecución de herramientas cancelada.");
          break;
        }

        const filePath = (call.args && (call.args.path || call.args.file)) || "";
        const isWrite = call.name === "write_file" || call.name === "edit_file" || call.name === "delete_file";

        // Notificar archivo activo al explorador UI
        if (filePath && typeof window !== "undefined" && window.state) {
          window.state.activeAgentFile = {
            path: filePath,
            action: isWrite ? "write" : "read",
            ts: Date.now()
          };
          if (typeof window.state.onProjectChange === "function") {
            try { window.state.onProjectChange(); } catch (e) {}
          }
        }

        if (call.name === "read_file") {
          this.term(`📖 [LECTURA] Leyendo archivo: ${filePath}`, "dim");
        } else if (isWrite) {
          this.term(`✍️ [ESCRITURA] Modificando archivo en disco: ${filePath} ●`, "success");
        } else if (call.name === "run_command") {
          this.term(`⚡ [TERMINAL] Ejecutando: ${call.args && call.args.cmd ? call.args.cmd : ""}`, "agent");
        }

        try {
          const r = await this.tools.invoke(call.name, call.args);
          const rStr = typeof r === "string" ? r : JSON.stringify(r);
          turnResults.push({ name: call.name, args: call.args, result: rStr, ok: true, isWrite });
          allToolResults.push({ name: call.name, path: filePath, result: rStr, ok: true, isWrite });
          if (this.teamMemory && this.teamMemory.synapticGraph) {
            this.teamMemory.synapticGraph.recordSuccess(`tool:${call.name}`, filePath ? `file:${filePath}` : `action:${call.name}`);
          }
          this.term(`  ✔ ${call.name} ${filePath} (${rStr.length} chars)`);
        } catch (e) {
          turnResults.push({ name: call.name, args: call.args, error: e.message, ok: false, isWrite });
          allToolResults.push({ name: call.name, path: filePath, error: e.message, ok: false, isWrite });
          if (this.teamMemory && this.teamMemory.synapticGraph) {
            this.teamMemory.synapticGraph.recordFailure(`tool:${call.name}`, filePath ? `file:${filePath}` : `action:${call.name}`);
          }
          this.term(`  ✘ ${call.name}: ${e.message}`, "error");
        }
      }

      // Limpiar archivo activo tras unos instantes para restablecer indicador visual
      if (typeof window !== "undefined" && window.state) {
        setTimeout(() => {
          if (window.state.activeAgentFile && Date.now() - window.state.activeAgentFile.ts >= 1500) {
            window.state.activeAgentFile = null;
            if (typeof window.state.onProjectChange === "function") {
              try { window.state.onProjectChange(); } catch (e) {}
            }
          }
        }, 1600);
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

    if (typeof window !== "undefined" && window.state) {
      window.state.activeAgentFile = null;
      if (typeof window.state.onProjectChange === "function") {
        try { window.state.onProjectChange(); } catch (e) {}
      }
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
    // 0. Si el usuario pide cerrar el proyecto o carpeta
    const isCloseCommand = /\b(cierra|cerrar|quitar|desconectar)\b.*\b(proyecto|carpeta|folder|directorio)\b/i.test(userTask);
    if (isCloseCommand && !extractDiskPath(userTask)) {
      if (typeof window !== "undefined" && window.state && typeof window.state.closeDiskFolder === "function") {
        try { await window.state.closeDiskFolder(); } catch (e) {}
      }
      context.diskFolder = null;
      this.term("📁 Proyecto cerrado del panel de proyectos.");
    }

    // 1. Detección automática de rutas en el prompt del usuario
    const extractedPath = extractDiskPath(userTask);
    if (extractedPath) {
      context.diskFolder = extractedPath;
      if (typeof window !== "undefined" && window.state) {
        window.state.diskFolder = extractedPath;
        if (typeof window.state.openFolderFromPath === "function") {
          try { await window.state.openFolderFromPath(extractedPath); } catch (e) {}
        }
      }
      this.term("📂 Espacio de trabajo detectado y abierto en panel de proyectos: " + extractedPath);
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