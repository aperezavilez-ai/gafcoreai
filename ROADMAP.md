# GAFCOREAI — ROADMAP

Fuente de verdad del proceso del proyecto para el agente. LEER ESTO ANTES de cualquier tool.
PROHIBIDO reexplorar el repo entero si este documento cubre la tarea. Solo read_file de lo que vas a editar.
EditCore actualiza este archivo tras cambios. No pedirlo al usuario. No pegar codigo largo.

## Proceso
- Fase: implementacion
- Estado: Ciclo finalizado.
- Actualizado: 2026-10-01 20:02
- Stack: Tauri
- Scripts: tauri, dev, serve, build, build:web, build:desktop, build:tauri, release, test, test:unit
- Preview: desconocido — usa el preview del IDE, no inventes puertos

## Mapa
- package.json — gafcoreai · scripts: tauri, dev, serve, build, build:web, build:desktop, build:tauri, release, test, test:unit
- stack: Tauri
- .cursorrules
- .github/
- .gitignore
- .vercelignore
- AGENTS.md
- ANALISIS_FORENSE_20260923.md
- ANALISIS_FORENSE_20260930.md
- app-icon.png
- ARQUITECTURA_20260923_0758.txt
- brain-seed/
- CHANGELOG.md
- CLAUDE.md
- clean.cjs
- enhance-tools.cjs
- fix-code.cjs
- fix-flicker.cjs
- fix-grid.cjs
- fix-js-grid.cjs
- fix-open-folder.cjs
- fix-overlay.cjs
- fix.cjs
- gafcoreai.exe
- inject-js.cjs
- inject.cjs
- mod-html.cjs
- mod-js.cjs
- move-overlay.cjs
- package-lock.json
- project-infra.json
- README.md
- REPORTE_20260923_075651.txt
- RESUMEN_MAESTRO_v1.5.0.md
- scripts/
- scripts/build-release.mjs
- scripts/bump-version.mjs
- scripts/migrate-secrets.mjs
- scripts/safe-build.mjs
- scripts/smoke-test.mjs
- scripts/test-fast-apply.mjs
- scripts/test-full-e2e.mjs
- scripts/test-project-analyzer.mjs
- scripts/verify-full-system.mjs
- scripts/verify-media-pipeline.mjs
- scripts/verify-synaptic-graph.mjs
- src-tauri/
- src-tauri/build.rs

## Archivos clave (no reexplorar)
- package.json
- README.md
- RESUMEN_MAESTRO_v1.5.0.md
- ANALISIS_FORENSE_20260930.md
- project-infra.json
- src-tauri/Cargo.toml
- Usar el Mapa; no list_files('.') si ya hay rutas aqui

## Tarea activa
- ## Habilidades especializadas activas (Skills)

### Skill: editcore-connect
Guía para conectar el proyecto del usuario con GitHub, Vercel, Supabase, o configurar las API keys de Claude/OpenAI. Úsala cuando el usuario pid

## Bloqueos / bugs conocidos
- Ninguno registrado

## Decisiones
- Ninguna registrada

## Cambios recientes
- package.json
- README.md
- RESUMEN_MAESTRO_v1.5.0.md
- ANALISIS_FORENSE_20260930.md
- project-infra.json
- src-tauri/Cargo.toml

## Verificado
- Pendiente

## Siguiente
- Proponer optimización o nueva funcionalidad.

## Regla anti-reexploracion
- Si el pedido del usuario apunta a un archivo ya listado arriba: ve DIRECTO a read_file/replace_in_file de ese path.
- PROHIBIDO list_files('.') / project_discovery / codebase_map del repo completo en el mismo turno si el Mapa ya tiene >= 5 entradas utiles.
- Tras mutar: EditCore refresca este ROADMAP; continua desde aqui en el siguiente mensaje.
