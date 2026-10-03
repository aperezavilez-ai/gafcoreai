// ============================================================
//  GafCoreAI - core.js (v5 - filtro de tools por rol + timeout)
// ============================================================
import { ECOSYSTEM_KNOWLEDGE } from "./ecosystem.js";

export class TokenCache {
  constructor(maxSize = 500) {
    this.max = maxSize;
    this.store = new Map();
    this.stats = { hits: 0, misses: 0, saved: 0 };
    this.load();
  }
  hash(model, messages) {
    const last = messages[messages.length - 1];
    const sys = messages[0];
    const str = model + "|" +
      (typeof sys.content === "string" ? sys.content : JSON.stringify(sys.content)) + "|" +
      (typeof last.content === "string" ? last.content : JSON.stringify(last.content));
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return "c" + h;
  }
  get(model, messages) {
    const key = this.hash(model, messages);
    const entry = this.store.get(key);
    if (!entry) { this.stats.misses++; return null; }
    if (Date.now() - entry.ts > 24 * 60 * 60 * 1000) { this.store.delete(key); this.stats.misses++; return null; }
    entry.hits++; this.stats.hits++; this.stats.saved += entry.response.length * 0.25;
    this.save();
    return entry.response;
  }
  put(model, messages, response) {
    const key = this.hash(model, messages);
    this.store.set(key, { response, ts: Date.now(), hits: 0 });
    if (this.store.size > this.max) this.store.delete(this.store.keys().next().value);
    this.save();
  }
  clear() { this.store.clear(); this.stats = { hits: 0, misses: 0, saved: 0 }; this.save(); }
  save() {
    try { localStorage.setItem("gafcoreai_cache", JSON.stringify({ store: Array.from(this.store.entries()), stats: this.stats })); } catch (e) {}
  }
  load() {
    try {
      const raw = localStorage.getItem("gafcoreai_cache");
      if (!raw) return;
      const obj = JSON.parse(raw);
      this.store = new Map(obj.store || []);
      this.stats = obj.stats || { hits: 0, misses: 0, saved: 0 };
    } catch (e) {}
  }
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits, misses: this.stats.misses,
      ratio: total ? (this.stats.hits / total * 100).toFixed(1) + "%" : "0%",
      entries: this.store.size, savedApprox: Math.round(this.stats.saved)
    };
  }
}

export class Memory {
  constructor() { this.facts = []; this.summaries = []; this.load(); }
  addFact(fact) { this.facts.push({ fact, ts: Date.now() }); if (this.facts.length > 200) this.facts.shift(); this.save(); }
  addSummary(s) { this.summaries.push({ summary: s, ts: Date.now() }); if (this.summaries.length > 50) this.summaries.shift(); this.save(); }
  getContext(max = 3000) {
    let ctx = "";
    if (this.facts.length) { ctx += "\n\nMemoria:\n"; this.facts.slice(-30).forEach(f => ctx += "- " + f.fact + "\n"); }
    if (this.summaries.length) { ctx += "\nContexto previo:\n"; this.summaries.slice(-5).forEach(s => ctx += "- " + s.summary + "\n"); }
    return ctx.slice(0, max);
  }
  save() { try { localStorage.setItem("gafcoreai_memory", JSON.stringify({ facts: this.facts.slice(-200), summaries: this.summaries.slice(-50) })); } catch (e) {} }
  load() {
    try {
      const raw = localStorage.getItem("gafcoreai_memory");
      if (!raw) return;
      const obj = JSON.parse(raw);
      this.facts = obj.facts || [];
      this.summaries = obj.summaries || [];
    } catch (e) {}
  }
  clear() { this.facts = []; this.summaries = []; this.save(); }
}

export const PERMISSION_LEVELS = { READ: "read", WRITE: "write", EXECUTE: "exec", DANGEROUS: "danger" };

export class PermissionManager {
  constructor() {
    const defaults = {
      [PERMISSION_LEVELS.READ]: true,
      [PERMISSION_LEVELS.WRITE]: true,
      [PERMISSION_LEVELS.EXECUTE]: true,
      [PERMISSION_LEVELS.DANGEROUS]: false
    };
    try {
      const raw = localStorage.getItem("gafcoreai_perms");
      if (raw) {
        const stored = JSON.parse(raw);
        this.granted = Object.assign({}, defaults, stored);
        this.granted[PERMISSION_LEVELS.READ] = true;
        this.granted[PERMISSION_LEVELS.WRITE] = true;
      } else {
        this.granted = Object.assign({}, defaults);
      }
    } catch (e) {
      this.granted = Object.assign({}, defaults);
    }
    this.save();
  }
  has(level) { return !!this.granted[level]; }
  grant(level) { this.granted[level] = true; this.save(); }
  revoke(level) {
    if (level === PERMISSION_LEVELS.READ || level === PERMISSION_LEVELS.WRITE) return;
    this.granted[level] = false;
    this.save();
  }
  revokeAll() {
    this.granted = {
      [PERMISSION_LEVELS.READ]: true,
      [PERMISSION_LEVELS.WRITE]: true,
      [PERMISSION_LEVELS.EXECUTE]: false,
      [PERMISSION_LEVELS.DANGEROUS]: false
    };
    this.save();
  }
  async requestPermission(level, action) {
    if (this.has(level)) return true;
    throw new Error("Permiso " + level + " no concedido para: " + action);
  }
  save() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("gafcoreai_perms", JSON.stringify(this.granted));
      }
    } catch (_) {}
  }
}

// Tools que meten contenido externo (no confiable) al contexto del modelo.
const UNTRUSTED_SOURCE_TOOLS = new Set(["read_url", "search_web", "scrape_web", "search_github", "search_packages", "download_file"]);
// Tras leer contenido externo, "permitir siempre" queda suspendido este tiempo (defensa contra prompt injection).
const UNTRUSTED_WINDOW_MS = 10 * 60 * 1000;

export class ToolRegistry {
  constructor(perms) {
    this.tools = new Map();
    this.perms = perms;
    this.approver = null;
    this.sessionAllowed = new Set();
    this.untrustedReadAt = 0;
    this._approvalQueue = Promise.resolve();
  }

  register(name, { level, description, params, run, confirm }) {
    this.tools.set(name, { name, level, description, params, run, confirm: !!confirm });
  }

  // fn(request) => Promise<"once" | "always" | "deny" | null>
  setApprover(fn) { this.approver = fn; }

  needsApproval(tool) {
    return tool.confirm || tool.level === PERMISSION_LEVELS.EXECUTE || tool.level === PERMISSION_LEVELS.DANGEROUS;
  }

  recentlyReadUntrusted() {
    return Date.now() - this.untrustedReadAt < UNTRUSTED_WINDOW_MS;
  }

  // Las solicitudes se encolan: el modal de dialogs.js solo admite una a la vez.
  confirm(request) {
    const ask = async () => {
      if (!this.approver) return "deny";
      try { return await this.approver(request); } catch (_) { return "deny"; }
    };
    const p = this._approvalQueue.then(ask);
    this._approvalQueue = p.catch(() => {});
    return p;
  }
  get(name) { return this.tools.get(name); }
  list() { return Array.from(this.tools.values()); }

  describeForPrompt(allowedTools) {
    const hasWrite = !allowedTools || allowedTools.includes("write_file");
    const hasRead = !allowedTools || allowedTools.includes("read_file") || allowedTools.includes("list_files");

    let s = "\n\n# HERRAMIENTAS DISPONIBLES\n";

    if (hasWrite) {
      s += `
## CREAR ARCHIVOS (uso principal)
Para crear UN archivo, responde con un bloque:

\`\`\`write:ruta/del/archivo.ext
contenido completo
\`\`\`

Para crear varios, usa varios bloques seguidos.

REGLAS:
- El nombre despues de "write:" es la RUTA (ej: src/app.js)
- Las carpetas se crean automaticamente
- Escribe el contenido COMPLETO
- Despues, agrega una explicacion breve
`;
    } else {
      s += `
## CREAR ARCHIVOS NO ES TU ESPECIALIDAD
Prioriza leer y analizar. Usa bloques \`\`\`write: solo si es imprescindible: requieren aprobacion del usuario.
`;
    }

    if (hasRead) {
      s += `
## LEER ARCHIVOS
\`\`\`read:ruta/archivo.ext
\`\`\`
`;
    }

    s += "\n### Otras herramientas (<tool>)\n";
    if (!allowedTools || allowedTools.includes("list_files")) s += "- <tool>list_files|path=ruta|recursive=true</tool>\n";
    if (!allowedTools || allowedTools.includes("read_url"))   s += "- <tool>read_url|url=https://...</tool>\n";
    if (!allowedTools || allowedTools.includes("search_web")) s += "- <tool>search_web|query=texto</tool>\n";
    if (!allowedTools || allowedTools.includes("clone_repo")) s += "- <tool>clone_repo|url=https://github.com/owner/repo.git</tool> (Clona un repo completo)\n";
    if (!allowedTools || allowedTools.includes("search_github")) s += "- <tool>search_github|query=texto</tool>\n";
    if (!allowedTools || allowedTools.includes("scrape_web")) s += "- <tool>scrape_web|url=https://...</tool>\n";
    if (!allowedTools || allowedTools.includes("run_command")) s += "- <tool>run_command|cmd=comando</tool>\n";

    return s;
  }

  async invoke(name, args) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error("Tool no existe: " + name);
    await this.perms.requestPermission(tool.level, tool.name);
    if (this.needsApproval(tool)) {
      const tainted = this.recentlyReadUntrusted();
      if (!this.sessionAllowed.has(name) || tainted) {
        const answer = await this.confirm({ tool: name, level: tool.level, args: args || {}, tainted, allowAlways: true });
        if (answer === "always") this.sessionAllowed.add(name);
        else if (answer !== "once") throw new Error("Accion rechazada por el usuario: " + name);
      }
    }
    if (UNTRUSTED_SOURCE_TOOLS.has(name)) this.untrustedReadAt = Date.now();
    return await tool.run(args);
  }

  parseCalls(text) {
    if (!text) return [];
    const calls = [];

    const ALIASES = {
      "fs.list": "list_files", "fs_list": "list_files", "list": "list_files",
      "fs.read": "read_file", "fs_read": "read_file", "read": "read_file",
      "fs.write": "write_file", "fs_write": "write_file", "write": "write_file",
      "fs.edit": "edit_file", "fs_edit": "edit_file", "edit": "edit_file",
      "cmd.run": "run_command", "bash.run": "run_command", "terminal.run": "run_command", "run_cmd": "run_command",
      "code.search": "search_code", "search": "search_code"
    };

    const pushCall = (name, args) => {
      if (!name) return;
      const cleanName = ALIASES[name.trim().toLowerCase()] || name.trim();
      calls.push({ name: cleanName, args: args || {} });
    };

    // ────────────────────────────────────────────────────────
    //  1. WRITE blocks: ```write:path\ncontent```
    // ────────────────────────────────────────────────────────
    const writeRe = /```write:([^\n]+)\n([\s\S]*?)```/g;
    // v41: fallback - aceptar "write:ruta" sin backticks (lo emite deepseek/gpt a veces)
    const writeReNoTick = /(?:^|\n\n)write:([^\n]+)\n([\s\S]*?)(?=\n\n(?:write:||###|##\s|\`\`\`|write:)|$)/g;
    let m;
    while ((m = writeRe.exec(text)) !== null) {
      let rawPath = m[1].trim().replace(/^`+|`+$/g, "").trim();
      const content = m[2];
      if (rawPath && !rawPath.includes("`") && !rawPath.includes("*") && !rawPath.includes("?") && !rawPath.includes("|") && rawPath.length < 260) {
        if (/\.[a-zA-Z0-9_\-]+$/.test(rawPath)) {
          pushCall("write_file", { path: rawPath, content });
        }
      }
    }

    // ────────────────────────────────────────────────────────
    //  2. FORMATO CUSTOM COMPLETO: <tool>name|arg=v</tool>
    // ────────────────────────────────────────────────────────
    const customRe = /<tool>([a-zA-Z_][a-zA-Z0-9_\.]*)(?:\|([\s\S]*?))?<\/tool>/g;
    while ((m = customRe.exec(text)) !== null) {
      const name = m[1].trim();
      const argStr = (m[2] || "").trim();
      const args = {};
      if (argStr) {
        let parts = [], cur = "", depth = 0;
        for (let i = 0; i < argStr.length; i++) {
          const ch = argStr[i];
          if (ch === "|" && depth === 0) { parts.push(cur); cur = ""; }
          else {
            if (ch === "{") depth++;
            if (ch === "}") depth--;
            cur += ch;
          }
        }
        if (cur) parts.push(cur);
        parts.forEach(p => {
          const eq = p.indexOf("=");
          if (eq < 0) return;
          const k = p.slice(0, eq).trim();
          const v = p.slice(eq + 1);
          if (k) args[k] = v;
        });
      }
      pushCall(name, args);
    }

    // ────────────────────────────────────────────────────────
    //  3. FORMATO CUSTOM SIN PIPES: <tool>name</tool> seguido de <arg>val</arg>
    // ────────────────────────────────────────────────────────
    const blockRe = /<tool>([a-zA-Z_][a-zA-Z0-9_\.]*)<\/tool>([\s\S]*?)(?=<tool>|<\/tool_call>|$)/g;
    while ((m = blockRe.exec(text)) !== null) {
      const name = m[1].trim();
      const body = m[2] || "";
      const argRe = /<([a-zA-Z_][a-zA-Z0-9_]*)\s*>([\s\S]*?)<\/\1>/g;
      const args = {};
      let am;
      while ((am = argRe.exec(body)) !== null) {
        const k = am[1].trim();
        let v = am[2].trim();
        if (k === "tool" || k === "tool_call" || k === "function" || k === "parameter") continue;
        if (v === "True" || v === "true") v = true;
        else if (v === "False" || v === "false") v = false;
        else if (/^-?\d+$/.test(v)) v = parseInt(v, 10);
        args[k] = v;
      }
      if (Object.keys(args).length > 0) {
        const dup = calls.findIndex(c => c.name === name && JSON.stringify(c.args) === JSON.stringify(args));
        if (dup < 0) pushCall(name, args);
      }
    }

    // ────────────────────────────────────────────────────────
    //  4. FORMATO ANTHROPIC: <function=name> o <tool_call><function=name>
    // ────────────────────────────────────────────────────────
    const anthRe = /<tool_call>\s*<function\s*=\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*>([\s\S]*?)<\/function>\s*<\/tool_call>/g;
    while ((m = anthRe.exec(text)) !== null) {
      const name = m[1].trim();
      const body = m[2] || "";
      const args = parseAnthropicParams(body);
      pushCall(name, args);
    }

    const anthRe2 = /<function\s*=\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*>([\s\S]*?)<\/function>/g;
    while ((m = anthRe2.exec(text)) !== null) {
      const name = m[1].trim();
      const body = m[2] || "";
      const args = parseAnthropicParams(body);
      if (Object.keys(args).length > 0) {
        const dup = calls.findIndex(c => c.name === name && JSON.stringify(c.args) === JSON.stringify(args));
        if (dup < 0) pushCall(name, args);
      }
    }

    // ────────────────────────────────────────────────────────
    //  5. FORMATO XML DIRECTO NATIVO: <read_file path="..."/>, <edit_file path="..."><target>...</target></edit_file>
    // ────────────────────────────────────────────────────────
    const DIRECT_TOOLS = [
      "read_file", "write_file", "edit_file", "list_files", "run_command",
      "search_code", "search_web", "read_url", "open_folder", "close_folder",
      "deploy_vercel", "supabase_query", "supabase_sync", "ssh_exec",
      "publish_project", "git_status", "git_commit", "git_push", "git_pull"
    ];
    const directPattern = `<(${DIRECT_TOOLS.join("|")})\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/\\1>)`;
    const directRe = new RegExp(directPattern, "gi");
    while ((m = directRe.exec(text)) !== null) {
      const toolName = m[1].toLowerCase();
      const attrStr = m[2] || "";
      const innerBody = m[3] || "";
      const args = {};

      const attrRe = /([a-zA-Z_][a-zA-Z0-9_\-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
      let am;
      while ((am = attrRe.exec(attrStr)) !== null) {
        const k = am[1].trim();
        const v = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : am[4]);
        if (k && v !== undefined) args[k] = normalizeVal(v);
      }

      if (innerBody) {
        const childRe = /<([a-zA-Z_][a-zA-Z0-9_]*)\s*>([\s\S]*?)<\/\1>/g;
        let cm;
        while ((cm = childRe.exec(innerBody)) !== null) {
          const k = cm[1].trim();
          const v = cm[2];
          if (k && !["tool", "tool_call", "function", "parameter"].includes(k)) {
            args[k] = normalizeVal(v.trim());
          }
        }
      }

      pushCall(toolName, args);
    }

    // ────────────────────────────────────────────────────────
    //  6. FORMATO OPENAI JSON: {"tool_calls": [...]}
    // ────────────────────────────────────────────────────────
    try {
      const jsonRe = /\{\s*"tool_calls"\s*:\s*(\[[\s\S]*?\])\s*\}/g;
      while ((m = jsonRe.exec(text)) !== null) {
        try {
          const arr = JSON.parse(m[1]);
          for (const tc of arr) {
            if (tc && tc.function && tc.function.name) {
              let args = {};
              try {
                args = typeof tc.function.arguments === "string"
                  ? JSON.parse(tc.function.arguments)
                  : (tc.function.arguments || {});
              } catch (_) {}
              pushCall(tc.function.name, args);
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    // ────────────────────────────────────────────────────────
    //  Helper: parsea params Anthropic (con = o con name=)
    // ────────────────────────────────────────────────────────
    function parseAnthropicParams(body) {
      const args = {};
      // Variante 1: <parameter=x>val</parameter>
      const re1 = /<parameter\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*>([\s\S]*?)<\/parameter>/g;
      let pm;
      while ((pm = re1.exec(body)) !== null) {
        const k = pm[1].trim();
        let v = pm[2].trim();
        v = normalizeVal(v);
        if (k) args[k] = v;
      }
      // Variante 2: <parameter name="x">val</parameter>
      const re2 = /<parameter\s+name\s*=\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']\s*>([\s\S]*?)<\/parameter>/g;
      while ((pm = re2.exec(body)) !== null) {
        const k = pm[1].trim();
        let v = pm[2].trim();
        v = normalizeVal(v);
        if (k && !args[k]) args[k] = v;
      }
      // Variante 3: <x>val</x> (tags directos sin wrapper parameter)
      const re3 = /<([a-zA-Z_][a-zA-Z0-9_]*)\s*>([\s\S]*?)<\/\1>/g;
      while ((pm = re3.exec(body)) !== null) {
        const k = pm[1].trim();
        if (["parameter", "function", "tool", "tool_call"].includes(k)) continue;
        let v = pm[2].trim();
        if (!v || v.includes("<")) continue;
        v = normalizeVal(v);
        if (k && !args[k]) args[k] = v;
      }
      return args;
    }

    function normalizeVal(v) {
      if (typeof v !== "string") return v;
      if (v === "True" || v === "true") return true;
      if (v === "False" || v === "false") return false;
      if (/^-?\d+$/.test(v)) return parseInt(v, 10);
      if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
      return v;
    }

    // ────────────────────────────────────────────────────────
    //  Deduplicar
    // ────────────────────────────────────────────────────────
    const unique = [];
    const seen = new Set();
    for (const c of calls) {
      const key = c.name + "::" + JSON.stringify(c.args);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }

    return unique;
  }
}

export const AGENT_ROLES = {
  PLANNER: {
    name: "Planner",
    system: `Eres el PLANIFICADOR. Tu trabajo: descomponer la tarea en pasos CONCRETOS.

# REGLAS
- Si la tarea es de ANALISIS: define las areas a auditar (estructura, seguridad, rendimiento, calidad, tests)
- Si la tarea es de CREACION: define los archivos a crear y su proposito
- Usa <tool>list_files</tool> ANTES de planificar si hay archivos
- Cada paso: verbo en imperativo + objeto concreto
- Maximo 6 pasos

# FORMATO
1. Verbo + objeto (1 linea)
2. Verbo + objeto
...

Cero intro. Cero cierre. Cero markdown decorativo.`,
    allowedTools: ["list_files"]
  },

  EXPLORER: {
    name: "Explorer",
    system: `Eres el EXPLORADOR. Tu trabajo: mapear TODO el proyecto milimetricamente.

# OBLIGATORIO
- Usa <tool>list_files</tool> PRIMERO. Si hay archivos, obten la estructura COMPLETA
- Detecta: lenguajes, frameworks, dependencias, estructura de carpetas, entry points
- Cuenta archivos por tipo
- Identifica archivos clave (los mas grandes, los mas importados, los entry points)

# FORMATO
Estructura: [resumen de carpetas]
Stack: [lenguajes + frameworks detectados]
Archivos: [N total, X en src/, Y en public/...]
Entry: [archivo principal]
Clave: [3-5 archivos importantes]

Cero relleno. Datos concretos.`,
    allowedTools: ["list_files", "read_file", "search_github", "search_packages", "search_skills"]
  },

  ANALYST: {
    name: "Analyst",
    system: `Eres un ANALISTA DE CÓDIGO Y ARQUITECTO SENIOR.
Tu trabajo es realizar una auditoría forense profunda, rigurosa y detallada del proyecto.

# METODOLOGÍA OBLIGATORIA
1. Inspecciona los archivos relevantes usando tus herramientas (<tool>list_files</tool>, <tool>read_file</tool>, <tool>search_code</tool>).
2. Analiza a fondo el flujo de datos, lógica de autenticación, enrutamiento, base de datos y manejo de errores.
3. Para cada problema detectado, explica:
   - **Archivo y Líneas Exactas:** Cita la ubicación precisa.
   - **Causa Raíz:** Explica técnicamente por qué ocurre el error.
   - **Impacto:** Qué parte del sistema se ve afectada.
   - **Solución Propuesta:** Código o estrategia concreta para corregirlo.

Escribe tu respuesta en formato Markdown elegante, con encabezados claros, listas estructuradas y bloques de código con sintaxis.`,
    allowedTools: ["read_file", "list_files", "search_code", "search_web", "read_url"]
  },

  CODER: {
    name: "Coder",
    system: `Eres un INGENIERO DE SOFTWARE SENIOR ESPECIALISTA EN CÓDIGO.
Tu trabajo es solucionar problemas, refactorizar e implementar código robusto, limpio y funcional.

# METODOLOGÍA OBLIGATORIA
1. Examina el código existente antes de proponer o aplicar cambios.
2. Si creas o reemplazas archivos completos, usa el bloque \`\`\`write:ruta/del/archivo
3. Si estás explicando una corrección, muestra los bloques de código corregidos con explicaciones claras de las decisiones tomadas.
4. Asegúrate de que el código esté 100% libre de placeholders, TODOs o sintaxis incompleta.

Escribe tu respuesta con explicaciones técnicas claras, profesionales y fáciles de seguir.`,
    allowedTools: ["write_file", "read_file", "list_files", "download_file", "search_github", "search_packages"]
  },

  REVIEWER: {
    name: "Reviewer",
    system: `Eres el REVISOR TÉCNICO Y LEAD ARCHITECT.
Tu trabajo es validar la calidad, coherencia, rendimiento y mantenibilidad del sistema.

# METODOLOGÍA
1. Evalúa el diagnóstico y las soluciones propuestas por el equipo.
2. Identifica posibles efectos secundarios, cuellos de botella o casos límite no contemplados.
3. Emite recomendaciones claras y un veredicto técnico argumentado.

Escribe en Markdown estructurado y profesional.`,
    allowedTools: ["read_file", "list_files"]
  },

  TESTER: {
    name: "Tester",
    system: `Eres un INGENIERO DE QA Y TESTING SENIOR.
Tu trabajo es diseñar casos de prueba exhaustivos, unitarios, de integración y escenarios de error crítico para validar la solución.

# METODOLOGÍA
- Propón tests concretos con inputs, outputs esperados y validación de casos límite (edge cases).
- Proporciona ejemplos de código de prueba listos para ejecutar.`,
    allowedTools: ["read_file", "list_files"]
  },

  SECURITY: {
    name: "Security",
    system: `Eres un AUDITOR DE CIBERSEGURIDAD SENIOR.
Tu trabajo es auditar minuciosamente el código para detectar vulnerabilidades, fallas de autenticación, autorización, validación de inputs y manejo de credenciales.

# METODOLOGÍA
- Revisa configuración, autenticación, protección de rutas, tokens y permisos.
- Si detectas una vulnerabilidad, explica el riesgo, el archivo:línea afectado y el parche de seguridad exacto.`,
    allowedTools: ["read_file", "list_files", "search_code", "search_web"]
  },

  RESEARCHER: {
    name: "Researcher",
    system: `Eres un INVESTIGADOR TÉCNICO SENIOR.
Busca documentación oficial, paquetes actualizados y mejores prácticas técnicas. Cita fuentes y ejemplos reales.`,
    allowedTools: ["read_url", "search_web", "scrape_web", "download_file", "search_github", "search_packages", "search_skills"]
  }
};
// Reglas que todo agente recibe sin importar su rol. Sin credenciales: solo politica.
export const ECOSYSTEM_RULES = `# REGLAS INMUTABLES DEL ECOSISTEMA GAFCORE
- Backend: Supabase self-hosted en https://supabase.gafcore.com. PROHIBIDO usar Supabase Cloud (*.supabase.co) o crear infraestructura de pago.
- Cada proyecto lleva project-infra.json con su schema dedicado; las migraciones SQL van en supabase/migrations/.
- NUNCA leas, extraigas, descifres ni imprimas credenciales, tokens, API keys ni baules cifrados (.env, secrets, DPAPI).
- NUNCA inventes archivos, rutas, APIs ni resultados de herramientas.

${ECOSYSTEM_KNOWLEDGE}`;

const HANDOFF_TARGETS = ["Planner", "Explorer", "Analyst", "Coder", "Reviewer", "Tester", "Security", "Researcher"];

export const HANDOFF_CONTRACT = `# CONTRATO DE SALIDA (obligatorio)
Al FINAL de tu respuesta agrega exactamente UN bloque:
\`\`\`handoff
{"summary":"1-2 frases con tu conclusion","facts":["hecho verificado (archivo:linea si aplica)"],"decisions":[{"decision":"...","reason":"..."}],"next":"${HANDOFF_TARGETS.join("|")}|none","confidence":0.0}
\`\`\`
- facts: solo lo que VERIFICASTE con herramientas (max 5).
- next: el rol que deberia continuar, o "none" si la tarea esta cerrada.
- confidence: 0.0 a 1.0, que tan seguro estas de tu resultado.`;

const HANDOFF_BLOCK_RE = /```handoff\s*\n([\s\S]*?)```/gi;

// Devuelve { text, handoff }: el texto sin bloques handoff y el ultimo bloque parseado (o null).
export function extractHandoff(text) {
  if (!text) return { text: text || "", handoff: null };
  const blocks = [...text.matchAll(HANDOFF_BLOCK_RE)];
  if (!blocks.length) return { text, handoff: null };
  const stripped = text.replace(HANDOFF_BLOCK_RE, "").trim();
  let raw;
  try { raw = JSON.parse(blocks[blocks.length - 1][1].trim()); } catch (_) { return { text: stripped, handoff: null }; }
  if (!raw || typeof raw !== "object") return { text: stripped, handoff: null };
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const next = HANDOFF_TARGETS.find(t => t.toLowerCase() === str(raw.next, 40).toLowerCase()) || null;
  const conf = Number(raw.confidence);
  return {
    text: stripped,
    handoff: {
      summary: str(raw.summary, 400),
      facts: (Array.isArray(raw.facts) ? raw.facts : []).map(f => str(f, 300)).filter(Boolean).slice(0, 5),
      decisions: (Array.isArray(raw.decisions) ? raw.decisions : [])
        .map(d => (d && typeof d === "object") ? { decision: str(d.decision, 300), reason: str(d.reason, 300) } : null)
        .filter(d => d && d.decision)
        .slice(0, 5),
      next,
      closed: str(raw.next, 40).toLowerCase() === "none",
      confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : null
    }
  };
}

const WRITE_TOOLS_WITH_PATH = new Set(["write_file", "edit_file", "delete_file"]);

export class MultiAgentOrchestrator {
  constructor({ provider, model, tools, cache, memory, teamMemory, tokenOptimizer, taskId, terminal, onProgress, onStep }) {
    this.provider = provider;
    this.model = model;
    this.tools = tools;
    this.cache = cache;
    this.memory = memory;
    this.teamMemory = teamMemory || null;
    this.tokenOptimizer = tokenOptimizer || null;
    this.taskId = taskId || null;
    this.signal = null;
    this.onToolEvent = null;  // (kind, data) => void, para marcar archivos en la UI
    this.terminal = terminal;
    this.onProgress = onProgress;
    this.onStep = onStep;
    this.onToken = null;  // callback (roleName, token) para streaming
    this.runs = [];
    this.timeout = 60000;
  }

  log(msg) { if (this.terminal) this.terminal.writeln(msg); }

  withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout " + (ms/1000) + "s: " + label)), ms)
      )
    ]);
  }

  async runParallel(agents, task, context) {
    if (this.onStep) {
      this.onStep({ phase: "Ejecutando " + agents.map(a => a.name).join(" + ") + "..." });
    }
    this.log(">> " + agents.length + " agentes en paralelo");
    const promises = agents.map(role =>
      this.withTimeout(this.runSingle(role, task, context), this.timeout, role.name)
        .catch(e => ({
          role: role.name,
          error: e.message,
          responseText: "(timeout/error: " + e.message + ")"
        }))
    );
    const results = await Promise.all(promises);
    this.log(">> " + agents.length + " agentes completados");
    return results;
  }

  async runSingle(role, task, context) {
    try {
      return await this._runSingleInner(role, task, context);
    } finally {
      if (this.teamMemory) this.teamMemory.unlockAll(role.name);
    }
  }

  _describeCatalog(role) {
    if (!this.tools) return "";
    const primary = new Set(role.allowedTools || []);
    const lines = this.tools.list()
      .filter(t => !primary.has(t.name))
      .map(t => "- " + t.name + " [" + t.level + "]: " + String(t.description || "").slice(0, 90));
    if (!lines.length) return "";
    return "\n\n# CATALOGO COMPLETO (fuera de tu especialidad, usalas solo si la tarea lo exige)\n"
      + lines.join("\n")
      + "\nLas de escritura [write] fuera de tu rol piden aprobacion del usuario; las de ejecucion [exec]/[danger] siempre la piden.";
  }

  // Herramientas de escritura fuera del rol: aprobacion del usuario + lock de archivo compartido.
  async _gateToolCall(role, call) {
    const tool = this.tools.get(call.name);
    if (!tool) return { ok: true };
    const path = call.args && (call.args.path || call.args.file);
    if (WRITE_TOOLS_WITH_PATH.has(call.name) && path && this.teamMemory) {
      const lock = this.teamMemory.lockFile(path, role.name);
      if (!lock.ok) return { ok: false, error: "Archivo bloqueado por " + lock.heldBy + ": " + path };
    }
    const isPrimary = (role.allowedTools || []).includes(call.name);
    if (tool.level === PERMISSION_LEVELS.WRITE && !isPrimary) {
      const answer = await this.tools.confirm({
        tool: call.name,
        level: tool.level,
        args: call.args || {},
        tainted: this.tools.recentlyReadUntrusted(),
        allowAlways: false,
        message: "El agente " + role.name + " quiere usar \"" + call.name + "\", que no es de su especialidad."
      });
      if (answer !== "once") return { ok: false, error: "Accion rechazada por el usuario: " + call.name };
    }
    return { ok: true };
  }

  async _runSingleInner(role, task, context) {
    const memoryCtx = this.teamMemory ? this.teamMemory.buildContext(role.name, { taskId: this.taskId }) : "";
    const workingMemory = this.tokenOptimizer ? this.tokenOptimizer.buildCompactContext(task, {}) : "";
    const toolsDesc = this.tools ? this.tools.describeForPrompt(role.allowedTools) + this._describeCatalog(role) : "";

    const verificationRules = {
      "Explorer": "PASO 1 OBLIGATORIO: Tu PRIMERA accion debe ser <tool>list_files|path=.|recursive=true</tool>. NO respondas nada hasta ver los resultados. NUNCA inventes archivos.",
      "Analyst": "PASO 1 OBLIGATORIO: Tu PRIMERA accion debe ser <tool>list_files|path=.|recursive=true</tool> para ver los archivos reales. DESPUES usa <tool>read_file|path=...</tool> en los archivos de codigo relevantes. SOLO DESPUES emite hallazgos con archivo:linea. NUNCA digas 'directorio vacio' sin haber ejecutado list_files primero.",
      "Coder": "PASO 1 OBLIGATORIO: Si vas a modificar, PRIMERO <tool>list_files</tool> y <tool>read_file</tool> del archivo. NUNCA inventes el contenido existente.",
      "Reviewer": "PASO 1 OBLIGATORIO: Antes de veredicto, ejecuta <tool>list_files|path=.|recursive=true</tool>. Cita archivo:linea. NUNCA inventes problemas.",
      "Tester": "PASO 1 OBLIGATORIO: Ejecuta <tool>list_files|path=.|recursive=true</tool> para ver que archivos existen. Cada test con INPUT y OUTPUT concretos. NUNCA inventes APIs.",
      "Security": "PASO 1 OBLIGATORIO: Tu PRIMERA accion debe ser <tool>list_files|path=.|recursive=true</tool>. DESPUES <tool>read_file</tool> en archivos de auth/config. Solo DESPUES da veredicto con archivo:linea. NUNCA digas 'sin codigo' sin haber ejecutado list_files primero.",
      "Researcher": "Cita URLs exactas. NUNCA inventes datos o fechas.",
      "Planner": "PASO 1 OBLIGATORIO: <tool>list_files|path=.|recursive=true</tool> ANTES de planificar. Pasos concretos con verbos."
    };

    const verification = verificationRules[role.name] || "";
    const contextInfo = context
      ? "\n\nCONTEXTO DEL PROYECTO:\n" + context.slice(0, 8000)
      : "\n\n(No hay contexto previo del proyecto)";

    const messages = [
      {
        role: "system",
        content: role.system
          + "\n\n" + ECOSYSTEM_RULES
          + "\n\n# REGLAS DE VERIFICACION OBLIGATORIAS\n" + verification
          + "\n\n# HERRAMIENTAS PRINCIPALES DE TU ROL\n" + (role.allowedTools && role.allowedTools.length
              ? role.allowedTools.join(", ")
              : "solo razonamiento")
          + memoryCtx
          + workingMemory
          + toolsDesc
          + "\n\n" + HANDOFF_CONTRACT
          + "\n\n# FORMATO DE HERRAMIENTAS\n"
          + "Para llamar una herramienta usa: <tool>nombre|param1=valor1|param2=valor2</tool>\n"
          + "Ejemplos correctos:\n"
          + "  <tool>list_files|path=D:\\proyecto|recursive=true</tool>\n"
          + "  <tool>read_file|path=src/index.js</tool>\n"
          + "NO inventes otros formatos. NO uses <tool_call> ni JSON."
      },
      {
        role: "user",
        content: "TAREA: " + task + contextInfo + "\n\n=== REGLAS ESTRICTAS ===\n1. PRIMERA accion: <tool>list_files|path=.|recursive=true</tool>\n2. read_file SOLO acepta paths que EXISTAN en list_files\n3. NO inventes archivos (Cargo.toml, tauri.conf.json, package.json)\n4. Cita paths COMPLETOS del listado\n5. Si no encuentras: No encontre X"
      }
    ];

    let responseText = "";
    let fromCache = false;
    const toolResults = [];
    const MAX_ITER = 3;

    // Cache (solo cachea la respuesta final, no iteraciones intermedias)
    if (this.cache) {
      const cached = this.cache.get(this.model.id + "::" + role.name, messages);
      if (cached) {
        responseText = cached;
        fromCache = true;
        this.log("[cache HIT] " + role.name);
      }
    }

    if (!fromCache) {
      this.log("[" + role.name + "] consultando modelo...");

      for (let iter = 0; iter < MAX_ITER; iter++) {
        if (this.signal && this.signal.aborted) {
          if (!responseText) responseText = "(cancelado por el usuario)";
          break;
        }
        let iterText = "";
        try {
          await this._callModel(messages, tok => {
            iterText += tok;
            if (this.onToken) { try { this.onToken(role.name, tok); } catch (e) {} }
          });
        } catch (e) {
          this.log("[" + role.name + "] error iter " + iter + ": " + e.message);
          if (!responseText) responseText = "(error: " + e.message + ")";
          break;
        }

        responseText += iterText;

        // Parsear tool calls de ESTA iteracion
        const toolCalls = this.tools ? this.tools.parseCalls(iterText) : [];

        // Si NO hay tool calls -> respuesta final, salir del loop
        if (!toolCalls.length) {
          this.log("[" + role.name + "] iter " + iter + " -> respuesta final");
          break;
        }

        this.log("[" + role.name + "] iter " + iter + " -> " + toolCalls.length + " tool(s): " +
          toolCalls.map(c => c.name).join(", "));

        // Ejecutar tools
        const iterResults = [];
        const MAX_PER_ITER = 3;
        const limitedCalls = [];
        const seenPaths = new Set();
        let rf = 0, lf = 0;
        for (const call of toolCalls) {
          if (call.name === "read_file") {
            if (rf >= MAX_PER_ITER) continue;
            const p = call.args && (call.args.path || "");
            if (p && seenPaths.has(p)) continue;
            if (p) seenPaths.add(p);
            rf++;
            limitedCalls.push(call);
          } else if (call.name === "list_files") {
            if (lf >= 1) continue;
            lf++;
            limitedCalls.push(call);
          } else {
            limitedCalls.push(call);
          }
        }
        for (const call of limitedCalls) {
          if (this.signal && this.signal.aborted) break;
          let gated = false;
          try {
            const gate = await this._gateToolCall(role, call);
            if (!gate.ok) throw new Error(gate.error);
            gated = true;
            this._emitToolEvent("tool_call", { role: role.name, name: call.name, args: call.args, isWrite: WRITE_TOOLS_WITH_PATH.has(call.name) });
            const r = await this.tools.invoke(call.name, call.args);
            const rStr = typeof r === "string" ? r : JSON.stringify(r);
            iterResults.push({ name: call.name, args: call.args, result: rStr, ok: true });
            this.log("  ✔ " + call.name + (call.args && call.args.path ? " " + call.args.path : "") + " (" + rStr.length + " chars)");
            toolResults.push({ name: call.name, path: call.args && call.args.path, result: rStr, ok: true });
            this._emitToolEvent("observation", { role: role.name, name: call.name, path: call.args && (call.args.path || call.args.file), ok: true });
            this._reinforceTool(role, call.name, true);
          } catch (e) {
            iterResults.push({ name: call.name, args: call.args, error: e.message, ok: false });
            this.log("  ✘ " + call.name + ": " + e.message);
            toolResults.push({ name: call.name, path: call.args && call.args.path, error: e.message, ok: false });
            if (gated) this._emitToolEvent("observation", { role: role.name, name: call.name, path: call.args && (call.args.path || call.args.file), ok: false, error: e.message });
            // Un rechazo del usuario o un lock no es un fallo de la herramienta.
            if (gated && !/rechazada por el usuario/i.test(e.message)) this._reinforceTool(role, call.name, false);
          }
        }

        // Añadir al historial: assistant tool call + user tool results
        messages.push({ role: "assistant", content: iterText });

        const resultsBlock = iterResults.map(r => {
          if (r.ok) {
            const header = "=== Resultado de " + r.name + (r.args && r.args.path ? " (" + r.args.path + ")" : "") + " ===";
            const body = r.result.length > 15000 ? r.result.slice(0, 15000) + "\n...(truncado)" : r.result;
            return header + "\n" + body;
          } else {
            return "=== ERROR en " + r.name + " ===\n" + r.error;
          }
        }).join("\n\n");

        messages.push({
          role: "user",
          content: resultsBlock
            + "\n\nAhora ANALIZA estos resultados reales y responde con tu hallazgo final. "
            + "Si necesitas ver contenido especifico de archivos, usa <tool>read_file|path=...</tool>. "
            + "Si ya tienes suficiente informacion, responde SIN mas tool calls."
        });
      }

      if (this.cache && responseText && !responseText.startsWith("(error") && !responseText.startsWith("(")) {
        this.cache.put(this.model.id + "::" + role.name, messages, responseText);
      }
    }

    // Deteccion de alucinaciones
    let finalToolCalls = this.tools ? this.tools.parseCalls(responseText) : [];
    const hallucinationChecks = this._detectHallucinations(role.name, responseText, finalToolCalls, toolResults);
    if (hallucinationChecks.length) {
      this.log("[" + role.name + "] ⚠️ Posibles alucinaciones:");
      hallucinationChecks.forEach(h => this.log("  - " + h));
    }

    const { text: visibleText, handoff } = extractHandoff(responseText);
    const out = { role: role.name, responseText: visibleText, toolResults, fromCache, hallucinations: hallucinationChecks, handoff };
    this.runs.push(out);
    return out;
  }

  // ────────────────────────────────────────────────────────
  //  Detector de alucinaciones
  //  Busca patrones sospechosos en la respuesta
  // ────────────────────────────────────────────────────────
  _detectHallucinations(agentName, text, toolCalls = [], toolResults = []) {
    const issues = [];
    if (!text || text.length < 10) return issues;

    const t = text.toLowerCase();
    const hasListFiles = (toolResults && toolResults.some(r => r.name === "list_files")) || (toolCalls && toolCalls.some(c => c.name === "list_files"));
    const hasWrite = (toolResults && toolResults.some(r => r.name === "write_file")) || (toolCalls && toolCalls.some(c => c.name === "write_file"));
    const hasRead = (toolResults && toolResults.some(r => r.name === "read_file")) || (toolCalls && toolCalls.some(c => c.name === "read_file"));
    const totalToolsUsed = (toolResults ? toolResults.length : 0) + (toolCalls ? toolCalls.length : 0);

    // 1. Explorer/Analyst que describen el proyecto SIN usar list_files
    if (agentName === "Explorer" && !hasListFiles) {
      if (/(archivos?|carpeta|estructura|directorio)/i.test(text)) {
        issues.push("Explorer describe el proyecto SIN usar list_files");
      }
    }

    // 2. Coder que dice "he creado" sin write_file
    if (agentName === "Coder" && !hasWrite) {
      if (/(he creado|creado|archivo creado|escribi|escrito)/i.test(text)) {
        issues.push("Coder dice 'he creado' sin usar write_file");
      }
    }

    // 3. Afirmaciones absolutas sin cita
    if (/(todas las funciones|todos los archivos|todo el codigo|completamente revisado)/i.test(text)) {
      if (totalToolsUsed === 0) {
        issues.push("Afirmacion absoluta sin haber leido el codigo");
      }
    }

    // 4. Menciona archivos con extension pero no los leyo
    const fileMatches = text.match(/[\w\/.-]+\.(js|ts|html|css|py|json|md|tsx|jsx)/g) || [];
    if (fileMatches.length >= 2 && !hasListFiles && !hasRead) {
      if (agentName === "Explorer" || agentName === "Analyst") {
        issues.push("Menciona " + fileMatches.length + " archivos sin haber leido el proyecto");
      }
    }

    // 5. Veredictos de Security sin leer codigo
    if (agentName === "Security" && !hasRead && !hasListFiles) {
      if (/(vulnerabilidad|cve|critico|bloquear)/i.test(text)) {
        issues.push("Security da veredicto sin haber leido el codigo");
      }
    }

    // 6. Uso de "quiza", "tal vez", "posiblemente" en Analyst/Reviewer
    if ((agentName === "Analyst" || agentName === "Reviewer" || agentName === "Security")) {
      const vague = (t.match(/(quiza|tal vez|posiblemente|podria ser|quizas)/g) || []).length;
      if (vague >= 3) {
        issues.push(vague + " expresiones vagas (quiza/tal vez) - respuesta poco concreta");
      }
    }

    // 7. Respuesta muy larga sin estructura (probable relleno)
    if (text.length > 2000 && totalToolsUsed === 0) {
      const bullets = (text.match(/^[-*•]/gm) || []).length;
      if (bullets < 3) {
        issues.push("Respuesta larga (" + text.length + " chars) sin estructura clara");
      }
    }

    return issues;
  }

  _emitToolEvent(kind, data) {
    if (typeof this.onToolEvent !== "function") return;
    try { this.onToolEvent(kind, data); } catch (_) {}
  }

  _reinforceTool(role, toolName, success) {
    const graph = this.teamMemory && this.teamMemory.synapticGraph;
    if (!graph || typeof graph.reinforce !== "function" || !/^[a-z_]{2,40}$/.test(toolName)) return;
    try { graph.reinforce("agent:" + role.name, "tool:" + toolName, "uses_tool", success); } catch (_) {}
  }

  async _callModel(messages, onToken) {
    // addEventListener sobre una señal ya abortada nunca dispara: hay que cortar antes.
    if (this.signal && this.signal.aborted) throw new Error("Cancelado por el usuario");
    const mod = await import("./providers.js");
    return await mod.chatCompletion(this.provider, this.model, messages, onToken, { timeout: 90000, signal: this.signal || undefined });
  }
}

export const core = {
  cache: new TokenCache(),
  memory: new Memory(),
  perms: new PermissionManager(),
  tools: null
};