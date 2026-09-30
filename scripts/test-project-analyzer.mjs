// Test standalone para web/js/project-analyzer.js
// Uso: node scripts/test-project-analyzer.mjs [ruta]
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.argv[2] || "D:\\PROGRAMAS IA\\GAFCOREAI";
const MODULE_SRC = path.resolve("web/js/project-analyzer.js");
const TMP_MJS = path.resolve("web/js/.project-analyzer.tmp.mjs");

async function readDir(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dirPath, e.name);
    let size = null;
    if (e.isFile()) {
      try {
        const st = await fs.stat(full);
        size = st.size;
      } catch (_) {}
    }
    out.push({
      name: e.name,
      path: full,
      isDir: e.isDirectory(),
      isFile: e.isFile(),
      size
    });
  }
  return out;
}

async function readFile(filePath) {
  return await fs.readFile(filePath, "utf8");
}

async function main() {
  console.log("[test] root:", ROOT);
  console.log("[test] module:", MODULE_SRC);
  await fs.access(MODULE_SRC);
  const src = await fs.readFile(MODULE_SRC, "utf8");
  await fs.writeFile(TMP_MJS, src, "utf8");

  let mod;
  try {
    mod = await import(pathToFileURL(TMP_MJS).href + "?t=" + Date.now());
  } catch (e) {
    try { await fs.unlink(TMP_MJS); } catch (_) {}
    throw e;
  }

  const { ProjectAnalyzer } = mod;
  if (!ProjectAnalyzer) throw new Error("ProjectAnalyzer no exportado");

  const pa = new ProjectAnalyzer({
    readDir,
    readFile,
    maxDepth: 5,
    maxFiles: 400,
    budgetChars: 7000
  });

  const t0 = Date.now();
  const outline = await pa.buildOutline(ROOT);
  const dt = Date.now() - t0;

  console.log("\n----- OUTLINE (" + outline.length + " chars, " + dt + "ms) -----\n");
  console.log(outline);
  console.log("\n----- FIN -----");

  try { await fs.unlink(TMP_MJS); } catch (_) {}

  if (!outline.includes("PROJECT OUTLINE")) {
    console.error("[test] FAIL: no se genero el outline");
    process.exit(1);
  }
  if (!outline.includes("src-tauri") && !outline.includes("web\\js") && !outline.includes("web/js")) {
    console.error("[test] FAIL: el outline no incluye dirs prioritarios (src-tauri o web/js)");
    process.exit(1);
  }
  if (!/\d+\.\d+KB|\d+B/.test(outline)) {
    console.error("[test] FAIL: no se reportan tamanos reales");
    process.exit(1);
  }
  console.log("[test] OK");
}

main().catch((e) => {
  console.error("[test] ERROR:", (e && e.stack) || e);
  process.exit(1);
});
