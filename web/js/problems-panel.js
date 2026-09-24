// ============================================================
//  GafCoreAI - Problems Panel
//  Agrega todos los diagnosticos: LSP + analisis + tests
// ============================================================

export class ProblemsPanel {
  constructor({ log, onOpen }) {
    this.log = log || console.log;
    this.onOpen = onOpen || (() => {});
    this.problems = new Map(); // key -> { path, line, col, severity, source, message }
    this.el = null;
  }

  init() {
    this.buildUI();
  }

  buildUI() {
    const el = document.createElement("div");
    el.id = "problems-panel";
    el.className = "problems-panel hidden";
    el.innerHTML = `
      <div class="pp-head">
        <span>&#9888; Problemas <span id="pp-count">0</span></span>
        <div style="display:flex;gap:6px">
          <button class="btn ghost small" id="pp-clear">Limpiar</button>
          <button class="btn ghost small" id="pp-close">×</button>
        </div>
      </div>
      <div id="pp-list" class="pp-list"></div>
    `;
    document.body.appendChild(el);
    this.el = el;
    el.querySelector("#pp-close").onclick = () => this.close();
    el.querySelector("#pp-clear").onclick = () => { this.problems.clear(); this.render(); };
  }

  add(key, problem) {
    this.problems.set(key, problem);
    this.render();
    this.updateBadge();
  }

  remove(key) {
    this.problems.delete(key);
    this.render();
    this.updateBadge();
  }

  /**
   * Reemplaza todos los problemas de una fuente+path (util para LSP)
   */
  replaceBySource(source, path, problems) {
    // Borrar los previos de esa fuente+path
    for (const [k, p] of this.problems.entries()) {
      if (p.source === source && p.path === path) this.problems.delete(k);
    }
    // Agregar nuevos
    problems.forEach((p, i) => {
      const key = source + "::" + path + "::" + i;
      this.problems.set(key, p);
    });
    this.render();
    this.updateBadge();
  }

  render() {
    const list = this.el.querySelector("#pp-list");
    list.innerHTML = "";
    if (!this.problems.size) {
      list.innerHTML = '<div class="pp-empty">Sin problemas detectados</div>';
      return;
    }
    // Ordenar por severidad
    const arr = Array.from(this.problems.values()).sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2, hint: 3 };
      return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    });

    const byFile = {};
    arr.forEach(p => {
      if (!byFile[p.path]) byFile[p.path] = [];
      byFile[p.path].push(p);
    });

    Object.keys(byFile).forEach(path => {
      const group = document.createElement("div");
      group.className = "pp-group";
      group.innerHTML = '<div class="pp-file">📄 ' + path + ' <span class="pp-count">' + byFile[path].length + '</span></div>';
      byFile[path].forEach(p => {
        const line = document.createElement("div");
        line.className = "pp-line pp-" + p.severity;
        const icon = p.severity === "error" ? "🔴" :
                     p.severity === "warning" ? "🟡" :
                     p.severity === "info" ? "🔵" : "⚪";
        line.innerHTML =
          '<span class="pp-icon">' + icon + '</span>' +
          '<span class="pp-msg">' + this.escape(p.message) + '</span>' +
          '<span class="pp-loc">' + (p.line || 0) + ":" + (p.col || 0) + '</span>' +
          '<span class="pp-src">' + (p.source || "") + '</span>';
        line.onclick = () => this.onOpen(p.path, p.line);
        group.appendChild(line);
      });
      list.appendChild(group);
    });
  }

  updateBadge() {
    const count = this.problems.size;
    const badge = document.getElementById("pp-count");
    if (badge) badge.textContent = count;

    // Actualizar el badge del boton toolbar
    let btn = document.getElementById("btn-problems");
    if (btn) {
      if (count > 0) {
        btn.classList.add("has-problems");
        btn.innerHTML = "&#9888; " + count;
      } else {
        btn.classList.remove("has-problems");
        btn.innerHTML = "&#9888; 0";
      }
    }
  }

  open() { this.el.classList.remove("hidden"); }
  close() { this.el.classList.add("hidden"); }

  toggle() {
    if (this.el.classList.contains("hidden")) this.open();
    else this.close();
  }

  escape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}