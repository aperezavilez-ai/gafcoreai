// scripts/migrate-secrets-fase2.mjs
// v62  Migra las últimas 4 keys al store cifrado.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

function stripBOM(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

// Cada archivo: rutas de imports existentes + qué constants reemplazar
const MIGRATIONS = {
  "web/js/embeddings.js": ["EMBED_CONFIG_KEY"],
  "web/js/ghost.js":      ["GHOST_CONFIG_KEY"],
  "web/js/rag.js":        ["RAG_CONFIG_KEY"],
  "web/js/mcp-client.js": ["MCP_SERVERS_KEY"],
};

console.log("=== Fix 7 Fase 2: cifrado de ultimas keys ===\n");

let totalChanges = 0;

for (const [rel, keys] of Object.entries(MIGRATIONS)) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    console.log("  WARN no existe:", rel);
    continue;
  }
  copyFileSync(p, p + ".bak-" + TS);
  let src = stripBOM(readFileSync(p, "utf-8"));
  const before = src.length;
  let changes = 0;

  // 1) Agregar import si no existe
  if (!src.includes('from "./secrets.js"')) {
    // Buscar el último import existente
    const lines = src.split("\n");
    let lastImport = -1;
    for (let i = 0; i < Math.min(lines.length, 80); i++) {
      if (/^\s*import\s/.test(lines[i])) lastImport = i;
    }
    const importLine = 'import { getSecret, setSecret, removeSecret } from "./secrets.js";';
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    src = lines.join("\n");
    changes++;
    console.log("  " + rel + "  -> import agregado");
  }

  // 2) Reemplazos por cada KEY
  for (const key of keys) {
    const patterns = [
      [new RegExp("localStorage\\.getItem\\(" + key + "\\)", "g"), "getSecret(" + key + ")"],
      [new RegExp("localStorage\\.setItem\\(" + key + ",\\s*", "g"), "setSecret(" + key + ", "],
      [new RegExp("localStorage\\.removeItem\\(" + key + "\\)", "g"), "removeSecret(" + key + ")"],
    ];
    for (const [re, to] of patterns) {
      const matches = src.match(re);
      if (matches) {
        src = src.replace(re, to);
        changes += matches.length;
      }
    }
  }

  writeFileSync(p, src, "utf-8");
  console.log("  " + rel + "  -> " + changes + " cambio(s), " + (before - src.length) + " chars menos");
  totalChanges += changes;
}

//  Añadir mcp_servers a SECRET_KEYS en secrets.js si falta 
const secretsPath = join(ROOT, "web/js/secrets.js");
if (existsSync(secretsPath)) {
  copyFileSync(secretsPath, secretsPath + ".bak-" + TS);
  let sec = stripBOM(readFileSync(secretsPath, "utf-8"));
  if (!sec.includes('"gafcoreai_mcp_servers"')) {
    sec = sec.replace(
      /(export const SECRET_KEYS = \[[\s\S]*?)(\n\];)/,
      '$1\n  "gafcoreai_mcp_servers",$2'
    );
    writeFileSync(secretsPath, sec, "utf-8");
    console.log("  web/js/secrets.js  -> 'gafcoreai_mcp_servers' agregado a SECRET_KEYS");
    totalChanges++;
  } else {
    console.log("  web/js/secrets.js  -> ya incluye mcp_servers");
  }
}

console.log("\n=== Total: " + totalChanges + " cambio(s) ===\n");
console.log("Verificar con:");
console.log("  node --check web/js/embeddings.js");
console.log("  node --check web/js/ghost.js");
console.log("  node --check web/js/rag.js");
console.log("  node --check web/js/mcp-client.js");
console.log("  node --check web/js/secrets.js");