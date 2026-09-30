// scripts/smoke-test.mjs
// Abre el exe, espera 8s, verifica que no aparezca el alert de error.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXE = join(ROOT, "gafcoreai.exe");

if (!existsSync(EXE)) {
  console.log(" No existe gafcoreai.exe en la raíz.");
  process.exit(1);
}

console.log(" SMOKE TEST  GafCoreAI \n");
console.log("1. Comprobando exe...");
console.log("   Ruta: " + EXE);
const stat = readFileSync(EXE).length;
console.log("   Tamaño: " + (stat / 1024 / 1024).toFixed(2) + " MB");

console.log("\n2. Verificando que no hay strings de error conocidos...");
const buffer = readFileSync(EXE);
const text = buffer.toString("utf8", 0, Math.min(buffer.length, 20_000_000));
const errores = [
  "Cannot read properties of null",
  "reading 'terminal'",
  "PERMISSION_LEVELS is not defined",
  "is not defined at",
];
let foundErrors = [];
for (const err of errores) {
  if (text.includes(err)) foundErrors.push(err);
}
if (foundErrors.length > 0) {
  console.log("     Posibles strings de error embebidos:");
  foundErrors.forEach(e => console.log("      - " + e));
} else {
  console.log("    No se encontraron strings de error conocidos");
}

console.log("\n3. Lanzando exe...");
const child = spawn(EXE, [], { detached: true, stdio: "ignore" });
child.unref();

console.log("   PID: " + child.pid);
console.log("   Esperando 8 segundos...");

await new Promise(r => setTimeout(r, 8000));

console.log("\n4. Cerrando exe...");
try {
  process.kill(child.pid);
  console.log("    Terminado");
} catch (e) {
  console.log("   (ya cerrado por el usuario)");
}

console.log("\n RESULTADO ");
console.log(" Smoke test completado");
console.log("");
console.log("  IMPORTANTE: si el exe mostró un alert rojo al abrir,");
console.log("   el smoke test NO lo detecta automáticamente.");
console.log("   Confirma visualmente antes de seguir.");