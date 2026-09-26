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
  },

  // ── Multimedia, Video & Render ─────────────
  "ffmpeg": {
    category: "multimedia",
    name: "FFmpeg Video Processing",
    description: "Manipulación, transcodificación, filtros y corte de video/audio con FFmpeg",
    risk: "medium",
    agents: ["Coder", "Explorer", "Analyst"],
    prompt: "Aplica comandos de FFmpeg optimizados para renderizado, escalado y audio."
  },
  "moviepy": {
    category: "multimedia",
    name: "MoviePy Video Scripting",
    description: "Edición programática de video en Python mediante MoviePy",
    risk: "low",
    agents: ["Coder", "Analyst"],
    prompt: "Genera scripts de MoviePy para composición de video, clips y transiciones."
  },
  "remotion": {
    category: "multimedia",
    name: "Remotion React Video",
    description: "Creación de videos programáticos con React, motion graphics y animaciones",
    risk: "low",
    agents: ["Coder", "Explorer", "Reviewer"],
    prompt: "Estructura composiciones de Remotion en React con renderizado por frames."
  },
  "remotion_official": {
    category: "multimedia",
    name: "Remotion Official Patterns",
    description: "Patrones oficiales y mejores prácticas de la arquitectura Remotion",
    risk: "low",
    agents: ["Coder", "Reviewer"],
    prompt: "Sigue las directrices oficiales de Remotion para optimizar bundle y render."
  },

  // ── Automatización & Workflows n8n ──────────
  "n8n_agents": {
    category: "n8n",
    name: "n8n AI Agents",
    description: "Construcción de agentes de IA en n8n con memory, tools y subworkflows",
    risk: "low",
    agents: ["Coder", "Analyst", "Planner"],
    prompt: "Diseña nodos de agente de IA en n8n con herramientas asignadas y guardrails."
  },
  "n8n_code_javascript": {
    category: "n8n",
    name: "n8n JavaScript Nodes",
    description: "Programación de nodos Code en JavaScript para transformación de items en n8n",
    risk: "low",
    agents: ["Coder"],
    prompt: "Escribe código JavaScript para nodos Code de n8n retornando estructura de items válida."
  },
  "n8n_code_python": {
    category: "n8n",
    name: "n8n Python Nodes",
    description: "Programación de nodos Code en Python para procesamiento de datos en n8n",
    risk: "low",
    agents: ["Coder"],
    prompt: "Escribe scripts de Python compatibles con el runtime de n8n."
  },
  "n8n_mcp_tools": {
    category: "n8n",
    name: "n8n MCP Tools Integration",
    description: "Conexión de herramientas MCP (Model Context Protocol) dentro de flujos n8n",
    risk: "medium",
    agents: ["Coder", "Explorer"],
    prompt: "Integra servidores MCP como herramientas dinámicas en agentes de n8n."
  },
  "n8n_workflow_patterns": {
    category: "n8n",
    name: "n8n Workflow Patterns",
    description: "Patrones arquitectónicos de automatización (fan-out, retry, queue, webhook) en n8n",
    risk: "low",
    agents: ["Planner", "Coder", "Analyst"],
    prompt: "Aplica patrones de flujo resilientes en n8n con control de flujo y ramificación."
  },
  "n8n_error_handling": {
    category: "n8n",
    name: "n8n Error Handling",
    description: "Manejo de errores, error triggers y recuperación automática en n8n",
    risk: "low",
    agents: ["Coder", "Reviewer"],
    prompt: "Configura Error Workflows y continuaciones on-fail en n8n."
  },

  // ── Testing, Browser & DevTools ─────────────
  "browser_testing_devtools": {
    category: "testing",
    name: "Browser Testing DevTools",
    description: "Pruebas de navegador automatizadas, inspección de DOM y consola DevTools",
    risk: "medium",
    agents: ["Tester", "Coder", "Analyst"],
    prompt: "Ejecuta y diagnostica pruebas de frontend con herramientas DevTools."
  },
  "playwright_recording": {
    category: "testing",
    name: "Playwright E2E Recording",
    description: "Generación y grabación de suites de prueba end-to-end con Playwright",
    risk: "medium",
    agents: ["Tester", "Coder"],
    prompt: "Crea tests reproducibles con Playwright testeando flujos de usuario completos."
  },
  "tdd_development": {
    category: "testing",
    name: "Test-Driven Development (TDD)",
    description: "Desarrollo guiado por pruebas: Red-Green-Refactor",
    risk: "low",
    agents: ["Tester", "Coder", "Reviewer"],
    prompt: "Escribe primero las pruebas unitarias que fallen y luego implementa la solución mínima."
  },
  "debugging_error_recovery": {
    category: "testing",
    name: "Debugging & Error Recovery",
    description: "Diagnóstico forense de excepciones, trazas de error y resolución de bugs",
    risk: "low",
    agents: ["Analyst", "Coder", "Security"],
    prompt: "Analiza el stacktrace, identifica causa raíz y propone solución quirúrgica."
  },

  // ── Seguridad, Calidad & Arquitectura ───────
  "security_hardening": {
    category: "security",
    name: "Security Hardening",
    description: "Auditoría de seguridad, políticas CSP, sanitización y protección contra inyecciones",
    risk: "low",
    agents: ["Security", "Reviewer", "Analyst"],
    prompt: "Aplica hardening estricto en APIs, cabeceras HTTP, variables de entorno y auth."
  },
  "security_guidance": {
    category: "security",
    name: "Security Guidance & Compliance",
    description: "Buenas prácticas OWASP, gestión de secretos y dependencias seguras",
    risk: "low",
    agents: ["Security", "Reviewer"],
    prompt: "Verifica cumplimiento de estándares de seguridad y cero secretos expuestos."
  },
  "performance_optimization": {
    category: "quality",
    name: "Performance Optimization",
    description: "Optimización de Core Web Vitals, tiempos de carga, memoria y bundle size",
    risk: "low",
    agents: ["Analyst", "Coder", "Reviewer"],
    prompt: "Identifica cuellos de botella, optimiza loops, queries y activos pesados."
  },
  "code_simplification": {
    category: "quality",
    name: "Code Simplification & Clean Code",
    description: "Refactorización para simplificar lógica enrevesada y reducir deuda técnica",
    risk: "low",
    agents: ["Reviewer", "Coder"],
    prompt: "Simplifica el código sin alterar el comportamiento funcional ni las firmas públicas."
  },
  "deep_project_analysis": {
    category: "analysis",
    name: "Deep Project Analysis",
    description: "Análisis integral de arquitectura, grafo de dependencias y riesgos de software",
    risk: "low",
    agents: ["Planner", "Analyst", "Reviewer"],
    prompt: "Genera un diagnóstico exhaustivo de arquitectura, modularidad y puntos débiles."
  },
  "frontend_ui_engineering": {
    category: "frontend",
    name: "Frontend UI Engineering",
    description: "Ingeniería de componentes UI, diseño responsivo, CSS moderno y accesibilidad",
    risk: "low",
    agents: ["Coder", "Reviewer"],
    prompt: "Diseña interfaces limpias, fluidas, accesibles (a11y) y con animaciones de 0.2s."
  },
  "frontend_design": {
    category: "frontend",
    name: "Frontend Modern Design",
    description: "Sistemas de diseño, tokens tipográficos, paletas de color y microinteracciones",
    risk: "low",
    agents: ["Coder", "Analyst"],
    prompt: "Construye experiencias visuales con glassmorphism, gradientes sutiles y contraste adecuado."
  },

  // ── Empaquetado & Herramientas ─────────────
  "web_to_desktop_pake": {
    category: "packaging",
    name: "Web to Desktop Packaging",
    description: "Empaquetado de aplicaciones web en binarios de escritorio livianos",
    risk: "medium",
    agents: ["Coder", "Planner"],
    prompt: "Configura empaquetado multiplataforma optimizado."
  },
  "prompt_master": {
    category: "meta",
    name: "Prompt Engineering Master",
    description: "Diseño y optimización de meta-prompts y estructuras de instrucciones para LLMs",
    risk: "low",
    agents: ["Planner", "Analyst"],
    prompt: "Estructura prompts con roles, restricciones, formato de salida y ejemplos pocos disparos."
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