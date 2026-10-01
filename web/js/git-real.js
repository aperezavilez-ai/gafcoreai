// ============================================================
//  GafCoreAI - Git Real
//  Usa GitHub API real + git nativo del sistema
// ============================================================
import { Desktop } from "./desktop.js";
import { getSecret } from "./secrets.js";

export class GitReal {
  constructor({ state, log, termWrite }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
  }

  getConfig() {
    return {
      github: JSON.parse(getSecret("gafcoreai_github") || "{}"),
      vercel: JSON.parse(getSecret("gafcoreai_vercel") || "{}"),
      repo: localStorage.getItem("gafcoreai_github_selected"),
      project: localStorage.getItem("gafcoreai_vercel_selected")
    };
  }

  /**
   * git status real (via Rust)
   */
  async status() {
    if (!Desktop.isDesktop()) return { ok: false, error: "Solo escritorio" };
    const cwd = this.state.diskFolder;
    if (!cwd) return { ok: false, error: "Sin carpeta" };
    try {
      const out = await Desktop.invoke("git_status", { cwd });
      return { ok: true, output: out };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * git init real
   */
  async init() {
    if (!Desktop.isDesktop()) return { ok: false, error: "Solo escritorio" };
    const cwd = this.state.diskFolder;
    if (!cwd) return { ok: false, error: "Sin carpeta" };
    try {
      const out = await Desktop.invoke("git_init", { cwd });
      return { ok: true, output: out };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * git commit real
   */
  async commit(message) {
    if (!Desktop.isDesktop()) return { ok: false, error: "Solo escritorio" };
    const cwd = this.state.diskFolder;
    if (!cwd) return { ok: false, error: "Sin carpeta" };
    if (!message) return { ok: false, error: "Falta mensaje" };
    try {
      const out = await Desktop.invoke("git_commit", { cwd, message, files: [] });
      return { ok: true, output: out };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * git push real
   */
  async push() {
    if (!Desktop.isDesktop()) return { ok: false, error: "Solo escritorio" };
    const cwd = this.state.diskFolder;
    if (!cwd) return { ok: false, error: "Sin carpeta" };
    const cfg = this.getConfig();
    if (!cfg.github.token) return { ok: false, error: "GitHub no conectado" };
    try {
      const out = await Desktop.invoke("git_push", { cwd, remote: "origin", branch: null });
      return { ok: true, output: out };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * git pull real
   */
  async pull() {
    if (!Desktop.isDesktop()) return { ok: false, error: "Solo escritorio" };
    const cwd = this.state.diskFolder;
    if (!cwd) return { ok: false, error: "Sin carpeta" };
    try {
      const out = await Desktop.invoke("git_pull", { cwd });
      return { ok: true, output: out };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * git clone real AL DISCO
   */
  async clone(url, dest) {
    if (!Desktop.isDesktop()) return { ok: false, error: "Solo escritorio" };
    if (!url) return { ok: false, error: "URL requerida" };
    const repoName = url.split("/").pop().replace(".git", "").trim();
    const target = dest || (this.state.diskFolder ? (this.state.diskFolder + "\\" + repoName) : ("D:\\PROGRAMAS IA\\" + repoName));
    try {
      this.termWrite("📥 Clonando " + url + " a " + target, "head");
      const out = await Desktop.invoke("git_clone", { url, dest: target });
      this.termWrite("  ✓ Clonado", "success");
      return { ok: true, output: out, path: target };
    } catch (e) {
      this.termWrite("  ✗ " + e.message, "error");
      return { ok: false, error: e.message };
    }
  }

  /**
   * Deploy REAL a Vercel via API
   */
  async deployVercel() {
    const cfg = this.getConfig();
    if (!cfg.vercel.token) return { ok: false, error: "Vercel no conectado" };
    if (!cfg.project) return { ok: false, error: "Sin proyecto Vercel seleccionado" };

    try {
      this.termWrite("🚀 Desplegando a Vercel: " + cfg.project, "head");

      const r = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + cfg.vercel.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: cfg.project,
          target: "production",
          gitSource: null
        })
      });

      if (!r.ok) {
        const err = await r.text();
        throw new Error("HTTP " + r.status + ": " + err.slice(0, 200));
      }

      const data = await r.json();
      this.termWrite("  ✓ Deployment creado: " + (data.url || data.id), "success");
      return { ok: true, deployment: data };
    } catch (e) {
      this.termWrite("  ✗ " + e.message, "error");
      return { ok: false, error: e.message };
    }
  }

  /**
   * Publicar TODO (commit + push + deploy + supabase sync)
   */
  async publishAll(message) {
    this.termWrite("");
    this.termWrite("══════════════════════════════════════════════", "head");
    this.termWrite("  PUBLICANDO PROYECTO", "head");
    this.termWrite("══════════════════════════════════════════════", "head");

    const results = { commit: null, push: null, deploy: null };

    // 1) Commit
    this.termWrite("");
    this.termWrite("[1/3] Git commit", "dim");
    results.commit = await this.commit(message);
    if (!results.commit.ok) {
      this.termWrite("  ⚠ " + results.commit.error, "warn");
    }

    // 2) Push
    this.termWrite("");
    this.termWrite("[2/3] Git push", "dim");
    results.push = await this.push();
    if (!results.push.ok) {
      this.termWrite("  ⚠ " + results.push.error, "warn");
    }

    // 3) Deploy
    this.termWrite("");
    this.termWrite("[3/3] Vercel deploy", "dim");
    results.deploy = await this.deployVercel();
    if (!results.deploy.ok) {
      this.termWrite("  ⚠ " + results.deploy.error, "warn");
    }

    this.termWrite("");
    this.termWrite("✔ Publicacion terminada", "success");
    return results;
  }
}