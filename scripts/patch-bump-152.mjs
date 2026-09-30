// Patcher v1.5.2 - bump versions + CHANGELOG
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";

const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const targets = [
  { file: "src-tauri/Cargo.toml",   from: 'version = "1.5.1"',        to: 'version = "1.5.2"',       anchor: '[package]' },
  { file: "src-tauri/tauri.conf.json", from: '"version": "1.5.1"',    to: '"version": "1.5.2"' },
  { file: "package.json",           from: '"version": "1.5.1"',       to: '"version": "1.5.2"' },
  { file: "web/index.html",         from: '<title>GafCoreAI v1.5.1</title>', to: '<title>GafCoreAI v1.5.2</title>' }
];

async function patchOne(t) {
  const original = await fs.readFile(t.file, "utf8");
  if (original.includes('"1.5.2"') || original.includes('"version": "1.5.2"') || original.includes('v1.5.2')) {
    console.log("[skip] " + t.file + " ya en v1.5.2");
    return;
  }
  if (!original.includes(t.from)) {
    console.error("[FAIL] " + t.file + " no contiene: " + t.from);
    process.exit(1);
  }
  const occurrences = original.split(t.from).length - 1;
  if (t.anchor && occurrences > 1) {
    console.error("[FAIL] " + t.file + " tiene " + occurrences + " ocurrencias. Ancla requerida.");
    process.exit(1);
  }
  const bak = t.file + ".bak-" + STAMP;
  await fs.writeFile(bak, original, "utf8");
  const out = original.replace(t.from, t.to);
  await fs.writeFile(t.file, out, "utf8");
  console.log("[OK] " + t.file + "  " + t.from + "  ->  " + t.to);
}

async function updateChangelog() {
  const cl = "CHANGELOG.md";
  const original = await fs.readFile(cl, "utf8");
  if (original.includes("[v1.5.2]")) {
    console.log("[skip] CHANGELOG ya tiene v1.5.2");
    return;
  }
  const entry = [
    "# Changelog  GafCoreAI",
    "",
    "[v1.5.2]  2026-09-30",
    "Added",
    "- project-analyzer.js: modulo puro de analisis jerarquico de proyectos (outline con simbolos por archivo, prioridad de dirs de codigo, reporta dirs omitidos por budget).",
    "- agent.js: _forceAnalysisReads usa ProjectAnalyzer y elimina 9 read_file hardcodeados de GafCoreAI.",
    "Fixed",
    "- tools.js list_files: IGNORE ampliado (brain-seed, docs, examples, fixtures, .github, etc.) para evitar lecturas masivas irrelevantes.",
    "- UI: spinner 'Pensando...' se limpia cuando la respuesta final es vacia o no hay sintesis.",
    ""
  ].join("\n");
  const out = entry + original.replace(/^# Changelog\s+GafCoreAI\s*\n/, "");
  await fs.writeFile(cl, out, "utf8");
  console.log("[OK] CHANGELOG.md actualizado con v1.5.2");
}

async function main() {
  console.log("[bump] -> v1.5.2");
  for (const t of targets) await patchOne(t);
  await updateChangelog();
  // node --check no aplica a Cargo/JSON/HTML, pero verificamos los JS afectados por cambios previos
  const chk = spawnSync(process.execPath, ["--check", "web/js/project-analyzer.js"], { encoding: "utf8" });
  if (chk.status !== 0) { console.error(chk.stderr); process.exit(1); }
  const chk2 = spawnSync(process.execPath, ["--check", "web/js/agent.js"], { encoding: "utf8" });
  if (chk2.status !== 0) { console.error(chk2.stderr); process.exit(1); }
  const chk3 = spawnSync(process.execPath, ["--check", "web/js/tools.js"], { encoding: "utf8" });
  if (chk3.status !== 0) { console.error(chk3.stderr); process.exit(1); }
  console.log("[bump] LISTO. node --check OK en project-analyzer/agent/tools.");
}
main().catch(e => { console.error("[bump] ERROR:", e.stack || e); process.exit(1); });
