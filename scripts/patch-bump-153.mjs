// Patcher v1.5.3 - fix title + version-badge + bump 1.5.2 -> 1.5.3
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";

const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

// Fix 1: dos strings que quedaron en v1.5.1
const fixes = [
  { file: "src-tauri/tauri.conf.json", from: '"title": "GafCoreAI v1.5.1"', to: '"title": "GafCoreAI v1.5.3"' },
  { file: "web/index.html",            from: '<span class="version-badge">v1.5.1</span>', to: '<span class="version-badge">v1.5.3</span>' }
];

// Fix 2: bump global 1.5.2 -> 1.5.3
const bumps = [
  { file: "src-tauri/Cargo.toml",     from: 'version = "1.5.2"',  to: 'version = "1.5.3"' },
  { file: "src-tauri/tauri.conf.json", from: '"version": "1.5.2"', to: '"version": "1.5.3"' },
  { file: "package.json",             from: '"version": "1.5.2"',  to: '"version": "1.5.3"' },
  { file: "web/index.html",           from: '<title>GafCoreAI v1.5.2</title>', to: '<title>GafCoreAI v1.5.3</title>' }
];

async function patch(t, label) {
  const original = await fs.readFile(t.file, "utf8");
  if (!original.includes(t.from)) {
    // Podría estar ya aplicado
    if (original.includes(t.to)) {
      console.log("[skip " + label + "] " + t.file + " ya tiene target");
      return;
    }
    console.error("[FAIL " + label + "] " + t.file + " no contiene: " + t.from);
    process.exit(1);
  }
  const occurrences = original.split(t.from).length - 1;
  if (occurrences !== 1) {
    console.error("[FAIL " + label + "] " + t.file + " tiene " + occurrences + " ocurrencias. Abortando.");
    process.exit(1);
  }
  const bak = t.file + ".bak-" + STAMP;
  await fs.writeFile(bak, original, "utf8");
  const out = original.replace(t.from, t.to);
  await fs.writeFile(t.file, out, "utf8");
  console.log("[OK " + label + "] " + t.file + "  " + t.from + "  ->  " + t.to);
}

async function main() {
  console.log("[bump] -> v1.5.3");
  // Orden: primero fixes de strings v1.5.1, luego bumps v1.5.2 -> v1.5.3
  for (const t of fixes) await patch(t, "fix");
  for (const t of bumps) await patch(t, "bump");

  const chk = spawnSync(process.execPath, ["--check", "web/js/app.js"], { encoding: "utf8" });
  if (chk.status !== 0) { console.error(chk.stderr); process.exit(1); }
  console.log("[bump] LISTO.");
}
main().catch(e => { console.error("[bump] ERROR:", e.stack || e); process.exit(1); });
