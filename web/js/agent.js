// ============================================================
//  GafCoreAI - agent.js (v8 - Motor ReAct + Trace + Síntesis Blindada)
// ============================================================
import { MultiAgentOrchestrator, AGENT_ROLES } from "./core.js";
import { SKILL_CATALOG, buildSkillsPrompt } from "./skills.js";
import { AgentMemory } from "./agent-memory.js";
import { Harness } from "./harness.js";
import { TokenOptimizer } from "./token-optimizer.js";
import { tauri as tauriBridge } from "./tauri-bridge.js";

/**
 * Extrae rutas de disco (Windows o Unix) mencionadas en el texto del usuario
 */
export function extractDiskPath(text) {
  if (!text) return null;
  const winMatch = text.match(/\b([a-zA-Z]:[\\\/]?[a-zA-Z0-9_\- \.\\\/]+)/);
  if (winMatch) {
    let p = winMatch[1].trim().replace(/[\.,;]+$/, "");
    if (/^[a-zA-Z]:[^\/\\]/.test(p)) {
      p = p.slice(0, 2) + "\\" + p.slice(2);
    }
    return p;
  }
  const unixMatch = text.match(/\b(\/(?:home|usr|var|tmp|mnt|opt|srv|etc|root|media)(?:\/[a-zA-Z0-9_\-\.]+)+)/); // v36: solo paths Unix reales
  if (unixMatch && unixMatch[1].length > 2) {
    return unixMatch[1].trim().replace(/[\.,;]+$/, "");
  }
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
    return `⚠️ **Modelo no disponible en plan gratuito / Requiere Créditos (HTTP 402)**\nEl modelo \`${modelId || "seleccionado"}\` requiere créditos de pago en tu cuenta de ME AI Cloud o no está incluido en tu plan actual.\n👉 **Solución:** Selecciona en el selector superior otro modelo habilitado.`;
  }
  if (str.includes("429") || str.includes("Rate limit") || str.includes("quota")) {
    return `⚠️ **Límite de Peticiones Alcanzado (HTTP 429)**\nSe ha superado la cuota de uso del modelo \`${modelId || "activo"}\` en este momento.\n👉 **Solución:** Espera unos segundos o selecciona otro modelo verificado.`;
  }
  if (str.includes("Failed to fetch") || str.includes("NetworkError") || str.includes("Network request failed")) {
    return `⚠️ **Error de Red / Conexión**\nNo se pudo establecer conexión con el servidor del proveedor de IA.\n👉 **Solución:** Verifica tu conexión a internet o el estado del proveedor.`;
  }
  return `⚠️ **Error de conexión con el modelo (${modelId || "desconocido"}):**\n${str.slice(0, 300)}\nPor favor verifica tu API key y conexión en Proveedores.`;
}

/**
 * Determina si una respuesta ya es un reporte completo o si hay que forzar síntesis.
 * NO usa longitud como criterio principal: usa estructura real.
 */
function isReportComplete(text) {
  if (!text) return false;
  const t = String(text).trim();
  if (t.length < 80) return false;
  const hasHeadings = /^#{1,3}\s/m.test(t);
  const hasBullets  = /^\s*[-*•]\s/m.test(t);
  const hasCodeBlock = /```/.test(t);
  const hasPath      = /[A-Z]:\\|\.\/|\/[\w-]+\//.test(t);
  const longEnough   = t.length > 300;
  const score = [hasHeadings, hasBullets, hasCodeBlock, hasPath, longEnough].filter(Boolean).length;
  return score >= 3;
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
    this.onTrace = opts.onTrace || (() => {});
    this.tools = opts.tools;
    this.cache = opts.cache;
    this.memory = opts.memory;
    this.checkpoints = [];
    this.globalTimeout = 420000;
    this.aborted = false;
    this.currentController = null;

    this.harness = new Harness({ log: (m) => this.term(m), termWrite: (m, k) => this.term(m) });
    this.teamMemory = new AgentMemory();
    this.tokenOptimizer = new TokenOptimizer(this.teamMemory.synapticGraph);
    this.currentTaskId = "task-" + Date.now();
    this.teamMemory.startTask(this.currentTaskId, "orchestrator");

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

  _emitTrace(kind, data = {}) {
    try {
      this.onTrace({ kind, ts: Date.now(), taskId: this.currentTaskId, ...data });
    } catch (e) {
      console.warn("[trace] error:", e);
    }
  }

  stop() {
    this.aborted = true;
    if (this.currentController) {
      try { this.currentController.abort(); } catch (e) {}
    }
    this._emitTrace("aborted", {});
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
    // v42: NO mostrar el codigo en el chat, solo confirmar que el archivo se guardo
    s = s.replace(/```write:([^\n]+)\n([\s\S]*?)```/g, (m, path) => {
      return "\n📄 **" + path.trim() + "** _(archivo guardado)_\n";
    });
    s = s.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "");
    s = s.replace(/<tool_call>/gi, "").replace(/<\/tool_call>/gi, "");
    s = s.replace(/<function\b[^>]*>[\s\S]*?<\/function>/gi, "");
    s = s.replace(/<function\b[^>]*\/?>/gi, "").replace(/<\/function>/gi, "");
    s = s.replace(/<parameter\b[^>]*>[\s\S]*?<\/parameter>/gi, "");
    s = s.replace(/<parameter\b[^>]*\/?>/gi, "").replace(/<\/parameter>/gi, "");
    s = s.replace(/<tool\b[^>]*>[\s\S]*?<\/tool>/gi, "");
    s = s.replace(/<tool=[^>\n]*\/?>/gi, "").replace(/<\/tool>/gi, "");
    s = s.replace(/<(?:read_file|write_file|edit_file|list_files|run_command|search_code|search_web|read_url|open_folder|close_folder|deploy_vercel|supabase_query|supabase_sync|ssh_exec|publish_project|git_status|git_commit|git_push|git_pull)\b[\s\S]*?(?:\/>|<\/(?:read_file|write_file|edit_file|list_files|run_command|search_code|search_web|read_url|open_folder|close_folder|deploy_vercel|supabase_query|supabase_sync|ssh_exec|publish_project|git_status|git_commit|git_push|git_pull)>)/gi, "");
    s = s.replace(/<\/?(?:read_file|write_file|edit_file|list_files|run_command|search_code|search_web|read_url|open_folder|close_folder|deploy_vercel|supabase_query|supabase_sync|ssh_exec|publish_project|git_status|git_commit|git_push|git_pull)\b[^>]*>/gi, "");
    s = s.replace(/<(?:target|replacement|content|cmd|path|recursive|query|url|table|action|select|message|branch|host|user)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
    s = s.replace(/<\/?(?:target|replacement|content|cmd|path|recursive|query|url|table|action|select|message|branch|host|user)\b[^>]*>/gi, "");
    s = s.replace(/```(?:tool|tool_call|call):[^\n]*\n[\s\S]*?```/gi, "");
    s = s.replace(/```read:[^\n]+\n?\s*```/gi, "");
    s = s.replace(/\{\s*"tool_calls"\s*:[\s\S]*?\}\s*\}/g, "");
    s = s.replace(/^\s*(?:path|recursive|url|query|cmd|content|file|target|replacement)\s*:\s*.*$/gm, "");
    s = s.replace(/\n{3,}/g, "\n\n").trim();
    return s;
  }

  _buildFallbackReport(userTask, allToolResults) {
    const lines = [];
    lines.push("## 📋 Reporte de ejecución (fallback)");
    lines.push("");
    lines.push(`**Tarea solicitada:** ${userTask}`);
    lines.push("");
    lines.push(`**Herramientas ejecutadas:** ${allToolResults.length}`);
    lines.push("");
    if (allToolResults.length) {
      lines.push("### Acciones realizadas");
      lines.push("");
      allToolResults.forEach(r => {
        const status = r.ok ? "✅" : "❌";
        const path = r.path ? ` \`${r.path}\`` : "";
        lines.push(`- ${status} \`${r.name}\`${path}`);
        if (!r.ok && r.error) lines.push(`  - Error: ${r.error}`);
      });
      lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push("_El modelo no generó una síntesis. Este reporte resume las acciones ejecutadas en el turno._");
    return lines.join("\n");
  }

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

4. **DISTINCIÓN ESTRICTA ENTRE ANÁLISIS Y EDICIÓN:**
   - Si la tarea es de **ANÁLISIS, AUDITORÍA O DIAGNÓSTICO**: usa EXCLUSIVAMENTE herramientas de lectura (\`list_files\`, \`read_file\`, \`search_code\`). NUNCA inventes llamadas a \`edit_file\` con rutas ficticias ni placeholders.
   - Si la tarea es de **EDICIÓN O CREACIÓN**:
     * Para archivos completos: usa el bloque \`\`\`write:ruta_real/archivo.ext
     * Para modificaciones quirúrgicas: DEBES haber leído el archivo primero con \`read_file\` para obtener el bloque exacto. NUNCA uses placeholders como "ruta/archivo.ext" o "bloque_antiguo".
     * Sintaxis: <tool>edit_file|path=ruta_real/archivo.ext|target=bloque_exacto_antiguo|replacement=bloque_nuevo</tool>

5. **RESPUESTAS TÉCNICAS DIRECTAS:**
   - Cita archivos, rutas y líneas exactas reales comprobadas en disco.
   - Diagnósticos con causa raíz demostrable sin rodeos ni justificaciones vacías.


6.5 **ANALISIS EXHAUSTIVO OBLIGATORIO (REGLA v47):**
   - PROHIBIDO declarar un analisis "completo", "exhaustivo" o "forense" si has leido menos de 10 archivos.
   - Antes de sintetizar DEBES haber leido como minimo: package.json (raiz), README.md (si existe), el entry point principal (index.js / main.js / app.js / server.js / renderer.js), y al menos 6 archivos fuente adicionales (modulos de src/, test/, lib/, scripts/).
   - Si el usuario dice "procede", "continua", "dale", "sigue", "profundiza", "amplia" DESPUES de un reporte previo: NO sintetices. Lee MAS archivos que aun no hayas leido. Amplia el analisis.
   - Si el usuario dice "?" o "que paso" o "ya terminaste": responde SIEMPRE con contexto - menciona cuantos archivos leiste, cuales, y que falta por revisar.

6.6 **ESCRITURA REAL OBLIGATORIA (REGLA v47):**
   - Si el usuario pide aplicar, corregir, modificar, crear, arreglar, implementar o escribir CUALQUIER cambio en un proyecto: PROHIBIDO responder "hecho", "listo", "aplicado", "corregido" SIN haber emitido antes la herramienta correspondiente.
   - Herramientas validas: <tool>write_file</tool>, <tool>edit_file</tool>, o bloque con \`\`\`write:ruta.
   - Esta PROHIBIDO simular la aplicacion de cambios. Si no emites la herramienta, el archivo NO existe en disco.
   - Confirmar el resultado SOLO despues de que la herramienta devolvio exito.
6.5 **ANALISIS EXHAUSTIVO OBLIGATORIO (REGLA v47):**
   - PROHIBIDO declarar un analisis "completo", "exhaustivo" o "forense" si has leido menos de 10 archivos.
   - Antes de sintetizar DEBES haber leido como minimo: package.json (raiz), README.md (si existe), el entry point principal, y al menos 6 archivos fuente adicionales (modulos de src/, test/, lib/, scripts/).
   - Si el usuario dice "procede", "continua", "dale", "sigue", "profundiza" DESPUES de un reporte previo: NO sintetices. Lee MAS archivos.
   - Si el usuario dice "?" o "que paso" o "ya terminaste": responde SIEMPRE mencionando cuantos archivos leiste y que falta por revisar.

6.6 **ESCRITURA REAL OBLIGATORIA (REGLA v47):**
   - Si el usuario pide aplicar, corregir, modificar, crear o arreglar CUALQUIER cambio: PROHIBIDO responder "hecho", "listo", "aplicado", "corregido" SIN antes emitir la herramienta real.
   - Herramientas validas: write_file, edit_file, o bloque write:ruta.
   - PROHIBIDO simular cambios. Si no emites la herramienta, el archivo NO existe en disco.
   - Confirmar el exito SOLO despues de que la herramienta respondio OK.
6. **SINTESIS FINAL OBLIGATORIA:**
   - Cuando termines de usar herramientas y tengas suficiente informacion, SIEMPRE entrega un REPORTE FINAL en Markdown con: Resumen, Hallazgos, Causa raiz (si aplica) y Propuesta / Proximos pasos.
   - NUNCA termines un turno sin texto. NUNCA devuelvas solo tool calls sin reporte.

7. **FLUJO DE CREACION GUIADA (SOLO PROYECTOS NUEVOS DESDE CERO):**
   - Si el usuario pide CREAR algo nuevo (pagina web, app, landing, tienda, blog, dashboard, etc.) y NO ha dado detalles especificos, NO empieces a escribir archivos todavia. Primero GUIA al usuario como hace Lovable.
   - Haz entre 3 y 5 preguntas concisas (no mas) sobre lo esencial:
     * Proposito del proyecto / tipo de negocio
     * Estilo visual deseado (minimalista, moderno, colorido, elegante, etc.)
     * Colores o paleta preferida (si tiene)
     * Secciones o paginas clave que debe tener
     * Contenido real disponible vs. placeholders
   - Formato: lista numerada corta. Cero discursos largos.
   - ESPERA respuesta del usuario. NO escribas archivos en este turno. NO invoques write_file.
   - Cuando el usuario responda, presenta un PLAN BREVE de 5-8 bullets con la estructura propuesta. Termina con la pregunta: "Confirmas y procedo?"
   - Solo si el usuario dice "procede", "dale", "hazlo", "adelante", "si", "ok" o similar, ENTONCES empieza a escribir archivos.
   - Si el usuario da TODOS los detalles desde el inicio (o dice "hazlo tu, elige por mi", "sorprendeme"), SALTATE las preguntas y procede directamente a escribir.

8. **EXCEPCION - EDITAR PROYECTO EXISTENTE:**
   - Si el usuario pide modificar, anadir, corregir, arreglar o refactorizar algo en un proyecto que YA existe en disco, NO preguntes. Actua directamente.
   - La regla 7 (creacion guiada) SOLO aplica cuando es un proyecto NUEVO desde cero.

9. **PROHIBIDO REPETIR CODIGO EN EL CHAT CUANDO USAS write_file:**
   - Cuando creas o modificas archivos con <tool>write_file</tool>, <tool>edit_file</tool> o bloques write:ruta, PROHIBIDO mostrar el contenido del codigo otra vez en tu respuesta final.
   - Tu respuesta final debe ser SOLO un resumen ejecutivo breve: que archivos creaste, que hacen en 1 linea cada uno, y como verlo.
   - Formato correcto: "He creado el sitio con 3 archivos: index.html (estructura), styles.css (diseno responsivo), script.js (carrito). Abrelo en el navegador interno."
   - Formato PROHIBIDO: volver a pegar el HTML/CSS/JS completo despues de haberlo escrito.
   - El codigo YA esta en el editor. NO lo dupliques en el chat.

10. **CALIDAD PROFESIONAL OBLIGATORIA EN FRONTEND:**
    - Al crear cualquier web nueva (landing, e-commerce, dashboard, blog, portfolio), ACTIVA las skills frontend_ui_engineering y frontend_design.
    - Requisitos minimos NO NEGOCIABLES para diseno nivel profesional:
      * Tipografia: importar fuentes reales de Google Fonts (Inter, Manrope, Outfit, Plus Jakarta Sans). NUNCA Arial ni sans-serif por defecto.
      * Paleta: definir 6-9 colores con jerarquia (primary, secondary, accent, neutral 50-900). NUNCA usar solo 3 colores planos.
      * Hero: imagen o video real de fondo con overlay. Usar URLs de Unsplash/Pexels directamente.
      * Micro-interacciones: hover states en TODOS los botones, links y cards. Transiciones 200-300ms con cubic-bezier(0.4, 0, 0.2, 1).
      * Animaciones sutiles: fade-in al scroll (Intersection Observer), slide-up en cards.
      * Componentes modernos: cards con sombra suave (0 4px 20px rgba(0,0,0,0.08)), bordes redondeados 8-24px, espaciado minimo 80px entre secciones.
      * Grid responsive real: grid-template-columns repeat(auto-fill, minmax(320px, 1fr)) con gap 24-32px.
      * Iconos: SVGs reales inline o Lucide/Heroicons via CDN. NUNCA emojis como iconos principales.
      * Imagenes reales: URLs de Unsplash para productos y hero.
      * SEO: meta description, Open Graph, favicon, title descriptivo.
      * Accesibilidad: aria-label en botones, contraste WCAG AA, focus visible.

11. **ORDEN CORRECTO DE SUGERENCIAS AL TERMINAR:**
    - Cuando termines de crear o modificar una web, las sugerencias de continuacion deben seguir ESTE ORDEN ESTRICTO:
      1. Terminar el desarrollo completo: secciones faltantes, contenido real, paginas internas, funcionalidades visuales.
      2. Refinar diseno y UX: animaciones, responsive extremo, dark mode, accesibilidad.
      3. Anadir tests: basicos de funcionalidad.
      4. SOLO AL FINAL, cuando la web este 100% terminada visualmente: ofrecer conectar backend (Supabase), GitHub, Vercel.
    - PROHIBIDO ofrecer Supabase/GitHub/Vercel como primera sugerencia cuando la web aun tiene secciones sin construir.
    - Cada bloque de sugerencias: maximo 3 opciones, foco en completar la web primero.


12. **CREACION DE PROYECTOS NUEVOS - RUTA OBLIGATORIA:**
    - Cuando el usuario te pida crear un proyecto nuevo (web, app, landing, tienda, blog, dashboard, etc.), SIEMPRE debes guardarlo en: D:\PROGRAMAS IA\NUEVOS PROYECTOS\<NOMBRE_DEL_PROYECTO>\
    - Flujo obligatorio:
      1. Deduce un nombre corto en MAYUSCULAS con guiones (ej: TENIS-SHOP, BLOG-MODA, LANDING-CAFE, PORTFOLIO-2026)
      2. ANTES de escribir ningun archivo, invoca PRIMERO esta herramienta para crear la carpeta:
         <tool>open_folder|path=D:\PROGRAMAS IA\NUEVOS PROYECTOS\NOMBRE-DEL-PROYECTO</tool>
      3. El sistema creara la carpeta automaticamente si no existe
      4. Despues escribe los archivos con rutas RELATIVAS (index.html, styles.css, script.js, assets/css/style.css, etc.) - NO uses rutas absolutas
      5. Al terminar, el navegador se abrira automaticamente con index.html
    - PROHIBIDO escribir en rutas absolutas tipo /callejero, /home, /tmp, /usr
    - PROHIBIDO escribir fuera de D:\PROGRAMAS IA\NUEVOS PROYECTOS\
    - Si el usuario pide modificar un proyecto EXISTENTE que ya esta abierto, trabaja directamente en el sin mover nada

# HERRAMIENTAS DISPONIBLES:
- <tool>open_folder|path=D:\\PROGRAMAS IA\\nombre_proyecto</tool> (Abre y carga el proyecto en el explorador derecho)
- <tool>close_folder</tool> (Cierra el proyecto actual)
- <tool>list_files|path=D:\\PROGRAMAS IA\\...|recursive=true</tool> (Lista archivos en disco)
- <tool>read_file|path=ruta_real/archivo.ext</tool> (Lee el contenido real)
- <tool>edit_file|path=ruta_real/archivo.ext|target=bloque_antiguo|replacement=bloque_nuevo</tool>
- <tool>run_command|cmd=comando</tool> (Ejecuta en terminal)
- <tool>search_code|query=texto</tool>
- <tool>search_web|query=consulta</tool>
- <tool>read_url|url=https://...</tool>

${toolsDesc}
`;

    let contextInfo = "";
    if (diskFolder) {
      contextInfo = `\n\n[Espacio de trabajo activo en disco: "${diskFolder}"]`;

      const ruleFiles = [".cursorrules", "AGENTS.md", ".agentrules", "CLAUDE.md"];
      const sep = diskFolder.includes("\\") ? "\\" : "/";
      for (const rf of ruleFiles) {
        try {
          const rulePath = diskFolder.replace(/[\\\/]$/, "") + sep + rf;
          let content = null;
          if (tauriBridge && typeof tauriBridge.readFile === "function") {
            try { content = await tauriBridge.readFile(rulePath); } catch (_) {}
          }
          if (!content && typeof window !== "undefined" && window.state && window.state.projectFiles && window.state.projectFiles[rf]) {
            content = window.state.projectFiles[rf];
          }
          if (content && content.trim().length > 10) {
            contextInfo += `\n\n# 📜 REGLAS OBLIGATORIAS DEL PROYECTO (${rf}):\n${content.trim()}\n`;
            this.term(`⚡ [Reglas de Proyecto] Cargadas reglas de ${rf} (${content.length} chars)`, "dim");
            break;
          }
        } catch (_) {}
      }
    }
    if (context.repo) {
      contextInfo += `\n[Repositorio conectado: "${context.repo}"]`;
    }

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
        this._emitTrace("aborted", { reason: "signal-before-start" });
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

    messages.push({ role: "user", content: userContent });

    this._emitTrace("plan", {
      userTask,
      diskFolder,
      maxTurns: 8,
      toolsAvailable: this.tools ? this.tools.list().map(t => t.name) : []
    });

    let fullResponse = "";
    const allToolResults = [];
    const MAX_TURNS = 8;
    const executedToolSignatures = new Set();

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (this.aborted || (context.signal && context.signal.aborted)) {
        this.term("⛔ Tarea cancelada por el usuario.");
        fullResponse += "\n\n⛔ **Proceso detenido y cancelado por el usuario.**";
        this._emitTrace("aborted", { turn });
        break;
      }

      this.progress(Math.min(90, 20 + turn * 12));
      this._emitTrace("turn_start", { turn: turn + 1, maxTurns: MAX_TURNS });

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
          this._emitTrace("aborted", { turn, reason: "abort-error" });
          break;
        }
        const friendlyError = sanitizeApiErrorMessage(e.message, model ? model.id : "");
        this.term("Error al consultar modelo: " + e.message);
        this._emitTrace("error", { turn, message: e.message });
        fullResponse += "\n\n" + friendlyError;
        if (this.onToken) {
          try { this.onToken("GafCoreAI", "\n\n" + friendlyError); } catch (err) {}
        }
        break;
      }

      if (this.aborted || (context.signal && context.signal.aborted)) break;
      fullResponse += (turn > 0 ? "\n\n" : "") + turnText;

      this._emitTrace("assistant_text", {
        turn: turn + 1,
        text: turnText,
        length: turnText.length
      });

      const toolCalls = this.tools ? this.tools.parseCalls(turnText) : [];
      if (!toolCalls.length) {
  // ========== v47 GUARDRAIL: Analisis profundo obligatorio ==========
        const __readSetV47 = new Set();
        allToolResults.forEach(r => {
          if ((r.name === "read_file" || r.name === "write_file" || r.name === "edit_file") && r.path) {
            __readSetV47.add(r.path);
          }
        });
        const __isAnalysisV47 = /\b(analiza|analizar|analisis|revisa|revisar|audita|auditoria|forense|exhaustiv|reporte|diagnostico|examina|inspecciona)\b/i.test(userTask);
        const __needsDeepV47 = __isAnalysisV47 && __readSetV47.size < 8 && turn < MAX_TURNS - 2;
        if (__needsDeepV47) {
          this.term("v47: analisis superficial (" + __readSetV47.size + " archivos). Ampliando a 10+...", "warn");
          this._emitTrace("guardrail", { reason: "shallow-analysis-v47", filesRead: __readSetV47.size });
          messages.push({ role: "assistant", content: turnText });
          messages.push({
            role: "user",
            content: "[GUARDRAIL v47 - ANALISIS PROFUNDO]: Has leido solo " + __readSetV47.size + " archivos. Un analisis FORENSE o EXHAUSTIVO requiere MINIMO 10 archivos. Lee AHORA mas archivos con las herramientas disponibles. Minimos obligatorios: package.json raiz, README.md, entry point principal, y al menos 6 modulos fuente de src/, test/, lib/ o scripts/. PROHIBIDO entregar reporte final en este turno."
          });
          continue;
        }
        const isActionIntent = /\b(procede|aplica|corrige|modifica|ejecuta|fase\s*\d+|hazlo|crea|cambia|guarda|escribe)\b/i.test(userTask);
        const isCreateTask = /(crea|crear|construye|genera|implementa|haz|programa|desarrolla|construir|generar)\s+(una?\s+)?(web|p[aá]gina|landing|sitio|tienda|blog|app|aplicaci[oó]n|dashboard|proyecto|portfolio|html)/i.test(userTask);
        const hasSimulatedCompletion = /\b(listo|tarea procesada|hecho|completado|aplicado|aplicada|aplicadas|aplicados|corregido|corregida|corregidas|corregidos|modificado|modificada|modificados|modificadas|actualizado|actualizada|actualizados|actualizadas|añadido|añadida|añadidos|añadidas|implementado|implementada|implementados|implementadas|refactorizado|refactorizada|cambios aplicados|fase \d+ aplicada|modificaciones aplicadas|he creado|hemos creado|se cre[oó]|se gener[oó]|archivos creados|archivos generados|he generado|he escrito|creados? exitosamente|proyecto creado|tienda creada|pagina creada)\b/i.test(turnText);
        const hasWrittenFiles = allToolResults.some(t => t.name === "write_file" || t.name === "edit_file" || (t.args && t.args.content));

        if ((isActionIntent || isCreateTask) && hasSimulatedCompletion && !hasWrittenFiles && turn < MAX_TURNS - 1) {
          this.term("⚠️ [Guardrail] El modelo simuló 'Listo' sin emitir tool calls de escritura. Forzando emisión real...", "warn");
          this._emitTrace("guardrail", { reason: "simulated-completion-without-write" });
          messages.push({ role: "assistant", content: turnText });
          messages.push({
            role: "user",
            content: "[GUARDRAIL DE SEGURIDAD GAFCOREAI]: Has respondido que la tarea está lista, pero NO has emitido ninguna llamada a herramientas de modificación de archivos (`write_file`, `edit_file` o bloque ```write:ruta```). Es OBLIGATORIO que emitas ahora mismo los bloques de código o tool calls para escribir físicamente los cambios en el disco."
          });
          continue;
        }

        this._emitTrace("final_text", { turn: turn + 1, text: turnText });
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
        const callSig = call.name + ":" + (filePath || (call.args && call.args.folder) || "");

        if (executedToolSignatures.has(callSig) && !isWrite) {
          this.term(`  ⚠️ [Anti-Loop] Herramienta repetida prevenida: ${call.name} (${filePath || 'raíz'})`, "warn");
          this._emitTrace("anti_loop", { name: call.name, path: filePath });
          const cachedMsg = `[SISTEMA - AVISO ANTI-BUCLE]: Ya ejecutaste '${call.name}' para esta ruta en un turno previo y tienes la información en las observaciones anteriores. NO repitas la misma consulta. Continúa leyendo otros archivos con read_file o entrega tu análisis y reporte final al usuario.`;
          turnResults.push({ name: call.name, args: call.args, result: cachedMsg, ok: true, isWrite: false });
          continue;
        }
        executedToolSignatures.add(callSig);

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

        this._emitTrace("tool_call", {
          turn: turn + 1,
          name: call.name,
          args: call.args,
          isWrite
        });

        try {
          const r = await this.tools.invoke(call.name, call.args);
          const rStr = typeof r === "string" ? r : JSON.stringify(r);
          turnResults.push({ name: call.name, args: call.args, result: rStr, ok: true, isWrite });
          allToolResults.push({ name: call.name, path: filePath, result: rStr, ok: true, isWrite });
          if (this.teamMemory && this.teamMemory.synapticGraph) {
            this.teamMemory.synapticGraph.recordSuccess(`tool:${call.name}`, filePath ? `file:${filePath}` : `action:${call.name}`);
          }
          this.term(`  ✔ ${call.name} ${filePath} (${rStr.length} chars)`);

          this._emitTrace("observation", {
            turn: turn + 1,
            name: call.name,
            path: filePath,
            ok: true,
            resultPreview: rStr.slice(0, 800),
            fullLength: rStr.length
          });
        } catch (e) {
          turnResults.push({ name: call.name, args: call.args, error: e.message, ok: false, isWrite });
          allToolResults.push({ name: call.name, path: filePath, error: e.message, ok: false, isWrite });
          if (this.teamMemory && this.teamMemory.synapticGraph) {
            this.teamMemory.synapticGraph.recordFailure(`tool:${call.name}`, filePath ? `file:${filePath}` : `action:${call.name}`);
          }
          this.term(`  ✘ ${call.name}: ${e.message}`, "error");

          this._emitTrace("observation", {
            turn: turn + 1,
            name: call.name,
            path: filePath,
            ok: false,
            error: e.message
          });
        }
      }

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

      messages.push({ role: "assistant", content: turnText });

      const resultsBlock = turnResults.map(r => {
        if (r.ok) {
          const header = `=== Resultado de ${r.name}${r.args && r.args.path ? " (" + r.args.path + ")" : ""} ===`;
          let body = r.result;
          if (this.tokenOptimizer) {
            body = this.tokenOptimizer.compressObservation(r.name, body, 12000);
          } else if (body.length > 20000) {
            body = body.slice(0, 20000) + "\n...(truncado para optimizar contexto)";
          }
          return `${header}\n${body}`;
        } else {
          return `=== ERROR en ${r.name} ===\n${r.error}`;
        }
      }).join("\n\n");

      const hasErrors = turnResults.some(r => !r.ok);
      let followUpGuidance = "";

      if (hasErrors) {
        followUpGuidance = `\n\n[INSTRUCCIÓN INTERNA DEL SISTEMA]: Una o más herramientas arrojaron error arriba.
⚠️ PROHIBIDO redactar un ensayo o análisis explicando este error al usuario.
⚠️ PROHIBIDO detenerte a justificar el fallo o culpar a las herramientas.
Tu OBLIGACIÓN inmediata es:
1. Si faltó una ruta o el archivo no existe, invoca <tool>list_files</tool> para encontrar las rutas reales en disco.
2. Si hubo un error en edit_file o write_file, verifica el contenido con read_file y vuelve a invocar la herramienta con los parámetros correctos.
3. Si la tarea del usuario era de solo análisis/reporte, NO intentes editar archivos ficticios; procede a leer los archivos reales con read_file o entrega tu reporte técnico final basado en los archivos inspeccionados.`;
      } else {
        followUpGuidance = `\n\n[Analiza las observaciones reales anteriores. Si necesitas más información o archivos, invoca las herramientas correspondientes. Si ya cuentas con los datos necesarios, proporciona tu RESPUESTA FINAL completa, estructurada y detallada en Markdown, con: Resumen, Hallazgos (con archivo:línea), Causa raíz si aplica, y Propuesta/Próximos pasos.]`;
      }

      messages.push({
        role: "user",
        content: `${resultsBlock}${followUpGuidance}`
      });
    }

    const displayCheck = AgentOrchestrator.cleanForDisplay(fullResponse);
    const reportOk = isReportComplete(displayCheck);

    if (!this.aborted && !reportOk && allToolResults.length > 0) {
      this.term("[ReAct Síntesis] Generando reporte y respuesta final estructurada...", "agent");
      this._emitTrace("synthesis_start", { reason: reportOk ? "forced" : "incomplete" });

      messages.push({
        role: "user",
        content: `[INSTRUCCIÓN OBLIGATORIA DE SÍNTESIS FINAL]:
Has completado la inspección y lectura de herramientas.
1. NO emitas más etiquetas <tool> ni llamadas a herramientas.
2. Redacta AHORA tu reporte técnico y respuesta completa, exhaustiva y estructurada en Markdown para el usuario en el chat.
3. El reporte DEBE contener al menos estas secciones:
   ## Resumen
   ## Hallazgos
   ## Causa raíz (si aplica)
   ## Propuesta / Próximos pasos
4. Cita rutas de archivo reales con backticks.
5. Si aplica, incluye bloques de código con el fix propuesto.`
      });

      let synthesisText = "";
      try {
        await mod.chatCompletion(provider, model, messages, tok => {
          if (this.aborted || (context.signal && context.signal.aborted)) return;
          synthesisText += tok;
          if (this.onToken) {
            try { this.onToken("GafCoreAI", tok); } catch (e) {}
          }
        }, { signal: this.currentController.signal });
      } catch (synthErr) {
        this.term("Aviso en síntesis final: " + synthErr.message, "dim");
        this._emitTrace("synthesis_error", { message: synthErr.message });
      }

      synthesisText = (synthesisText || "").trim();

      if (synthesisText.length < 80) {
        this.term("[ReAct Síntesis] Fallback determinista activado (respuesta vacía o muy corta).", "warn");
        this._emitTrace("synthesis_fallback", {
          reason: "empty-or-too-short",
          length: synthesisText.length
        });
        synthesisText = this._buildFallbackReport(userTask, allToolResults);
      }

      fullResponse += "\n\n" + synthesisText;
      this._emitTrace("final_report", {
        text: fullResponse,
        toolCount: allToolResults.length,
        usedFallback: synthesisText.startsWith("## 📋 Reporte de ejecución")
      });
    } else {
      this._emitTrace("final_report", {
        text: fullResponse,
        toolCount: allToolResults.length,
        usedFallback: false
      });
    }

    if (typeof window !== "undefined" && window.state) {
      window.state.activeAgentFile = null;
      if (typeof window.state.onProjectChange === "function") {
        try { window.state.onProjectChange(); } catch (e) {}
      }
    }

    if (this.teamMemory && diskFolder && typeof window !== "undefined" && window.tauri) {
      try { this.teamMemory.syncToDisk(diskFolder, window.tauri); } catch (_) {}
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

  async run(userTask, context = {}) {
    const isCloseCommand = /\b(cierra|cerrar|quitar|desconectar)\b.*\b(proyecto|carpeta|folder|directorio)\b/i.test(userTask);
    if (isCloseCommand && !extractDiskPath(userTask)) {
      if (typeof window !== "undefined" && window.state && typeof window.state.closeDiskFolder === "function") {
        try { await window.state.closeDiskFolder(); } catch (e) {}
      }
      context.diskFolder = null;
      this.term("📁 Proyecto cerrado del panel de proyectos.");
    }

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

    const isMultiAgentExplicit = /\b(equipo de agentes|multiagente|multi-agent|6 agentes|fase multiagente|auditoria multiagente)\b/i.test(userTask);
    if (isMultiAgentExplicit) {
      return await this._runMultiAgentWaterfall(userTask, context);
    }

    return await this._runUnifiedReAct(userTask, context);
  }

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

    this._emitTrace("multi_start", { userTask });

    this.term("");
    this.term("▶ FASE 1: Explorer + Analyst + Security (paralelo)");
    this.onStep({ phase: "Fase 1/3: Analizando proyecto..." });
    this.progress(15);

    this._emitTrace("multi_phase", { phase: 1, agents: ["Explorer", "Analyst", "Security"] });

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

    this.term("");
    this.term("▶ FASE 2: Coder");
    this.onStep({ phase: "Fase 2/3: Generando codigo..." });

    this._emitTrace("multi_phase", { phase: 2, agents: ["Coder"] });

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

    this.term("");
    this.term("▶ FASE 3: Reviewer + Tester (paralelo)");
    this.onStep({ phase: "Fase 3/3: Revisando..." });

    this._emitTrace("multi_phase", { phase: 3, agents: ["Reviewer", "Tester"] });

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

    const allResults = [...phase1, ...phase2, ...phase3];
    const finalReport = allResults
      .filter(r => r.responseText && !r.error)
      .map(r => `### ${r.role}\n\n${r.responseText}`)
      .join("\n\n---\n\n");

    this._emitTrace("final_report", {
      text: finalReport,
      toolCount: allResults.reduce((a, r) => a + ((r.toolResults || []).length), 0),
      usedFallback: false,
      multiAgent: true
    });

    return {
      phase1, phase2, phase3,
      all: allResults,
      taskId: this.currentTaskId,
      teamStats: this.teamMemory.getStats(),
      harnessStats: this.harness.getStats()
    };
  }

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

      this._emitTrace("agent_done", {
        role: role.name,
        preview: (result.responseText || "").slice(0, 500)
      });

      return result;
    } finally {
      role.system = originalSystem;
    }
  }

  detectSkills(task) {
    const t = (task || "").toLowerCase();
    const useful = [];

    if (/busca|investiga|actualizado|noticias|web|url/.test(t)) useful.push("web_search", "read_url");
    if (/analiza|revisa|complejidad|deuda|smell/.test(t)) useful.push("analyze_complexity", "deep_project_analysis");
    if (/seguridad|vulnerab|inyecc|xss|cve|hardening/.test(t)) useful.push("security_scan", "security_hardening", "security_guidance");
    if (/bug|error|edge|race|null|crash|fallo/.test(t)) useful.push("detect_bugs", "debugging_error_recovery");
    if (/crea|escribe|implementa|programa/.test(t)) useful.push("write_code", "code_simplification");
    if (/test|prueba|unitario|e2e|playwright/.test(t)) useful.push("write_tests", "run_tests", "playwright_recording", "tdd_development", "browser_testing_devtools");
    if (/documenta|readme|comentario|adr/.test(t)) useful.push("write_docs");
    if (/git|commit|push|branch/.test(t)) useful.push("git_ops");
    if (/deploy|publica|despliega/.test(t)) useful.push("deploy", "web_to_desktop_pake");
    if (/n8n|workflow|nodo|automatiz/.test(t)) useful.push("n8n_agents", "n8n_code_javascript", "n8n_code_python", "n8n_mcp_tools", "n8n_workflow_patterns", "n8n_error_handling");
    if (/remotion|video|moviepy|ffmpeg|clip|cinema|render/.test(t)) useful.push("ffmpeg", "moviepy", "remotion", "remotion_official");
    if (/ui|interfaz|diseño|frontend|css|responsive|a11y/.test(t)) useful.push("frontend_ui_engineering", "frontend_design");
    if (/prompt|meta-prompt|instruccion/.test(t)) useful.push("prompt_master");

    return [...new Set(useful)];
  }

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