// ============================================================
//  GafCoreAI - Project Watcher
//  Vigila el proyecto y detecta situaciones que requieren accion
// ============================================================
import { Desktop } from "./desktop.js";

export class ProjectWatcher {
  constructor({ state, log }) {
    this.state = state;
    this.log = log || console.log;
    this.timer = null;
    this.lastSnapshot = {};
    this.observers = [];
  }

  on(event, handler) {
    this.observers.push({ event, handler });
  }

  emit(event, data) {
    this.observers.filter(o => o.event === event).forEach(o => {
      try { o.handler(data); } catch (e) {}
    });
  }

  start(intervalMs) {
    this.stop();
    const interval = intervalMs || 30000; // cada 30s
    this.timer = setInterval(() => this.tick(), interval);
    this.tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (!Desktop.isDesktop() || !this.state.diskFolder) return;

    try {
      const snapshot = await this.snapshot();
      const changes = this.compare(this.lastSnapshot, snapshot);
      this.lastSnapshot = snapshot;

      if (changes.newFiles.length) {
        this.emit("files-added", changes.newFiles);
      }
      if (changes.modifiedFiles.length) {
        this.emit("files-modified", changes.modifiedFiles);
      }
      if (changes.deletedFiles.length) {
        this.emit("files-deleted", changes.deletedFiles);
      }

      // Detecciones proactivas
      await this.detectOpportunities(snapshot);
    } catch (e) {
      this.log("Watcher error: " + e.message);
    }
  }

  async snapshot() {
    const dir = this.state.diskFolder;
    const files = [];
    const stack = [{ path: dir, depth: 0 }];

    while (stack.length) {
      const { path, depth } = stack.pop();
      if (depth > 4) continue;
      try {
        const entries = await Desktop.invoke("list_dir", { path });
        for (const e of entries) {
          const name = e.name || "";
          if (name === "node_modules" || name === ".git" || name === "target" ||
              name === "dist" || name === "build" || name === ".next") continue;
          if (e.is_dir) {
            stack.push({ path: e.path, depth: depth + 1 });
          } else if (e.is_file) {
            files.push({
              path: e.path,
              size: e.size,
              modified: e.modified || Date.now()
            });
          }
        }
      } catch (err) {}
    }

    return {
      total: files.length,
      files,
      ts: Date.now(),
      diskFolder: dir
    };
  }

  compare(prev, curr) {
    if (!prev.files) return { newFiles: [], modifiedFiles: [], deletedFiles: [] };

    const prevMap = new Map(prev.files.map(f => [f.path, f]));
    const currMap = new Map(curr.files.map(f => [f.path, f]));

    const newFiles = curr.files.filter(f => !prevMap.has(f.path)).map(f => f.path);
    const modifiedFiles = curr.files
      .filter(f => prevMap.has(f.path) && prevMap.get(f.path).size !== f.size)
      .map(f => f.path);
    const deletedFiles = prev.files.filter(f => !currMap.has(f.path)).map(f => f.path);

    return { newFiles, modifiedFiles, deletedFiles };
  }

  async detectOpportunities(snapshot) {
    // 1) Archivos sin tests
    const codeFiles = snapshot.files.filter(f => /\.(js|ts|jsx|tsx|py)$/.test(f.path));
    const testFiles = snapshot.files.filter(f => /\.(test|spec)\./.test(f.path));

    if (codeFiles.length > 5 && testFiles.length === 0) {
      this.emit("opportunity", {
        type: "no-tests",
        message: "Hay " + codeFiles.length + " archivos de codigo sin ningun test",
        action: "generar-tests",
        severity: "warn"
      });
    }

    // 2) Archivo grande (>50KB)
    const bigFiles = snapshot.files.filter(f => f.size > 50000 && /\.(js|ts|jsx|tsx|py)$/.test(f.path));
    if (bigFiles.length) {
      this.emit("opportunity", {
        type: "big-files",
        message: bigFiles.length + " archivos superan 50 KB (candidatos a dividir)",
        files: bigFiles.slice(0, 5).map(f => f.path),
        action: "refactor",
        severity: "info"
      });
    }

    // 3) Falta README
    const hasReadme = snapshot.files.some(f => /README/i.test(f.path));
    if (!hasReadme && snapshot.total > 3) {
      this.emit("opportunity", {
        type: "no-readme",
        message: "El proyecto no tiene README",
        action: "crear-readme",
        severity: "info"
      });
    }

    // 4) Falta gitignore
    const hasGitignore = snapshot.files.some(f => f.path.endsWith(".gitignore"));
    if (!hasGitignore && snapshot.total > 3) {
      this.emit("opportunity", {
        type: "no-gitignore",
        message: "Falta .gitignore",
        action: "crear-gitignore",
        severity: "info"
      });
    }

    // 5) Muchos archivos en raiz (>15)
    const rootFiles = snapshot.files.filter(f => {
      const rel = f.path.replace(snapshot.diskFolder, "").replace(/^[\\\/]/, "");
      return !rel.includes("\\") && !rel.includes("/");
    });
    if (rootFiles.length > 15) {
      this.emit("opportunity", {
        type: "cluttered-root",
        message: rootFiles.length + " archivos sueltos en la raiz (considera organizar)",
        action: "organize",
        severity: "warn"
      });
    }
  }
}