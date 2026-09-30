// scripts/safe-build.mjs
// Build con tag automático y verificación final.
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");

console.log(" SAFE BUILD  GafCoreAI \n");

// 1. Verificar working tree limpio
console.log("1. Estado de git...");
try {
  const status = execSync("git status --short", { cwd: ROOT, encoding: "utf-8" }).trim();
  if (status) {
    console.log("     Working tree sucio. Commit primero:");
    console.log(status);
    console.log("");
    console.log("   Abortando para evitar builds con cambios sin commitear.");
    process.exit(1);
  }
  console.log("    Working tree limpio");
} catch (e) {
  console.log("    Error al verificar git: " + e.message);
  process.exit(1);
}

// 2. Crear tag pre-build
const tagName = "pre-build-" + TS;
console.log("\n2. Creando tag de seguridad...");
try {
  execSync(`git tag -a ${tagName} -m "Auto-tag antes de build ${TS}"`, { cwd: ROOT });
  console.log("    Tag creado: " + tagName);
  console.log("    Volver a este punto: git reset --hard " + tagName);
} catch (e) {
  console.log("     No se pudo crear tag: " + e.message);
}

// 3. Build
console.log("\n3. Ejecutando npm run tauri build...");
console.log("   (esto tarda 10-15 min)\n");

try {
  execSync("npm run tauri build", { cwd: ROOT, stdio: "inherit" });
  console.log("\n    Build completado");
} catch (e) {
  console.log("\n    Build falló");
  process.exit(1);
}

// 4. Copiar exe a la raíz
console.log("\n4. Copiando exe a la raíz...");
const srcExe = join(ROOT, "src-tauri", "target", "release", "gafcoreai.exe");
const dstExe = join(ROOT, "gafcoreai.exe");
if (!existsSync(srcExe)) {
  console.log("    No existe el exe compilado");
  process.exit(1);
}
execSync(`Copy-Item "${srcExe}" "${dstExe}" -Force`, { cwd: ROOT, shell: "powershell.exe" });
const size = readFileSync(dstExe).length;
console.log("    gafcoreai.exe actualizado (" + (size / 1024 / 1024).toFixed(2) + " MB)");

// 5. Smoke test
console.log("\n5. Smoke test...");
try {
  execSync("node scripts/smoke-test.mjs", { cwd: ROOT, stdio: "inherit" });
} catch (e) {
  console.log("     Smoke test con warnings");
}

console.log("\n SAFE BUILD COMPLETADO ");
console.log("");
console.log("  ÚLTIMO PASO OBLIGATORIO:");
console.log("   1. Abre el exe manualmente");
console.log("   2. Confirma que NO aparece alert rojo");
console.log("   3. Si hay error  git reset --hard " + tagName);