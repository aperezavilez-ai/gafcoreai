# Changelog GafCoreAI

## [v1.5.4] — 2026-09-30

### Fixed
- `agent.js`: inyecta fecha y hora actual del sistema en el system prompt. El agente ya no responde "no tengo acceso a la hora actual".
- Conexiones de GitHub, Vercel, Supabase, la key de Brave y el modelo activo ya no se pierden al reiniciar: `app.js`, `tools.js`, `git-real.js`, `mentions.js` y `rag.js` usan `getSecret`/`setSecret`/`removeSecret` en vez de `localStorage`.
- `secrets.js`: `setSecret()` escribe al store de inmediato (solo el `save()` queda con debounce); los cambios hechos justo antes de cerrar ya no se pierden.
- `supabase_sync` y `publish_project` hacen un GET real a `{url}/rest/v1/` con la anon key y reportan error si falla, en vez de decir "Conectado" siempre.
- `run_shell` agrega `[exit code: N]` cuando el comando falla; nuevo comando `run_shell_ex` devuelve `{ code, stdout, stderr }`. `deploy_vercel` y `publish_project` marcan el deploy como fallido si el código de salida no es 0.
- Cache-busting de `styles.css` y `js/app.js` alineado a la versión.

### Security
- El agente pide aprobación por llamada (Rechazar / Permitir siempre en la sesión / Permitir una vez) antes de ejecutar comandos, git, deploy, SSH, `run_project` y `open_folder`. Tras leer contenido web, "permitir siempre" se suspende 10 minutos.
- El permiso "Ejecutar comandos" ya se puede desactivar.
- `write_file` y `delete_file` solo operan dentro de la carpeta abierta; borrar una carpeta pide confirmación. `delete_path` (Rust) se niega a borrar raíces de disco, carpetas de primer nivel y el home del usuario.
- Herramientas git sin shell (usan `git.rs` con argumentos separados); ramas validadas y `--` antes de rutas/URLs.
- `window.confirm` síncrono devuelve `false` en vez de `true`.
- URLs de Supabase Cloud reemplazadas por `https://supabase.gafcore.com`.

### Changed
- `scripts/bump-version.mjs <version>` reemplaza a los scripts `patch-*` sueltos: actualiza `package.json`, `Cargo.toml`, `tauri.conf.json`, `index.html` (title, badge y `?v=`).
- `npm test` corre todas las pruebas de `web/js/__tests__/`.
- `Cargo.lock` y `package-lock.json` ahora se versionan.
- Backups `*.bak-*` movidos a `_backups/` (excluido de git y de Vercel).
- Bump 1.5.3 -> 1.5.4 en `Cargo.toml`, `tauri.conf.json`, `package.json`, `index.html`.

### Removed
- `web/js/updater.js` (código muerto; el actualizador vive en `app.js`).
- `windows_subsystem` duplicado en `src-tauri/src/lib.rs` (queda solo en `main.rs`).
- Scripts `patch-bump-152/153/154`, `patch-hour-154`, `patch-agent-v13`, `patch-tools-v14`.

## [v1.5.3] — 2026-09-30

### Fixed
- `tauri.conf.json`: título de ventana actualizado a "GafCoreAI v1.5.3".
- `web/index.html`: badge de versión actualizado a v1.5.3.
- Bump 1.5.2 -> 1.5.3 en `Cargo.toml`, `tauri.conf.json`, `package.json`, `index.html`.

## [v1.5.2] — 2026-09-30

### Added
- `project-analyzer.js`: módulo puro de análisis jerárquico de proyectos (outline con símbolos por archivo, prioridad de dirs de código, reporta dirs omitidos por budget).
- `agent.js`: `_forceAnalysisReads` usa ProjectAnalyzer y elimina 9 `read_file` hardcodeados de GafCoreAI.

### Fixed
- `tools.js` `list_files`: IGNORE ampliado (brain-seed, docs, examples, fixtures, .github, etc.) para evitar lecturas masivas irrelevantes.
- UI: spinner "Pensando..." se limpia cuando la respuesta final es vacía o no hay síntesis.

## [v1.5.1] — 2026-09-30

### Added
- `/new <nombre>` crea proyecto web determinista en `D:\PROGRAMAS IA\NUEVOS PROYECTOS\<nombre>\` con 4 archivos fijos (index.html, styles.css, script.js, package.json).
- Atajos de teclado globales: `Ctrl+N` (nuevo proyecto), `Ctrl+O` (abrir carpeta), `Ctrl+S` (guardar), `Ctrl+B` (toggle panel derecho).
- Botón "Historial" que lista las conversaciones guardadas por proyecto.
- API keys en `tauri-plugin-store` con fallback transparente a `localStorage` en PWA. (Nota v1.5.4: el store guarda JSON en texto plano, no cifra; el cifrado real queda pendiente.)
- Script `scripts/smoke-test.mjs` — verifica que el exe no tenga errores conocidos embebidos.
- Script `scripts/safe-build.mjs` — build con tag automático y verificación.
- Git hook `pre-commit` — valida sintaxis JS antes de cada commit.

### Fixed
- `agent.js` — constructor acepta `opts = {}` por defecto (evita error `reading 'terminal'`).

### Changed
- Versión alineada a `1.5.1` en `Cargo.toml`, `tauri.conf.json`, `package.json`, `index.html`.
- Título de ventana: `GafCoreAI v1.5.1`.

## [v1.5.0] — 2026-09-24

### Added
- Chat limpio tipo Claude/ChatGPT (sin paneles de actividad, sin badges internos).
- Reglas 6.5 (Análisis Exhaustivo Obligatorio) y 6.6 (Escritura Real Obligatoria).
- PWA con ZIP nativo (sin JSZip).
- Modo offline (10 CDNs vendorizados + Monaco 0.45.0).
- Icono SVG.

### Removed
- Estudio Cinemático completo. Vive en proyecto separado: **VIDEO IA STUDIO** (https://github.com/aperezavilez-ai/video-ia-studio).
