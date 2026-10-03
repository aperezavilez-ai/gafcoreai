import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '1.5.0';

// Sin version consistente no se compila: el .exe mostraria un numero distinto al del codigo.
try {
  execSync('node --test web/js/__tests__/version-sync.test.mjs', { stdio: 'pipe', cwd: rootDir });
} catch (e) {
  console.error(`❌ La version no coincide en todos los archivos (package.json = ${version}).`);
  console.error(`   Ejecuta primero: node scripts/bump-version.mjs <nueva-version>`);
  process.exit(1);
}

console.log(`🔨 Compilando GafCoreAI versión v${version}...`);

// Limpiar cache del paquete para forzar a Tauri a re-empaquetar todos los archivos web
try {
  const cleanCmd = `"${process.env.USERPROFILE}\\.cargo\\bin\\cargo.exe" clean -p gafcoreai --manifest-path src-tauri/Cargo.toml`;
  execSync(cleanCmd, { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.warn("Advertencia en cargo clean:", e.message);
}

const cargoCmd = `"${process.env.USERPROFILE}\\.cargo\\bin\\cargo.exe" build --release --manifest-path src-tauri/Cargo.toml`;
execSync(cargoCmd, { stdio: 'inherit', cwd: rootDir });

const srcExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'gafcoreai.exe');
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Limpiar cualquier exe viejo con número de versión en dist y en la raíz para evitar duplicidad o confusión
const cleanupOldVersioned = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (/^gafcoreai-v\d+.*\.exe$/i.test(file)) {
      try {
        fs.unlinkSync(path.join(dir, file));
        console.log(`   🧹 Eliminado ejecutable duplicado con versión: ${file}`);
      } catch (err) {
        console.warn(`   ⚠️ No se pudo eliminar ${file}:`, err.message);
      }
    }
  }
};

cleanupOldVersioned(distDir);
cleanupOldVersioned(rootDir);
cleanupOldVersioned(path.join(rootDir, 'src-tauri', 'target', 'release'));

if (!fs.existsSync(srcExe)) {
  console.error(`❌ No se encontró el ejecutable base en ${srcExe}`);
  process.exit(1);
}

try {
  execSync('node scripts/sync-exe.mjs', { stdio: 'inherit', cwd: rootDir });
} catch (_) {
  process.exit(1);
}
