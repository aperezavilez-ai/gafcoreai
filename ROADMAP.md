# 🗺️ ROADMAP OFICIAL — GAFCOREAI

Hoja de ruta estratégica, ciclo de vida de versiones y plan de evolución tecnológica para **GafCoreAI**.

---

## 📌 Estado Actual del Proyecto: `v1.1.0` (Estable & Auditado)

### 🚀 Hitos Completados (v1.1.0)
- [x] **Auditoría Forense y Corrección Quirúrgica:**
  - [x] Eliminación de recursión infinita en `safeFetch` (`providers.js`).
  - [x] Persistencia de archivos nuevos en disco en `maybeWriteToDisk` (`pending-diffs.js`).
  - [x] Soporte nativo de disco en herramientas de lectura y ejecución (`tools.js`).
  - [x] Implementación de ciclo ReAct multi-turno con feedback de herramientas (`core.js`).
  - [x] Blindaje de embeddings contra fallos de CORS (`embeddings.js`).
  - [x] Estandarización de accesos IPC nativos con `tauriBridge` (`code-analyzer.js`).
  - [x] Cableado y persistencia en `localStorage` de los toggles de `#modal-config` (`app.js`).
  - [x] Limpieza de elementos HTML muertos y purga de 109 archivos temporales.
- [x] **Backend Rust (Tauri 2.0):**
  - [x] Terminal PTY interactiva (`portable-pty`).
  - [x] Gestor de procesos Language Server Protocol (LSP).
  - [x] Sistema de archivos nativo con búsqueda recursiva de texto.
  - [x] Integración de Git y cliente SSH.
- [x] **Frontend:**
  - [x] Monaco Editor con soporte Diff y syntax highlighting.
  - [x] Orquestador agéntico en 3 fases concurrentes.
  - [x] Pasarelas multi-modelo (APICredits, ME AI Cloud, OpenAI).

---

## 🧭 Próximas Versiones y Plan de Evolución

### 🌟 Versión `v1.1.0` — Ecosistema de Extensiones & MCP Avanzado
- [ ] **Soporte Completo para Protocolo MCP (Model Context Protocol):**
  - [ ] Integración de clientes MCP stdio y SSE con auto-descubrimiento de herramientas externas.
  - [ ] Interfaz gráfica para habilitar/deshabilitar servidores MCP dinámicamente.
- [ ] **Gestor de Extensiones:**
  - [ ] Instalación de plugins comunitarios desde repositorios GitHub.
  - [ ] API de extensiones para temas visuales y sintaxis personalizada.
- [ ] **Optimización del Motor de RAG:**
  - [ ] Soporte para bases de datos vectoriales locales embebidas (p. ej. SQLite-vss / DuckDB).
  - [ ] Re-ranking semántico de resultados con modelos cross-encoder.

### 🌟 Versión `v1.2.0` — Colaboración & Agentes Autónomos 2.0
- [ ] **Modo Swarm / Agentes Autónomos Persistentes:**
  - [ ] Agentes con memoria episódica en base de datos SQLite persistente local.
  - [ ] Tareas agendadas en segundo plano con cron y watchdogs de compilación.
- [ ] **Colaboración en Tiempo Real:**
  - [ ] Compartir sesiones de terminal y workspace mediante túneles seguros SSH / WebRTC.
  - [ ] Pairing con IA en modo espectador/copiloto continuo.

### 🌟 Versión `v2.0.0` — IDE Autónomo de Siguiente Generación
- [ ] **Compilador y Runtime Agnóstico Multiplataforma:**
  - [ ] Soporte nativo para contenedores Docker / Podman embebidos para ejecución aislada de código.
  - [ ] Soporte para depuración interactiva gráfica (DAP - Debug Adapter Protocol).
- [ ] **Generación de UI Visual:**
  - [ ] Renderizado de componentes interactivos directamente en el chat.
  - [ ] Vista previa en vivo con Hot Reloading bidireccional.

---

## 📈 Historial de Versiones

| Versión | Fecha | Resumen de Cambios |
| :--- | :--- | :--- |
| **v1.0.0** | 24/09/2026 | Lanzamiento inicial auditado, con suite de 23 tests automatizados, Tauri 2.0 en Rust, bucle ReAct multi-agente, PTY interactiva y Monaco Editor. |

---

*Documento actualizado y verificado para la versión 1.0.0 de GafCoreAI.*
