// ============================================================
//  GafCoreAI - Project Analyzer (analisis jerarquico de proyectos)
//  v1.2 - Modulo puro, SIN imports. Inyeccion via constructor.
//         Prioriza dirs de codigo, ignora dotfiles, reporta omitidos.
// ============================================================

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "target", "dist", "build", ".next", "out",
  ".cache", "coverage", "__pycache__", ".venv", "venv", "vendor",
  ".idea", ".vscode", ".DS_Store", "Thumbs.db", ".parcel-cache",
  ".turbo", ".svelte-kit", ".nuxt", "bower_components",
  "brain-seed", "docs", "documentation", "examples", "samples",
  "testdata", "fixtures", ".github", ".husky", "templates"
]);

const PRIORITY_DIRS = new Set([
  "src", "web", "app", "src-tauri", "lib", "packages",
  "public", "api", "server", "client", "frontend", "backend",
  "components", "pages", "routes", "js", "ts", "css", "scripts"
]);

const CODE_EXT = new Set([
  "js", "jsx", "mjs", "cjs", "ts", "tsx",
  "html", "htm", "css", "scss", "sass", "less",
  "py", "rb", "php", "java", "c", "cpp", "h", "hpp", "cs",
  "go", "rs", "swift", "kt", "sh", "bash",
  "yml", "yaml", "json", "toml", "ini", "cfg",
  "md", "vue", "svelte", "sql", "xml"
]);

function joinPath(parent, name) {
  if (!parent) return name;
  const sep = parent.includes("\\") ? "\\" : "/";
  return parent.replace(/[\\\/]$/, "") + sep + name;
}

function extOf(name) {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

function kb(bytes) {
  if (bytes == null || bytes === 0) return null;
  if (bytes < 1024) return bytes + "B";
  return (bytes / 1024).toFixed(1) + "KB";
}

function normEntry(raw, parent) {
  if (!raw) return null;
  if (typeof raw === "string") {
    return { name: raw, path: joinPath(parent, raw), isDir: false, isFile: true, size: null };
  }
  const name = raw.name || raw.file_name || raw.fileName;
  if (!name) return null;
  const isDir = raw.isDir === true || raw.is_dir === true || raw.type === "dir" || raw.type === "directory";
  const isFile = raw.isFile === true || raw.is_file === true || !isDir;
  const path = raw.path || joinPath(parent, name);
  let size = raw.size;
  if (size === undefined || size === null) size = raw.len;
  if (size === undefined || size === null) size = null;
  return { name, path, isDir, isFile, size };
}

export class ProjectAnalyzer {
  constructor(opts = {}) {
    if (typeof opts.readDir !== "function") throw new Error("ProjectAnalyzer: falta readDir(path) -> Array");
    if (typeof opts.readFile !== "function") throw new Error("ProjectAnalyzer: falta readFile(path) -> string");
    this.readDir = opts.readDir;
    this.readFile = opts.readFile;
    this.log = opts.log || (() => {});
    this.maxDepth = opts.maxDepth ?? 5;
    this.maxFiles = opts.maxFiles ?? 400;
    this.budgetChars = opts.budgetChars ?? 7000;
    this.symbolLimit = opts.symbolLimit ?? 6;
  }

  async buildOutline(rootPath) {
    if (!rootPath) throw new Error("buildOutline: falta rootPath");
    const t0 = Date.now();
    const acc = { files: [], dirs: new Set(), skipped: new Set() };
    await this._walk(rootPath, 0, acc);
    const ms = Date.now() - t0;
    return this._format(acc, rootPath, ms);
  }

  async _walk(dir, depth, acc) {
    if (depth > this.maxDepth) return;
    if (acc.files.length >= this.maxFiles) return;
    let rawEntries;
    try { rawEntries = await this.readDir(dir); } catch (_) { return; }
    if (!Array.isArray(rawEntries)) return;
    for (const raw of rawEntries) {
      if (acc.files.length >= this.maxFiles) return;
      const e = normEntry(raw, dir);
      if (!e) continue;
      if (e.isDir) {
        if (IGNORE_DIRS.has(e.name)) { acc.skipped.add(e.path); continue; }
        if (e.name.startsWith(".")) continue;
        acc.dirs.add(e.path);
        await this._walk(e.path, depth + 1, acc);
      } else {
        if (e.name.startsWith(".")) continue;
        const ext = extOf(e.name);
        if (!CODE_EXT.has(ext)) continue;
        acc.files.push(e);
      }
    }
  }

  _dirPriority(dirPath, rootPath) {
    const rel = dirPath.startsWith(rootPath)
      ? dirPath.slice(rootPath.length).replace(/^[\\\/]/, "")
      : dirPath;
    if (!rel) return 0;
    const first = rel.split(/[\\\/]/)[0].toLowerCase();
    if (PRIORITY_DIRS.has(first)) return 0;
    return 1;
  }

  async _format(acc, rootPath, ms) {
    const grouped = new Map();
    for (const f of acc.files) {
      const sep = f.path.includes("\\") ? "\\" : "/";
      const lastSep = f.path.lastIndexOf(sep);
      const dir = lastSep >= 0 ? f.path.slice(0, lastSep) : rootPath;
      if (!grouped.has(dir)) grouped.set(dir, []);
      grouped.get(dir).push(f);
    }

    const dirs = Array.from(grouped.keys()).sort((a, b) => {
      const pa = this._dirPriority(a, rootPath);
      const pb = this._dirPriority(b, rootPath);
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });

    const header = [
      "=== PROJECT OUTLINE ===",
      "root: " + rootPath,
      "scanned: " + acc.files.length + " files / " + acc.dirs.size + " dirs in " + ms + "ms",
      "budget: " + this.budgetChars + " chars",
      ""
    ].join("\n");

    const lines = [];
    let used = header.length;
    let emitted = 0;
    const omitted = [];

    for (const dir of dirs) {
      const rel = dir.startsWith(rootPath)
        ? dir.slice(rootPath.length).replace(/^[\\\/]/, "") || "(root)"
        : dir;
      const dirHeader = "\n[" + rel + "]";
      if (used + dirHeader.length > this.budgetChars) {
        omitted.push(rel);
        continue;
      }
      lines.push(dirHeader);
      used += dirHeader.length;
      emitted++;

      const files = grouped.get(dir).sort((a, b) => a.name.localeCompare(b.name));
      let filesEmitted = 0;
      for (const f of files) {
        let symbols = [];
        try {
          const content = await this._safeRead(f.path);
          symbols = this._extractSymbols(f.name, content);
        } catch (_) {}
        const symbolStr = symbols.length ? ": " + symbols.join(", ") : "";
        const sizeStr = kb(f.size);
        const sizePart = sizeStr ? " (" + sizeStr + ")" : "";
        const line = "  " + f.name + sizePart + symbolStr;
        if (used + line.length + 1 > this.budgetChars) {
          omitted.push(rel + " (+" + (files.length - filesEmitted) + " files)");
          break;
        }
        lines.push(line);
        used += line.length + 1;
        filesEmitted++;
      }
    }

    let tail = "";
    if (omitted.length) {
      tail = "\n\n[OMITTED " + omitted.length + " dirs por budget]\n  " + omitted.slice(0, 30).join("\n  ");
      if (omitted.length > 30) tail += "\n  ... y " + (omitted.length - 30) + " mas";
    }

    return header + lines.join("\n") + tail + "\n=== END OUTLINE ===\n";
  }

  async _safeRead(filePath) {
    try {
      const c = await this.readFile(filePath);
      if (typeof c !== "string") return "";
      return c;
    } catch (_) { return ""; }
  }

  _extractSymbols(fileName, content) {
    if (!content) return [];
    const ext = extOf(fileName);
    const out = [];
    const push = (s) => {
      if (!s) return;
      s = String(s).trim();
      if (!s) return;
      if (out.length >= this.symbolLimit) return;
      if (!out.includes(s)) out.push(s);
    };
    const scan = (re, groupIdx = 1) => {
      if (out.length >= this.symbolLimit) return;
      let m; re.lastIndex = 0;
      while ((m = re.exec(content)) !== null) {
        push(m[groupIdx]);
        if (out.length >= this.symbolLimit) break;
      }
    };

    if (["js", "jsx", "mjs", "cjs", "ts", "tsx"].includes(ext)) {
      scan(/^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm);
      scan(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm);
      scan(/^\s*class\s+([A-Za-z_$][\w$]*)/gm);
      scan(/^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function)/gm);
      return out;
    }
    if (ext === "rs") {
      scan(/^\s*pub\s+(?:async\s+)?(?:fn|struct|enum|trait|mod|impl|const|static)\s+([A-Za-z_]\w*)/gm);
      scan(/^\s*(?:async\s+)?fn\s+([A-Za-z_]\w*)/gm);
      scan(/^\s*impl(?:<[^>]*>)?\s+([A-Za-z_]\w*)/gm);
      return out;
    }
    if (["py", "rb"].includes(ext)) {
      scan(/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/gm);
      scan(/^\s*class\s+([A-Za-z_]\w*)/gm);
      return out;
    }
    if (ext === "go") {
      scan(/^func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)/gm);
      scan(/^type\s+([A-Za-z_]\w*)/gm);
      return out;
    }
    if (["java", "cs", "kt", "swift"].includes(ext)) {
      scan(/^\s*(?:public|private|protected|internal|open|final|static|\s)*\s*(?:class|interface|enum|struct|func|void|fun)\s+([A-Za-z_]\w*)/gm);
      return out;
    }
    if (ext === "json") {
      try {
        const obj = JSON.parse(content);
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          for (const k of Object.keys(obj).slice(0, 6)) push('"' + k + '"');
        }
      } catch (_) {}
      return out;
    }
    if (["toml", "ini", "cfg"].includes(ext)) { scan(/^\s*\[([^\]]+)\]/gm); return out; }
    if (["yml", "yaml"].includes(ext)) { scan(/^([A-Za-z_][\w-]*):/gm); return out; }
    if (["md", "markdown"].includes(ext)) { scan(/^#{1,2}\s+(.+)$/gm); return out; }
    if (["html", "htm", "vue", "svelte"].includes(ext)) {
      const t = content.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
      if (t) push("<title>" + t[1].trim() + "</title>");
      const scripts = (content.match(/<script\b/gi) || []).length;
      const styles = (content.match(/<link\b[^>]*rel=["']?stylesheet/gi) || []).length;
      if (scripts) push(scripts + " script tags");
      if (styles) push(styles + " stylesheets");
      return out;
    }
    if (["css", "scss", "sass", "less"].includes(ext)) { scan(/\/\*\s*={2,}\s*(.+?)\s*={2,}\s*\*\//g); return out; }
    if (ext === "sql") { scan(/^\s*CREATE\s+(?:TABLE|VIEW|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)/gim); return out; }
    return out;
  }
}
