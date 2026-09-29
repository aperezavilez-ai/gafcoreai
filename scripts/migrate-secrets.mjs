// scripts/migrate-secrets.mjs
// v59 — Migración Fase 1: API keys cifradas con tauri-plugin-store
// Uso: node scripts/migrate-secrets.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

const MIGRATIONS = {
  "web/js/app.js": {
    bootstrap: true,
    replacements: [
      ['localStorage.getItem(STORAGE_KEY)', 'getSecret(STORAGE_KEY)'],
      ['localStorage.setItem(STORAGE_KEY,', 'setSecret(STORAGE_KEY,'],
      ['localStorage.getItem("gafcoreai_github")', 'getSecret("gafcoreai_github")'],
      ['localStorage.setItem("gafcoreai_github",', 'setSecret("gafcoreai_github",'],
      ['localStorage.removeItem("gafcoreai_github")', 'removeSecret("gafcoreai_github")'],
      ['localStorage.getItem("gafcoreai_vercel")', 'getSecret("gafcoreai_vercel")'],
      ['localStorage.setItem("gafcoreai_vercel",', 'setSecret("gafcoreai_vercel",'],
      ['localStorage.removeItem("gafcoreai_vercel")', 'removeSecret("gafcoreai_vercel")'],
      ['localStorage.getItem("gafcoreai_sb")', 'getSecret("gafcoreai_sb")'],
      ['localStorage.setItem("gafcoreai_sb",', 'setSecret("gafcoreai_sb",'],
      ['localStorage.getItem(SEARCH_KEY)', 'getSecret(SEARCH_KEY)'],
      ['localStorage.setItem(SEARCH_KEY,', 'setSecret(SEARCH_KEY,'],
      ['localStorage.getItem("gafcoreai_active_model")', 'getSecret("gafcoreai_active_model")'],
      ['localStorage.setItem("gafcoreai_active_model",', 'setSecret("gafcoreai_active_model",'],
    ],
  },
  "web/js/git-real.js": {
    importLine: 'import { getSecret } from "./secrets.js";',
    replacements: [
      ['localStorage.getItem("gafcoreai_github")', 'getSecret("gafcoreai_github")'],
      ['localStorage.getItem("gafcoreai_vercel")', 'getSecret("gafcoreai_vercel")'],
    ],
  },
  "web/js/mentions.js": {
    importLine: 'import { getSecret } from "./secrets.js";',
    replacements: [
      ['localStorage.getItem("gafcoreai_github")', 'getSecret("gafcoreai_github")'],
    ],
  },
  "web/js/rag.js": {
    importLine: 'import { getSecret } from "./secrets.js";',
    replacements: [
      ['localStorage.getItem("gafcoreai_github")', 'getSecret("gafcoreai_github")'],
    ],
  },
  "web/js/tools.js": {
    importLine: 'import { getSecret } from "./secrets.js";',
    replacements: [
      ['localStorage.getItem("gafcoreai_brave_key")', 'getSecret("gafcoreai_brave_key")'],
      ['localStorage.getItem("gafcoreai_github")', 'getSecret("gafcoreai_github")'],
      ['localStorage.getItem("gafcoreai_sb_url")', 'getSecret("gafcoreai_sb_url")'],
      ['localStorage.getItem("gafcoreai_sb_key")', 'getSecret("gafcoreai_sb_key")'],
    ],
  },
};

function countOcc(hay, needle) {
  if (!needle) return 0;
  let n = 0, pos = 0;
  while ((pos = hay.indexOf(needle, pos)) !== -1) { n++; pos += needle.length; }
  return n;
}

let totalChanges = 0, totalFiles = 0;

for (const [relPath, cfg] of Object.entries(MIGRATIONS)) {
  const absPath = join(ROOT, relPath);
  if (!existsSync(absPath)) {
    console.log(`⚠️  ${relPath} no existe — omitido`);
    continue;
  }
  const original = readFileSync(absPath, "utf-8");
  let content = original;
  let changes = 0;

  // 1) Reemplazos de localStorage → getSecret/setSecret/removeSecret
  for (const [from, to] of cfg.replacements) {
    const n = countOcc(content, from);
    if (n > 0) {
      content = content.split(from).join(to);
      changes += n;
    }
  }

  // 2) Import simple (archivos que solo leen secrets)
  if (cfg.importLine && !content.includes(cfg.importLine)) {
    content = cfg.importLine + "\n" + content;
    changes++;
  }

  // 3) Bootstrap (app.js): import + await initSecrets()
  if (cfg.bootstrap && !content.includes("await initSecrets();")) {
    const lines = content.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 300); i++) {
      if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    }
    const insertAt = lastImportIdx >= 0 ? lastImportIdx + 1 : 0;
    const hasImport = /import[^;]*from\s+["']\.\/secrets\.js["']/.test(content);
    const block = hasImport
      ? ["await initSecrets();"]
      : ['import { initSecrets, getSecret, setSecret, removeSecret } from "./secrets.js";', "await initSecrets();"];
    lines.splice(insertAt, 0, ...block);
    content = lines.join("\n");
    changes++;
  }

  if (changes === 0) {
    console.log(`✅ ${relPath} — sin cambios necesarios`);
    continue;
  }

  copyFileSync(absPath, `${absPath}.bak-${TS}`);
  writeFileSync(absPath, content, "utf-8");
  console.log(`✅ ${relPath} — ${changes} cambio(s)`);
  totalChanges += changes;
  totalFiles++;
}

console.log("");
console.log("═".repeat(60));
console.log(`Migración completa: ${totalChanges} cambios en ${totalFiles} archivo(s)`);
console.log(`Backups con sufijo .bak-${TS}`);
console.log("═".repeat(60));