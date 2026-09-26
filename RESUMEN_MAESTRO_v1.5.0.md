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

## 🧠 NÚCLEO DEL AGENTE REACT SENIOR (v1.5.0)
1. **Parser Universal de Tool Calls XML:**
   - Soporta bloques estándar `<tool_call>{"name":"...","arguments":{...}}</tool_call>`.
   - Soporta tags XML directos de modelos avanzados (ej. `<read_file path="..."/>`, `<edit_file path="..."><target>...</target><replacement>...</replacement></edit_file>`, `<list_files ...>`, `<run_command ...>`).
   - Soporta atributos inline y etiquetas hijas sin fallos de parseo.
   - Limpieza automática de UI (`cleanForDisplay`) para no mostrar artefactos XML o JSON al usuario.

2. **Bucle de Auto-Recuperación Silenciosa (Silent Recovery Loop):**
   - Elimina la auto-justificación o redacción de ensayos ante errores de herramientas (evitando el bucle de Grok-4.5 / DeepSeek).
   - Inyecta directivas internas estrictas: cuando un comando o edición falla, el agente auto-diagnostica mediante `read_file` / `list_files` y corrige los parámetros de forma 100% silenciosa y autónoma.

3. **Action Guardrail Anti-Simulaciones & Anti-Placeholders:**
   - Impide que el modelo diga "Listo, archivo editado" si en realidad no ejecutó un `write_file` o `edit_file` con éxito.
   - Las herramientas `read_file`, `write_file` y `edit_file` interceptan cadenas genéricas o placeholders (`valor_obligatorio`, `ruta/al/archivo.ext`, `bloque_antiguo`) y guían al agente a inspeccionar el código real antes de proceder.
   - Regla 11 del System Prompt: Separación estricta entre análisis (solo herramientas de lectura) y modificación (herramientas de escritura).

4. **Memoria Persistente y Compresión Inspirada en Hermes Agent:**
   - **Compresión de Observaciones (`TokenOptimizer.compressObservation`):** Trunca salidas masivas de consola o búsquedas reteniendo cabeceras clave, códigos de error y estructura crítica para ahorrar ventana de contexto.
   - **Destilación Continua a Disco (`AgentMemory.exportToMarkdown` y `syncToDisk`):** Genera y actualiza un archivo estructurado `MEMORY.md` con hechos del usuario, arquitectura descubierta, dependencias y reglas de proyecto.
   - **Grafo Sináptico de Memoria (`agent-memory.js`):** Red semántica de conceptos conectados para retener contexto entre sesiones largas.

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

- **Proveedores Directos Adicionales:**
  - Anthropic: Claude 3.7 Sonnet (con Thinking), Claude 3.5 Sonnet, Claude 3.5 Haiku.
  - OpenAI: GPT-4o, GPT-4o-mini, o1, o3-mini.
  - DeepSeek Directo: DeepSeek Chat & Reasoner.
  - Ollama / LM Studio: Modelos locales con soporte de Tool Calling offline.

---

## 🧪 ESTADO DE VALIDACIÓN Y SUITE DE PRUEBAS
- **Test E2E Completo (`node scripts/test-full-e2e.mjs`):** 72 / 72 PRUEBAS SUPERADAS (100% PASS).
- **Test Pipeline Multimedia (`node scripts/verify-media-pipeline.mjs`):** 30 / 30 PRUEBAS SUPERADAS (100% PASS).
- **Build de Escritorio:** Binario `gafcoreai.exe` compilado y validado en Windows 11.
- **Repositorio Git:** Sincronizado en rama `main` en https://github.com/aperezavilez-ai/gafcoreai.
