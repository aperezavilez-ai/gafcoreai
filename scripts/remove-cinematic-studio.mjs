// scripts/remove-cinematic-studio.mjs
// v60.3 — Elimina TODO el estudio cinematográfico de GafCoreAI.
// Backups con sufijo .bak-YYYYMMDD-HHMMSS.

import { readFileSync, writeFileSync, existsSync, unlinkSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

console.log("═══ Removiendo Cinematic Studio de GafCoreAI ═══\n");

// ─── 1. Borrar archivos ──────────────────────────────
const filesToDelete = [
  "web/js/cinematic-project.js",
  "web/js/cinematic-script-parser.js",
  "web/js/cinematic-breakdown.js",
  "web/js/cinematic-studio-ui.js",
];

for (const rel of filesToDelete) {
  const abs = join(ROOT, rel);
  if (existsSync(abs)) {
    copyFileSync(abs, abs + ".bak-" + TS);
    unlinkSync(abs);
    console.log("🗑️  Eliminado:", rel);
  } else {
    console.log("⚠️  No existe:", rel);
  }
}

// ─── 2. Parchear app.js ──────────────────────────────
const appPath = join(ROOT, "web/js/app.js");
if (!existsSync(appPath)) {
  console.log("❌ app.js no encontrado");
} else {
  let app = readFileSync(appPath, "utf-8");
  copyFileSync(appPath, appPath + ".bak-" + TS);
  const before = app.length;
  const patches = [];

  function applyPatch(name, regex, replacement) {
    const hit = regex.test(app);
    if (hit) {
      app = app.replace(regex, replacement);
      patches.push(name);
    }
  }

  // Import
  applyPatch(
    "import CinematicStudioUI",
    /^import \{ CinematicStudioUI \} from "\.\/cinematic-studio-ui\.js";\s*\r?\n/m,
    ""
  );

  // Estado
  applyPatch(
    "state.cinematicStudio",
    /^[ \t]*cinematicStudio:[ \t]*null,[ \t]*\r?\n/m,
    ""
  );

  // Render studio view
  applyPatch(
    "renderStudioView call",
    /[ \t]*if \(viewName === "studio" && state\.cinematicStudio\) \{\r?\n[ \t]*state\.cinematicStudio\.renderStudioView\(\);\r?\n[ \t]*\}\r?\n/g,
    ""
  );

  // openGenerateVideoModal (2 bloques)
  applyPatch(
    "openGenerateVideoModal calls",
    /[ \t]*if \(state\.cinematicStudio\) \{\r?\n(?:[ \t]*\/\/[^\n]*\r?\n)*[ \t]*state\.cinematicStudio\.openGenerateVideoModal\(\{[\s\S]*?\}\);\r?\n[ \t]*\}\r?\n/g,
    ""
  );

  // Constructor + init + termWrite
  applyPatch(
    "constructor CinematicStudioUI",
    /[ \t]*state\.cinematicStudio = new CinematicStudioUI\(\{[\s\S]*?\}\);\r?\n[ \t]*state\.cinematicStudio\.init\(\);\r?\n[ \t]*termWrite\("Cinematic Studio v1\.5 listo \(Image->Video Pipeline\)", "dim"\);\r?\n/g,
    ""
  );

  // Getter
  applyPatch(
    "get cinematicStudio",
    /^[ \t]*get cinematicStudio\(\) \{ return state\.cinematicStudio; \},?[ \t]*\r?\n/m,
    ""
  );

  if (patches.length > 0) {
    writeFileSync(appPath, app, "utf-8");
    console.log("\n✏️  app.js parcheado. Cambios aplicados:");
    patches.forEach(p => console.log("   ✓", p));
    console.log("   Reducción: " + (before - app.length) + " chars");
  } else {
    console.log("\n⚠️  app.js: sin cambios (quizá ya estaba limpio)");
  }

  // Verificación
  const leftOver = app.match(/cinematicStudio|CinematicStudioUI|cinematic-studio/g);
  if (leftOver) {
    console.log("\n⚠️  Quedan " + leftOver.length + " referencias en app.js.");
    console.log("   Busca manualmente con: Select-String -Path web\\js\\app.js -Pattern 'cinematic' -CaseSensitive:$false");
  } else {
    console.log("\n✅ app.js: sin referencias a cinematic restantes.");
  }
}

// ─── 3. Parchear styles.css ──────────────────────────
const cssPath = join(ROOT, "web/styles.css");
if (!existsSync(cssPath)) {
  console.log("\n❌ styles.css no encontrado");
} else {
  let css = readFileSync(cssPath, "utf-8");
  copyFileSync(cssPath, cssPath + ".bak-" + TS);
  const before = css.length;

  // Bloques con comentarios de sección "Cinematic Studio"
  css = css.replace(/\/\* ═+[^*]*?Cinematic Studio[\s\S]*?(?=\/\* ═+|$)/g, "");
  css = css.replace(/\/\* Cinematic Studio v59\.\d+[^*]*?[\s\S]*?(?=\/\* ═+|$)/g, "");

  // Reglas que empiezan con .cs-
  css = css.replace(/^\.cs-[^{]+\{[^}]*\}\s*\r?\n?/gm, "");

  if (css.length !== before) {
    writeFileSync(cssPath, css, "utf-8");
    console.log("\n✏️  styles.css parcheado. Reducción: " + (before - css.length) + " chars");
  } else {
    console.log("\n⚠️  styles.css sin cambios");
  }

  const leftOverCSS = css.match(/\.cs-[a-z]/g);
  if (leftOverCSS) {
    console.log("   ⚠️  Quedan " + leftOverCSS.length + " selectores .cs-*");
  } else {
    console.log("   ✅ Sin selectores .cs-* restantes.");
  }
}

console.log("\n════════════════════════════════════════════");
console.log(" Backups: *.bak-" + TS);
console.log(" Revisa con 'git status' antes de commitear.");
console.log("════════════════════════════════════════════");
