// ============================================================
//  GafCoreAI - Global Search (Ctrl+Shift+F)
// ============================================================
import { Desktop } from "./desktop.js";

export class GlobalSearch {
  constructor({ state, log }) {
    this.state = state;
    this.log = log || console.log;
    this.el = null;
    this.results = [];
  }

  init() {
    this.buildUI();
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        this.open();
      }
      if (e.key === "Escape" && this.el && !this.el.classList.contains("hidden")) {
        this.close();
      }
    });
  }

  buildUI() {
    const el = document.createElement("div");
    el.id = "global-search";
    el.className = "global-search hidden";
    el.innerHTML = `
      <div class="gs-box">
        <div class="gs-head">
          <input type="text" id="gs-query" placeholder="Buscar en el proyecto..." autocomplete="off" />
          <label class="gs-opt"><input type="checkbox" id="gs-case" /> Mayus</label>
          <label class="gs-opt"><input type="checkbox" id="gs-regex" /> Regex</label>
          <button class="btn primary small" id="gs-go">Buscar</button>
          <button class="btn ghost small" id="gs-close">×</button>
        </div>
        <div id="gs-results" class="gs-results"></div>
        <div class="gs-status" id="gs-status"></div>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;

    const input = el.querySelector("#gs-query");
    input.onkeydown = (e) => { if (e.key === "Enter") this.search(); };
    el.querySelector("#gs-go").onclick = () => this.search();
    el.querySelector("#gs-close").onclick = () => this.close();
    el.querySelector("#gs-case").onchange = () => this.search();
    el.querySelector("#gs-regex").onchange = () => this.search();
  }

  open() {
    this.el.classList.remove("hidden");
    setTimeout(() => this.el.querySelector("#gs-query").focus(), 50);
  }

  close() {
    this.el.classList.add("hidden");
  }

  async search() {
    const query = this.el.querySelector("#gs-query").value;
    if (!query) return;

    const caseSensitive = this.el.querySelector("#gs-case").checked;
    const useRegex = this.el.querySelector("#gs-regex").checked;

    this.el.querySelector("#gs-status").textContent = "Buscando...";
    this.results = [];

    let matcher;
    try {
      if (useRegex) {
        matcher = new RegExp(query, caseSensitive ? "g" : "gi");
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        matcher = new RegExp(escaped, caseSensitive ? "g" : "gi");
      }
    } catch (e) {
      this.el.querySelector("#gs-status").textContent = "Regex invalido: " + e.message;
      return;
    }

    // 1) Buscar en archivos del proyecto (memoria)
    if (this.state.projectFiles) {
      Object.keys(this.state.projectFiles).forEach(path => {
        this.searchInContent(path, this.state.projectFiles[path], matcher);
      });
    }

    // 2) Buscar en disco si esta abierto
    if (this.state.diskFolder && Desktop.isDesktop()) {
      try {
        await this.searchDisk(this.state.diskFolder, matcher, 0);
      } catch (e) {}
    }

    // Render
    this.render();
    this.el.querySelector("#gs-status").textContent =
      this.results.length + " resultados en " + new Set(this.results.map(r => r.path)).size + " archivos";
  }

  searchInContent(path, content, matcher) {
    const lines = String(content).split("\n");
    lines.forEach((line, i) => {
      matcher.lastIndex = 0;
      if (matcher.test(line)) {
        this.results.push({ path, line: i + 1, text: line.trim() });
      }
    });
  }

  async searchDisk(dir, matcher, depth) {
    if (depth > 4 || this.results.length > 500) return;
    const entries = await Desktop.invoke("list_dir", { path: dir });
    for (const e of entries) {
      if (this.results.length > 500) return;
      const name = e.name || "";
      if (name === "node_modules" || name === ".git" || name === "target" ||
          name === "dist" || name === "build" || name === ".next") continue;
      if (e.is_dir) {
        await this.searchDisk(e.path, matcher, depth + 1);
      } else if (e.is_file && e.size < 500000 && /\.(js|jsx|ts|tsx|html|css|md|json|py|rb|go|rs|sh|yml|yaml)$/i.test(name)) {
        try {
          const content = await Desktop.invoke("read_file", { path: e.path });
          this.searchInContent(e.path, content, matcher);
        } catch (err) {}
      }
    }
  }

  render() {
    const box = this.el.querySelector("#gs-results");
    box.innerHTML = "";
    if (!this.results.length) {
      box.innerHTML = '<div class="gs-empty">Sin resultados</div>';
      return;
    }
    const byFile = {};
    this.results.slice(0, 200).forEach(r => {
      if (!byFile[r.path]) byFile[r.path] = [];
      byFile[r.path].push(r);
    });

    Object.keys(byFile).forEach(path => {
      const group = document.createElement("div");
      group.className = "gs-group";
      group.innerHTML = '<div class="gs-file">📄 ' + path + ' <span class="gs-count">' + byFile[path].length + '</span></div>';
      byFile[path].forEach(r => {
        const line = document.createElement("div");
        line.className = "gs-line";
        line.innerHTML =
          '<span class="gs-num">' + r.line + '</span>' +
          '<span class="gs-text">' + this.escape(r.text.slice(0, 200)) + '</span>';
        line.onclick = () => {
          this.close();
          const fn = window.__gafOpenFileAtLine;
          if (fn) fn(path, r.line);
        };
        group.appendChild(line);
      });
      box.appendChild(group);
    });
  }

  escape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}