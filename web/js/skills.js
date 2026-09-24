// ============================================================
//  GafCoreAI - Catalogo de Skills
//  Habilidades que los agentes pueden invocar
// ============================================================

export const SKILL_CATALOG = {
  // ── Exploracion ────────────────────────────
  "explore_files": {
    category: "explore",
    name: "Explorar archivos",
    description: "Lista y examina los archivos del proyecto",
    risk: "low",
    agents: ["Explorer", "Coder", "Reviewer"],
    prompt: "Usa esta skill para mapear la estructura del proyecto. Identifica archivos clave, entry points y dependencias."
  },
  "read_code": {
    category: "explore",
    name: "Leer codigo",
    description: "Lee el contenido de archivos especificos",
    risk: "low",
    agents: ["Explorer", "Analyst", "Coder", "Reviewer", "Tester"],
    prompt: "Lee los archivos relevantes antes de proponer cambios."
  },
  "search_code": {
    category: "explore",
    name: "Buscar en codigo",
    description: "Busca patrones o simbolos en el proyecto (RAG)",
    risk: "low",
    agents: ["Explorer", "Analyst", "Coder"],
    prompt: "Usa busqueda semantica para encontrar fragmentos relevantes del codigo."
  },

  // ── Analisis ───────────────────────────────
  "analyze_complexity": {
    category: "analysis",
    name: "Analizar complejidad",
    description: "Evalua complejidad ciclomatica, code smells y deuda tecnica",
    risk: "low",
    agents: ["Analyst", "Reviewer"],
    prompt: "Identifica funciones largas, ramas anidadas, duplicacion y code smells."
  },
  "security_scan": {
    category: "analysis",
    name: "Escaneo de seguridad",
    description: "Busca vulnerabilidades comunes (inyeccion, XSS, secretos expuestos)",
    risk: "low",
    agents: ["Security", "Analyst"],
    prompt: "Revisa: validacion de input, sanitizacion, manejo de secretos, dependencias vulnerables."
  },
  "detect_bugs": {
    category: "analysis",
    name: "Detectar bugs",
    description: "Busca bugs potenciales y edge cases sin cubrir",
    risk: "low",
    agents: ["Analyst", "Tester", "Reviewer"],
    prompt: "Identifica: null/undefined no manejados, race conditions, off-by-one, memory leaks."
  },

  // ── Generacion ─────────────────────────────
  "write_code": {
    category: "codegen",
    name: "Escribir codigo",
    description: "Genera o modifica archivos de codigo",
    risk: "medium",
    agents: ["Coder"],
    prompt: "Escribe codigo limpio siguiendo el estilo del proyecto. Usa bloques ```write:path"
  },
  "write_tests": {
    category: "codegen",
    name: "Escribir tests",
    description: "Genera tests unitarios e integracion",
    risk: "medium",
    agents: ["Tester", "Coder"],
    prompt: "Escribe tests que cubran: happy path, edge cases, errores esperados."
  },
  "write_docs": {
    category: "codegen",
    name: "Escribir documentacion",
    description: "Genera README, JSDoc, comentarios",
    risk: "low",
    agents: ["Coder", "Reviewer"],
    prompt: "Documenta el que, el como y el por que."
  },

  // ── Verificacion ───────────────────────────
  "review_code": {
    category: "review",
    name: "Revisar codigo",
    description: "Revisa cambios y sugiere mejoras",
    risk: "low",
    agents: ["Reviewer", "Security"],
    prompt: "Revisa: correctitud, estilo, rendimiento, seguridad, mantenibilidad."
  },
  "run_tests": {
    category: "review",
    name: "Ejecutar tests",
    description: "Corre la suite de tests del proyecto",
    risk: "low",
    agents: ["Tester"],
    prompt: "Ejecuta los tests y reporta resultados."
  },

  // ── Internet ───────────────────────────────
  "web_search": {
    category: "web",
    name: "Buscar en internet",
    description: "Busca informacion actualizada en la web",
    risk: "low",
    agents: ["Researcher", "Analyst", "Coder"],
    prompt: "Usa busqueda web cuando necesites informacion actualizada o ejemplos."
  },
  "read_url": {
    category: "web",
    name: "Leer URL",
    description: "Lee el contenido de una pagina web",
    risk: "low",
    agents: ["Researcher", "Analyst"],
    prompt: "Lee documentacion o referencias desde URLs."
  },

  // ── Operaciones ────────────────────────────
  "run_command": {
    category: "ops",
    name: "Ejecutar comando",
    description: "Corre comandos en la terminal (npm, git, etc)",
    risk: "high",
    agents: ["Coder", "Tester"],
    prompt: "Solo comandos seguros. Evita rm -rf y comandos destructivos."
  },
  "git_ops": {
    category: "ops",
    name: "Operaciones Git",
    description: "Commit, push, pull, branch",
    risk: "high",
    agents: ["Coder"],
    prompt: "Usa mensajes de commit descriptivos."
  },
  // ── Web avanzado ─────────────────────────
  "scrape_web": {
    category: "web",
    name: "Scraping web",
    description: "Extrae datos estructurados (links, titulos, tablas) de una pagina",
    risk: "low",
    agents: ["Researcher", "Analyst", "Explorer"],
    prompt: "Usa scraping para obtener datos estructurados de paginas cuando necesites informacion especifica."
  },
  "download_file": {
    category: "web",
    name: "Descargar archivo",
    description: "Descarga un archivo (imagen, doc, codigo) desde una URL",
    risk: "low",
    agents: ["Researcher", "Explorer", "Coder"],
    prompt: "Usa download_file para traer archivos externos al proyecto."
  },
  "search_github": {
    category: "web",
    name: "Buscar en GitHub",
    description: "Busca repos, codigo o usuarios en GitHub",
    risk: "low",
    agents: ["Researcher", "Explorer", "Coder"],
    prompt: "Busca repos de referencia o ejemplos en GitHub."
  },
  "search_packages": {
    category: "web",
    name: "Buscar paquetes NPM",
    description: "Busca paquetes en el registro de NPM",
    risk: "low",
    agents: ["Researcher", "Explorer", "Coder"],
    prompt: "Usa para encontrar librerias o herramientas."
  },
  "search_skills": {
    category: "meta",
    name: "Buscar skills",
    description: "Busca skills internas disponibles por palabra clave o categoria",
    risk: "low",
    agents: ["Researcher", "Explorer", "Planner", "Coder"],
    prompt: "Antes de actuar, verifica que skills tienes disponibles para esta tarea."
  },
  "deploy": {
    category: "ops",
    name: "Desplegar",
    description: "Publica el proyecto a Vercel/VPS",
    risk: "critical",
    agents: [],  // solo via boton Publicar
    prompt: "Requiere confirmacion explicita del usuario."
  }
};

/**
 * Devuelve las skills asignadas a un agente especifico.
 */
export function getSkillsForAgent(agentName) {
  const result = [];
  Object.keys(SKILL_CATALOG).forEach(skillId => {
    const skill = SKILL_CATALOG[skillId];
    if (skill.agents.includes(agentName)) {
      result.push({ id: skillId, ...skill });
    }
  });
  return result;
}

/**
 * Genera un bloque de texto para inyectar en el system prompt del agente.
 */
export function buildSkillsPrompt(agentName) {
  const skills = getSkillsForAgent(agentName);
  if (!skills.length) return "";

  let out = "\n\n=== SKILLS DISPONIBLES ===\n";
  skills.forEach(s => {
    out += `- ${s.id} [${s.risk}]: ${s.description}\n`;
  });
  out += "\nUsa estas skills segun necesites. Documenta cual usaste.\n";
  return out;
}

/**
 * Lista de todas las skills por categoria.
 */
export function getSkillsByCategory() {
  const cats = {};
  Object.keys(SKILL_CATALOG).forEach(id => {
    const s = SKILL_CATALOG[id];
    if (!cats[s.category]) cats[s.category] = [];
    cats[s.category].push({ id, ...s });
  });
  return cats;
}