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

const cargoCmd = `"${process.env.USERPROFILE}\\.cargo\\bin\\cargo.exe" build --release --manifest-path src-tauri/Cargo.toml`;
execSync(cargoCmd, { stdio: 'inherit', cwd: rootDir });

const srcExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'gafcoreai.exe');
const targetReleaseVersioned = path.join(rootDir, 'src-tauri', 'target', 'release', versionedExeName);

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
const distVersioned = path.join(distDir, versionedExeName);

if (fs.existsSync(srcExe)) {
  fs.copyFileSync(srcExe, targetReleaseVersioned);
  fs.copyFileSync(srcExe, distVersioned);
  console.log(`\n✅ Ejecutable versionado generado exitosamente:`);
  console.log(`   📦 ${distVersioned}`);
  console.log(`   📦 ${targetReleaseVersioned}`);
} else {
  console.error(`❌ No se encontró el ejecutable base en ${srcExe}`);
  process.exit(1);
}
