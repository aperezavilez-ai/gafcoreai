// Patcher v1.4.1 - amplia IGNORE en list_files de tools.js
// Line-ending agnostic: normaliza LF antes de matchear, restaura EOL original.
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const TOOLS = path.resolve("web/js/tools.js");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BAK = TOOLS + ".bak-" + STAMP;

const OLD_BLOCK_LF = [
  '      const IGNORE = new Set([',
  '        "node_modules", ".git", "dist", "build", ".next", "target",',
  '        ".cache", "coverage", "__pycache__", ".venv", "venv",',
  '        ".idea", ".vscode", ".DS_Store", "Thumbs.db"',
  '      ]);'
].join("\n");

const NEW_BLOCK_LF = [
  '      const IGNORE = new Set([',
  '        "node_modules", ".git", "dist", "build", ".next", "target",',
  '        ".cache", "coverage", "__pycache__", ".venv", "venv",',
  '        ".idea", ".vscode", ".DS_Store", "Thumbs.db",',
  '        "brain-seed", "docs", "documentation", "examples", "samples",',
  '        "testdata", "fixtures", ".github", ".husky", "templates",',
  '        ".turbo", ".svelte-kit", ".nuxt", "bower_components", "vendor",',
  '        ".parcel-cache", "out"',
  '      ]);'
].join("\n");

async function main() {
  console.log("[patch] leyendo:", TOOLS);
  const original = await fs.readFile(TOOLS, "utf8");

  if (original.includes('"brain-seed"')) {
    console.log("[patch] ya estaba aplicado. Nada que hacer.");
    return;
  }

  const hasCRLF = original.includes("\r\n");
  const eol = hasCRLF ? "\r\n" : "\n";
  console.log("[patch] line endings detectados:", hasCRLF ? "CRLF" : "LF");

  const normalized = original.replace(/\r\n/g, "\n");

  if (!normalized.includes(OLD_BLOCK_LF)) {
    console.error("[patch] NO se encontro el bloque IGNORE exacto ni normalizado.");
    process.exit(1);
  }

  const occurrences = normalized.split(OLD_BLOCK_LF).length - 1;
  if (occurrences !== 1) {
    console.error("[patch] el bloque aparece " + occurrences + " veces. Esperaba 1. Abortando.");
    process.exit(1);
  }

  await fs.writeFile(BAK, original, "utf8");
  console.log("[patch] backup:", BAK);

  let patched = normalized.replace(OLD_BLOCK_LF, NEW_BLOCK_LF);
  if (hasCRLF) patched = patched.replace(/\n/g, "\r\n");

  await fs.writeFile(TOOLS, patched, "utf8");
  console.log("[patch] tools.js escrito (", patched.length, "chars )");

  const chk = spawnSync(process.execPath, ["--check", TOOLS], { encoding: "utf8" });
  if (chk.status !== 0) {
    console.error("[patch] node --check FALLO. Restaurando backup...");
    console.error(chk.stderr || chk.stdout);
    await fs.writeFile(TOOLS, original, "utf8");
    process.exit(1);
  }
  console.log("[patch] node --check OK");
  console.log("[patch] LISTO.");
}

main().catch((e) => {
  console.error("[patch] ERROR:", (e && e.stack) || e);
  process.exit(1);
});
