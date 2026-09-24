// ============================================================
//  GafCoreAI - Skills Registry (catalogo completo invisible)
//  El agente decide cuando usar cada skill
// ============================================================

export const SKILLS_REGISTRY = {

  // ─────────────────────────────────────────────────────────
  //  FILESYSTEM
  // ─────────────────────────────────────────────────────────
  "fs.read": {
    category: "fs",
    risk: "low",
    description: "Lee el contenido de un archivo del proyecto o disco",
    params: { path: "string" },
    returns: "string",
    auto: true
  },
  "fs.write": {
    category: "fs",
    risk: "medium",
    description: "Escribe o crea un archivo. Se guarda como pendiente si aplica",
    params: { path: "string", content: "string" },
    returns: "boolean",
    auto: true
  },
  "fs.list": {
    category: "fs",
    risk: "low",
    description: "Lista archivos de un directorio",
    params: { path: "string" },
    returns: "array",
    auto: true
  },
  "fs.delete": {
    category: "fs",
    risk: "high",
    description: "Elimina un archivo o carpeta",
    params: { path: "string" },
    auto: false
  },
  "fs.mkdir": {
    category: "fs",
    risk: "medium",
    description: "Crea una carpeta",
    params: { path: "string" },
    auto: true
  },
  "fs.move": {
    category: "fs",
    risk: "high",
    description: "Mueve o renombra archivos",
    params: { from: "string", to: "string" },
    auto: false
  },

  // ─────────────────────────────────────────────────────────
  //  CODE
  // ─────────────────────────────────────────────────────────
  "code.analyze": {
    category: "code",
    risk: "low",
    description: "Analiza calidad, complejidad, code smells de un archivo",
    params: { path: "string" },
    auto: true
  },
  "code.refactor": {
    category: "code",
    risk: "medium",
    description: "Propone y aplica refactorizaciones",
    params: { path: "string", instructions: "string" },
    auto: true
  },
  "code.format": {
    category: "code",
    risk: "medium",
    description: "Formatea codigo segun el estilo del proyecto",
    params: { path: "string" },
    auto: true
  },
  "code.lint": {
    category: "code",
    risk: "low",
    description: "Ejecuta linter y devuelve problemas",
    params: { path: "string" },
    auto: true
  },
  "code.search": {
    category: "code",
    risk: "low",
    description: "Busca patrones o simbolos en el codigo (RAG)",
    params: { query: "string" },
    auto: true
  },

  // ─────────────────────────────────────────────────────────
  //  PROJECT
  // ─────────────────────────────────────────────────────────
  "project.create": {
    category: "project",
    risk: "medium",
    description: "Crea un proyecto completo desde un template (landing, mobile, dashboard)",
    params: { template: "string", name: "string" },
    auto: true
  },
  "project.scaffold": {
    category: "project",
    risk: "medium",
    description: "Genera estructura base de cualquier tipo de proyecto",
    params: { type: "string", name: "string" },
    auto: true
  },
  "project.install_deps": {
    category: "project",
    risk: "medium",
    description: "Instala dependencias (npm install, pip install, etc)",
    params: { manager: "string" },
    auto: true
  },
  "project.run": {
    category: "project",
    risk: "medium",
    description: "Ejecuta el proyecto (npm start, python app.py, etc)",
    params: { script: "string" },
    auto: false
  },

  // ─────────────────────────────────────────────────────────
  //  GIT
  // ─────────────────────────────────────────────────────────
  "git.clone": {
    category: "git",
    risk: "medium",
    description: "Clona un repositorio desde una URL",
    params: { url: "string", dest: "string" },
    auto: true
  },
  "git.status": {
    category: "git",
    risk: "low",
    description: "Estado del repo",
    params: {},
    auto: true
  },
  "git.commit": {
    category: "git",
    risk: "medium",
    description: "Hace commit de cambios",
    params: { message: "string" },
    auto: true
  },
  "git.push": {
    category: "git",
    risk: "medium",
    description: "Empuja cambios a remoto",
    params: { remote: "string", branch: "string" },
    auto: false
  },
  "git.pull": {
    category: "git",
    risk: "medium",
    description: "Baja cambios del remoto",
    params: {},
    auto: true
  },
  "git.branch": {
    category: "git",
    risk: "medium",
    description: "Crea o cambia de rama",
    params: { name: "string" },
    auto: true
  },

  // ─────────────────────────────────────────────────────────
  //  WEB / INTERNET
  // ─────────────────────────────────────────────────────────
  "web.search": {
    category: "web",
    risk: "low",
    description: "Busca informacion en internet",
    params: { query: "string" },
    auto: true
  },
  "web.read_url": {
    category: "web",
    risk: "low",
    description: "Lee el contenido de una pagina web",
    params: { url: "string" },
    auto: true
  },
  "web.scrape": {
    category: "web",
    risk: "medium",
    description: "Extrae datos estructurados de una pagina",
    params: { url: "string", selector: "string" },
    auto: true
  },

  // ─────────────────────────────────────────────────────────
  //  SKILLS (meta-skills: el agente instala skills)
  // ─────────────────────────────────────────────────────────
  "skills.list": {
    category: "skills",
    risk: "low",
    description: "Lista todas las skills disponibles (internas + instaladas)",
    params: {},
    auto: true
  },
  "skills.install": {
    category: "skills",
    risk: "high",
    description: "Instala una skill desde una URL de repo. Analiza viabilidad antes.",
    params: { url: "string", force: "boolean" },
    auto: false
  },
  "skills.uninstall": {
    category: "skills",
    risk: "high",
    description: "Desinstala una skill",
    params: { id: "string" },
    auto: false
  },
  "skills.verify": {
    category: "skills",
    risk: "low",
    description: "Verifica que una skill instalada funciona correctamente",
    params: { id: "string" },
    auto: true
  },
  "skills.read_manifest": {
    category: "skills",
    risk: "low",
    description: "Lee el manifest de un repo sin instalarlo (SKILL.md, skill.json, package.json)",
    params: { url: "string" },
    auto: true
  },

  // ─────────────────────────────────────────────────────────
  //  MCP (Model Context Protocol)
  // ─────────────────────────────────────────────────────────
  "mcp.list_servers": {
    category: "mcp",
    risk: "low",
    description: "Lista MCP servers conectados",
    params: {},
    auto: true
  },
  "mcp.add_server": {
    category: "mcp",
    risk: "high",
    description: "Agrega un MCP server (stdio o HTTP)",
    params: { name: "string", command: "string", args: "array", url: "string" },
    auto: false
  },
  "mcp.list_tools": {
    category: "mcp",
    risk: "low",
    description: "Lista tools expuestas por un MCP server",
    params: { server: "string" },
    auto: true
  },
  "mcp.call_tool": {
    category: "mcp",
    risk: "medium",
    description: "Invoca un tool de un MCP server",
    params: { server: "string", tool: "string", args: "object" },
    auto: true
  },
  "mcp.remove_server": {
    category: "mcp",
    risk: "high",
    description: "Elimina un MCP server",
    params: { name: "string" },
    auto: false
  },

  // ─────────────────────────────────────────────────────────
  //  SHELL
  // ─────────────────────────────────────────────────────────
  "shell.run": {
    category: "shell",
    risk: "high",
    description: "Ejecuta un comando en la terminal",
    params: { cmd: "string", cwd: "string" },
    auto: false
  },
  "shell.spawn": {
    category: "shell",
    risk: "medium",
    description: "Lanza un proceso en background",
    params: { cmd: "string" },
    auto: false
  },

  // ─────────────────────────────────────────────────────────
  //  DEPLOY
  // ─────────────────────────────────────────────────────────
  "deploy.vercel": {
    category: "deploy",
    risk: "high",
    description: "Despliega el proyecto a Vercel",
    params: { project: "string" },
    auto: false
  },
  "deploy.ssh": {
    category: "deploy",
    risk: "critical",
    description: "Ejecuta comandos por SSH en tu servidor",
    params: { host: "string", user: "string", cmd: "string" },
    auto: false
  },

  // ─────────────────────────────────────────────────────────
  //  META (cognitivas)
  // ─────────────────────────────────────────────────────────
  "meta.plan": {
    category: "meta",
    risk: "low",
    description: "Descompone una tarea compleja en pasos",
    params: { task: "string" },
    auto: true
  },
  "meta.classify": {
    category: "meta",
    risk: "low",
    description: "Clasifica el tipo de tarea (code, design, debug, etc)",
    params: { text: "string" },
    auto: true
  },
  "meta.remember": {
    category: "meta",
    risk: "low",
    description: "Guarda un hecho en la memoria persistente",
    params: { fact: "string" },
    auto: true
  },
  "meta.recall": {
    category: "meta",
    risk: "low",
    description: "Recupera memoria relevante para una tarea",
    params: { query: "string" },
    auto: true
  }
};

/**
 * Devuelve skills por categoria
 */
export function getSkillsByCategory() {
  const cats = {};
  Object.keys(SKILLS_REGISTRY).forEach(id => {
    const s = SKILLS_REGISTRY[id];
    if (!cats[s.category]) cats[s.category] = [];
    cats[s.category].push({ id, ...s });
  });
  return cats;
}

/**
 * Devuelve skills auto (que el agente puede invocar sin permiso)
 */
export function getAutoSkills() {
  return Object.keys(SKILLS_REGISTRY)
    .filter(id => SKILLS_REGISTRY[id].auto)
    .map(id => ({ id, ...SKILLS_REGISTRY[id] }));
}

/**
 * Filtra skills por riesgo maximo
 */
export function getSkillsByRisk(maxRisk) {
  const order = { low: 0, medium: 1, high: 2, critical: 3 };
  const max = order[maxRisk] ?? 3;
  return Object.keys(SKILLS_REGISTRY)
    .filter(id => order[SKILLS_REGISTRY[id].risk] <= max)
    .map(id => ({ id, ...SKILLS_REGISTRY[id] }));
}

/**
 * Genera el bloque de texto que se inyecta al system prompt
 * para que el agente sepa QUE puede hacer
 */
export function buildSkillsPrompt(allowedRisk = "medium") {
  const order = { low: 0, medium: 1, high: 2, critical: 3 };
  const max = order[allowedRisk] ?? 1;

  const cats = {};
  Object.keys(SKILLS_REGISTRY).forEach(id => {
    const s = SKILLS_REGISTRY[id];
    if (order[s.risk] > max) return;
    if (!cats[s.category]) cats[s.category] = [];
    cats[s.category].push({ id, ...s });
  });

  let out = "\n\n=== HERRAMIENTAS INTERNAS DISPONIBLES ===\n";
  out += "Puedes usar estas herramientas cuando las necesites. No requieren confirmacion (excepto alto riesgo).\n\n";

  Object.keys(cats).forEach(cat => {
    out += `\n[${cat.toUpperCase()}]\n`;
    cats[cat].forEach(s => {
      const params = Object.keys(s.params).join(", ");
      out += `  - ${s.id}(${params}) — ${s.description}\n`;
    });
  });

  out += "\nUsa estas herramientas de forma invisible al usuario. Solo reporta el resultado.\n";
  return out;
}