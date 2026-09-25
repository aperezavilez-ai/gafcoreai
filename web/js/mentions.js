// ============================================================
//  GafCoreAI - Sistema de @-mentions
//  Autocompletado al escribir @ en el chat
// ============================================================
import { tauri } from "./tauri-bridge.js";

export class Mentions {
  constructor({ state, textarea, log, fetchUrl, stripHtml }) {
    this.state = state;
    this.textarea = textarea;
    this.log = log || console.log;
    this.fetchUrl = fetchUrl;
    this.stripHtml = stripHtml;
    this.dropdown = null;
    this.filtered = [];
    this.selectedIndex = 0;
    this.atPosition = -1;
    this.items = [];
    this.cache = new Map(); // path -> contenido
  }

  init() {
    if (!this.textarea) return;
    this.createDropdown();
    this.textarea.addEventListener("input", () => this.onInput());
    this.textarea.addEventListener("keydown", (e) => this.onKeydown(e));
    this.textarea.addEventListener("blur", () => {
      setTimeout(() => this.hide(), 150);
    });
    this.log("Mentions: registrado");
  }

  createDropdown() {
    const dd = document.createElement("div");
    dd.className = "mentions-dropdown hidden";
    dd.innerHTML = '<div class="mentions-list"></div>';
    document.body.appendChild(dd);
    this.dropdown = dd;
  }

  // ============================================================
  //  CONSTRUIR LISTA DE ITEMS (archivos + comandos)
  // ============================================================
  buildItems() {
    const items = [];

    // Comandos especiales
    items.push({ type: "cmd", id: "@codebase", label: "@codebase", hint: "Todo el proyecto (resumen)" });
    items.push({ type: "cmd", id: "@web", label: "@web", hint: "Leer una URL (abre el modal)" });
    items.push({ type: "cmd", id: "@search", label: "@search", hint: "Buscar en internet (Brave)" });

    // Archivos del disco (carpeta abierta)
    if (this.state.diskFolder && this.state.diskEntries) {
      this.state.diskEntries.forEach(entry => {
        if (entry.is_file) {
          items.push({
            type: "disk",
            id: entry.path,
            label: entry.name,
            hint: "Disco · " + this.shortPath(entry.path),
            path: entry.path
          });
        }
      });
    }

    // Archivos del proyecto del agente (en memoria)
    if (this.state.projectFiles) {
      Object.keys(this.state.projectFiles).forEach(p => {
        items.push({
          type: "project",
          id: p,
          label: p,
          hint: "Proyecto · " + this.state.projectFiles[p].length + " bytes",
          path: p
        });
      });
    }

    // Archivos del repo cargado
    if (this.state.repo && this.state.repo.tree) {
      this.state.repo.tree.slice(0, 300).forEach(f => {
        items.push({
          type: "repo",
          id: f.path,
          label: f.path,
          hint: "Repo · " + this.state.repo.owner + "/" + this.state.repo.name,
          path: f.path
        });
      });
    }

    return items;
  }

  shortPath(p) {
    if (!p) return "";
    const parts = p.split(/[\\\/]/);
    if (parts.length <= 3) return p;
    return ".../" + parts.slice(-3).join("/");
  }

  // ============================================================
  //  DETECTAR @ AL TECLEAR
  // ============================================================
  onInput() {
    const value = this.textarea.value;
    const cursor = this.textarea.selectionStart;

    // Buscar @ hacia atrás desde el cursor
    let atPos = -1;
    for (let i = cursor - 1; i >= 0; i--) {
      const ch = value[i];
      if (ch === "@") { atPos = i; break; }
      if (ch === " " || ch === "\n" || ch === "\t") break;
    }

    if (atPos === -1) {
      this.hide();
      return;
    }

    // Texto despues de @ hasta el cursor
    const query = value.slice(atPos + 1, cursor).toLowerCase();
    if (query.includes(" ") || query.includes("\n")) {
      this.hide();
      return;
    }

    // Construir items si es primera vez
    if (!this.items.length) {
      this.items = this.buildItems();
    }

    // Filtrar
    if (query.length === 0) {
      this.filtered = this.items.slice(0, 15);
    } else {
      this.filtered = this.items
        .filter(it => it.label.toLowerCase().includes(query) || it.id.toLowerCase().includes(query))
        .slice(0, 20);
    }

    if (!this.filtered.length) {
      this.hide();
      return;
    }

    this.atPosition = atPos;
    this.selectedIndex = 0;
    this.show();
  }

  // ============================================================
  //  NAVEGACION CON FLECHAS
  // ============================================================
  onKeydown(e) {
    if (!this.dropdown || this.dropdown.classList.contains("hidden")) return;

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
      e.stopPropagation();
      this.select(this.filtered[this.selectedIndex]);
    } else if (e.key === "Escape") {
      this.hide();
    } else if (e.key === "Tab") {
      e.preventDefault();
      this.select(this.filtered[this.selectedIndex]);
    }
  }

  // ============================================================
  //  MOSTRAR / OCULTAR
  // ============================================================
  show() {
    if (!this.dropdown) return;
    // Posicionar arriba del textarea
    const rect = this.textarea.getBoundingClientRect();
    this.dropdown.style.left = rect.left + "px";
    this.dropdown.style.bottom = (window.innerHeight - rect.top + 6) + "px";
    this.dropdown.style.width = Math.min(rect.width, 500) + "px";
    this.dropdown.classList.remove("hidden");
    this.render();
  }

  hide() {
    if (this.dropdown) this.dropdown.classList.add("hidden");
    this.atPosition = -1;
    this.filtered = [];
  }

  render() {
    if (!this.dropdown) return;
    const list = this.dropdown.querySelector(".mentions-list");
    list.innerHTML = "";

    this.filtered.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "mention-item" + (i === this.selectedIndex ? " selected" : "");
      const icon = item.type === "cmd" ? "✨"
                 : item.type === "disk" ? "💾"
                 : item.type === "project" ? "📦"
                 : item.type === "repo" ? "📚" : "📄";
      el.innerHTML =
        '<span class="mi-icon">' + icon + '</span>' +
        '<span class="mi-label">' + item.label + '</span>' +
        '<span class="mi-hint">' + item.hint + '</span>';
      el.onmousedown = (e) => { e.preventDefault(); this.select(item); };
      el.onmouseenter = () => {
        this.selectedIndex = i;
        this.render();
      };
      list.appendChild(el);
    });
  }

  // ============================================================
  //  SELECCIONAR UN ITEM
  // ============================================================
  select(item) {
    if (!item) return;

    if (item.type === "cmd") {
      if (item.id === "@web") {
        this.hide();
        document.getElementById("btn-url")?.click() || document.getElementById("tool-url")?.click();
        return;
      }
      if (item.id === "@search") {
        this.hide();
        document.getElementById("tool-search")?.click();
        return;
      }
      // @codebase → insertar y enviar
      this.insertText(item.id + " ");
      return;
    }

    // Archivo: insertar @ruta
    this.insertText("@" + item.id + " ");
    this.hide();
  }

  insertText(text) {
    const value = this.textarea.value;
    const cursor = this.textarea.selectionStart;

    // Reemplazar desde @ hasta el cursor
    const before = value.slice(0, this.atPosition);
    const after = value.slice(cursor);
    this.textarea.value = before + text + after;

    // Mover cursor al final del texto insertado
    const newPos = (before + text).length;
    this.textarea.setSelectionRange(newPos, newPos);
    this.textarea.focus();
  }

  // ============================================================
  //  PROCESAR MENTIONS AL ENVIAR
  //  Devuelve { text, attachments } con los archivos leidos
  // ============================================================
  async resolve(text) {
    const attachments = [];

    // 1) @codebase → resumen del proyecto
    if (text.includes("@codebase")) {
      const files = Object.keys(this.state.projectFiles || {});
      const repoFiles = this.state.repo ? this.state.repo.tree.slice(0, 100).map(f => f.path) : [];
      const all = [...new Set([...files, ...repoFiles])];
      if (all.length) {
        attachments.push({
          kind: "codebase",
          name: "@codebase (" + all.length + " archivos)",
          isImage: false,
          text: "ESTRUCTURA DEL PROYECTO:\n" + all.map(p => "  - " + p).join("\n")
        });
      }
      text = text.replace(/@codebase/g, "").trim();
    }

    // 2) @ruta/archivo.ext → leer contenido
    const re = /@([^\s@]+\.\w+)/g;
    let match;
    const paths = [];
    while ((match = re.exec(text)) !== null) {
      paths.push(match[1]);
    }

    for (const p of [...new Set(paths)]) {
      try {
        const content = await this.loadFileContent(p);
        if (content !== null) {
          attachments.push({
            kind: "file",
            name: p,
            isImage: false,
            text: "--- Archivo: " + p + " ---\n" + content.slice(0, 20000)
          });
        }
      } catch (e) {
        this.log("Error leyendo " + p + ": " + e.message);
      }
    }

    return { text, attachments };
  }

  // ============================================================
  //  CARGAR CONTENIDO (disco / proyecto / repo)
  // ============================================================
  async loadFileContent(path) {
    // Cache
    if (this.cache.has(path)) return this.cache.get(path);

    let content = null;

    // 1) Proyecto del agente
    if (this.state.projectFiles && this.state.projectFiles[path]) {
      content = this.state.projectFiles[path];
    }
    // 2) Disco
    else if (this.state.diskFolder) {
      try {
        const fullPath = (path.match(/^[A-Za-z]:|^\//)) ? path : (this.state.diskFolder.replace(/[\\\/]+$/, '') + '/' + path.replace(/^[\\\/]+/, ''));
        if (typeof tauri !== "undefined" && tauri.readFile) {
          content = await tauri.readFile(fullPath);
        } else if (typeof window.__TAURI__ !== "undefined") {
          content = await window.__TAURI__.core.invoke("read_file", { path: fullPath });
        }
      } catch (e) {
        content = null;
      }
    }
    // 3) Repo
    else if (this.state.repo) {
      try {
        if (this.state.repo.files[path]) {
          content = this.state.repo.files[path];
        } else {
          const cfg = JSON.parse(localStorage.getItem("gafcoreai_github") || "{}");
          const headers = { "Accept": "application/vnd.github+json" };
          if (cfg.token) headers["Authorization"] = "Bearer " + cfg.token;
          const url = "https://api.github.com/repos/" + this.state.repo.owner + "/" + this.state.repo.name +
            "/contents/" + path + "?ref=" + this.state.repo.branch;
          const r = await fetch(url, { headers });
          if (r.ok) {
            const data = await r.json();
            content = data.content ? atob(data.content.replace(/\n/g, "")) : "";
            this.state.repo.files[path] = content;
          }
        }
      } catch (e) {
        content = null;
      }
    }

    if (content !== null) {
      this.cache.set(path, content);
      if (this.cache.size > 100) {
        this.cache.delete(this.cache.keys().next().value);
      }
    }
    return content;
  }
}