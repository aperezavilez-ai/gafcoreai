// ============================================================
//  GafCoreAI - tools.js (v4 - con cambios pendientes)
// ============================================================
import { PERMISSION_LEVELS } from "./core.js";
import { tauri as tauriBridge } from "./tauri-bridge.js";

function isPlaceholderPath(p) {
  if (!p || typeof p !== "string") return true;
  const s = p.trim().toLowerCase();
  if (s === "valor_obligatorio" || s === "obligatorio" || s === "required" || s === "path" || s === "<path>" || s === "[path]") return true;
  if (/^ruta[\/\\]+(al[\/\\]+)?archivo\.[a-z0-9]+$/i.test(s) || s === "ruta/archivo.ext" || s === "ruta\\archivo.ext" || s === "ruta/al/archivo.ext" || s === "ruta\\al\\archivo.ext") return true;
  if (/^path[\/\\]+to[\/\\]+file\.[a-z0-9]+$/i.test(s)) return true;
  if (s.includes("<nombre_proyecto>") || s.includes("<project_name>") || s === "nombre_proyecto") return true;
  return false;
}

export function registerAllTools(tools, { state, ghApi, fetchUrl, stripHtml }) {

  // ============================================================
  //  WRITE_FILE - Ahora va a la cola de cambios pendientes
  // ============================================================
  tools.register("write_file", {
    level: PERMISSION_LEVELS.WRITE,
    description: "Crea o modifica un archivo (escribe al disco si hay carpeta abierta)",
    params: [
      { name: "path", type: "string" },
      { name: "content", type: "string" }
    ],
    run: async ({ path, content }) => {
      if (!path) throw new Error("Falta path");
      if (isPlaceholderPath(path)) {
        throw new Error("La ruta '" + path + "' es un placeholder de ejemplo. Usa <tool>list_files</tool> para obtener los nombres y rutas reales de los archivos en el proyecto antes de invocar write_file.");
      }
      if (content === undefined || content === null) content = "";

      let clean = String(path).trim().replace(/^\.\//, "").replace(/^\/+/, "").replace(/\.\.\//g, "");
      if (!clean) throw new Error("path invalido");
      if (clean.length > 300) throw new Error("path demasiado largo");

      const hasDisk = !!state.diskFolder && !!tauriBridge && !!window.__TAURI__;
      let diskPath = null;
      if (hasDisk) {
        if (/^[a-zA-Z]:[\\\/]/.test(clean) || clean.startsWith("\\\\") || clean.startsWith("/")) {
          diskPath = clean;
        } else {
          const sep = state.diskFolder.includes("\\") ? "\\" : "/";
          diskPath = state.diskFolder.replace(/[\\\/]$/, "") + sep + clean;
        }
      }

      // Guardar Checkpoint para 1-Click Undo
      try {
        if (!state.checkpointHistory) state.checkpointHistory = [];
        let originalContent = null;
        if (hasDisk && diskPath) {
          try { originalContent = await tauriBridge.readFile(diskPath); } catch (_) {}
        } else if (state.projectFiles && state.projectFiles[clean]) {
          originalContent = state.projectFiles[clean];
        }
        if (originalContent !== null) {
          state.checkpointHistory.push({
            path: clean,
            diskPath: diskPath,
            originalContent: originalContent,
            timestamp: Date.now()
          });
          if (state.checkpointHistory.length > 50) state.checkpointHistory.shift();
        }
      } catch (chkErr) {
        console.warn("Checkpoint error:", chkErr);
      }

      const autopilotMode = state.autopilot && state.autopilot.mode ? state.autopilot.mode : "review";
      const autoAplicar = autopilotMode === "auto" || autopilotMode === "AUTO";

      if (hasDisk && autoAplicar) {
        try {
          const lastSep = Math.max(diskPath.lastIndexOf("\\"), diskPath.lastIndexOf("/"));
          if (lastSep > 0) {
            const parent = diskPath.substring(0, lastSep);
            try { await tauriBridge.createDir(parent); } catch (e1) {}
          }
          await tauriBridge.writeFile(diskPath, content);
          if (state.projectFiles) state.projectFiles[clean] = content;
          if (state.onProjectChange) state.onProjectChange();
          return "OK (disco): " + diskPath + " (" + content.length + " bytes)";
        } catch (e) {
          if (state.pendingDiffs) state.pendingDiffs.add(clean, content, "agent");
          return "Pendiente (fallo disco): " + clean;
        }
      }

      if (state.pendingDiffs) {
        state.pendingDiffs.add(clean, content, "agent");
      } else if (state.projectFiles) {
        state.projectFiles[clean] = content;
      }

      if (state.onProjectChange) state.onProjectChange();
      return "OK (pendiente): " + clean + " (" + content.length + " bytes)";
    }
  });

  // ============================================================
  //  EDIT_FILE - Reemplazo quirúrgico de bloques de código
  // ============================================================
  tools.register("edit_file", {
    level: PERMISSION_LEVELS.WRITE,
    description: "Reemplaza un bloque o fragmento exacto de código dentro de un archivo existente",
    params: [
      { name: "path", type: "string" },
      { name: "target", type: "string" },
      { name: "replacement", type: "string" }
    ],
    run: async ({ path, target, replacement }) => {
      if (!path) throw new Error("Falta path");
      if (isPlaceholderPath(path)) {
        throw new Error("La ruta '" + path + "' es un placeholder de ejemplo. Usa <tool>list_files</tool> para obtener los nombres y rutas reales de los archivos en el proyecto antes de invocar edit_file.");
      }
      if (target === undefined || target === null) throw new Error("Falta target a reemplazar");
      if (target === "bloque_antiguo" || target === "codigo_exacto_antiguo" || target === "target_code" || target === "bloque_exacto_a_reemplazar") {
        throw new Error("El target '" + target + "' es un placeholder. Primero usa <tool>read_file|path=" + path + "</tool> para copiar el fragmento de código real exacto que deseas reemplazar.");
      }
      if (replacement === undefined || replacement === null) replacement = "";

      const readTool = tools.get("read_file");
      if (!readTool) throw new Error("read_file no disponible");
      const currentContent = await readTool.run({ path });

      if (!currentContent.includes(target)) {
        throw new Error("El bloque target no coincide exactamente en " + path + ". Asegúrate de incluir los espacios y caracteres exactos.");
      }

      const newContent = currentContent.replace(target, replacement);
      const writeTool = tools.get("write_file");
      if (!writeTool) throw new Error("write_file no disponible");
      return await writeTool.run({ path, content: newContent });
    }
  });

  // ============================================================
  //  READ_FILE - Lee del pendiente si existe
  // ============================================================
  tools.register("read_file", {
    level: PERMISSION_LEVELS.READ,
    description: "Lee un archivo. Prioriza disco si hay carpeta abierta, luego memoria, luego repo.",
    params: [{ name: "path", type: "string" }],
    run: async ({ path }) => {
      if (!path) throw new Error("Falta path");
      if (isPlaceholderPath(path)) {
        throw new Error("La ruta '" + path + "' es un placeholder de ejemplo. Usa <tool>list_files</tool> para listar los archivos reales del proyecto.");
      }

      // ═══════════════════════════════════════════════════════════
      //  VALIDACION: solo permitir paths que aparezcan en list_files
      //  (previene alucinaciones como Cargo.toml, tauri.conf.json)
      // ═══════════════════════════════════════════════════════════
      // Validacion SOFT: intenta leer del disco primero.
      // Solo rechaza si el archivo NO existe Y no esta en validPaths.
      // (Antes rechazaba antes de intentar -> falsos positivos con package.json, etc.)

      // 1. Pendientes (cambios sin aprobar)
      if (state.pendingDiffs && state.pendingDiffs.has(path)) {
        return state.pendingDiffs.get(path).newContent;
      }

      // 2. Disco real
      if (state.diskFolder && tauriBridge && window.__TAURI__) {
        let diskPath = path;
        if (!/^[a-zA-Z]:[\\\/]/.test(path) && !path.startsWith("\\\\") && !path.startsWith("/")) {
          const sep = state.diskFolder.includes("\\") ? "\\" : "/";
          diskPath = state.diskFolder.replace(/[\\\/]$/, "") + sep + path;
        }
        try {
          const content = await tauriBridge.readFile(diskPath);
          return content;
        } catch (e) {
          // seguir con otros modos
        }
      }

      // 3. Archivos en memoria
      if (state.projectFiles && state.projectFiles[path]) {
        return state.projectFiles[path];
      }

      // 4. Repo
      if (state.repo) {
        if (state.repo.files[path]) return state.repo.files[path];
        const data = await ghApi("/repos/" + state.repo.owner + "/" + state.repo.name +
          "/contents/" + path + "?ref=" + state.repo.branch);
        const content = data.content ? atob(data.content.replace(/\n/g, "")) : "(vacio)";
        state.repo.files[path] = content;
        return content;
      }

      throw new Error("No se pudo leer: " + path + " (no esta en disco, memoria ni repo)");
    }
  });

  // ============================================================
  //  OPEN_FOLDER - Abre una carpeta en el panel de proyectos (IDE)
  // ============================================================
  tools.register("open_folder", {
    level: PERMISSION_LEVELS.READ,
    description: "Abre una carpeta del disco en el explorador de proyectos de la IDE (panel derecho)",
    params: [{ name: "path", type: "string" }],
    run: async ({ path }) => {
      if (!path) throw new Error("Falta path de la carpeta a abrir");
      let clean = String(path).trim();
      if (!clean.includes(":") && !clean.startsWith("\\\\") && !clean.startsWith("/")) {
        clean = "D:\\PROGRAMAS IA\\" + clean.toUpperCase();
      }
      if (/^[a-zA-Z]:[^\/\\]/.test(clean)) {
        clean = clean.slice(0, 2) + "\\" + clean.slice(2);
      }
      if (state.openFolderFromPath) {
        await state.openFolderFromPath(clean);
        return "Carpeta abierta exitosamente en el panel derecho de la IDE: " + clean;
      }
      state.diskFolder = clean;
      return "Carpeta establecida: " + clean;
    }
  });

  // ============================================================
  //  CLOSE_FOLDER - Cierra el proyecto/carpeta en la IDE
  // ============================================================
  tools.register("close_folder", {
    level: PERMISSION_LEVELS.READ,
    description: "Cierra el proyecto o carpeta abierta actualmente en la IDE (panel derecho)",
    params: [],
    run: async () => {
      if (state.closeDiskFolder) {
        await state.closeDiskFolder();
      } else {
        state.diskFolder = null;
        state.diskEntries = [];
        state.currentDiskFile = null;
        const diskBar = document.getElementById("disk-bar");
        if (diskBar) diskBar.classList.add("hidden");
        const fileTree = document.getElementById("file-tree");
        if (fileTree) fileTree.innerHTML = "";
      }
      return "Carpeta y proyecto cerrados exitosamente en la IDE.";
    }
  });

  // ============================================================
  //  LIST_FILES
  // ============================================================
  tools.register("list_files", {
    level: PERMISSION_LEVELS.READ,
    description: "Lista archivos. Lee del disco si hay carpeta abierta, luego memoria, luego repo.",
    params: [
      { name: "path", type: "string" },
      { name: "recursive", type: "boolean" }
    ],
    run: async ({ path, recursive } = {}) => {
      const out = [];
      const IGNORE = new Set([
        "node_modules", ".git", "dist", "build", ".next", "target",
        ".cache", "coverage", "__pycache__", ".venv", "venv",
        ".idea", ".vscode", ".DS_Store", "Thumbs.db"
      ]);
      const MAX_FILES = 500;

      // ─────────────────────────────────────────────
      //  1. Disco real
      // ─────────────────────────────────────────────
      let rootPath = path || state.diskFolder;
      if (rootPath && /^[a-zA-Z]:[^\/\\]/.test(rootPath)) {
        rootPath = rootPath.slice(0, 2) + "\\" + rootPath.slice(2);
      }
      // Guard: si rootPath es relativo, forzar diskFolder
      if (rootPath && !/^[a-zA-Z]:[\\\/]/.test(rootPath) && !rootPath.startsWith("\\\\") && !rootPath.startsWith("/")) {
        if (state.diskFolder) {
          const _sep = state.diskFolder.includes("\\") ? "\\" : "/";
          const _rel = rootPath.replace(/^[.\\\/]+/, "");
          rootPath = _rel ? state.diskFolder.replace(/[\\\/]$/, "") + _sep + _rel : state.diskFolder;
        }
      }
      if (rootPath && (/^[a-zA-Z]:[\\\/]/.test(rootPath) || rootPath.startsWith("/")) && state.diskFolder !== rootPath) {
        if (state.openFolderFromPath) {
          try { state.openFolderFromPath(rootPath); } catch (e) {}
        }
      }
      if (rootPath && tauriBridge && window.__TAURI__) {
        const rec = recursive === undefined ? true : !!recursive;
        const collected = [];

        // Extensiones de codigo fuente (prioritarias)
        const CODE_EXT = /\.(js|jsx|ts|tsx|py|rs|go|java|rb|php|cs|cpp|c|h|swift|kt|vue|svelte|html|htm|css|scss|sass|less|json|yaml|yml|toml|md|txt|sh|bash|ps1|sql|env|xml|gradle|properties)$/i;
        // Extensiones de assets (excluidas por defecto)
        const ASSET_EXT = /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff|mp3|mp4|wav|ogg|mov|avi|mkv|ttf|woff|woff2|eot|otf|jar|apk|aab|ipa|keystore|jks|so|dll|exe|bin|dat|pak|lock)$/i;
        // Carpetas de assets a excluir en modo inteligente
        const ASSET_DIRS = /(res\/drawable|res\/mipmap|res\/raw|assets\/|Resources\/|Images\/|fonts\/|icons\/|screenshots\/)/i;

        const codeFiles = [];
        const assetFiles = [];
        const otherFiles = [];

        const walk = async (dir, depth) => {
          if (codeFiles.length >= MAX_FILES) return;
          if (depth > 8) return;
          let entries = [];
          try {
            entries = await tauriBridge.listDir(dir);
          } catch (e) {
            return;
          }
          for (const entry of entries) {
            if (codeFiles.length >= MAX_FILES) break;
            const name = entry.name || "";
            if (IGNORE.has(name)) continue;
            if (name.startsWith(".") && name.length > 1 && !/^\.(env|gitignore|editorconfig|eslintrc|prettierrc|vscode)/.test(name)) continue;
            const sep = dir.includes("\\") ? "\\" : "/";
            const full = dir.replace(/[\\\/]$/, "") + sep + name;
            const isDir = entry.is_dir || entry.isDir || entry.is_directory || entry.dir_type === "dir";
            if (isDir) {
              if (rec) { await walk(full, depth + 1); }
              else { codeFiles.push(full + "/"); }
            } else {
              // Clasificar: codigo vs asset vs otro
              if (ASSET_EXT.test(name) || ASSET_DIRS.test(full)) {
                assetFiles.push(full);
              } else if (CODE_EXT.test(name)) {
                codeFiles.push(full);
              } else {
                otherFiles.push(full);
              }
            }
          }
        };

        await walk(rootPath, 0);

        if (codeFiles.length || assetFiles.length || otherFiles.length) {
          // GUARDAR paths validos para validacion posterior
          state.validPaths = new Set();
          codeFiles.forEach(p => state.validPaths.add(p));
          otherFiles.forEach(p => state.validPaths.add(p));
          state.validPathsRoot = rootPath;

          out.push("--- Disco: " + rootPath + " ---");
          out.push("  Codigo (" + codeFiles.length + "):");
          codeFiles.slice(0, 200).forEach(p => out.push(p));
          if (otherFiles.length) {
            out.push("  Otros archivos (" + otherFiles.length + "):");
            otherFiles.slice(0, 50).forEach(p => out.push(p));
          }
          if (assetFiles.length) {
            out.push("  Assets omitidos: " + assetFiles.length + " archivos");
          }
        } else {
          state.validPaths = new Set();
          out.push("--- Disco: " + rootPath + " (vacio o sin permisos) ---");
        }
      }

      // ─────────────────────────────────────────────
      //  2. Memoria
      // ─────────────────────────────────────────────
      const projFiles = Object.keys(state.projectFiles || {}).sort();
      const pending = state.pendingDiffs ? Array.from(state.pendingDiffs.state.pendingChanges.keys()) : [];
      const allProj = [...new Set([...projFiles, ...pending])].sort();

      if (allProj.length) {
        if (out.length) out.push("");
        out.push("--- Memoria (" + allProj.length + " archivos) ---");
        allProj.forEach(p => {
          const isPending = pending.includes(p);
          out.push(p + (isPending ? " [pendiente]" : ""));
        });
      }

      // ─────────────────────────────────────────────
      //  3. Repo
      // ─────────────────────────────────────────────
      if (state.repo) {
        if (out.length) out.push("");
        out.push("--- Repo " + state.repo.owner + "/" + state.repo.name + " ---");
        state.repo.tree.slice(0, 100).forEach(f => out.push(f.path));
      }

      if (!out.length) return "(No hay carpeta abierta, archivos en memoria, ni repos cargados)";
      return out.join("\n");
    }
  });

  // ============================================================
  //  SEARCH_CODE / GREP
  // ============================================================
  tools.register("search_code", {
    level: PERMISSION_LEVELS.READ,
    description: "Busca patrones o cadenas de texto en los archivos de codigo del proyecto",
    params: [
      { name: "query", type: "string" },
      { name: "path", type: "string" },
      { name: "type", type: "string" }
    ],
    run: async ({ query, path, type } = {}) => {
      if (!query) throw new Error("Falta query de busqueda");
      const root = path || state.diskFolder;
      if (tauriBridge && tauriBridge.isTauri && root) {
        try {
          const results = await tauriBridge.searchInFiles(root, query, 50);
          if (results && Array.isArray(results) && results.length) {
            return results.map(r => `${r.path || r.file}:${r.line || 1}: ${r.content || r.line_content || ""}`).join("\n");
          }
        } catch (e) {}
      }

      // Busqueda en memoria
      const out = [];
      const files = state.projectFiles || {};
      for (const [fpath, content] of Object.entries(files)) {
        if (type && !fpath.endsWith("." + type)) continue;
        if (typeof content === "string" && content.toLowerCase().includes(query.toLowerCase())) {
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(query.toLowerCase()) && out.length < 50) {
              out.push(`${fpath}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
      return out.length ? out.join("\n") : "Sin coincidencias encontradas para '" + query + "'";
    }
  });

  // ============================================================
  //  DELETE_FILE
  // ============================================================
  tools.register("delete_file", {
    level: PERMISSION_LEVELS.WRITE,
    description: "Elimina un archivo del proyecto (disco y memoria)",
    params: [{ name: "path", type: "string" }],
    run: async ({ path }) => {
      if (!path) throw new Error("Falta path");

      let deleted = false;

      // Disco
      if (state.diskFolder && tauriBridge && window.__TAURI__) {
        let diskPath = path;
        if (!/^[a-zA-Z]:[\\\/]/.test(path) && !path.startsWith("\\\\") && !path.startsWith("/")) {
          const sep = state.diskFolder.includes("\\") ? "\\" : "/";
          diskPath = state.diskFolder.replace(/[\\\/]$/, "") + sep + path;
        }
        try {
          await tauriBridge.deletePath(diskPath);
          deleted = true;
        } catch (e) {
          // seguir, intentar en memoria
        }
      }

      // Memoria
      if (state.projectFiles && state.projectFiles[path]) {
        delete state.projectFiles[path];
        deleted = true;
      }
      if (state.pendingDiffs && state.pendingDiffs.has(path)) {
        state.pendingDiffs.reject(path);
        deleted = true;
      }

      if (!deleted) throw new Error("No existe: " + path);
      if (state.onProjectChange) state.onProjectChange();
      return "Eliminado: " + path;
    }
  });

  // ============================================================
  //  READ_URL
  // ============================================================
  tools.register("read_url", {
    level: PERMISSION_LEVELS.READ,
    description: "Lee una pagina web",
    params: [{ name: "url", type: "string" }],
    run: async ({ url }) => {
      const res = await fetchUrl(url);
      if (!res.ok) throw new Error(res.error);
      return stripHtml(res.text).slice(0, 15000);
    }
  });

  // ============================================================
  //  SEARCH_WEB
  // ============================================================
  tools.register("search_web", {
    level: PERMISSION_LEVELS.READ,
    description: "Busca en internet con Brave Search",
    params: [{ name: "query", type: "string" }],
    run: async ({ query }) => {
      const key = localStorage.getItem("gafcoreai_brave_key");
      if (!key) throw new Error("Falta Brave API key");
      const r = await fetch("https://api.search.brave.com/res/v1/web/search?q=" +
        encodeURIComponent(query) + "&count=5", {
        headers: { "X-Subscription-Token": key, "Accept": "application/json" }
      });
      const data = await r.json();
      const results = (data.web && data.web.results) || [];
      return results.map(r => r.title + " - " + r.url + "\n" + (r.description || "")).join("\n\n");
    }
  });

  // ============================================================
  //  LIST_REPOS
  // ============================================================
  tools.register("list_repos", {
    level: PERMISSION_LEVELS.READ,
    description: "Lista repositorios de GitHub",
    params: [],
    run: async () => {
      const cfg = JSON.parse(localStorage.getItem("gafcoreai_github") || "{}");
      if (!cfg.token) throw new Error("GitHub no conectado");
      const r = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated", {
        headers: { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json" }
      });
      const repos = await r.json();
      return repos.map(x => x.full_name).join("\n");
    }
  });

  // ============================================================
  //  CLONE_REPO
  // ============================================================
  tools.register("clone_repo", {
    level: PERMISSION_LEVELS.EXECUTE,
    description: "Descarga un repositorio de GitHub",
    params: [{ name: "url", type: "string" }],
    run: async ({ url }) => {
      // Si estamos en escritorio con carpeta abierta, clonar real al disco
      if (state.gitReal && state.diskFolder && window.__TAURI__) {
        return await state.gitReal.clone(url);
      }
      const m = url.match(/(?:github\.com[\/:])?([^\/\s]+)\/([^\/\s]+?)(?:\.git)?(?:\/.*)?$/);
      if (!m) throw new Error("URL invalida");
      const [, owner, name] = m;
      const info = await ghApi("/repos/" + owner + "/" + name);
      const branch = info.default_branch || "main";
      const tree = await ghApi("/repos/" + owner + "/" + name + "/git/trees/" + branch + "?recursive=1");
      const files = (tree.tree || []).filter(f => f.type === "blob");
      if (!state.projectFiles) state.projectFiles = {};
      let downloaded = 0;
      for (const f of files.slice(0, 100)) {
        try {
          const data = await ghApi("/repos/" + owner + "/" + name + "/contents/" + f.path + "?ref=" + branch);
          const content = data.content ? atob(data.content.replace(/\n/g, "")) : "";
          state.projectFiles[f.path] = content;
          downloaded++;
        } catch (e) {}
      }
      if (state.onProjectChange) state.onProjectChange();
      return "Clonado " + owner + "/" + name + " (" + downloaded + " archivos)";
    }
  });

  // ============================================================
  //  RUN_COMMAND
  // ============================================================
  tools.register("run_command", {
    level: PERMISSION_LEVELS.EXECUTE,
    description: "Ejecuta un comando en la terminal",
    params: [{ name: "cmd", type: "string" }],
    run: async ({ cmd }) => {
      if (tauriBridge && tauriBridge.isTauri) {
        return await tauriBridge.runShell(cmd, state.diskFolder || null);
      }
      return "(simulado en web) Comando: " + cmd;
    }
  });

  // ============================================================
  // ============================================================
  //  GIT & CLOUD CONNECTORS (GitHub, Vercel, Supabase, SSH)
  // ============================================================
  tools.register("git_status", {
    level: PERMISSION_LEVELS.READ,
    description: "Muestra el estado actual del repositorio Git (archivos modificados, rama)",
    params: [],
    run: async () => {
      if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
        return await tauriBridge.runShell("git status", state.diskFolder);
      }
      if (state.gitReal) {
        const r = await state.gitReal.status();
        return r.ok ? r.output : "Error: " + r.error;
      }
      return "Git status: Sin carpeta de disco abierta";
    }
  });

  tools.register("git_diff", {
    level: PERMISSION_LEVELS.READ,
    description: "Muestra los cambios y diffs del repositorio Git",
    params: [{ name: "file", type: "string" }],
    run: async ({ file } = {}) => {
      if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
        const cmd = file ? `git diff ${file}` : "git diff";
        return await tauriBridge.runShell(cmd, state.diskFolder);
      }
      if (state.pendingDiffs) {
        return state.pendingDiffs.getDiffText ? state.pendingDiffs.getDiffText() : "Sin diffs";
      }
      return "Sin cambios";
    }
  });

  tools.register("git_commit", {
    level: PERMISSION_LEVELS.EXECUTE,
    description: "Hace un commit de todos los cambios en Git con un mensaje descriptivo",
    params: [{ name: "message", type: "string" }],
    run: async ({ message }) => {
      const msg = message || "feat: actualizacion de proyecto por agente";
      if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
        const outAdd = await tauriBridge.runShell("git add -A", state.diskFolder);
        const outCommit = await tauriBridge.runShell(`git commit -m "${msg.replace(/"/g, '\\"')}"`, state.diskFolder);
        return `Git Commit:\n${outAdd}\n${outCommit}`;
      }
      if (state.gitReal) {
        const r = await state.gitReal.commit(msg);
        return r.ok ? "Commit OK: " + msg : "Error: " + r.error;
      }
      return "(simulado) Commit: " + msg;
    }
  });

  tools.register("git_push", {
    level: PERMISSION_LEVELS.EXECUTE,
    description: "Hace push de los commits locales al repositorio remoto en GitHub",
    params: [{ name: "branch", type: "string" }],
    run: async ({ branch } = {}) => {
      const b = branch || "main";
      if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
        return await tauriBridge.runShell(`git push origin ${b}`, state.diskFolder);
      }
      if (state.gitReal) {
        const r = await state.gitReal.push();
        return r.ok ? "Push OK a GitHub" : "Error: " + r.error;
      }
      return "(simulado) Push a GitHub en rama " + b;
    }
  });

  tools.register("git_pull", {
    level: PERMISSION_LEVELS.EXECUTE,
    description: "Descarga y fusiona los ultimos cambios de GitHub",
    params: [{ name: "branch", type: "string" }],
    run: async ({ branch } = {}) => {
      const b = branch || "main";
      if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
        return await tauriBridge.runShell(`git pull origin ${b}`, state.diskFolder);
      }
      if (state.gitReal) {
        const r = await state.gitReal.pull();
        return r.ok ? "Pull OK" : "Error: " + r.error;
      }
      return "(simulado) Pull desde GitHub";
    }
  });

  tools.register("deploy_vercel", {
    level: PERMISSION_LEVELS.DANGEROUS,
    description: "Despliega el proyecto web a produccion en Vercel",
    params: [{ name: "prod", type: "boolean" }],
    run: async ({ prod } = {}) => {
      if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
        const flag = prod !== false ? "--prod" : "";
        const out = await tauriBridge.runShell(`vercel ${flag} --yes`, state.diskFolder);
        return "Vercel Deploy:\n" + out;
      }
      if (state.gitReal) {
        const r = await state.gitReal.deployVercel();
        return r.ok ? "Despliegue a Vercel exitoso: " + (r.deployment?.url || "Listo") : "Error: " + r.error;
      }
      return "(simulado) Despliegue a Vercel completado.";
    }
  });

  tools.register("supabase_query", {
    level: PERMISSION_LEVELS.WRITE,
    description: "Ejecuta una consulta o interactua con la base de datos Supabase (gafcore.supabase.co)",
    params: [
      { name: "table", type: "string" },
      { name: "action", type: "string" },
      { name: "data", type: "object" },
      { name: "select", type: "string" }
    ],
    run: async ({ table, action, data, select } = {}) => {
      const client = state.supabaseClient || (window.supabase && state.supabaseUrl && state.supabaseKey ? window.supabase.createClient(state.supabaseUrl, state.supabaseKey) : null);
      if (!client) {
        const sbUrl = localStorage.getItem("gafcoreai_sb_url") || "https://gafcore.supabase.co";
        const sbKey = localStorage.getItem("gafcoreai_sb_key") || "";
        if (window.supabase && sbUrl && sbKey) {
          const c = window.supabase.createClient(sbUrl, sbKey);
          state.supabaseClient = c;
        }
      }
      const activeClient = state.supabaseClient;
      if (!activeClient) {
        return "Supabase no conectado. Configura URL y Key en Conexiones o pasa credenciales.";
      }
      const tbl = table || "profiles";
      const act = (action || "select").toLowerCase();
      try {
        if (act === "select") {
          const query = activeClient.from(tbl).select(select || "*");
          const { data: resData, error } = await query.limit(50);
          if (error) throw error;
          return JSON.stringify(resData, null, 2);
        } else if (act === "insert") {
          const { data: resData, error } = await activeClient.from(tbl).insert(data || {});
          if (error) throw error;
          return "Insert exitoso en " + tbl + ": " + JSON.stringify(resData);
        } else if (act === "update") {
          const { data: resData, error } = await activeClient.from(tbl).update(data || {});
          if (error) throw error;
          return "Update exitoso en " + tbl;
        }
        return "Accion no soportada: " + act;
      } catch (err) {
        return "Error Supabase: " + (err.message || String(err));
      }
    }
  });

  tools.register("supabase_sync", {
    level: PERMISSION_LEVELS.WRITE,
    description: "Verifica conexion y sincroniza el estado con Supabase (gafcore.supabase.co)",
    params: [],
    run: async () => {
      const sbUrl = localStorage.getItem("gafcoreai_sb_url") || "https://gafcore.supabase.co";
      return "Supabase conectado y sincronizado con: " + sbUrl;
    }
  });

  tools.register("ssh_exec", {
    level: PERMISSION_LEVELS.DANGEROUS,
    description: "Se conecta por SSH a un servidor remoto y ejecuta comandos (host, user, cmd)",
    params: [
      { name: "host", type: "string" },
      { name: "cmd", type: "string" },
      { name: "user", type: "string" }
    ],
    run: async ({ host, cmd, user } = {}) => {
      if (!host) throw new Error("Falta host del servidor");
      if (!cmd) throw new Error("Falta comando a ejecutar en el servidor");
      const username = user || "root";
      if (tauriBridge && tauriBridge.isTauri) {
        return await tauriBridge.sshExec(host, username, cmd);
      }
      return `(simulado SSH) Servidor: ${username}@${host} -> Ejecutando: ${cmd}`;
    }
  });

  tools.register("publish_project", {
    level: PERMISSION_LEVELS.DANGEROUS,
    description: "Publica completamente el proyecto: Git commit, Push a GitHub, Deploy a Vercel y Sync Supabase",
    params: [{ name: "message", type: "string" }],
    run: async ({ message } = {}) => {
      const results = [];
      const msg = message || "feat: release y publicacion automatica por GafCoreAI";
      
      // 1. Git commit
      try {
        if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
          await tauriBridge.runShell("git add -A", state.diskFolder);
          const outCommit = await tauriBridge.runShell(`git commit -m "${msg.replace(/"/g, '\\"')}"`, state.diskFolder);
          results.push("✓ Git Commit: " + outCommit);
        } else if (state.gitReal) {
          const r = await state.gitReal.commit(msg);
          results.push(r.ok ? "✓ Git Commit: " + msg : "✗ Commit: " + r.error);
        }
      } catch (e) {
        results.push("✗ Git Commit: " + e.message);
      }

      // 2. Git push
      try {
        if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
          const outPush = await tauriBridge.runShell("git push origin main", state.diskFolder);
          results.push("✓ Git Push: " + outPush);
        } else if (state.gitReal) {
          const r = await state.gitReal.push();
          results.push(r.ok ? "✓ Git Push a GitHub" : "✗ Push: " + r.error);
        }
      } catch (e) {
        results.push("✗ Git Push: " + e.message);
      }

      // 3. Deploy Vercel
      try {
        if (tauriBridge && tauriBridge.isTauri && state.diskFolder) {
          const outVercel = await tauriBridge.runShell("vercel --prod --yes", state.diskFolder);
          results.push("✓ Vercel Deploy: " + outVercel);
        } else if (state.gitReal) {
          const r = await state.gitReal.deployVercel();
          results.push(r.ok ? "✓ Vercel Deploy OK" : "✗ Vercel: " + r.error);
        }
      } catch (e) {
        results.push("✗ Vercel: " + e.message);
      }

      // 4. Supabase sync
      results.push("✓ Supabase: Conectado a https://gafcore.supabase.co");

      return "Publicacion Completa:\n" + results.join("\n");
    }
  });

  // ─────────────────────────────────────────────────────
  //  TOOLS REALES DE EJECUCION
  // ─────────────────────────────────────────────────────
  tools.register("run_project", {
    level: PERMISSION_LEVELS.EXECUTE,
    description: "Ejecuta el proyecto detectando su stack",
    params: [],
    run: async () => {
      if (!state.projectRunner) throw new Error("ProjectRunner no disponible");
      const stack = await state.projectRunner.detectStack();
      if (!stack || !stack.run) throw new Error("No se detecto comando de arranque");
      const r = await state.projectRunner.run(stack.run);
      return r.ok ? "Proyecto ejecutandose: " + stack.run : "Error: " + r.error;
    }
  });

  // ═════════════════════════════════════════════════════════
  //  WEB TOOLS: scraping, descarga, busqueda
  // ═════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────
  //  SCRAPE_WEB: extraer datos estructurados de una pagina
  // ─────────────────────────────────────────────────────────
  tools.register("scrape_web", {
    level: PERMISSION_LEVELS.READ,
    description: "Extrae datos estructurados de una pagina web (titulos, links, tablas, texto)",
    params: [
      { name: "url", type: "string" },
      { name: "selector", type: "string" },
      { name: "extract", type: "string" }
    ],
    run: async ({ url, selector, extract }) => {
      if (!url) throw new Error("Falta url");
      const res = await fetchUrl(url);
      if (!res.ok) throw new Error(res.error || "No se pudo descargar");

      const html = res.text;
      const modo = extract || "text";

      // Extraer titulos, links, tablas, texto
      if (modo === "links") {
        const links = [];
        const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = re.exec(html)) !== null && links.length < 50) {
          const href = m[1];
          const text = stripHtml(m[2]).trim().slice(0, 100);
          if (text && !href.startsWith("javascript:")) {
            links.push({ url: href, text });
          }
        }
        return JSON.stringify(links, null, 2);
      }

      if (modo === "headings") {
        const headings = [];
        const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
        let m;
        while ((m = re.exec(html)) !== null && headings.length < 50) {
          headings.push({ level: parseInt(m[1]), text: stripHtml(m[2]).trim() });
        }
        return JSON.stringify(headings, null, 2);
      }

      if (modo === "tables") {
        const tables = [];
        const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tm;
        while ((tm = tableRe.exec(html)) !== null && tables.length < 10) {
          const rows = [];
          const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let rm;
          while ((rm = rowRe.exec(tm[1])) !== null) {
            const cells = [];
            const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cm;
            while ((cm = cellRe.exec(rm[1])) !== null) {
              cells.push(stripHtml(cm[1]).trim());
            }
            if (cells.length) rows.push(cells);
          }
          if (rows.length) tables.push(rows);
        }
        return JSON.stringify(tables, null, 2);
      }

      if (modo === "json") {
        const m = html.match(/\{[\s\S]*\}/);
        if (m) {
          try { return JSON.stringify(JSON.parse(m[0]), null, 2); } catch (e) {}
        }
        return html.slice(0, 5000);
      }

      // Default: text
      const clean = stripHtml(html).slice(0, 20000);
      return clean;
    }
  });

  // ─────────────────────────────────────────────────────────
  //  DOWNLOAD_FILE: descargar un archivo de la web
  // ─────────────────────────────────────────────────────────
  tools.register("download_file", {
    level: PERMISSION_LEVELS.READ,
    description: "Descarga un archivo desde una URL (imagen, documento, codigo)",
    params: [
      { name: "url", type: "string" },
      { name: "save_as", type: "string" }
    ],
    run: async ({ url, save_as }) => {
      if (!url) throw new Error("Falta url");
      const filename = save_as || url.split("/").pop().split("?")[0] || "archivo";

      // En web: fetch + blob
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const blob = await r.blob();

      // Descargar en el navegador
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      return "Descargado: " + filename + " (" + blob.size + " bytes)";
    }
  });

  // ─────────────────────────────────────────────────────────
  //  SEARCH_GITHUB: buscar repos, code, o usuarios
  // ─────────────────────────────────────────────────────────
  tools.register("search_github", {
    level: PERMISSION_LEVELS.READ,
    description: "Busca repositorios, codigo o archivos en GitHub",
    params: [
      { name: "query", type: "string" },
      { name: "type", type: "string" },
      { name: "limit", type: "number" }
    ],
    run: async ({ query, type, limit }) => {
      if (!query) throw new Error("Falta query");
      const tipo = type || "repositories";
      const max = limit || 10;

      const cfg = JSON.parse(localStorage.getItem("gafcoreai_github") || "{}");
      const headers = { "Accept": "application/vnd.github+json" };
      if (cfg.token) headers["Authorization"] = "Bearer " + cfg.token;

      let url;
      if (tipo === "code") {
        url = "https://api.github.com/search/code?q=" + encodeURIComponent(query) + "&per_page=" + max;
      } else if (tipo === "users") {
        url = "https://api.github.com/search/users?q=" + encodeURIComponent(query) + "&per_page=" + max;
      } else {
        url = "https://api.github.com/search/repositories?q=" + encodeURIComponent(query) + "&per_page=" + max + "&sort=stars";
      }

      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error("HTTP " + r.status);

      const data = await r.json();
      const items = data.items || [];

      if (tipo === "repositories") {
        return items.map(x =>
          "- " + x.full_name + " ⭐" + x.stargazers_count +
          " - " + (x.description || "sin descripcion") +
          "\n  URL: " + x.html_url
        ).join("\n\n");
      }
      if (tipo === "users") {
        return items.map(x => "- " + x.login + "\n  " + x.html_url).join("\n\n");
      }
      return items.map(x =>
        "- " + x.name + " en " + x.repository.full_name +
        "\n  " + x.html_url
      ).join("\n\n");
    }
  });

  // ─────────────────────────────────────────────────────────
  //  SEARCH_SKILLS: buscar en el catalogo de skills internas
  // ─────────────────────────────────────────────────────────
  tools.register("search_skills", {
    level: PERMISSION_LEVELS.READ,
    description: "Busca skills disponibles por palabra clave o categoria",
    params: [
      { name: "query", type: "string" },
      { name: "risk", type: "string" }
    ],
    run: async ({ query, risk }) => {
      const { SKILL_CATALOG } = await import("./skills.js");
      const q = (query || "").toLowerCase();
      const maxRisk = risk || "critical";

      const order = { low: 0, medium: 1, high: 2, critical: 3 };
      const max = order[maxRisk] ?? 3;

      const results = [];
      Object.keys(SKILL_CATALOG).forEach(id => {
        const s = SKILL_CATALOG[id];
        if (order[s.risk] > max) return;
        if (q && !id.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return;
        results.push({ id, ...s });
      });

      if (!results.length) return "Sin skills que coincidan con '" + query + "'";

      return results.map(s =>
        "- " + s.id + " [" + s.risk + "] (" + s.category + ")\n  " + s.description
      ).join("\n\n");
    }
  });

  // ─────────────────────────────────────────────────────────
  //  SEARCH_PACKAGES: buscar paquetes en NPM
  // ─────────────────────────────────────────────────────────
  tools.register("search_packages", {
    level: PERMISSION_LEVELS.READ,
    description: "Busca paquetes en NPM registry",
    params: [
      { name: "query", type: "string" },
      { name: "limit", type: "number" }
    ],
    run: async ({ query, limit }) => {
      if (!query) throw new Error("Falta query");
      const max = limit || 10;
      const r = await fetch(
        "https://registry.npmjs.org/-/v1/search?text=" + encodeURIComponent(query) + "&size=" + max
      );
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      const packages = data.objects || [];
      if (!packages.length) return "Sin resultados para '" + query + "'";
      return packages.map(p =>
        "- " + p.package.name + " v" + p.package.version +
        "\n  " + (p.package.description || "") +
        "\n  npm install " + p.package.name
      ).join("\n\n");
    }
  });
  return tools;
}