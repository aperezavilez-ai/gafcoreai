// ============================================================
//  GafCoreAI - Terminal interactiva (shell real PTY)
// ============================================================
import { tauri } from "./tauri-bridge.js";

export class TerminalInteractive {
  constructor({ log }) {
    this.log = log || console.log;
    this.term = null;
    this.fitAddon = null;
    this.spawned = false;
    this.termId = "main";
    this.unlistenOutput = null;
    this.unlistenExit = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return true;

    const container = document.getElementById("terminal-shell");
    if (!container) return false;

    if (!tauri.isTauri) {
      container.innerHTML =
        '<div style="padding:24px;color:#7d8794;font-family:Consolas,monospace;font-size:12px;line-height:1.7">' +
        '⚠  <b style="color:#f5a623">Shell interactiva solo en la version de escritorio (.exe)</b><br><br>' +
        'En la version web no es posible ejecutar comandos nativos por seguridad del navegador.<br>' +
        'Ejecuta el archivo <b>gafcoreai.exe</b> para tener la shell completa.<br><br>' +
        'Mientras tanto, la pestaña <b>Cerebro</b> sigue mostrando el trabajo del agente.'
        '</div>';
      this.initialized = true;
      return false;
    }

    if (typeof Terminal === "undefined") {
      container.innerHTML = '<div style="padding:20px;color:#ff5c5c;font-family:Consolas,monospace">xterm.js no cargo</div>';
      return false;
    }

    try {
      const term = new Terminal({
        fontFamily: "Consolas, 'Courier New', monospace",
        fontSize: 12.5,
        theme: {
          background: "#0b0d10",
          foreground: "#d4d4d4",
          cursor: "#7c5cff",
          selection: "#264f78"
        },
        cursorBlink: true,
        scrollback: 10000,
        convertEol: false,
        allowProposedApi: true
      });

      term.open(container);
      this.term = term;

      if (typeof FitAddon !== "undefined") {
        try {
          this.fitAddon = new FitAddon.FitAddon();
          term.loadAddon(this.fitAddon);
        } catch (e) { console.warn("FitAddon error:", e); }
      }

      // Mensaje de bienvenida
      term.writeln("\x1b[36m\x1b[1m  GafCoreAI Shell\x1b[0m  \x1b[2m- Terminal real de Windows\x1b[0m");
      term.writeln("\x1b[2m  Escribe comandos como en PowerShell normal.\x1b[0m");
      term.writeln("\x1b[2m  Ejemplos:  dir   ·   cd D:\PROGRAMAS IA   ·   git status   ·   npm install\x1b[0m");
      term.writeln("");
      term.writeln("\x1b[33m  [iniciando shell...]\x1b[0m");

      this.initialized = true;
      return true;
    } catch (e) {
      console.error("Terminal init error:", e);
      return false;
    }
  }

  async spawn(cwd) {
    if (!tauri.isTauri || !this.term) return false;
    if (this.spawned) {
      this.focus();
      return true;
    }

    try {
      await tauri.spawnTerminal(this.termId, cwd || null);
      this.spawned = true;

      // Conectar output del PTY → xterm
      this.unlistenOutput = await tauri.onTerminalOutput(this.termId, (data) => {
        if (this.term) this.term.write(data);
      });

      this.unlistenExit = await tauri.onTerminalExit(this.termId, () => {
        if (this.term) this.term.writeln("\r\n\x1b[33m[proceso terminado - recarga la app para reiniciar]\x1b[0m");
        this.spawned = false;
      });

      // Conectar input del usuario → PTY
      this.term.onData((data) => {
        tauri.writeTerminal(this.termId, data).catch((e) => {
          console.warn("write_terminal error:", e);
        });
      });

      // Conectar resize del editor → PTY
      this.term.onResize(({ rows, cols }) => {
        this.doResize(rows, cols);
      });

      // Ajustar al contenedor
      setTimeout(() => {
        this.fit();
        this.focus();
      }, 100);

      this.log("Shell interactiva iniciada en " + (cwd || "home"));
      return true;
    } catch (e) {
      if (this.term) {
        this.term.writeln("\r\n\x1b[31m✘ Error al iniciar shell: " + e.message + "\x1b[0m");
      }
      this.log("TerminalInteractive spawn error: " + e.message);
      return false;
    }
  }

  doResize(rows, cols) {
    if (!tauri.isTauri || !this.spawned) return;
    tauri.resizeTerminal(this.termId, rows, cols).catch((e) => {
      // Silencioso
    });
  }

  fit() {
    if (!this.fitAddon || !this.term) return;
    try {
      this.fitAddon.fit();
      const dims = this.fitAddon.proposeDimensions();
      if (dims && dims.rows && dims.cols) {
        this.doResize(dims.rows, dims.cols);
      }
    } catch (e) {}
  }

  focus() {
    if (this.term) this.term.focus();
  }

  clear() {
    if (this.term) this.term.clear();
  }

  async restart(cwd) {
    if (this.spawned) {
      try { await tauri.closeTerminal(this.termId); } catch (e) {}
    }
    if (this.unlistenOutput) { this.unlistenOutput(); this.unlistenOutput = null; }
    if (this.unlistenExit) { this.unlistenExit(); this.unlistenExit = null; }
    this.spawned = false;
    if (this.term) {
      this.term.writeln("\r\n\x1b[33m[reiniciando shell en: " + (cwd || "home") + "]\x1b[0m\r\n");
    }
    await this.spawn(cwd);
  }
}