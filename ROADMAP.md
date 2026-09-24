# 🗺️ ROADMAP & ESTADO OFICIAL — GAFCOREAI
> **Archivo de Consulta y Mantenimiento Obligatorio para todo Agente de IA**
> **Última Actualización:** 24/09/2026 — Versión `v1.3.0`

---

## 📌 1. RESUMEN EJECUTIVO Y CONTEXTO DEL PROYECTO
* **Nombre:** GafCoreAI
* **Creador & Autor Oficial:** aperezavilez-ai (`aperezavilez-ai <281112111+aperezavilez-ai@users.noreply.github.com>`)
* **Tipo:** IDE Inteligente con Agente Autónomo ReAct Multi-Modelo de Nivel Senior (Dual: Web + Escritorio)
* **Ubicación Local:** `D:\PROGRAMAS IA\GAFCOREAI`
* **Repositorio GitHub:** `https://github.com/aperezavilez-ai/gafcoreai`
* **Despliegue Web Oficial:** `https://gafcoreai.vercel.app`
* **Stack Tecnológico:**
  - **Escritorio:** Tauri v2.0 (Rust) + WebView2 + PTY real (`portable-pty`) + LSP Client
  - **Web:** Vanilla HTML5 / CSS3 / ES Modules + PWA Manifest + File System Access API
  - **Editor:** Monaco Editor con vista Diff bidireccional y syntax highlighting
  - **Terminal:** xterm.js interactivo con PTY nativo (Escritorio) y emulador web
  - **Modelos & Proveedores:** Conectores multi-modelo (APICredits, ME AI Cloud, Gemini, Claude, OpenAI, DeepSeek, Groq, OpenRouter)

---

## 🏛️ 2. ARQUITECTURA DUAL PLATAFORMA

```
                       ┌──────────────────────────────────────┐
                       │             GAFCOREAI                │
                       └──────────────────┬───────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
   ┌─────────────────────────────┐                 ┌─────────────────────────────┐
   │    VERSIÓN ESCRITORIO       │                 │        VERSIÓN WEB          │
   │      (Tauri 2.0 / Rust)     │                 │   (gafcoreai.vercel.app)    │
   ├─────────────────────────────┤                 ├─────────────────────────────┤
   │ • Único EXE: gafcoreai.exe  │                 │ • PWA Instalable 1-Click    │
   │ • Setup NSIS + MSI          │                 │ • File System Access API    │
   │ • PTY Terminal Nativa       │                 │ • LocalStorage Seguro       │
   │ • Acceso Total a Disco/OS   │                 │ • Auto-Deploy en Vercel     │
   └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## 🤖 3. MOTOR DE INTELIGENCIA Y AGENTE AUTÓNOMO REACT (v1.3.0)

### 🧠 1. Motor Autónomo ReAct Unificado (Por Defecto):
* **Razonamiento + Acción Multi-Turno:** El agente opera como un Lead Software Architect autónomo. Analiza el requerimiento, determina qué herramientas invocar en disco real, procesa las observaciones y refina su diagnóstico antes de responder.
* **Detección Automática de Rutas:** Si el usuario menciona una ruta (ej: `D:\PROGRAMAS IA\CALILI`), el agente la detecta (`extractDiskPath`), establece el espacio de trabajo en disco, actualiza el árbol de archivos y la inspecciona inmediatamente.
* **Herramientas de Disco & Web en Vivo:** Acceso universal a `list_files`, `read_file`, `write_file`, `search_code`, `delete_file`, `read_url` y `search_web`.
* **Manejo Real de Incertidumbre:** Si un archivo o ruta no existe, el agente lo investiga con `search_code` o búsqueda de alternativas, sin inventar APIs, dependencias ni respuestas ficticias.
* **Redacción Natural en Markdown:** Formato limpio con encabezados (`#`, `##`), listas, tablas, citas de causas raíz y bloques de código completos sin placeholders (`TODOs`).

### 👥 2. Modo Multi-Agente en Cascada (Especializado/Opcional):
Disponible cuando el usuario solicita explícitamente una auditoría en equipo o de 6 agentes:
1. **🔍 Explorer:** Escaneo recursivo de estructura de carpetas y filtrado de assets.
2. **🔎 Analyst:** Auditoría de flujo de datos, cuellos de botella y citas `archivo:línea`.
3. **🛡️ Security:** Auditoría de vulnerabilidades, JWT, endpoints y permisos.
4. **💻 Coder:** Generación de parches y código completo.
5. **📋 Reviewer:** Veredicto técnico y análisis de efectos secundarios.
6. **🧪 Tester:** Diseño de suites de testing y casos límite.

---

## 📁 4. ESTRUCTURA DE ARCHIVOS PRINCIPALES

```
D:\PROGRAMAS IA\GAFCOREAI\
├── ROADMAP.md                  # Este documento de referencia y estado
├── vercel.json                 # Configuración de despliegue en Vercel
├── src-tauri/                  # Backend Rust / Tauri
│   ├── Cargo.toml              # Dependencias de Rust (Tauri 2, PTY, etc.)
│   ├── tauri.conf.json         # Configuración del paquete y bundles
│   ├── icons/                  # Suite multi-resolución del logo 3D morado oficial
│   ├── src/                    # Código fuente Rust (main, lib, fs, shell, git, ssh, lsp)
│   └── target/release/
│       ├── gafcoreai.exe       # ÚNICO ejecutable oficial de escritorio
│       └── bundle/nsis/        # Instalador oficial GafCoreAI_1.1.0_x64-setup.exe
└── web/                        # Frontend Unificado (Web + Desktop WebView)
    ├── index.html              # Estructura principal, modales y cache-busting v1.3.0
    ├── styles.css              # Sistema visual oscuro, grid y animaciones de pulso
    ├── manifest.json           # Manifiesto PWA para instalación web
    └── js/
        ├── app.js              # Controlador principal de UI, chat, Monaco, tabs y openDiskFolderByPath
        ├── core.js             # MultiAgentOrchestrator, AGENT_ROLES y ToolRegistry
        ├── agent.js            # Motor Autónomo ReAct Unificado + Detección de Rutas
        ├── tools.js            # Registro de herramientas reales de disco (list_files, read_file, etc.)
        ├── providers.js        # Pasarelas de IA, gestión de API keys y streaming
        ├── memory-manager.js   # Memoria persistente v2 en 3 capas
        └── project-templates.js # 19 Templates (base + extras)
```

---

## ✅ 5. ESTADO DE FUNCIONALIDADES VERIFICADAS

| Módulo | Estado | Detalle |
| :--- | :---: | :--- |
| **Motor Autónomo ReAct** | ✅ 100% | Multi-turno con razonamiento real, ejecución en disco y manejo de incertidumbre. |
| **Detección de Rutas** | ✅ 100% | Reconocimiento automático de paths (`D:\...`) y apertura inmediata de carpetas. |
| **Backend Rust** | ✅ 100% | Compilación limpia, terminal PTY real, IPC seguro con Tauri 2. |
| **Identidad Visual** | ✅ 100% | Logo oficial 3D morado hexagonal en `.exe`, instalador, barra superior y web. |
| **Ejecutable Único** | ✅ 100% | Solo existe `gafcoreai.exe` en release (eliminados duplicados confusos). |
| **Versión Web Vercel** | ✅ 100% | Sincronizada y desplegada en `gafcoreai.vercel.app` con PWA y FS Access. |
| **Chat & Diagnóstico** | ✅ 100% | Explicaciones en lenguaje natural Senior, Markdown completo y sin textos enlatados. |
| **Proveedor Auto** | ✅ 100% | Resolución garantizada a modelos reales verificados (`claude-3-5-sonnet`, etc.). |
| **Control de Cancelación**| ✅ 100% | Interceptor instantáneo ante `stop` / `alto` / `cancela` / botón rojo. |

---

## 📜 6. REGLAS OBLIGATORIAS PARA TODO AGENTE DE IA

> [!IMPORTANT]
> **REGLAS PERMANENTES DE INTERVENCIÓN EN GAFCOREAI:**
> 1. **Consultar este archivo PRIMERO:** Antes de hacer cualquier cambio, lee `ROADMAP.md` para entender el estado actual.
> 2. **Mantener un ÚNICO `.exe`:** Nunca generes ejecutables con sufijos o nombres duplicados en `target/release/`. El único binario debe ser `gafcoreai.exe`.
> 3. **Prohibido usar textos robóticos o plantillas fijas:** El agente de GafCoreAI debe comunicarse con naturalidad, profundidad técnica y formato Markdown estructurado como un Ingeniero Senior.
> 4. **Actualizar este archivo al finalizar:** Todo cambio de arquitectura, fix crítico o nuevo release debe quedar documentado en este archivo.
> 5. **Un cambio a la vez:** Diagnosticar, aplicar cambio exacto, validar sintaxis (`node -c`) y probar antes de continuar.
