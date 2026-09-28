# GafCoreAI 🚀
> **IDE autónomo con orquestación Multi-Agente de Inteligencia Artificial para escritorio y web.**

Construido con un backend nativo de alto rendimiento en **Rust (Tauri 2.0)** y una interfaz responsiva en **JavaScript Moderno (ES Modules)**, Monaco Editor y xterm.js.

---

## 🌟 Características Principales

- 🤖 **Orquestador Multi-Agente:** Equipos autónomos de IA que colaboran en fases (Explorer, Analyst, Security, Coder, Reviewer, Tester, Researcher, Planner) con ciclo ReAct multi-turno.
- 💻 **Monaco Editor Integrado:** Editor con syntax highlighting, diffs side-by-side para revisión de cambios, autocompletado y atajo `Ctrl+K` para edición inline.
- ⚡ **Terminal Nativa Real (PTY):** Soporte para PowerShell y Bash con streams interactivos sin emulación.
- 🔍 **RAG Vectorial & Embeddings:** Búsqueda semántica sobre la base de código con similitud coseno.
- 🛠️ **Language Server Protocol (LSP):** IntelliSense y diagnósticos en tiempo real para TypeScript, Python (Pyright), HTML, CSS y JSON.
- 🌐 **Navegador Interno y Vista Previa:** Emulador responsive (Desktop, Tablet, Móvil) para probar proyectos web en vivo.
- ☁️ **Sincronización Cloud:** Conectores directos a GitHub (Git real y API REST), Vercel (despliegue a producción) y Supabase (bases de datos).
- 👻 **Ghost Text:** Autocompletado predictivo inline estilo Copilot.

---

## 🚀 Instalación y Desarrollo

### Requisitos
- **Node.js:** v18+ o v20+
- **Rust:** Rust toolchain 1.77+ con Cargo
- **Tauri CLI:** v2.0+

### Modo Desarrollo (Escritorio Tauri)
```bash
npm install
npm run dev
```

### Modo Servidor Web
```bash
npm run serve
```
Abre `http://localhost:3000` en tu navegador.

### Compilar Ejecutable (Release)
```bash
npm test
npm run build
```
`npm run build` ahora ejecuta `tauri build` (no un `console.log`).
El binario e instaladores quedan en:
`src-tauri/target/release/` y `src-tauri/target/release/bundle/` (nsis/msi/deb/dmg según el SO).

### Tests
```bash
npm test
```

---

## 🏗️ Arquitectura del Proyecto

```
GAFCOREAI/
├── src-tauri/                 # Backend nativo Rust (Tauri 2.0)
│   ├── src/
│   │   ├── lib.rs            # Comandos IPC principales
│   │   ├── fs.rs             # Operaciones en disco y búsqueda
│   │   ├── shell.rs          # Terminal PTY interactiva
│   │   ├── git.rs            # Wrapper Git CLI
│   │   ├── ssh.rs            # Cliente OpenSSH
│   │   └── lsp.rs            # Gestor de procesos Language Server
│   ├── Cargo.toml
│   └── tauri.conf.json       # Configuración de Tauri 2.0
├── web/                       # Frontend Webview (ES Modules)
│   ├── index.html            # Layout principal (3 paneles)
│   ├── styles.css            # Estilos CSS y temas
│   └── js/                   # Módulos JavaScript
│       ├── app.js            # Controlador central
│       ├── agent.js          # Orquestador de agentes
│       ├── core.js           # MultiAgentOrchestrator & ReAct loop
│       ├── providers.js      # Pasarelas LLM (SSE streaming & safeFetch)
│       ├── tools.js          # Catálogo de herramientas agénticas
│       ├── lsp-client.js     # Cliente JSON-RPC para Monaco
│       ├── rag.js            # Motor RAG y búsqueda semántica
│       └── ...               # Módulos especializados
├── .github/workflows/         # CI/CD y pipelines de Release
│   └── release.yml
├── ROADMAP.md                 # Hoja de ruta y estado de versiones
└── README.md
```

---

## 🛡️ Licencia
GafCoreAI — Todos los derechos reservados.