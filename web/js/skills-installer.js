// ============================================================
//  GafCoreAI - Skills Installer
//  Instala skills desde URLs de repos. El agente decide si es viable.
// ============================================================

const INSTALLED_SKILLS_KEY = "gafcoreai_installed_skills";

export class SkillsInstaller {
  constructor({ log, termWrite }) {
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.installed = this.loadInstalled();
  }

  /**
   * Analiza una URL y devuelve info sobre la skill (SIN instalar)
   * Soporta: github.com/usuario/repo, gitlab.com/..., URLs directas a SKILL.md
   */
  async analyze(url) {
    this.termWrite("");
    this.termWrite("🔍 Analizando: " + url, "head");

    const result = {
      url,
      valid: false,
      type: null,      // "github" | "git" | "raw" | "unknown"
      owner: null,
      repo: null,
      branch: "main",
      manifest: null,
      files: [],
      reason: null
    };

    try {
      // Detectar tipo
      const ghMatch = url.match(/github\.com[\/:]([^\/]+)\/([^\/\s\.]+)/);
      const rawMatch = url.match(/^https?:\/\/.+\.(md|json|js|yaml|yml)$/i);

      if (ghMatch) {
        result.type = "github";
        result.owner = ghMatch[1];
        result.repo = ghMatch[2].replace(/\.git$/, "");
        await this.fetchGithubInfo(result);
      } else if (/gitlab\.com|bitbucket\.org/.test(url)) {
        result.type = "git";
        result.reason = "Plataformas distintas a GitHub no soportadas aun. Usa GitHub o URL directa.";
      } else if (rawMatch) {
        result.type = "raw";
        result.manifest = await this.fetchRaw(url);
        result.valid = !!result.manifest;
      } else if (url.startsWith("git@") || url.endsWith(".git")) {
        result.type = "git";
        result.reason = "Git SSH/clone requiere backend. Usa GitHub HTTPS.";
      } else {
        result.reason = "URL no reconocida. Formatos validos: github.com/u/r, raw url .md/.json";
      }
    } catch (e) {
      result.reason = "Error de red: " + e.message;
    }

    if (result.valid) {
      this.termWrite("  ✓ Skill valida detectada", "success");
      this.termWrite("  Tipo: " + result.type, "dim");
      this.termWrite("  Nombre: " + (result.manifest.name || result.repo || "(sin nombre)"), "dim");
      if (result.manifest.description) {
        this.termWrite("  " + result.manifest.description.slice(0, 100), "dim");
      }
      this.termWrite("  Archivos: " + (result.files.length || (result.manifest.files ? result.manifest.files.length : 1)), "dim");
    } else {
      this.termWrite("  ✘ No es una skill valida: " + result.reason, "warn");
    }

    return result;
  }

  async fetchGithubInfo(result) {
    const base = "https://api.github.com/repos/" + result.owner + "/" + result.repo;

    // Info del repo
    const repoRes = await fetch(base);
    if (!repoRes.ok) {
      result.reason = "Repo no encontrado o privado (HTTP " + repoRes.status + ")";
      return;
    }
    const repoInfo = await repoRes.json();
    result.branch = repoInfo.default_branch || "main";
    result.description = repoInfo.description;
    result.stars = repoInfo.stargazers_count;

    // Buscar manifest
    const candidates = ["SKILL.md", "skill.json", "skills.json", ".gafcore/skill.json", "package.json"];

    for (const file of candidates) {
      const r = await fetch(base + "/contents/" + file + "?ref=" + result.branch);
      if (!r.ok) continue;
      const data = await r.json();
      if (data.content) {
        const text = atob(data.content.replace(/\n/g, ""));
        result.manifestFile = file;
        try {
          result.manifest = file.endsWith(".json") ? JSON.parse(text) : this.parseMarkdownManifest(text);
        } catch (e) {
          result.manifest = { name: result.repo, description: text.slice(0, 200), raw: text };
        }
        break;
      }
    }

    if (!result.manifest) {
      result.manifest = {
        name: result.repo,
        description: repoInfo.description || "(sin descripcion)",
        author: result.owner,
        type: "generic"
      };
    }

    // Listar archivos principales
    const treeRes = await fetch(base + "/git/trees/" + result.branch + "?recursive=1");
    if (treeRes.ok) {
      const tree = await treeRes.json();
      result.files = (tree.tree || []).filter(f => f.type === "blob").slice(0, 100);
    }

    result.valid = true;
  }

  parseMarkdownManifest(text) {
    const manifest = { type: "markdown", files: [] };
    const lines = text.split("\n");
    lines.forEach(line => {
      const nameMatch = line.match(/^#\s+(.+)$/);
      if (nameMatch && !manifest.name) manifest.name = nameMatch[1].trim();
      const descMatch = line.match(/^(description|descripcion)[:\s]+(.+)$/i);
      if (descMatch) manifest.description = descMatch[2].trim();
      const authorMatch = line.match(/^(author|autor)[:\s]+(.+)$/i);
      if (authorMatch) manifest.author = authorMatch[2].trim();
      const capMatch = line.match(/^[-*]\s+`?([a-z][a-z0-9._-]+)`?\s*[-:]\s*(.+)$/i);
      if (capMatch) {
        if (!manifest.capabilities) manifest.capabilities = [];
        manifest.capabilities.push({ id: capMatch[1], description: capMatch[2] });
      }
    });
    return manifest;
  }

  async fetchRaw(url) {
    const r = await fetch(url);
    if (!r.ok) return null;
    const text = await r.text();
    if (url.endsWith(".json")) {
      try { return JSON.parse(text); } catch (e) { return null; }
    }
    return this.parseMarkdownManifest(text);
  }

  /**
   * Instala la skill
   */
  async install(analysis) {
    if (!analysis.valid) {
      return { ok: false, error: analysis.reason || "Analisis invalido" };
    }

    const id = analysis.manifest.id || (analysis.owner ? analysis.owner + "/" + analysis.repo : "skill-" + Date.now());

    if (this.installed[id]) {
      return { ok: false, error: "Ya esta instalada: " + id };
    }

    const record = {
      id,
      url: analysis.url,
      type: analysis.type,
      owner: analysis.owner,
      repo: analysis.repo,
      branch: analysis.branch,
      name: analysis.manifest.name || analysis.repo,
      description: analysis.manifest.description || "",
      author: analysis.manifest.author || analysis.owner || "",
      capabilities: analysis.manifest.capabilities || [],
      files: analysis.files.map(f => f.path),
      installedAt: Date.now(),
      status: "installed"
    };

    this.installed[id] = record;
    this.save();

    this.termWrite("  ✓ Instalada: " + record.name, "success");
    return { ok: true, skill: record };
  }

  /**
   * Desinstala
   */
  uninstall(id) {
    if (!this.installed[id]) return false;
    delete this.installed[id];
    this.save();
    return true;
  }

  /**
   * Lista skills instaladas
   */
  list() {
    return Object.values(this.installed);
  }

  /**
   * Verifica que una skill instalada sigue disponible
   */
  async verify(id) {
    const skill = this.installed[id];
    if (!skill) return { ok: false, error: "No instalada" };

    if (skill.type === "github") {
      const url = "https://api.github.com/repos/" + skill.owner + "/" + skill.repo;
      try {
        const r = await fetch(url);
        return { ok: r.ok, status: r.status };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
    return { ok: true };
  }

  /**
   * Convierte skills instaladas a bloques para el system prompt
   */
  buildSkillsContext() {
    const list = this.list();
    if (!list.length) return "";

    let out = "\n\n=== SKILLS INSTALADAS POR EL USUARIO ===\n";
    list.forEach(s => {
      out += `\n[${s.id}]\n`;
      out += `  Nombre: ${s.name}\n`;
      if (s.description) out += `  ${s.description}\n`;
      if (s.author) out += `  Autor: ${s.author}\n`;
      if (s.capabilities.length) {
        out += "  Capacidades:\n";
        s.capabilities.forEach(c => { out += `    - ${c.id}: ${c.description}\n`; });
      }
    });
    out += "\nUsa estas skills cuando la tarea lo requiera.\n";
    return out;
  }

  save() {
    try {
      localStorage.setItem(INSTALLED_SKILLS_KEY, JSON.stringify(this.installed));
    } catch (e) {}
  }

  loadInstalled() {
    try {
      const raw = localStorage.getItem(INSTALLED_SKILLS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  clear() {
    this.installed = {};
    this.save();
  }
}