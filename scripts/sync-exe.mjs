// Copia target/release/gafcoreai.exe a dist/ y a la raiz, verificando la copia,
// para que todos los .exe de la carpeta sean la misma version.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')).version;
const srcExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'gafcoreai.exe');

if (!fs.existsSync(srcExe)) {
  console.error(`❌ No existe ${srcExe}`);
  process.exit(1);
}

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const expected = sha(srcExe);
fs.mkdirSync(path.join(rootDir, 'dist'), { recursive: true });

// Versiones anteriores que estaban abiertas en la sincronizacion previa; se borran cuando ya se puede.
const LEFTOVER_RE = /^gafcoreai(-v\d[\w.-]*|\.old-\d+)\.exe$/i;
for (const dir of [rootDir, path.join(rootDir, 'dist')]) {
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (LEFTOVER_RE.test(f)) {
      try { fs.unlinkSync(path.join(dir, f)); } catch (_) {}
    }
  }
}

const exeVersion = (p) => {
  try {
    return execSync(`powershell -NoProfile -Command "(Get-Item -LiteralPath '${p.replace(/'/g, "''")}').VersionInfo.ProductVersion"`, { encoding: 'utf8' }).trim();
  } catch (_) {
    return '';
  }
};

const copyVerified = (target) => {
  fs.copyFileSync(srcExe, target);
  if (sha(target) !== expected) throw new Error('la copia no coincide con el original');
};

let ok = true;
for (const target of [path.join(rootDir, 'dist', 'gafcoreai.exe'), path.join(rootDir, 'gafcoreai.exe')]) {
  try {
    try {
      copyVerified(target);
    } catch (err) {
      if (err.code !== 'EBUSY' && err.code !== 'EPERM') throw err;
      // Windows no deja sobrescribir un .exe abierto, pero si renombrarlo.
      const oldVersion = exeVersion(target) || 'anterior';
      let old = path.join(path.dirname(target), `gafcoreai-v${oldVersion}.exe`);
      if (fs.existsSync(old)) old = old.replace(/\.exe$/, '-2.exe');
      fs.renameSync(target, old);
      copyVerified(target);
      console.log(`   (la version anterior estaba abierta; quedo como ${path.basename(old)} y se borrara en la proxima sincronizacion)`);
    }
    console.log(`✅ v${version} -> ${target}`);
  } catch (err) {
    ok = false;
    console.error(`❌ ${target}: ${err.code === 'EBUSY' || err.code === 'EPERM' ? 'está bloqueado; cierra GafCoreAI y ejecuta: node scripts/sync-exe.mjs' : err.message}`);
  }
}
process.exit(ok ? 0 : 1);
