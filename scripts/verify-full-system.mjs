// scripts/verify-full-system.mjs
// v63  Suite unificada de verificacion completa de GafCoreAI.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const C = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m", bold: "\x1b[1m" };

const results = [];
let currentSection = "";

function banner(title) {
  console.log("\n" + C.cyan + "".repeat(66) + C.reset);
  console.log(C.cyan + " " + C.bold + title + C.reset);
  console.log(C.cyan + "".repeat(66) + C.reset);
}

function section(title) {
  currentSection = title;
  console.log("\n" + C.yellow + " " + title + C.reset);
}

function pass(name, extra = "") {
  results.push({ section: currentSection, name, ok: true });
  console.log("  " + C.green + "" + C.reset + " " + name + (extra ? " " + C.dim + extra + C.reset : ""));
}

function fail(name, extra = "") {
  results.push({ section: currentSection, name, ok: false, extra });
  console.log("  " + C.red + "" + C.reset + " " + name + (extra ? " " + C.dim + extra + C.reset : ""));
}

function skip(name, why = "") {
  results.push({ section: currentSection, name, ok: true, skipped: true });
  console.log("  " + C.yellow + "" + C.reset + " " + name + (why ? " " + C.dim + "(" + why + ")" + C.reset : ""));
}

//  1. Verificar que archivos clave existen 
section("Archivos clave del proyecto");
const keyFiles = [
  "package.json",
  "ROADMAP.md",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "web/index.html",
  "web/styles.css",
  "web/js/app.js",
  "web/js/agent.js",
  "web/js/providers.js",
  "web/js/secrets.js",
  "web/js/zip-writer.js",
];
for (const f of keyFiles) {
  if (existsSync(join(ROOT, f))) pass(f);
  else fail(f, "(NO EXISTE)");
}

//  2. Verificar que archivos eliminados NO existen 
section("Archivos eliminados (no deben existir)");
const removedFiles = [
  "web/js/cinematic-project.js",
  "web/js/cinematic-script-parser.js",
  "web/js/cinematic-breakdown.js",
  "web/js/cinematic-studio-ui.js",
];
for (const f of removedFiles) {
  if (!existsSync(join(ROOT, f))) pass(f + " (eliminado)");
  else fail(f, "(sigue existiendo)");
}

//  3. node --check sobre JS del frontend 
section("Sintaxis JavaScript (node --check)");
const jsFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "vendor") continue;
      walk(full);
    } else if (entry.name.endsWith(".js") && !entry.name.includes(".test.")) {
      jsFiles.push(full);
    }
  }
};
walk(join(ROOT, "web/js"));

for (const f of jsFiles) {
  const r = spawnSync("node", ["--check", f], { encoding: "utf-8" });
  const rel = f.replace(ROOT, "").replace(/\\/g, "/").replace(/^\//, "");
  if (r.status === 0) pass(rel);
  else fail(rel, r.stderr.split("\n")[0]);
}

//  4. Tests unitarios 
section("Tests unitarios (web/js/__tests__)");
try {
  const out = execSync('node --test "web/js/__tests__/*.test.mjs"', {
    cwd: ROOT,
    encoding: "utf-8",
    shell: true,
  });
  const m = out.match(/(?:^#|ℹ|i|) pass (\d+)/m);
  const total = m ? m[1] : "?";
  pass("Tests unitarios", "(" + total + " PASS)");
} catch (e) {
  const out = (e.stdout || "") + (e.stderr || "");
  const passM = out.match(/^# pass (\d+)/m);
  const failM = out.match(/^# fail (\d+)/m);
  fail("Tests unitarios", "pass=" + (passM ? passM[1] : "?") + " fail=" + (failM ? failM[1] : "?"));
  console.log(C.dim + out.slice(-500) + C.reset);
}

//  5. Fast Apply 
section("Fast Apply test");
const fastApplyPath = join(ROOT, "scripts/test-fast-apply.mjs");
if (existsSync(fastApplyPath)) {
  try {
    execSync("node scripts/test-fast-apply.mjs", { cwd: ROOT, encoding: "utf-8", stdio: "pipe" });
    pass("test-fast-apply.mjs");
  } catch (e) {
    fail("test-fast-apply.mjs", "(exit != 0)");
  }
} else {
  skip("test-fast-apply.mjs", "no existe");
}

//  6. E2E 
section("E2E Full test");
const e2ePath = join(ROOT, "scripts/test-full-e2e.mjs");
if (existsSync(e2ePath)) {
  try {
    const out = execSync("node scripts/test-full-e2e.mjs", { cwd: ROOT, encoding: "utf-8", stdio: "pipe" });
    const m = out.match(/(\d+)\/(\d+)/);
    pass("test-full-e2e.mjs", m ? "(" + m[0] + ")" : "");
  } catch (e) {
    fail("test-full-e2e.mjs", "(exit != 0)");
  }
} else {
  skip("test-full-e2e.mjs", "no existe");
}

//  7. Media pipeline 
section("Media pipeline test");
const mediaPath = join(ROOT, "scripts/verify-media-pipeline.mjs");
if (existsSync(mediaPath)) {
  try {
    const out = execSync("node scripts/verify-media-pipeline.mjs", { cwd: ROOT, encoding: "utf-8", stdio: "pipe" });
    const m = out.match(/(\d+)\/(\d+)/);
    pass("verify-media-pipeline.mjs", m ? "(" + m[0] + ")" : "");
  } catch (e) {
    fail("verify-media-pipeline.mjs", "(exit != 0)");
  }
} else {
  skip("verify-media-pipeline.mjs", "no existe");
}

//  8. Verificar version 1.6.0 
section("Version del proyecto");
const cargo = readFileSync(join(ROOT, "src-tauri/Cargo.toml"), "utf-8");
const conf = readFileSync(join(ROOT, "src-tauri/tauri.conf.json"), "utf-8");
if (/version\s*=\s*"1\.6\.0"/.test(cargo)) pass("Cargo.toml 1.6.0");
else fail("Cargo.toml version distinta a 1.6.0");
if (/"version"\s*:\s*"1\.6\.0"/.test(conf)) pass("tauri.conf.json 1.6.0");
else fail("tauri.conf.json version distinta a 1.6.0");

//  9. Sin referencias cinematic 
section("Sin referencias al Estudio Cinematico");
const checkFiles = ["web/index.html", "web/js/app.js", "web/styles.css"];
for (const rel of checkFiles) {
  const c = readFileSync(join(ROOT, rel), "utf-8");
  const hits = (c.match(/cinematic|Estudio Cinem|btn-studio|view-studio/gi) || []).length;
  if (hits === 0) pass(rel + " limpio");
  else fail(rel, hits + " referencias");
}

//  10. Resumen final 
banner("RESUMEN");
const total = results.length;
const ok = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
const skipped = results.filter(r => r.skipped).length;

console.log("  " + C.bold + "Total:   " + total + C.reset);
console.log("  " + C.green + "OK:      " + ok + C.reset);
console.log("  " + C.yellow + "Skipped: " + skipped + C.reset);
console.log("  " + (failed > 0 ? C.red : C.dim) + "Failed:  " + failed + C.reset);

if (failed > 0) {
  console.log("\n" + C.red + C.bold + "   Hay " + failed + " fallo(s). Revisar arriba." + C.reset);
  process.exit(1);
} else {
  console.log("\n" + C.green + C.bold + "   SISTEMA 100% OK" + C.reset);
  process.exit(0);
}