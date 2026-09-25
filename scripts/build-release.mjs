import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '1.5.0';
const versionedExeName = `gafcoreai-v${version}.exe`;

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
const targetReleaseVersioned = path.join(rootDir, 'src-tauri', 'target', 'release', versionedExeName);

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
const distVersioned = path.join(distDir, versionedExeName);
const distUnversioned = path.join(distDir, 'gafcoreai.exe');
const rootVersioned = path.join(rootDir, versionedExeName);
const rootUnversioned = path.join(rootDir, 'gafcoreai.exe');

if (fs.existsSync(srcExe)) {
  fs.copyFileSync(srcExe, targetReleaseVersioned);
  fs.copyFileSync(srcExe, distVersioned);
  fs.copyFileSync(srcExe, distUnversioned);
  fs.copyFileSync(srcExe, rootVersioned);
  fs.copyFileSync(srcExe, rootUnversioned);
  console.log(`\n✅ Ejecutables actualizados y sincronizados en todas las ubicaciones:`);
  console.log(`   📦 ${distVersioned}`);
  console.log(`   📦 ${distUnversioned}`);
  console.log(`   📦 ${rootVersioned}`);
  console.log(`   📦 ${rootUnversioned}`);
  console.log(`   📦 ${targetReleaseVersioned}`);
} else {
  console.error(`❌ No se encontró el ejecutable base en ${srcExe}`);
  process.exit(1);
}
