# Changelog  GafCoreAI

[v1.5.2]  2026-09-30
Added
- project-analyzer.js: modulo puro de analisis jerarquico de proyectos (outline con simbolos por archivo, prioridad de dirs de codigo, reporta dirs omitidos por budget).
- agent.js: _forceAnalysisReads usa ProjectAnalyzer y elimina 9 read_file hardcodeados de GafCoreAI.
Fixed
- tools.js list_files: IGNORE ampliado (brain-seed, docs, examples, fixtures, .github, etc.) para evitar lecturas masivas irrelevantes.
- UI: spinner 'Pensando...' se limpia cuando la respuesta final es vacia o no hay sintesis.
## [v1.5.1]  2026-09-30

### Added
- `/new <nombre>` crea proyecto web determinista en `D:\PROGRAMAS IA\NUEVOS PROYECTOS\<nombre>\` con 4 archivos fijos (index.html, styles.css, script.js, package.json).
- Atajos de teclado globales: `Ctrl+N` (nuevo proyecto), `Ctrl+O` (abrir carpeta), `Ctrl+S` (guardar), `Ctrl+B` (toggle panel derecho).
- Botón " Historial" que lista las conversaciones guardadas por proyecto.
- Cifrado de API keys con `tauri-plugin-store` (DPAPI en Windows). Fallback transparente a `localStorage` en PWA.
- Script `scripts/smoke-test.mjs`  verifica que el exe no tenga errores conocidos embebidos.
- Script `scripts/safe-build.mjs`  build con tag automático y verificación.
- Git hook `pre-commit`  valida sintaxis JS antes de cada commit.

### Fixed
- `agent.js`  constructor acepta `opts = {}` por defecto (evita error `reading 'terminal'`).

### Changed
- Versión alineada a `1.5.1` en `Cargo.toml`, `tauri.conf.json`, `package.json`, `index.html`.
- Título de ventana: `GafCoreAI v1.5.1`.

## [v1.5.0]  2026-09-24

### Added
- Chat limpio tipo Claude/ChatGPT (sin paneles de actividad, sin badges internos).
- Reglas 6.5 (Análisis Exhaustivo Obligatorio) y 6.6 (Escritura Real Obligatoria).
- PWA con ZIP nativo (sin JSZip).
- Modo offline (10 CDNs vendorizados + Monaco 0.45.0).
- Icono SVG.

### Removed
- Estudio Cinemático completo. Vive en proyecto separado: **VIDEO IA STUDIO** (https://github.com/aperezavilez-ai/video-ia-studio).
