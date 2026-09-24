// ============================================================
//  GafCoreAI - Command Palette (Ctrl+Shift+P)
// ============================================================

export class CommandPalette {
  constructor({ log }) {
    this.log = log || console.log;
    this.commands = [];
    this.filtered = [];
    this.selectedIndex = 0;
    this.visible = false;
    this.el = null;
  }

  /**
   * Registra un comando
   */
  register(id, label, hint, handler) {
    this.commands.push({ id, label, hint: hint || "", handler });
  }

  init() {
    this.buildUI();
    document.addEventListener("keydown", (e) => {
      // Ctrl+Shift+P o Cmd+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        this.open();
      }
      // Escape cierra
      if (e.key === "Escape" && this.visible) {
        this.close();
      }
    });
  }

  buildUI() {
    const el = document.createElement("div");
    el.id = "cmd-palette";
    el.className = "cmd-palette hidden";
    el.innerHTML = `
      <div class="cmd-palette-box">
        <input type="text" id="cmd-input" placeholder="Escribe un comando..." autocomplete="off" />
        <div id="cmd-list" class="cmd-list"></div>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;

    const input = el.querySelector("#cmd-input");
    input.oninput = () => this.filter(input.value);
    input.onkeydown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filtered.length - 1);
        this.render();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.render();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.execute();
      }
    };

    // Click fuera cierra
    el.onclick = (ev) => { if (ev.target === el) this.close(); };
  }

  open() {
    if (!this.el) return;
    this.visible = true;
    this.el.classList.remove("hidden");
    this.filtered = this.commands.slice();
    this.selectedIndex = 0;
    const input = this.el.querySelector("#cmd-input");
    input.value = "";
    input.focus();
    this.render();
  }

  close() {
    if (!this.el) return;
    this.visible = false;
    this.el.classList.add("hidden");
  }

  filter(query) {
    const q = (query || "").toLowerCase();
    if (!q) {
      this.filtered = this.commands.slice();
    } else {
      this.filtered = this.commands.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.hint.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
    this.render();
  }

  render() {
    const list = this.el.querySelector("#cmd-list");
    list.innerHTML = "";
    if (!this.filtered.length) {
      list.innerHTML = '<div class="cmd-empty">Sin resultados</div>';
      return;
    }
    this.filtered.slice(0, 30).forEach((c, i) => {
      const el = document.createElement("div");
      el.className = "cmd-item" + (i === this.selectedIndex ? " selected" : "");
      el.innerHTML =
        '<span class="cmd-label">' + c.label + '</span>' +
        (c.hint ? '<span class="cmd-hint">' + c.hint + '</span>' : "");
      el.onmouseenter = () => { this.selectedIndex = i; this.render(); };
      el.onclick = () => { this.selectedIndex = i; this.execute(); };
      list.appendChild(el);
    });
  }

  execute() {
    const cmd = this.filtered[this.selectedIndex];
    if (!cmd) return;
    this.close();
    try {
      cmd.handler();
    } catch (e) {
      this.log("Command error: " + e.message);
    }
  }
}