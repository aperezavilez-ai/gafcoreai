// ============================================================
//  GafCoreAI - Agent Brain
//  Decide QUE skills usar para cada tarea.
//  El usuario nunca ve esto: es invisible.
// ============================================================

import { SKILLS_REGISTRY, buildSkillsPrompt, getSkillsByRisk } from "./skills-registry.js";

export class AgentBrain {
  constructor({ skillsInstaller, mcpClient, memory, log, termWrite }) {
    this.skillsInstaller = skillsInstaller;
    this.mcpClient = mcpClient;
    this.memory = memory;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
  }

  /**
   * Clasifica la tarea y devuelve el tipo de inteligencia a usar
   */
  classify(taskText) {
    const t = (taskText || "").toLowerCase();

    const rules = [
      { type: "install_skill", re: /(instala|install)\s+(esta\s+)?(skill|habilidad)|github\.com\/[^\/]+\/[^\s]+.*(skill|habilidad)/i },
      { type: "install_mcp", re: /(instala|install)\s+(este\s+)?(mcp|server)|mcp:\/\/|@modelcontextprotocol/i },
      { type: "clone_repo", re: /(clona|clone|descarga)\s+(el\s+)?(repo|repositorio)/i },
      { type: "create_project", re: /(crea|create|haz|nuevo)\s+(un\s+)?(proyecto|landing|app|dashboard|sitio|web|pagina)/i },
      { type: "debug", re: /(bug|error|falla|no funciona|corrige|arregla)/i },
      { type: "refactor", re: /(refactoriza|reorganiza|limpia el codigo|mejora el codigo)/i },
      { type: "test", re: /(test|prueba|unitario|coverage)/i },
      { type: "deploy", re: /(deploy|despliega|publica|sube a produccion)/i },
      { type: "analyze", re: /(analiza|explica|como funciona|que hace)/i },
      { type: "search", re: /(busca|investiga|ultimas noticias|documentacion)/i },
      { type: "git_op", re: /(commit|push|pull|branch|merge|git\s+)/i }
    ];

    for (const r of rules) {
      if (r.re.test(t)) return r.type;
    }
    return "general";
  }

  /**
   * Devuelve las skills relevantes para una tarea
   */
  pickSkills(taskText) {
    const type = this.classify(taskText);
    const picks = [];

    const mapping = {
      install_skill:  ["skills.read_manifest", "skills.install", "skills.verify"],
      install_mcp:    ["mcp.add_server", "mcp.list_tools"],
      clone_repo:     ["git.clone", "fs.list", "project.install_deps"],
      create_project: ["project.create", "fs.write", "fs.mkdir", "code.format"],
      debug:          ["code.analyze", "fs.read", "code.search", "code.lint"],
      refactor:       ["code.analyze", "code.refactor", "code.format"],
      test:           ["code.analyze", "shell.run"],
      deploy:         ["git.commit", "git.push", "deploy.vercel"],
      analyze:        ["fs.read", "fs.list", "code.analyze", "code.search"],
      search:         ["web.search", "web.read_url"],
      git_op:         ["git.status", "git.commit", "git.pull"],
      general:        ["meta.plan", "fs.list", "code.analyze"]
    };

    const ids = mapping[type] || mapping.general;
    ids.forEach(id => {
      if (SKILLS_REGISTRY[id]) {
        let weight = 1.0;
        if (this.memory && this.memory.synapticGraph) {
          const edge = this.memory.synapticGraph.edges.get(`task:${type}->skill:${id}`);
          if (edge) weight = edge.weight;
        }
        picks.push({ id, weight, ...SKILLS_REGISTRY[id] });
      }
    });

    // Ordenar de mayor a menor peso sináptico
    picks.sort((a, b) => (b.weight || 1.0) - (a.weight || 1.0));

    return { type, skills: picks };
  }

  /**
   * Construye el prompt completo que se inyecta al agente
   */
  buildPrompt(taskText) {
    const { type, skills } = this.pickSkills(taskText);
    const skillsPrompt = buildSkillsPrompt("medium");

    let installedSkillsCtx = "";
    if (this.skillsInstaller) {
      installedSkillsCtx = this.skillsInstaller.buildSkillsContext();
    }

    let mcpCtx = "";
    if (this.mcpClient) {
      mcpCtx = this.mcpClient.buildMcpContext();
    }

    let memoryCtx = "";
    if (this.memory) {
      try { memoryCtx = this.memory.buildContext("orchestrator"); } catch (e) {}
    }

    let specificContext = "\n\n=== TAREA CLASIFICADA ===\n";
    specificContext += "Tipo: " + type + "\n";
    specificContext += "Skills sugeridas: " + skills.map(s => s.id).join(", ") + "\n";

    return {
      type,
      skills,
      prompt: skillsPrompt + installedSkillsCtx + mcpCtx + memoryCtx + specificContext
    };
  }

  /**
   * Detecta si el texto contiene una URL de repo de skills y la analiza
   * Devuelve null si no es URL, o el analisis si lo es
   */
  async detectSkillUrl(text) {
    const urls = (text.match(/https?:\/\/[^\s]+/g) || []);
    if (!urls.length) return null;

    for (const url of urls) {
      if (!/(github\.com|\.md$|\.json$)/i.test(url)) continue;

      // Chequear si el usuario menciona "skill" o "instala"
      if (/(skill|habilidad|instala|install)/i.test(text)) {
        if (this.skillsInstaller) {
          const analysis = await this.skillsInstaller.analyze(url);
          return analysis;
        }
      }
    }
    return null;
  }

  /**
   * Detecta si el texto pide un MCP server
   */
  async detectMcpUrl(text) {
    const urls = (text.match(/https?:\/\/[^\s]+/g) || []);
    for (const url of urls) {
      if (/(mcp|modelcontextprotocol)/i.test(url) || /(mcp|instala.*server)/i.test(text)) {
        return { url, detected: true };
      }
    }
    return null;
  }
}