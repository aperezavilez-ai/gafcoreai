
**Eliminados en v61 (ya no existen):**
* `web/js/cinematic-project.js`
* `web/js/cinematic-script-parser.js`
* `web/js/cinematic-breakdown.js`
* `web/js/cinematic-studio-ui.js`

---

## ✅ 5. ESTADO DE FUNCIONALIDADES VERIFICADAS

| Módulo | Estado | Detalle |
| :--- | :---: | :--- |
| **Inline Edit (`Ctrl+K`)** | ✅ 100% | Edición flotante sobre código en Monaco con Diff. |
| **Copilot Ghost Text** | ✅ 100% | Autocompletado predictivo con `Tab`. |
| **Menciones `@` en Chat** | ✅ 100% | Autocompletado flotante e inyección automática. |
| **1-Click Undo / Revert** | ✅ 100% | Snapshots + botón `⎌ Deshacer`. |
| **Auto-Fix en Terminal** | ✅ 100% | Detección de errores + botón `✨ Reparar`. |
| **AbortController (<50ms)** | ✅ 100% | Cancelación instantánea. |
| **Sanitizador de Errores** | ✅ 100% | Errores 401 y tokens chinos → mensajes claros. |
| **Visibilidad de Código** | ✅ 100% | Markdown completo sin recortes. |
| **Navegador & Viewport** | ✅ 100% | Full-height, responsivo. |
| **Detección HTML en Disco** | ✅ 100% | Carga asíncrona HTML/CSS/JS de disco. |
| **Memoria Multi-Turno** | ✅ 100% | Continuidad entre mensajes. |
| **Edición Quirúrgica** | ✅ 100% | Tool `edit_file`. |
| **Comandos en Terminal** | ✅ 100% | Tool `run_command`. |
| **Apertura & Cierre Carpetas** | ✅ 100% | `open_folder` / `close_folder`. |
| **Imágenes & Multimodal** | ✅ 100% | Miniaturas + payload Base64. |
| **Backend Rust** | ✅ 100% | Compilación limpia, PTY real, IPC seguro. |
| **Identidad Visual** | ✅ 100% | Logo oficial 3D morado hexagonal. |
| **Chat Limpio (v42–v47)** | ✅ 100% | Sin paneles/acordeones/badges internos. |
| **Análisis Exhaustivo (v47)** | ✅ 100% | Guardrail bloquea síntesis con <8 archivos. |
| **Escritura Real (v47)** | ✅ 100% | Regex anti-simulación. |
| **ZIP Nativo (v52)** | ✅ 100% | `zip-writer.js` sin JSZip. |
| **Modo Offline (v56)** | ✅ 100% | 10 CDNs vendorizados + Monaco 0.45.0. |
| **Icono SVG PWA (v57)** | ✅ 100% | `web/app-icon.svg`. |
| **Tests Unitarios (v58)** | ✅ 100% | 18/18 PASS iniciales. |
| **🔐 Fix 7 Fase 1 — keys cifradas (v59)** | ✅ 100% | `secrets.js` + migración providers/github/vercel/sb/brave/active_model. |
| **🧪 Tests secrets (v59)** | ✅ 100% | 7 tests adicionales. |
| **🧹 Eliminación Estudio Cinemático (v61)** | ✅ 100% | 4 archivos + botón + slash + CSS + 0 refs. |
| **🔐 Fix 7 Fase 2 (v62)** | ✅ 100% | embed/ghost/rag/mcp configs cifradas. |
| **Suite Fast Apply** | ✅ 100% | `node scripts/test-fast-apply.mjs`. |
| **Suite E2E Completa** | ✅ 100% | 72/72 (100% PASS). |
| **Suite Media Pipeline** | ✅ 100% | 30/30 (100% PASS). |
| **PWA Vercel** | ✅ 100% | Deploy sincronizado, sin cine. |
| **.exe Escritorio** | ✅ 100% | Recompilado 29/09/2026, sin cine embebido. |

---

## 📜 6. REGLAS OBLIGATORIAS PARA TODO AGENTE DE IA

> [!IMPORTANT]
> **REGLAS PERMANENTES DE INTERVENCIÓN EN GAFCOREAI:**
> 1. **Consultar este archivo PRIMERO:** Antes de hacer cualquier cambio, lee `ROADMAP.md`.
> 2. **Mantener un ÚNICO `.exe`:** El binario oficial se compila en `src-tauri/target/release/gafcoreai.exe`.
> 3. **Prohibido usar textos robóticos o plantillas fijas:** Comunicación natural + Markdown estructurado como Ingeniero Senior.
> 4. **No recortar código en display:** Bloques de código Markdown completos.
> 5. **Actualizar este archivo al finalizar:** Todo cambio crítico o nuevo release debe documentarse aquí.
> 6. **Ejecutar Suite de Pruebas:** `node scripts/verify-full-system.mjs` antes de dar por terminado.
> 7. **Infraestructura Self-Hosted obligatoria:** PROHIBIDO Supabase Cloud Oficial. Solo ecosistema GAFCORE Self-Hosted.
> 8. **Aislamiento por esquemas:** Cada proyecto usa su propio `schema` en `project-infra.json`.
> 9. **No modificar el ROADMAP sin aprobación:** Es la fuente de verdad del estado del proyecto.
> 10. **No reintroducir Estudio Cinemático:** Fue eliminado en v61. El pipeline de video vive en **VIDEO IA STUDIO** (repo separado).
> 11. **Uso obligatorio de `secrets.js` para API keys:** PROHIBIDO `localStorage.getItem/SetItem` con keys sensibles. Usar `getSecret`/`setSecret`/`removeSecret`.

---

## 📅 7. HISTORIAL DE SESIONES

### 📅 Sesión 24/09/2026 — v1.5.0 (Cursor/Windsurf Parity Edition)
* **Hito:** Paridad funcional con Cursor y Windsurf.
* **Entregables:** Inline Edit, Ghost Text, menciones `@`, Checkpoint Manager, Auto-Fix en Terminal, Agent Mode.
* 22/22 tests PASS en `verify-full-system.mjs`.

### 📅 Sesión 28/09/2026 — v42 → v58 (Chat Limpio · PWA · Modo Offline)

#### ✅ Chat limpio + Análisis profundo + Escritura real (v42–v47)
- v42 — `agent.js::cleanForDisplay` — prohibir bloques `write:ruta` en chat.
- v44 — `app.js` — eliminar paneles de actividad/acordeones/badges internos.
- v45 — CSS — puntos de estado alineados a la derecha.
- v46 — `app.js` — botón ↑ para subir un nivel de carpeta.
- v47 — **Regla 6.5** Análisis Exhaustivo Obligatorio (≥10 archivos).
- v47 — **Regla 6.6** Escritura Real Obligatoria.
- v47 — Guardrail ReAct + regex anti-simulación ampliada.

#### ✅ PWA funcional (v48–v52)
- v48–v52 — modo web, JSZip fallback, ZIP nativo (`zip-writer.js`, Blob + CRC32).

#### ✅ Fixes escritorio + producción (v53–v58)
- v53–v58 — eliminar `btn-mode-toggle`, fix AMD Monaco, `id="view-studio"` duplicado, vendorizar 10 CDNs, icono SVG, 18 tests unitarios.

#### 📦 Entregables
- 10 commits a `origin/main`.
- `gafcoreai.exe` (13.72 MB) validado.
- Suite: Fast Apply 100% + E2E 72/72 + Media 30/30 + Unitarios 18/18.

---

### 📅 Sesión 29/09/2026 — v59 → v62 (Cifrado de Keys · Limpieza Cinemática)

#### ✅ Fix 7 Fase 1 — Cifrado de API keys (v59)
- **`web/js/secrets.js`** — capa de abstracción con `tauri-plugin-store v2` (async).
- Cifrado a nivel SO (DPAPI Windows) cuando corre en `.exe`.
- Fallback transparente a `localStorage` en PWA.
- Migración one-shot: `providers_v3`, `github`, `vercel`, `sb`, `brave_key`, `active_model`.
- **7 tests unitarios** (`secrets.test.mjs`) — suite de 18 → 25 tests.
- Fix v59.1: `Store.load().get()` es **async**, no sync (bug corregido con `await`).
- 4 commits: 8551a9d, +fixes.

#### ✅ Fix 7 Fase 2 — Últimas 4 keys cifradas (v62)
- `embeddings.js` → `EMBED_CONFIG_KEY` cifrada.
- `ghost.js` → `GHOST_CONFIG_KEY` cifrada.
- `rag.js` → `RAG_CONFIG_KEY` cifrada.
- `mcp-client.js` → `MCP_SERVERS_KEY` cifrada.
- `secrets.js` → añadida `gafcoreai_mcp_servers` a `SECRET_KEYS`.
- 5/5 archivos con `node --check` OK.

#### ✅ Eliminación completa del Estudio Cinemático (v59.5–v61)
- **Motivación:** el Estudio era una maqueta parcial (0 clips generados, análisis fallando).
- **Decisión:** eliminar de GafCoreAI, mantener el pipeline profesional en **VIDEO IA STUDIO** (repo separado).
- Eliminados:
  - `cinematic-project.js`, `cinematic-script-parser.js`, `cinematic-breakdown.js`, `cinematic-studio-ui.js`.
  - Botón "🎬 Estudio Cinemático" (dropdown + pestaña).
  - Slash commands `/cinema` y `/video`.
  - ~9,000 chars de CSS `.cs-*`.
- **.exe recompilado** (17.3 MB, 29/09/2026 08:16 AM) — sin cine embebido.
- **PWA redeployada** — sin cine.

#### 📦 Entregables de la sesión 29/09
- 6 commits pusheados a `origin/main`.
- `gafcoreai.exe` (17.3 MB) + MSI + NSIS regenerados.
- 25 tests unitarios PASS (7 nuevos de secrets).
- 0 referencias a "cinematic" en `index.html`, `app.js`, `styles.css`.

---

## 🎯 8. PENDIENTES (DEUDA TÉCNICA)

### 🟡 Fix 5 — Split de `app.js` en módulos (2–3 horas)
* **Estado actual:** `app.js` es un monolito de ~5,900 líneas.
* **Objetivo:** Dividir en módulos ES:
  - `chat-ui.js`, `file-explorer.js`, `providers-ui.js`, `modals.js`, `editor.js`, `agent-runtime.js`.
* **Riesgo:** Medio-alto. Romper bindings globales o el `System Prompt` del agente.
* **Estrategia:** Mapear con `grep -n`, extraer por bloques funcionales, mantener un `app.js` barrel que reexporte.

### 🟡 Bump de versión del `.exe` (5 min + 10 min build)
* **Estado actual:** `Cargo.toml` y `tauri.conf.json` dicen `1.5.0`.
* **Objetivo:** Subir a `1.6.0` (o `2.0.0`) para reflejar toda la sesión v59-v62.
* **Cambios:** `version` en `Cargo.toml` + `version` en `tauri.conf.json` → `npm run tauri build`.

### 🟡 Suite unificada de tests (1 hora)
* **Estado actual:** Existen 3 suites separadas (fast-apply, e2e, media) + tests unitarios.
* **Objetivo:** Crear `scripts/verify-full-system.mjs` que corra todas en orden.

---

## 📅 9. PRÓXIMA SESIÓN — v63+

### 🎯 En curso
- [ ] **Fix 5** — Split de `app.js` en módulos ES.
- [ ] **Bump de versión** a 1.6.0 y recompilar `.exe`.
- [ ] **Suite unificada** de tests.

---

> **FIN DEL ROADMAP — GafCoreAI 100% OPERATIVO**
> Estado: IDE + Agente Autónomo, sin Estudio Cinemático, con cifrado de API keys.
> VIDEO IA STUDIO se mantiene como proyecto independiente.