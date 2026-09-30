// ============================================================
//  Patcher v1.3 - integra ProjectAnalyzer en agent.js
//  Uso: node scripts/patch-agent-v13.mjs
//  Backup: web/js/agent.js.bak-<timestamp>
//  Rollback automatico si node --check falla.
// ============================================================
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const AGENT = path.resolve("web/js/agent.js");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BAK = AGENT + ".bak-" + STAMP;

const IMPORT_ANCHOR = 'import { tauri as tauriBridge } from "./tauri-bridge.js";';
const IMPORT_LINE = 'import { ProjectAnalyzer } from "./project-analyzer.js";';

const START_MARKER = "  async _forceAnalysisReads(diskFolder, allToolResults, executedToolSignatures) {";
const END_TAIL = "  _extractWriteIntents(text) {";

const NEW_FN = `  async _forceAnalysisReads(diskFolder, allToolResults, executedToolSignatures) {
    const turnResults = [];
    if (!this.tools || !diskFolder) return turnResults;
    const MAX_OBS = 8000;
    this.term("[Orquestador] El modelo no emitio tools. Leyendo yo el disco para no fingir el analisis.", "warn");

    // 1) list_files recursivo (paths reales del proyecto)
    const seeds = [
      { name: "list_files", args: { path: diskFolder, recursive: "true" } }
    ];
    for (const call of seeds) {
      if (this.aborted) break;
      const filePath = (call.args.path || "") + "";
      const sig = call.name + ":" + filePath;
      if (executedToolSignatures.has(sig) && call.name !== "write_file") continue;
      executedToolSignatures.add(sig);
      try {
        const r = await this.tools.invoke(call.name, call.args);
        let rStr = typeof r === "string" ? r : JSON.stringify(r);
        if (rStr.length > MAX_OBS) rStr = rStr.slice(0, MAX_OBS) + "\\n...(truncado " + rStr.length + " chars)";
        turnResults.push({ name: call.name, args: call.args, result: rStr, ok: true, isWrite: false });
        allToolResults.push({ name: call.name, path: filePath, result: rStr, ok: true, isWrite: false });
        this.term("  OK " + call.name + " " + filePath + " (" + rStr.length + " chars)");
      } catch (e) {
        turnResults.push({ name: call.name, args: call.args, error: e.message, ok: false, isWrite: false });
        allToolResults.push({ name: call.name, path: filePath, error: e.message, ok: false, isWrite: false });
        this.term("  ERR " + call.name + ": " + e.message, "error");
      }
    }

    // 2) Outline jerarquico (reemplaza los 9 read_file hardcodeados de GafCoreAI)
    if (!this.aborted) {
      try {
        if (!this._projectAnalyzer) {
          this._projectAnalyzer = new ProjectAnalyzer({
            readDir: (p) => tauriBridge.listDir(p),
            readFile: (p) => tauriBridge.readFile(p),
            log: (m) => this.term(m)
          });
        }
        const outline = await this._projectAnalyzer.buildOutline(diskFolder);
        let outlineStr = outline || "";
        const HARD_CAP = MAX_OBS * 2;
        if (outlineStr.length > HARD_CAP) {
          outlineStr = outlineStr.slice(0, HARD_CAP) + "\\n...(outline truncado)";
        }
        const sig = "project_outline:" + diskFolder;
        if (!executedToolSignatures.has(sig)) {
          executedToolSignatures.add(sig);
          turnResults.push({ name: "project_outline", args: { path: diskFolder }, result: outlineStr, ok: true, isWrite: false });
          allToolResults.push({ name: "project_outline", path: diskFolder, result: outlineStr, ok: true, isWrite: false });
          this.term("  OK project_outline " + diskFolder + " (" + outlineStr.length + " chars)");
        }
      } catch (e) {
        this.term("  ERR project_outline: " + e.message, "error");
      }
    }

    return turnResults;
  }`;

async function main() {
  console.log("[patch] leyendo:", AGENT);
  const original = await fs.readFile(AGENT, "utf8");

  if (original.includes('from "./project-analyzer.js"')) {
    console.log("[patch] ya estaba aplicado. Nada que hacer.");
    return;
  }

  const startIdx = original.indexOf(START_MARKER);
  if (startIdx < 0) throw new Error("no se encontro START_MARKER de _forceAnalysisReads");
  const endIdx = original.indexOf(END_TAIL, startIdx);
  if (endIdx < 0) throw new Error("no se encontro END_TAIL (_extractWriteIntents)");
  if (!original.includes(IMPORT_ANCHOR)) throw new Error("no se encontro el anchor de import tauriBridge");

  // Backup
  await fs.writeFile(BAK, original, "utf8");
  console.log("[patch] backup:", BAK);

  // 1) import
  let out = original.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT_LINE);

  // 2) reemplazar la funcion completa (startIdx se mantiene porque el import esta antes)
  const startIdx2 = out.indexOf(START_MARKER);
  const endIdx2 = out.indexOf(END_TAIL, startIdx2);
  const oldFn = out.slice(startIdx2, endIdx2);
  const oldLines = oldFn.split(/\r?\n/).length;
  const newLines = NEW_FN.split(/\n/).length;

  out = out.slice(0, startIdx2) + NEW_FN + out.slice(endIdx2);

  await fs.writeFile(AGENT, out, "utf8");
  console.log("[patch] _forceAnalysisReads: " + oldLines + " lineas -> " + newLines + " lineas");
  console.log("[patch] agent.js escrito (", out.length, "chars )");

  // Verificacion de sintaxis
  const chk = spawnSync(process.execPath, ["--check", AGENT], { encoding: "utf8" });
  if (chk.status !== 0) {
    console.error("[patch] node --check FALLO. Restaurando backup...");
    console.error(chk.stderr || chk.stdout);
    await fs.writeFile(AGENT, original, "utf8");
    console.error("[patch] restaurado.");
    process.exit(1);
  }

  console.log("[patch] node --check OK");
  console.log("[patch] LISTO. Abre el exe y verifica arranque limpio.");
}

main().catch((e) => {
  console.error("[patch] ERROR:", (e && e.stack) || e);
  process.exit(1);
});
