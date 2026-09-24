// ============================================================
//  GafCoreAI - Code Analyzer (analisis profundo archivo por archivo)
//  Detecta y arregla proyectos severamente danados
// ============================================================
import { tauri as tauriBridge } from "./tauri-bridge.js";

export class CodeAnalyzer {
  constructor({ state, log, termWrite, live, provider, model }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.live = live;
    this.provider = provider;
    this.model = model;
    this.report = [];
    this.fixed = [];
  }

  /**
   * Detecta todos los archivos del proyecto abierto (disco o memoria)
   */
  async collectFiles() {
    const files = [];

    // Archivos del proyecto del agente (memoria)
    if (this.state.projectFiles) {
      Object.keys(this.state.projectFiles).forEach(p => {
        if (this.isCode(p)) files.push({ path: p, content: this.state.projectFiles[p] });
      });
    }

    // Archivos del disco (carpeta abierta)
    if (this.state.diskFolder && this.state.diskEntries) {
      for (const e of this.state.diskEntries) {
        if (e.is_file && this.isCode(e.name) && e.size < 500000) {
          try {
            if (tauriBridge && tauriBridge.isTauri) {
              const content = await tauriBridge.readFile(e.path);
              files.push({ path: e.path, content });
            }
          } catch (err) {}
        }
      }
    }

    return files;
  }

  isCode(path) {
    return /\.(js|jsx|ts|tsx|html|css|scss|py|rb|php|java|c|cpp|h|hpp|cs|go|rs|swift|kt|sh|bash|yml|yaml|json|md|vue|svelte|sql|xml)$/i.test(path);
  }

  /**
   * Analiza cada archivo en detalle, linea por linea cuando es necesario
   * Devuelve un reporte estructurado
   */
  async analyzeProject() {
    this.report = [];
    this.fixed = [];

    if (this.live) {
      this.live.startSession("Analizando proyecto completo");
      this.live.setPhase("🔍", "Analizando codigo", "archivo por archivo");
    }

    const files = await this.collectFiles();

    if (!files.length) {
      this.termWrite("⚠ No hay archivos de codigo para analizar", "warn");
      if (this.live) this.live.endSession(false);
      return { ok: false, error: "Sin archivos" };
    }

    this.termWrite("");
    this.termWrite("══════════════════════════════════════════════", "head");
    this.termWrite("  ANALISIS PROFUNDO DE CODIGO", "head");
    this.termWrite("  Archivos: " + files.length, "head");
    this.termWrite("══════════════════════════════════════════════", "head");

    const total = files.length;
    let index = 0;

    for (const f of files) {
      index++;
      const pct = Math.floor((index / total) * 100);
      if (this.live) {
        this.live.renderProgress(pct);
        this.live.fileStart(f.path, "analizando");
      }
      this.termWrite("");
      this.termWrite("[" + index + "/" + total + "] " + f.path, "head");

      const issues = await this.analyzeFile(f.path, f.content);
      this.report.push({ path: f.path, issues });

      if (this.live) {
        const hasErrors = issues.some(i => i.severity === "error");
        this.live.fileDone(f.path, !hasErrors);
      }
    }

    const totalIssues = this.report.reduce((acc, r) => acc + r.issues.length, 0);
    const errors = this.report.reduce((acc, r) => acc + r.issues.filter(i => i.severity === "error").length, 0);

    this.termWrite("");
    this.termWrite("══════════════════════════════════════════════", "head");
    this.termWrite("  RESULTADO: " + totalIssues + " issues (" + errors + " errores criticos)", "head");
    this.termWrite("══════════════════════════════════════════════", "head");

    if (this.live) {
      this.live.logLine("info", "Total: " + totalIssues + " issues en " + total + " archivos");
      this.live.setPhase("✅", "Analisis completo", totalIssues + " issues");
    }

    return { ok: true, report: this.report, totalIssues, errors };
  }

  /**
   * Analiza UN archivo en detalle
   */
  async analyzeFile(path, content) {
    const issues = [];
    const ext = (path.split(".").pop() || "").toLowerCase();

    // ── ANALISIS ESTATICO ────────────────────────
    const lines = content.split("\n");

    // 1) Llaves/parentesis desbalanceados
    const balance = this.checkBalance(content);
    if (!balance.ok) {
      issues.push({
        severity: "error",
        type: "syntax",
        line: balance.line || 0,
        message: "Balance " + balance.what + " incorrecto: " + balance.detail
      });
    }

    // 2) Codigo duplicado
    const dup = this.checkDuplicateLines(lines);
    if (dup.length) {
      issues.push({
        severity: "warn",
        type: "duplication",
        message: dup.length + " bloques de lineas repetidas",
        lines: dup
      });
    }

    // 3) Lineas muy largas
    const longLines = lines.map((l, i) => ({ i: i + 1, len: l.length }))
                           .filter(x => x.len > 200);
    if (longLines.length) {
      issues.push({
        severity: "info",
        type: "style",
        message: longLines.length + " lineas muy largas (>200 chars)",
        lines: longLines.map(x => x.i)
      });
    }

    // 4) console.log / debugger olvidados
    if (/console\.log|debugger|alert\(/.test(content)) {
      const count = (content.match(/console\.log|debugger/g) || []).length;
      issues.push({
        severity: "warn",
        type: "debug",
        message: count + " llamadas de debug olvidadas"
      });
    }

    // 5) TODO / FIXME
    const todos = (content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi) || []).length;
    if (todos) {
      issues.push({
        severity: "info",
        type: "todo",
        message: todos + " marcadores TODO/FIXME"
      });
    }

    // 6) Variables no usadas (heuristica JS/TS)
    if (["js","jsx","ts","tsx"].includes(ext)) {
      const unused = this.findUnusedVars(content);
      if (unused.length) {
        issues.push({
          severity: "info",
          type: "unused",
          message: unused.length + " variables posiblemente no usadas",
          vars: unused
        });
      }
    }

    // 7) HTML: tags sin cerrar
    if (["html","htm"].includes(ext)) {
      const htmlIssues = this.checkHtml(content);
      issues.push(...htmlIssues);
    }

    // 8) CSS: llaves desbalanceadas
    if (["css","scss","less"].includes(ext)) {
      const cssBalance = this.checkCssBraces(content);
      if (!cssBalance.ok) {
        issues.push({
          severity: "error",
          type: "css",
          line: cssBalance.line,
          message: "CSS: llaves desbalanceadas"
        });
      }
    }

    // ── IMPRIMIR EN TERMINAL ─────────────────────
    if (issues.length === 0) {
      this.termWrite("   ✓ Sin issues detectados", "success");
      if (this.live) this.live.logLine("success", "   ✓ " + path);
    } else {
      issues.forEach(iss => {
        const color = iss.severity === "error" ? "error" :
                      iss.severity === "warn" ? "warn" : "dim";
        this.termWrite("   [" + iss.severity + "] " + iss.message, color);
        if (this.live) {
          this.live.logLine(color, "   " + iss.message);
        }
      });
    }

    return issues;
  }

  checkBalance(content) {
    const pairs = { "{": "}", "(": ")", "[": "]" };
    const stack = [];
    let line = 1;
    for (let i = 0; i < content.length; i++) {
      const c = content[i];
      if (c === "\n") line++;
      if (c === "{" || c === "(" || c === "[") stack.push({ c, line });
      if (c === "}" || c === ")" || c === "]") {
        const top = stack.pop();
        if (!top || pairs[top.c] !== c) {
          return { ok: false, what: "parentesis/llaves", line, detail: "cierra " + c + " sin abrir" };
        }
      }
    }
    if (stack.length) {
      return { ok: false, what: "parentesis/llaves", line: stack[0].line,
               detail: "abre " + stack[0].c + " sin cerrar" };
    }
    return { ok: true };
  }

  checkDuplicateLines(lines) {
    const seen = new Map();
    const dups = [];
    const cleaned = lines.map((l, i) => ({ i: i + 1, t: l.trim() }))
                         .filter(x => x.t.length > 20 && !x.t.startsWith("//"));
    for (const c of cleaned) {
      if (seen.has(c.t)) {
        dups.push([seen.get(c.t), c.i]);
      } else {
        seen.set(c.t, c.i);
      }
    }
    return dups;
  }

  findUnusedVars(content) {
    const vars = new Set();
    const used = new Set();
    const declRe = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let m;
    while ((m = declRe.exec(content)) !== null) vars.add(m[1]);
    vars.forEach(v => {
      const useRe = new RegExp("\\b" + v.replace(/[$]/g, "\\$") + "\\b", "g");
      const count = (content.match(useRe) || []).length;
      if (count <= 1) used.add(v);
    });
    return Array.from(used);
  }

  checkHtml(content) {
    const issues = [];
    const opens = (content.match(/<(div|span|section|article|header|footer|nav|main|aside|ul|ol|li|form|button|a|p|h[1-6])\b[^>]*>/gi) || []).length;
    const closes = (content.match(/<\/(div|span|section|article|header|footer|nav|main|aside|ul|ol|li|form|button|a|p|h[1-6])>/gi) || []).length;
    if (opens !== closes) {
      issues.push({
        severity: "error",
        type: "html",
        message: "HTML: " + opens + " tags abren pero " + closes + " cierran"
      });
    }
    if (!/<meta[^>]+viewport/i.test(content)) {
      issues.push({
        severity: "warn",
        type: "html",
        message: "HTML: falta meta viewport (no sera responsive)"
      });
    }
    return issues;
  }

  checkCssBraces(content) {
    let depth = 0;
    let line = 1;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === "\n") line++;
      if (content[i] === "{") depth++;
      if (content[i] === "}") depth--;
      if (depth < 0) return { ok: false, line };
    }
    if (depth !== 0) return { ok: false, line };
    return { ok: true };
  }

  /**
   * Intenta arreglar los errores detectados con ayuda del modelo
   */
  async autoFix(maxFiles) {
    const max = maxFiles || 10;
    const fixed = [];
    const filesWithErrors = this.report
      .filter(r => r.issues.some(i => i.severity === "error" || i.severity === "warn"))
      .slice(0, max);

    if (!filesWithErrors.length) {
      this.termWrite("✓ No hay errores criticos que arreglar", "success");
      return { ok: true, fixed: [] };
    }

    if (this.live) {
      this.live.setPhase("🔧", "Auto-fix", filesWithErrors.length + " archivos");
    }

    for (const entry of filesWithErrors) {
      const path = entry.path;
      this.termWrite("");
      this.termWrite("🔧 Arreglando: " + path, "head");

      const original = await this.getFileContent(path);
      if (!original) continue;

      if (this.live) this.live.fileStart(path, "corrigiendo");

      try {
        const fixedContent = await this.fixFileWithModel(path, original, entry.issues);
        if (fixedContent && fixedContent !== original) {
          // Guardar como cambio pendiente
          if (this.state.pendingDiffs) {
            this.state.pendingDiffs.add(path, fixedContent, "auto-fix");
          }
          fixed.push({ path, before: original.length, after: fixedContent.length });
          this.termWrite("   ✓ Propuesta guardada como pendiente", "success");
          if (this.live) this.live.fileDone(path, true);
        } else {
          this.termWrite("   - Sin cambios necesarios", "dim");
          if (this.live) this.live.fileDone(path, true);
        }
      } catch (e) {
        this.termWrite("   ✗ Error: " + e.message, "error");
        if (this.live) this.live.fileDone(path, false);
      }
    }

    return { ok: true, fixed };
  }

  async getFileContent(path) {
    if (this.state.projectFiles && this.state.projectFiles[path] !== undefined) {
      return this.state.projectFiles[path];
    }
    if (tauriBridge && tauriBridge.isTauri) {
      try {
        return await tauriBridge.readFile(path);
      } catch (e) {}
    }
    return null;
  }

  async fixFileWithModel(path, content, issues) {
    const { chatCompletion } = await import("./providers.js");

    const issuesText = issues.map(i =>
      "- [" + i.severity + "] " + i.type + ": " + i.message
    ).join("\n");

    const prompt =
      "Arregla este archivo. Problemas detectados:\n" + issuesText + "\n\n" +
      "REGLAS:\n" +
      "- Devuelve SOLO el codigo corregido completo\n" +
      "- NO uses bloques markdown (nada de ```)\n" +
      "- Mantiene el estilo y funcionalidad\n" +
      "- Si algo esta roto, arreglalo con criterio\n\n" +
      "ARCHIVO: " + path + "\n\n" +
      "CONTENIDO ACTUAL:\n" + content;

    let result = "";
    await chatCompletion(
      this.provider,
      this.model,
      [{ role: "user", content: prompt }],
      tok => { result += tok; }
    );

    let clean = result.trim();
    clean = clean.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/\n?```$/, "");
    return clean.trim();
  }

  /**
   * Reporte final
   */
  getReport() {
    return {
      files: this.report.length,
      totalIssues: this.report.reduce((a, r) => a + r.issues.length, 0),
      errors: this.report.reduce((a, r) => a + r.issues.filter(i => i.severity === "error").length, 0),
      details: this.report
    };
  }
}