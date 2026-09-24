// ============================================================
//  GafCoreAI - Project Runner
//  Detecta el stack y ejecuta el proyecto automaticamente
// ============================================================
import { Desktop } from "./desktop.js";

export class ProjectRunner {
  constructor({ state, log, termWrite }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.process = null;
  }

  /**
   * Detecta el stack del proyecto abierto
   */
  async detectStack() {
    const folder = this.state.diskFolder;
    if (!folder || !Desktop.isDesktop()) return null;

    const checks = [
      { file: "package.json",     type: "node",  run: "npm start" },
      { file: "pyproject.toml",   type: "python", run: "python main.py" },
      { file: "requirements.txt", type: "python", run: "python main.py" },
      { file: "Cargo.toml",       type: "rust",  run: "cargo run" },
      { file: "go.mod",           type: "go",    run: "go run ." },
      { file: "Gemfile",          type: "ruby",  run: "bundle exec ruby main.rb" },
      { file: "composer.json",    type: "php",   run: "php -S localhost:8000" }
    ];

    for (const c of checks) {
      try {
        const exists = await Desktop.invoke("file_exists", { path: folder + "\\" + c.file });
        if (exists) {
          // Si es node, leer scripts del package.json
          if (c.type === "node") {
            const content = await Desktop.invoke("read_file", { path: folder + "\\package.json" });
            const pkg = JSON.parse(content);
            const script = pkg.scripts?.dev ? "npm run dev"
                         : pkg.scripts?.start ? "npm start"
                         : pkg.scripts?.serve ? "npm run serve" : null;
            return { type: "node", run: script, pkg };
          }
          return { type: c.type, run: c.run };
        }
      } catch (e) {}
    }

    return { type: "static", run: null };
  }

  /**
   * Ejecuta el comando de inicio
   */
  async run(command, cwd) {
    if (!Desktop.isDesktop()) {
      this.termWrite("⚠ Ejecutar solo funciona en .exe", "warn");
      return { ok: false, error: "No es escritorio" };
    }

    const dir = cwd || this.state.diskFolder;
    if (!dir) {
      return { ok: false, error: "No hay carpeta abierta. Usa 📁 Carpeta primero" };
    }

    this.termWrite("");
    this.termWrite("▶ Ejecutando: " + command, "head");
    this.termWrite("  Cwd: " + dir, "dim");

    try {
      // Abrir terminal tab Shell
      const termTab = document.querySelector(".terminal-tab[data-term-tab='shell']");
      if (termTab) termTab.click();

      // Esperar 500ms a que la shell este lista
      await new Promise(r => setTimeout(r, 500));

      // Escribir el comando en la terminal interactiva
      if (this.state.terminalInteractive) {
        await this.state.terminalInteractive.spawn(dir);
        await this.state.terminalInteractive.writeString(command + "\r");
      } else {
        // Fallback: invoke directo
        await Desktop.invoke("run_shell", { cmd: command, cwd: dir });
      }

      this.termWrite("  ✓ Comando enviado", "success");
      return { ok: true };
    } catch (e) {
      this.termWrite("  ✗ Error: " + e.message, "error");
      return { ok: false, error: e.message };
    }
  }

  /**
   * Instala dependencias segun stack
   */
  async installDeps() {
    const stack = await this.detectStack();
    if (!stack) return { ok: false, error: "No detectado" };

    let cmd = null;
    if (stack.type === "node") cmd = "npm install";
    else if (stack.type === "python") cmd = "pip install -r requirements.txt";
    else if (stack.type === "rust") cmd = "cargo build";
    else if (stack.type === "go") cmd = "go mod tidy";
    else if (stack.type === "php") cmd = "composer install";
    else if (stack.type === "ruby") cmd = "bundle install";

    if (!cmd) return { ok: false, error: "No hace falta instalar deps para " + stack.type };

    return await this.run(cmd, this.state.diskFolder);
  }
}