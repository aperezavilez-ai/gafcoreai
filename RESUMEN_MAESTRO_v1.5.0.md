# ═══════════════════════════════════════════════════════════════
# RESUMEN MAESTRO GAFCOREAI — Actualizado 26/09/2026 (v1.5.0)
# Punto de Restauración Oficial y Maestro
# ═══════════════════════════════════════════════════════════════

## 🎯 CONTEXTO GENERAL DEL PROYECTO
- **Nombre:** GafCoreAI
- **Tipo:** IDE Inteligente con Agente Autónomo ReAct Senior Multi-Modelo (Dual: Escritorio + Web PWA)
- **Ruta Local:** `D:\PROGRAMAS IA\GAFCOREAI`
- **GitHub:** https://github.com/aperezavilez-ai/gafcoreai (Rama `main` sincronizada)
- **Web Oficial (PWA):** https://gafcoreai.vercel.app (Instalable en cualquier SO)
- **Binario Único de Escritorio:** `D:\PROGRAMAS IA\GAFCOREAI\gafcoreai.exe` (y `dist/gafcoreai.exe`)
- **Autor Oficial:** aperezavilez-ai <281112111+aperezavilez-ai@users.noreply.github.com>
- **Stack:** Tauri v2 + Rust (Backend nativo) | Vanilla JS ESModules + HTML5 + CSS3 (Frontend) | PostgREST / Supabase Self-Hosted

---

## ⚠️ REGLAS CRÍTICAS DE INFRAESTRUCTURA Y ECOSISTEMA (AGENTS.md)
1. **PROHIBIDO** usar Supabase Cloud Oficial (`https://*.supabase.co`) o crear infraestructura de pago.
2. Todo proyecto usa el ecosistema Self-Hosted GAFCORE ($0/mes):
   - **Supabase URL Pública:** `https://supabase.gafcore.com`
   - **Supabase Local API (Kong):** `http://127.0.0.1:54321`
   - **PostgreSQL Directo:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
   - **Supabase Studio UI:** `http://localhost:54323`
   - **Public Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
   - **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`
3. **Aislamiento por esquemas:** Cada proyecto tiene su propio schema (`schema: <project_slug>`) definido en `project-infra.json`.
4. **Regla del Binario Único:** Toda la suite de escritorio compila en un único ejecutable autosuficiente `gafcoreai.exe` (Rust/Tauri empaquetado).
5. **Roadmap como Fuente de Verdad:** `ROADMAP.md` es la única lista de tareas oficial y no debe modificarse sin aprobación explícita.

---

## 🧠 NÚCLEO DEL AGENTE REACT SENIOR & FAST APPLY (v1.5.0)
1. **Inyección Automática de Reglas de Proyecto (`.cursorrules`, `AGENTS.md`, `.agentrules`, `CLAUDE.md`):**
   - El agente detecta de forma autónoma al abrir cualquier carpeta los archivos de reglas del proyecto y los inyecta en la cabecera del `System Prompt` con la más alta prioridad.
   - El modelo obedece las restricciones de arquitectura y convenciones de código sin requerir configuración manual.

2. **Motor Fast Apply Quirúrgico con Fuzzy Chunk Alignment:**
   - Triple estrategia de parcheo en `edit_file`:
     * *Exact Match (0ms):* Sustitución directa idéntica.
     * *CRLF/LF Normalization (0ms):* Tolerancia total a saltos de línea Windows vs Unix.
     * *Fuzzy Chunk Alignment (<2ms):* Ventana deslizante que tolera diferencias de indentación o espacios en blanco emitidos por el modelo y adapta la indentación base del archivo original.
   - Rendimiento validado: parches aplicados en 1 milisegundo.

3. **Anti-Loop Guard (Prevención de Bucles Repetitivos):**
   - El agente registra las firmas de herramientas ejecutadas; si el modelo intenta pedir `list_files` o `read_file` sobre la misma ruta por segunda vez, se intercepta la llamada avisándole que ya tiene los datos en memoria y exigiéndole continuar con archivos nuevos o entregar su reporte.

4. **Garantía de Turno de Síntesis Final (Reporte Obligatorio):**
   - Al finalizar la lectura de herramientas (o al llegar al tope de turnos), el sistema desactiva las herramientas e inyecta un turno de síntesis forzoso exigiendo al modelo redactar su reporte completo en Markdown.
   - El chat NUNCA queda en blanco ni con 0 caracteres.

5. **Nueva UI No Destructiva para Herramientas:**
   - Las operaciones de herramientas se agrupan en un acordeón colapsable discreto (`🔍 Inspección técnica (X operaciones)`).
   - El **reporte Markdown completo y estructurado del asistente siempre es el contenido principal y visible**.

6. **Parser Universal de Tool Calls XML:**
   - Soporta bloques `<tool_call>...</tool_call>`, tags directos `<read_file path="..."/>`, `<edit_file ...>`, `<list_files ...>`, `<run_command ...>` y bloques `write:ruta`.
   - Limpieza automática de UI (`cleanForDisplay`) para no mostrar artefactos XML o JSON al usuario.

7. **Memoria Persistente y Compresión Inspirada en Hermes Agent:**
   - Compresión de Observaciones (`TokenOptimizer.compressObservation`).
   - Destilación Continua a Disco (`AgentMemory.exportToMarkdown` y `syncToDisk` -> `MEMORY.md`).
   - Grafo Sináptico de Memoria (`agent-memory.js`).

---

## 📦 CATÁLOGO DE 50 SKILLS EXPERTAS INTEGRADAS (Zero-Token Overhead)
Ubicación: `brain-seed/skills/` y `web/js/skills.js`.
Detección por intención contextual: solo inyectan tokens cuando el prompt del usuario o la tarea del agente lo requiere.

1. **Automatización & Flujos n8n (14 Skills):**
   - `n8n_agents`, `n8n_mcp_tools`, `n8n_workflow_patterns`, `n8n_advanced_workflows`, `n8n_canvas_best_practices`, `n8n_custom_nodes`, `n8n_database_patterns`, `n8n_error_handling`, `n8n_expression_variables`, `n8n_general_rules`, `n8n_langchain_nodes`, `n8n_node_configuration`, `n8n_subworkflows`, `n8n_version_compatibility`.
2. **Multimedia & Video Programático:**
   - `ffmpeg` (Manipulación de audio/video y streams).
   - `moviepy` (Edición de video programática con Python).
   - `remotion` y `remotion_official` (Generación de video mediante React, composiciones dinámicas, transiciones y renderizado).
3. **Testing, QA y Auditoría:**
   - `browser_testing_devtools` (Testing E2E mediante DevTools/Chrome).
   - `playwright_recording` (Grabación y tests de automatización con Playwright).
   - `tdd_development` (Desarrollo guiado por pruebas unitarias y de integración).
4. **Seguridad & Hardening:**
   - `security_hardening` (Protección contra XSS, inyecciones, sanitización y CSP).
   - `security_guidance` (Auditoría de dependencias y políticas de menor privilegio).
5. **Calidad, Arquitectura & Frontend:**
   - `performance_optimization` (Métricas Core Web Vitals, LCP, INP, optimización de render).
   - `code_simplification` (Refactorización limpia y eliminación de deuda técnica).
   - `deep_project_analysis` (Auditoría profunda de arquitectura y dependencias).
   - `frontend_ui_engineering` y `frontend_design` (Componentes modernos, diseño responsivo, CSS accesible).
6. **Integraciones Cloud & Bases de Datos:**
   - Supabase self-hosted, PostgREST APIs, Workers y WebSockets locales.

---

## 🌐 CATÁLOGO DE PROVEEDORES Y MODELOS (v11)
Archivo: `web/js/providers.js`

- **ME AI Cloud (GafCore Cloud):**
  - `meai-step-3-7-flash` (Step-3.7-Flash — Altísima velocidad y razonamiento).
  - `meai-minimax-m2-7` (MiniMax M2.7 — Alta precisión en tareas complejas y código).
  - `meai-mimo-v2.5` (Mimo-v2.5).
  - `meai-deepseek-chat` (DeepSeek-V3).
  - `meai-deepseek-reasoner` (DeepSeek-R1).
  - `meai-glm-5` (GLM-5).
  - `meai-kimi-k2.6` (Kimi K2.6).
  - `meai-qwen3.6-plus` (Qwen 3.6 Plus).

- **APICredits & Proveedores Directos Adicionales:**
  - Claude: Claude 3.7 Sonnet (con Thinking), Claude 3.5 Sonnet, Claude 3.5 Haiku, Opus.
  - OpenAI: GPT-5 / GPT-4o / o1 / o3-mini.
  - DeepSeek Directo: DeepSeek Chat & Reasoner.
  - Ollama / LM Studio: Modelos locales con soporte de Tool Calling offline.

---

## 🧪 ESTADO DE VALIDACIÓN Y SUITE DE PRUEBAS
- **Test Fast Apply (`node scripts/test-fast-apply.mjs`):** 100% PASS (1ms por parche).
- **Test E2E Completo (`node scripts/test-full-e2e.mjs`):** 72 / 72 PRUEBAS SUPERADAS (100% PASS).
- **Test Pipeline Multimedia (`node scripts/verify-media-pipeline.mjs`):** 30 / 30 PRUEBAS SUPERADAS (100% PASS).
- **Build de Escritorio:** Binario `gafcoreai.exe` (13.72 MB) compilado y validado en Windows 11.
- **Repositorio Git:** Sincronizado en rama `main` en https://github.com/aperezavilez-ai/gafcoreai.
