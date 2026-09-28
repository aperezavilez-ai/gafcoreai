// ============================================================
//  GafCoreAI - app.js (v31 - Conversaciones por Proyecto)
//  PARTE 1/6: imports, state, terminal, monaco
// ============================================================

import {
  DEFAULT_PROVIDERS, chatCompletion, buildUserContent,
  getAllModels, findModelWithKey, getVerifiedModels, migrateIfNeeded,
  classifyModelCategory, classifyQueryIntent, MODEL_CATEGORIES
} from "./providers.js";
import { verifyGroupKey } from "./verify.js";
import { showAlert, showConfirm, showPrompt, installGlobalDialogs } from "./dialogs.js";
import { AgentMemory } from "./agent-memory.js";
import { Desktop } from "./desktop.js";
import { applyTemplate, listTemplates } from "./project-templates.js";
import { ConversationManager } from "./conversation.js";
import { SkillsInstaller } from "./skills-installer.js";
import { McpClient } from "./mcp-client.js";
import { AgentBrain } from "./agent-brain.js";
import { SKILLS_REGISTRY, getSkillsByRisk } from "./skills-registry.js";
import { LiveView } from "./live-view.js";
import { CodeAnalyzer } from "./code-analyzer.js";
import { ProjectRunner } from "./project-runner.js";
import { GitReal } from "./git-real.js";
import { AgentAutopilot } from "./agent-autopilot.js";
import { CommandPalette } from "./command-palette.js";
import { GlobalSearch } from "./global-search.js";
import { ProblemsPanel } from "./problems-panel.js";
import { MCP_CATALOG } from "./mcp-catalog.js";
import { ProjectWatcher } from "./project-watcher.js";
import { ProactiveEngine } from "./proactive-engine.js";
import { UserPatterns } from "./user-patterns.js";
import { buildSystemPrompt, getTaskContext } from "./system-prompt.js";
import { SKILL_CATALOG, getSkillsForAgent, getSkillsByCategory } from "./skills.js";
import { AgentOrchestrator } from "./agent.js";
import {
  core, TokenCache, Memory, PermissionManager, ToolRegistry,
  PERMISSION_LEVELS, AGENT_ROLES
} from "./core.js";
import { registerAllTools } from "./tools.js";
import { tauri } from "./tauri-bridge.js";
import { GhostText } from "./ghost.js";
import { InlineEdit } from "./inline-edit.js";
import { TerminalInteractive } from "./terminal-interactive.js";
import { Mentions } from "./mentions.js";
import { PendingDiffs } from "./pending-diffs.js";
import { RAG } from "./rag.js";
import { LspClient, LSP_SERVERS } from "./lsp-client.js";
import { readAnyFile, getFileType } from "./file-handlers.js";
import { MemoryManager } from "./memory-manager.js";
import { MediaRouter } from "./media-router.js";
import { MediaTaskManager } from "./media-task-manager.js";
import { CinematicStudioUI } from "./cinematic-studio-ui.js";

// ────────────────────────────────────────────────────────────
//  CONSTANTES
// ────────────────────────────────────────────────────────────
const STORAGE_KEY = "gafcoreai_providers_v3";
const REPO_KEY = "gafcoreai_repo_state";
const SEARCH_KEY = "gafcoreai_brave_key";
const MODE_KEY = "gafcoreai_mode";
const PROJECT_KEY = "gafcoreai_project_files";

const SLASH_COMMANDS = {
  "/new":      "__NEW_TEMPLATE__",
  "/skills":   "__SHOW_SKILLS__",
  "/clear":    "__CLEAR_CHAT__",
  "/fix":      "Corrige los errores del siguiente codigo: ",
  "/explain":  "Explica paso a paso: ",
  "/test":     "Escribe tests unitarios: ",
  "/doc":      "Escribe documentacion: ",
  "/refactor": "Refactoriza: ",
  "/opt":      "Optimiza: ",
  "/search":   "Busca en internet: ",
  "/url":      "Lee y analiza la URL: ",
  "/remember": "Recuerda este hecho sobre mi: ",
  "/video":    "__CINEMA_VIDEO__",
  "/cinema":   "__CINEMA_STUDIO__"
};

// ────────────────────────────────────────────────────────────
//  STATE
// ────────────────────────────────────────────────────────────
const state = {
  providers: (function() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) {}
    const migrated = migrateIfNeeded(parsed) || DEFAULT_PROVIDERS;
    localStorage.setItem("gafcoreai_providers_version", "9");
    return migrated;
  })(),
  activeProvider: null,
  activeModel: null,
  repo: JSON.parse(localStorage.getItem(REPO_KEY) || "null"),
  projectFiles: (function() {
    // v37: solo cargar archivos fantasma si hay diskFolder abierto
    try {
      const stored = JSON.parse(localStorage.getItem(PROJECT_KEY) || "{}");
      const hasDisk = localStorage.getItem("gafcoreai_last_disk_folder");
      if (!hasDisk || !Object.keys(stored).length) return {};
      return stored;
    } catch (_) { return {}; }
  })(),
  pendingChanges: new Map(),
  diskFolder: null,
  diskEntries: [],
  currentDiskFile: null,
  terminal: null,
  fitAddon: null,
  usingFallback: false,
  editor: null,
  diffEditor: null,
  orchestrator: null,
  supabaseClient: null,
  supabaseUser: null,
  attachments: [],
  history: [],
  mode: localStorage.getItem(MODE_KEY) || "chat",
  agentRunning: false,
  agentAbort: null,
  onProjectChange: null,
  lastPreviewUrl: null,
  activeMainTab: "editor",
  activeTermTab: "logs",
  ghost: null,
  inlineEdit: null,
  terminalInteractive: null,
  mentions: null,
  pendingDiffs: null,
  rag: null,
  lsp: null,
  agentMemory: null,
  conversation: null,
  skillsInstaller: null,
  mcpClient: null,
  agentBrain: null,
  liveView: null,
  codeAnalyzer: null,
  projectRunner: null,
  gitReal: null,
  autopilot: null,
  commandPalette: null,
  globalSearch: null,
  problemsPanel: null,
  projectWatcher: null,
  proactive: null,
  patterns: null,
  currentDiffPath: null,
  memoryManager: null,
  mediaRouter: null,
  mediaTaskManager: null,
  cinematicStudio: null,
  activeAgentFile: null,
  activeAgentFileHistory: []
};

function setSendBtn(isRunning) {
  const btn = document.getElementById("chat-send");
  if (!btn) return;
  if (isRunning) { btn.classList.add("btn-danger"); btn.textContent = ""; btn.title = "Detener"; }
  else { btn.classList.remove("btn-danger"); btn.textContent = "Enviar"; btn.title = ""; }
}

// ────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────
function saveProviders() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.providers)); }
function saveRepo() { localStorage.setItem(REPO_KEY, JSON.stringify(state.repo)); }
function saveMode() { localStorage.setItem(MODE_KEY, state.mode); }
function saveProject() {
  try { localStorage.setItem(PROJECT_KEY, JSON.stringify(state.projectFiles)); }
  catch (e) { console.warn("Quota:", e.message); }
}

function log(msg) { console.log("[GafCoreAI]", msg); termWrite(msg, "normal"); }

function safeBind(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) { console.warn("[GafCoreAI] Falta #" + id); return; }
  el[event] = handler;
}

function truncatePath(p, max = 40) {
  if (!p) return "";
  if (p.length <= max) return p;
  return "..." + p.slice(p.length - max + 3);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskPartialToolCalls(text) {
  if (!text) return "";
  let s = String(text);

  const lastToolOpen = s.lastIndexOf("<tool>");
  const lastToolClose = s.lastIndexOf("</tool>");
  if (lastToolOpen > lastToolClose) {
    s = s.slice(0, lastToolOpen);
  }

  const lastToolCallOpen = s.lastIndexOf("<tool_call>");
  const lastToolCallClose = s.lastIndexOf("</tool_call>");
  if (lastToolCallOpen > lastToolCallClose) {
    s = s.slice(0, lastToolCallOpen);
  }

  const lastFnOpen = s.lastIndexOf("<function=");
  const lastFnClose = s.lastIndexOf("</function>");
  if (lastFnOpen > lastFnClose) {
    s = s.slice(0, lastFnOpen);
  }

  const directTools = ["read_file", "write_file", "edit_file", "list_files", "run_command",
                       "search_code", "search_web", "read_url", "open_folder", "close_folder"];
  for (const toolName of directTools) {
    const openTag = "<" + toolName;
    const idx = s.lastIndexOf(openTag);
    if (idx >= 0) {
      const after = s.slice(idx);
      const hasClose = after.includes("/>") || after.includes("</" + toolName + ">");
      if (!hasClose) {
        if (after.length < 500) {
          s = s.slice(0, idx);
          break;
        }
      }
    }
  }

  const tripleBacktickOpen = s.lastIndexOf("```write:");
  const tripleBacktickOpenRead = s.lastIndexOf("```read:");
  const tripleBacktickClose = s.lastIndexOf("```");
  if (tripleBacktickOpen > tripleBacktickClose && tripleBacktickOpen > 0) {
    s = s.slice(0, tripleBacktickOpen);
  } else if (tripleBacktickOpenRead > tripleBacktickClose && tripleBacktickOpenRead > 0) {
    s = s.slice(0, tripleBacktickOpenRead);
  }

  const lastToolBlockOpen = s.lastIndexOf("```tool");
  if (lastToolBlockOpen > tripleBacktickClose && lastToolBlockOpen > 0) {
    s = s.slice(0, lastToolBlockOpen);
  }

  return s;
}

// ────────────────────────────────────────────────────────────
//  CHAT: mensajes iniciales
// ────────────────────────────────────────────────────────────

const WELCOME_HTML = `
  <div style="padding:8px 0;">
    <div style="font-size:15px;font-weight:700;color:#a78bfa;margin-bottom:8px;">👋 Bienvenido a GafCoreAI</div>
    <div style="color:var(--text-dim,#94a3b8);line-height:1.6;font-size:13px;">
      Soy tu IDE inteligente con agente autónomo.<br>
      Para empezar, abre un proyecto con <b>📁 Carpeta</b> en el panel derecho, o escríbeme directamente.
    </div>
    <div style="margin-top:12px;color:var(--text-mute,#64748b);font-size:12px;">
      Consejos: <code style="background:rgba(255,255,255,.06);padding:1px 6px;border-radius:3px;">@</code> para archivos, <code style="background:rgba(255,255,255,.06);padding:1px 6px;border-radius:3px;">/</code> para comandos.
    </div>
  </div>
`;

function renderWelcome() {
  const logEl = document.getElementById("chat-log");
  if (!logEl) return;
  logEl.innerHTML = "";
  const el = document.createElement("div");
  el.className = "msg system";
  el.innerHTML = "<div class=\"body\"></div>";
  el.querySelector(".body").innerHTML = WELCOME_HTML;
  logEl.appendChild(el);
}

function renderProjectLoadedHeader(projectPath) {
  const logEl = document.getElementById("chat-log");
  if (!logEl) return;
  const el = document.createElement("div");
  el.className = "msg system";
  el.innerHTML = "<div class=\"body\"></div>";
  const projName = (projectPath || "").split(/[\\\/]/).pop() || projectPath;
  el.querySelector(".body").innerHTML =
    '<div style="padding:6px 0;font-size:12px;color:var(--text-dim,#94a3b8);">' +
      '📂 Proyecto activo: <code style="background:rgba(255,255,255,.06);padding:1px 6px;border-radius:3px;color:#c084fc;">' + escapeHtml(projName) + '</code>' +
    '</div>';
  logEl.appendChild(el);
}

function renderConversationHistory(messages) {
  const logEl = document.getElementById("chat-log");
  if (!logEl) return;
  if (!messages || !messages.length) return;
  messages.forEach(m => {
    if (m.role === "user") {
      appendChat("user", typeof m.content === "string" ? m.content : "[multimodal]");
    } else if (m.role === "assistant") {
      const cleanText = (typeof AgentOrchestrator !== "undefined" && AgentOrchestrator.cleanForDisplay)
        ? AgentOrchestrator.cleanForDisplay(m.content)
        : m.content;
      appendChat("assistant", cleanText);
    } else if (m.role === "system") {
      const el = document.createElement("div");
      el.className = "msg system";
      el.innerHTML = "<div class=\"body\"></div>";
      el.querySelector(".body").innerHTML = renderMarkdownLite(m.content);
      logEl.appendChild(el);
    }
  });
  logEl.scrollTop = logEl.scrollHeight;
}

// ────────────────────────────────────────────────────────────
//  BARRA DE STATUS EN VIVO (persistente)
// ────────────────────────────────────────────────────────────
function renderAgentLiveStatus() {
  const host = document.getElementById("agent-live-host");
  if (!host) return;

  const current = state.activeAgentFile;
  if (!current || !current.path) {
    host.innerHTML = "";
    return;
  }

  const pathShort = current.path.length > 60
    ? "..." + current.path.slice(-57)
    : current.path;
  const isWrite = current.action === "write";
  const isDone = current.action === "done";
  const isError = current.action === "error";

  let label, className;
  if (isDone) {
    label = "✓ Último";
    className = " is-done";
  } else if (isError) {
    label = "✘ Error en";
    className = " is-error";
  } else if (isWrite) {
    label = "✍️ Escribiendo";
    className = " is-write";
  } else {
    label = "📖 Leyendo";
    className = "";
  }

  const totalTouched = state.activeAgentFileHistory.length;

  host.innerHTML =
    '<div class="agent-live-status' + className + '">' +
      '<span class="live-dot"></span>' +
      '<span class="live-label">' + label + ':</span>' +
      '<span class="live-path" title="' + escapeHtml(current.path) + '">' + escapeHtml(pathShort) + '</span>' +
      (totalTouched > 1 ? '<span class="live-count">' + totalTouched + ' archivos</span>' : '') +
      '<button class="live-dismiss" title="Cerrar" onclick="this.parentElement.parentElement.innerHTML=\'\'; window.state && (window.state.activeAgentFile = null);">×</button>' +
    '</div>';
}

function clearAgentLiveStatus() {
  state.activeAgentFile = null;
  state.activeAgentFileHistory = [];
  renderAgentLiveStatus();
}

// ────────────────────────────────────────────────────────────
//  TERMINAL (logs)
// ────────────────────────────────────────────────────────────
function termWrite(msg, kind) {
  const fb = document.getElementById("terminal-fallback");
  if (fb && fb.style.display !== "none") {
    const line = document.createElement("div");
    line.className = "tf-line tf-" + (kind || "normal");
    line.textContent = String(msg);
    fb.appendChild(line);
    fb.scrollTop = fb.scrollHeight;
  }
  if (state.terminal) {
    let ansi = "";
    if (kind === "head") ansi = "\x1b[36m\x1b[1m";
    if (kind === "success") ansi = "\x1b[32m";
    if (kind === "error") ansi = "\x1b[31m";
    if (kind === "warn") ansi = "\x1b[33m";
    if (kind === "dim") ansi = "\x1b[2m";
    if (kind === "agent") ansi = "\x1b[35m\x1b[1m";
    if (ansi) state.terminal.writeln(ansi + msg + "\x1b[0m");
    else state.terminal.writeln(msg);
  }

  if (kind === "error" || (typeof msg === "string" && (msg.includes("Error:") || msg.includes("Exception:") || msg.includes("npm ERR!") || msg.includes("FAILED")))) {
    state.lastTerminalError = String(msg);
    const fixBtn = document.getElementById("term-fix-error");
    if (fixBtn) {
      fixBtn.style.display = "inline-flex";
      fixBtn.classList.remove("hidden");
    }
  }
}

function termClear() {
  if (state.activeTermTab === "shell" && state.terminalInteractive) {
    state.terminalInteractive.clear();
  } else {
    if (state.terminal) state.terminal.clear();
    const fb = document.getElementById("terminal-fallback");
    if (fb) fb.innerHTML = "";
  }
}

function initTerminal() {
  const fb = document.getElementById("terminal-fallback");
  const xtermEl = document.getElementById("terminal");
  if (!fb || !xtermEl) return;

  let xtermOk = false;
  if (typeof Terminal !== "undefined") {
    try {
      const term = new Terminal({
        fontFamily: "Consolas, monospace", fontSize: 12.5,
        theme: { background: "#0b0d10", foreground: "#d4d4d4" },
        convertEol: true, scrollback: 5000
      });
      term.open(xtermEl);
      state.terminal = term;
      if (typeof FitAddon !== "undefined") {
        try {
          state.fitAddon = new FitAddon.FitAddon();
          term.loadAddon(state.fitAddon);
          setTimeout(() => fitTerminal(), 100);
        } catch (e) {}
      }
      xtermOk = true;
      xtermEl.style.display = "block";
      fb.style.display = "none";
    } catch (e) { console.error(e); }
  }

  if (!xtermOk) {
    xtermEl.style.display = "none";
    fb.style.display = "block";
    state.usingFallback = true;
  }

  const btnToggle = document.getElementById("term-toggle-view");
  if (btnToggle) {
    btnToggle.onclick = () => {
      if (!state.terminal) { alert("xterm no disponible"); return; }
      const showingXterm = xtermEl.style.display !== "none";
      xtermEl.style.display = showingXterm ? "none" : "block";
      fb.style.display = showingXterm ? "block" : "none";
      if (!showingXterm) setTimeout(() => fitTerminal(), 50);
    };
  }

  const btnClear = document.getElementById("term-clear");
  if (btnClear) btnClear.onclick = termClear;

  const btnClose = document.getElementById("term-close");
  if (btnClose) btnClose.onclick = () => switchMainTab("editor");

  const btnRestart = document.getElementById("term-restart");
  if (btnRestart) {
    btnRestart.onclick = async () => {
      if (state.terminalInteractive && tauri.isTauri) {
        await state.terminalInteractive.restart(state.diskFolder);
      }
    };
  }

  window.addEventListener("resize", () => {
    if (state.activeMainTab === "terminal") {
      setTimeout(() => {
        fitTerminal();
        if (state.activeTermTab === "shell" && state.terminalInteractive) {
          state.terminalInteractive.fit();
        }
      }, 50);
    }
  });
}

function fitTerminal() {
  if (!state.fitAddon || !state.terminal) return;
  try { state.fitAddon.fit(); } catch (e) {}
}

async function switchTermTab(tabName) {
  state.activeTermTab = tabName;
  document.querySelectorAll(".terminal-tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".terminal-panel").forEach(x => x.classList.remove("active"));
  const tabBtn = document.querySelector('.terminal-tab[data-term-tab="' + tabName + '"]');
  if (tabBtn) tabBtn.classList.add("active");
  const panel = document.getElementById("terminal-panel-" + tabName);
  if (panel) panel.classList.add("active");

  if (tabName === "shell") {
    if (!state.terminalInteractive) {
      try {
        state.terminalInteractive = new TerminalInteractive({ log });
        state.terminalInteractive.init();
      } catch (e) { console.warn("TerminalInteractive init error:", e); }
    }
    if (state.terminalInteractive && tauri.isTauri) {
      await state.terminalInteractive.spawn(state.diskFolder);
    }
    setTimeout(() => {
      if (state.terminalInteractive) state.terminalInteractive.fit();
    }, 100);
  } else {
    setTimeout(() => fitTerminal(), 50);
  }
}

// ────────────────────────────────────────────────────────────
//  MONACO
// ────────────────────────────────────────────────────────────
let __monacoInitPromise = null;

function initMonaco() {
  if (__monacoInitPromise) return __monacoInitPromise;
  __monacoInitPromise = _initMonacoInner();
  return __monacoInitPromise;
}

function _initMonacoInner() {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      console.warn("[Monaco] Carga diferida; continuando arranque de GafCoreAI.");
      resolve();
    }, 1500);

    if (typeof require === "undefined") {
      clearTimeout(timer);
      resolve();
      return;
    }

    if (typeof monaco !== "undefined" && monaco.editor) {
      clearTimeout(timer);
      try { _createMonacoEditors(); } catch (e) { console.error(e); }
      resolve();
      return;
    }

    try {
      require(["vs/editor/editor.main"], () => {
        clearTimeout(timer);
        try { _createMonacoEditors(); } catch (e) { console.error(e); }
        resolve();
      }, (err) => {
        clearTimeout(timer);
        console.warn("[Monaco] Error cargando vs/editor/editor.main:", err);
        resolve();
      });
    } catch (e) {
      clearTimeout(timer);
      resolve();
    }
  });
}

function _createMonacoEditors() {
  const editorEl = document.getElementById("monaco");
  const diffEl = document.getElementById("monaco-diff");
  if (!editorEl || !diffEl) return;
  if (state.editor) return;

  monaco.editor.defineTheme("gafcore-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editorGhostText.foreground": "#7c5cff",
      "editorGhostText.border": "#00000000"
    }
  });

  state.editor = monaco.editor.create(editorEl, {
    value: "// Bienvenido a GafCoreAI\n",
    language: "javascript", theme: "gafcore-dark", automaticLayout: true,
    fontSize: 13, minimap: { enabled: true },
    inlineSuggest: { enabled: true }
  });
  state.diffEditor = monaco.editor.createDiffEditor(diffEl, {
    theme: "gafcore-dark", automaticLayout: true, readOnly: true
  });
  state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    saveCurrentFile();
  });
  state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
    const sel = state.editor.getSelection();
    if (sel && !sel.isEmpty() && state.inlineEdit) {
      state.inlineEdit.trigger();
    } else {
      const chatInput = document.getElementById("chat-input");
      if (chatInput) {
        chatInput.focus();
        if (state.currentDiskFile && !chatInput.value.includes("@")) {
          chatInput.value = "@" + state.currentDiskFile.split(/[\\\/]/).pop() + " ";
        }
      }
    }
  });

  if (state.lsp) state.lsp.editor = state.editor;

  try {
    state.editor.onDidChangeModelContent(() => {
      if (!state.lsp || !state.currentDiskFile) return;
      const uri = "file:///" + state.currentDiskFile.replace(/\\/g, "/");
      const ext = (state.currentDiskFile.split(".").pop() || "").toLowerCase();
      const langId = ["ts","tsx"].includes(ext) ? "typescript"
                   : ["js","jsx","mjs","cjs"].includes(ext) ? "typescript"
                   : ext === "py" ? "python"
                   : ["html","htm"].includes(ext) ? "html"
                   : ["css","scss","less"].includes(ext) ? "css"
                   : ["json","jsonc"].includes(ext) ? "json" : null;
      if (langId && state.lsp.servers.has(langId)) {
        state.lsp.changeDocument(langId, uri, state.editor.getValue()).catch(() => {});
      }
    });
  } catch (e) { console.warn("LSP editor hook error:", e); }

  try {
    state.ghost = new GhostText({ state, log, termWrite });
    state.ghost.register();
    updateGhostButtonUI();
  } catch (e) { console.warn("Ghost init error:", e); }

  try {
    state.inlineEdit = new InlineEdit({ state, editor: state.editor, log, termWrite });
    state.inlineEdit.registerKeybinding();
  } catch (e) { console.warn("InlineEdit init error:", e); }
}

function switchMainTab(viewName) {
  document.querySelectorAll(".main-tabs .tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
  const tab = document.querySelector(".main-tabs .tab[data-view='" + viewName + "']");
  if (tab) tab.classList.add("active");
  const view = document.getElementById("view-" + viewName);
  if (view) view.classList.add("active");
  state.activeMainTab = viewName;
  if (viewName === "diff" && state.diffEditor) state.diffEditor.layout();
  if (viewName === "editor" && state.editor) state.editor.layout();
  if (viewName === "browser") {
    const frame = document.getElementById("browser-frame");
    if (frame && (!frame.src || frame.src === "about:blank" || frame.src.endsWith("about:blank"))) {
      try { previewProject(); } catch (_) {}
    }
  }
  if (viewName === "studio" && state.cinematicStudio) {
    state.cinematicStudio.renderStudioView();
  }
  if (viewName === "terminal") {
    setTimeout(() => {
      if (state.activeTermTab === "shell" && state.terminalInteractive) {
        state.terminalInteractive.fit();
        state.terminalInteractive.focus();
      } else {
        fitTerminal();
      }
    }, 80);
  }
}

function updateGhostButtonUI() {
  const btn = document.getElementById("btn-ghost-toggle");
  if (!btn || !state.ghost) return;
  if (state.ghost.isEnabled()) {
    btn.classList.add("ghost-active");
    btn.innerHTML = "&#10024; Ghost ON";
  } else {
    btn.classList.remove("ghost-active");
    btn.innerHTML = "&#10024; Ghost";
  }
}

function openGhostModal() {
  if (!state.ghost) { alert("Ghost no esta listo."); return; }
  const sel = document.getElementById("ghost-model");
  sel.innerHTML = "";
  const options = [];
  state.providers.forEach(p => {
    (p.groups || []).forEach(g => {
      if (g.key) {
        g.models.forEach(mid => {
          options.push({ provider: p, model: mid, id: p.id + "::" + mid, label: p.name + " / " + mid });
        });
      }
    });
  });
  if (!options.length) {
    sel.innerHTML = "<option value=''>(sin modelos verificados)</option>";
  } else {
    options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.id;
      o.textContent = opt.label;
      sel.appendChild(o);
    });
    if (state.ghost.config.modelId) sel.value = state.ghost.config.modelId;
  }
  document.getElementById("ghost-enabled").checked = state.ghost.config.enabled;
  document.getElementById("ghost-maxlines").value = String(state.ghost.config.maxLines);
  openModal("modal-ghost");
}

function saveGhostConfig() {
  if (!state.ghost) return;
  const enabled = document.getElementById("ghost-enabled").checked;
  const modelId = document.getElementById("ghost-model").value;
  const maxLines = document.getElementById("ghost-maxlines").value;
  if (enabled && !modelId) { alert("Elige un modelo"); return; }
  state.ghost.setEnabled(enabled);
  state.ghost.setModel(modelId);
  state.ghost.setMaxLines(maxLines);
  updateGhostButtonUI();
  closeModals();
  termWrite("Ghost: " + (enabled ? "ON con " + modelId : "off"), enabled ? "success" : "dim");
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("hidden");
}
function closeModals() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
}

// ============================================================
//  PARTE 2/6: chat UI, attachments, disco, arbol, preview
// ============================================================

function renderInlineMarkdown(text) {
  if (!text) return "";
  let s = String(text);
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/(?:^|[^\*])\*([^*\n]+)\*(?:[^\*]|$)/g, (m, c) => m.replace(`*${c}*`, `<i>${c}</i>`));
  return s;
}

function renderMarkdownLite(text) {
  let s = String(text || "");
  if (!s.trim()) return "";

  const codeBlocks = [];

  s = s.replace(/```([a-zA-Z0-9_\-]*)\n([\s\S]*?)```/g, (m, lang, code) => {
    const placeholder = "___GAF_CODE_BLOCK_" + codeBlocks.length + "___";
    const cleanLang = (lang || "").trim();
    const safeCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n$/, "");
    codeBlocks.push(
      `<div class="md-code-wrap">` +
      (cleanLang ? `<div class="md-code-lang">${cleanLang}</div>` : "") +
      `<pre><code class="lang-${cleanLang}">${safeCode}</code></pre>` +
      `</div>`
    );
    return "\n\n" + placeholder + "\n\n";
  });

  s = s.replace(/((?:^|\n)\|[^\n]+\|\r?\n\|[-: |]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g, (tableBlock) => {
    const lines = tableBlock.trim().split(/\r?\n/).filter(l => l.trim().startsWith("|"));
    if (lines.length < 2) return tableBlock;
    const headerCols = lines[0].split("|").map(c => c.trim()).slice(1, -1);
    let tableHtml = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
    headerCols.forEach(h => {
      tableHtml += `<th>${renderInlineMarkdown(h)}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    for (let i = 2; i < lines.length; i++) {
      const rowCols = lines[i].split("|").map(c => c.trim()).slice(1, -1);
      if (rowCols.length) {
        tableHtml += '<tr>';
        rowCols.forEach(col => {
          tableHtml += `<td>${renderInlineMarkdown(col || "")}</td>`;
        });
        tableHtml += '</tr>';
      }
    }
    tableHtml += '</tbody></table></div>';
    const placeholder = "___GAF_CODE_BLOCK_" + codeBlocks.length + "___";
    codeBlocks.push(tableHtml);
    return "\n\n" + placeholder + "\n\n";
  });

  const lines = s.split(/\r?\n/);
  const output = [];
  let inList = false;
  let listType = "ul";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/___GAF_CODE_BLOCK_\d+___/.test(line.trim())) {
      if (inList) { output.push(`</${listType}>`); inList = false; }
      output.push(line.trim());
      continue;
    }

    if (/^(?:---|\*\*\*|___)\s*$/.test(line.trim())) {
      if (inList) { output.push(`</${listType}>`); inList = false; }
      output.push('<hr class="md-hr">');
      continue;
    }

    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) {
      if (inList) { output.push(`</${listType}>`); inList = false; }
      output.push(`<h2 class="md-h1">${renderInlineMarkdown(h1[1])}</h2>`);
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      if (inList) { output.push(`</${listType}>`); inList = false; }
      output.push(`<h3 class="md-h2">${renderInlineMarkdown(h2[1])}</h3>`);
      continue;
    }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      if (inList) { output.push(`</${listType}>`); inList = false; }
      output.push(`<h4 class="md-h3">${renderInlineMarkdown(h3[1])}</h4>`);
      continue;
    }
    const h4 = line.match(/^####\s+(.*)$/);
    if (h4) {
      if (inList) { output.push(`</${listType}>`); inList = false; }
      output.push(`<h5 class="md-h4">${renderInlineMarkdown(h4[1])}</h5>`);
      continue;
    }

    const bq = line.match(/^>\s*(.*)$/);
    if (bq) {
      if (inList) { output.push(`</${listType}>`); inList = false; }
      output.push(`<blockquote class="md-quote">${renderInlineMarkdown(bq[1])}</blockquote>`);
      continue;
    }

    const ulItem = line.match(/^[\s]*[•\-\*]\s+(.*)$/);
    if (ulItem) {
      if (!inList || listType !== "ul") {
        if (inList) output.push(`</${listType}>`);
        output.push('<ul class="md-ul">');
        inList = true;
        listType = "ul";
      }
      output.push(`<li>${renderInlineMarkdown(ulItem[1])}</li>`);
      continue;
    }

    const olItem = line.match(/^[\s]*(\d+)\.\s+(.*)$/);
    if (olItem) {
      if (!inList || listType !== "ol") {
        if (inList) output.push(`</${listType}>`);
        output.push('<ol class="md-ol">');
        inList = true;
        listType = "ol";
      }
      output.push(`<li>${renderInlineMarkdown(olItem[2])}</li>`);
      continue;
    }

    if (!line.trim()) {
      if (inList) {
        output.push(`</${listType}>`);
        inList = false;
      }
      continue;
    }

    if (inList) {
      output.push(`</${listType}>`);
      inList = false;
    }
    output.push(`<p class="md-p">${renderInlineMarkdown(line)}</p>`);
  }

  if (inList) {
    output.push(`</${listType}>`);
  }

  let finalHtml = output.join("\n");

  codeBlocks.forEach((cb, i) => {
    finalHtml = finalHtml.replace("___GAF_CODE_BLOCK_" + i + "___", cb);
  });

  return finalHtml;
}

function buildTraceAccordion(trace) {
  return ""; // v44: traza oculta
  if (!trace || !trace.length) return "";

  const plan = trace.find(t => t.kind === "plan");
  const toolCalls = trace.filter(t => t.kind === "tool_call");
  const antiLoops = trace.filter(t => t.kind === "anti_loop");
  const guardrails = trace.filter(t => t.kind === "guardrail");
  const synthesis = trace.find(t => t.kind === "synthesis_start");
  const fallback = trace.find(t => t.kind === "synthesis_fallback");
  const finalReport = trace.find(t => t.kind === "final_report");
  const errors = trace.filter(t => t.kind === "error");

  const totalOps = toolCalls.length;
  const summaryLabel = `🧠 Traza del agente (${totalOps} operación${totalOps === 1 ? "" : "es"})`;

  let html = `<details class="trace-accordion" open style="margin-bottom:12px;padding:10px 12px;border-radius:8px;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.25);font-size:12px;">`;
  html += `<summary style="cursor:pointer;font-weight:600;color:#a78bfa;user-select:none;outline:none;">${summaryLabel}</summary>`;
  html += `<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">`;

  if (plan) {
    const taskPreview = (plan.userTask || "").slice(0, 160);
    html += `<div><b style="color:#a78bfa;">📋 Plan:</b> <span style="color:var(--text-muted,#94a3b8);">${escapeHtml(taskPreview)}${taskPreview.length >= 160 ? "…" : ""}</span></div>`;
    if (plan.diskFolder) {
      html += `<div style="color:var(--text-muted,#94a3b8);font-size:11px;">📂 Espacio: <code>${escapeHtml(plan.diskFolder)}</code></div>`;
    }
  }

  if (toolCalls.length) {
    html += `<div><b style="color:#a78bfa;">🔧 Operaciones ejecutadas:</b><ul style="margin:6px 0 0 18px;padding:0;color:var(--text-muted,#94a3b8);">`;
    toolCalls.forEach(tc => {
      const args = tc.args || {};
      const path = args.path || args.file || args.folder || args.url || args.query || args.cmd;
      const pathStr = path ? ` <code style="color:#e2e8f0;">${escapeHtml(String(path).slice(0, 100))}</code>` : "";
      const writeTag = tc.isWrite ? ` <span style="color:#34d399;font-size:10px;">[escritura]</span>` : "";
      html += `<li><code style="color:#a78bfa;">${escapeHtml(tc.name)}</code>${pathStr}${writeTag}</li>`;
    });
    html += `</ul></div>`;
  }

  if (antiLoops.length) {
    html += `<div style="color:#f59e0b;">⚠️ Anti-loop: ${antiLoops.length} operación(es) repetida(s) prevenida(s)</div>`;
  }

  if (guardrails.length) {
    html += `<div style="color:#f59e0b;">🛡️ Guardrail de simulación activado ${guardrails.length} vez(ces)</div>`;
  }

  if (errors.length) {
    html += `<div style="color:#f87171;">❌ Errores: ${errors.length}</div>`;
  }

  if (fallback) {
    html += `<div style="color:#f59e0b;">🔄 Síntesis fallback determinista utilizada (el modelo no generó reporte)</div>`;
  } else if (finalReport) {
    html += `<div style="color:#34d399;">✅ Reporte final generado correctamente</div>`;
  } else if (synthesis) {
    html += `<div style="color:#facc15;">⏳ Síntesis en curso…</div>`;
  }

  html += `</div></details>`;
  return html;
}

function renderLiveTracePanel(trace) {
  return ""; // v44: panel oculto
  if (!trace || !trace.length) return "";
  const recent = trace.slice(-12);
  if (!recent.length) return "";

  let html = '<div class="live-trace-panel">';
  html += '<div class="live-trace-title"><span class="mini-dots"><span></span><span></span><span></span></span> Actividad del agente</div>';
  html += '<ul class="live-trace-list">';

  recent.forEach(ev => {
    if (ev.kind === "plan") {
      html += `<li class="info">📋 Planificando tarea…</li>`;
    } else if (ev.kind === "tool_call") {
      const args = ev.args || {};
      const p = args.path || args.file || args.folder || args.url || args.query || args.cmd || "";
      const pStr = p ? `<span class="trace-path" title="${escapeHtml(String(p))}">${escapeHtml(String(p).slice(0, 50))}</span>` : "";
      html += `<li class="info">🔧 <code>${escapeHtml(ev.name)}</code> ${pStr}</li>`;
    } else if (ev.kind === "observation") {
      const ok = ev.ok !== false;
      const cls = ok ? "ok" : "err";
      const p = ev.path ? `<span class="trace-path">${escapeHtml(String(ev.path).slice(-45))}</span>` : "";
      const preview = ok
        ? (ev.fullLength ? `(${ev.fullLength} chars)` : "")
        : `❌ ${escapeHtml(ev.error || "")}`;
      html += `<li class="${cls}">${ok ? "✓" : "✘"} <code>${escapeHtml(ev.name)}</code> ${p} ${preview}</li>`;
    } else if (ev.kind === "anti_loop") {
      html += `<li class="warn">⚠️ Anti-loop: <code>${escapeHtml(ev.name)}</code></li>`;
    } else if (ev.kind === "guardrail") {
      html += `<li class="warn">🛡️ Guardrail activado</li>`;
    } else if (ev.kind === "synthesis_start") {
      html += `<li class="info">📝 Generando reporte final…</li>`;
    } else if (ev.kind === "synthesis_fallback") {
      html += `<li class="warn">🔄 Usando reporte fallback</li>`;
    } else if (ev.kind === "final_report") {
      html += `<li class="ok">✅ Reporte final listo</li>`;
    } else if (ev.kind === "error") {
      html += `<li class="err">❌ ${escapeHtml(ev.message || "Error")}</li>`;
    }
  });

  html += "</ul></div>";
  return html;
}

function appendChat(role, text, attachments, spinner, rawHtml) {
  const logEl = document.getElementById("chat-log");
  const el = document.createElement("div");
  el.className = "msg " + role;
  const label = role === "user" ? "Tu" : "GafCoreAI";
  if (role === "agent-working") {
    el.className = "msg assistant agent-working";
  }
  el.innerHTML = "<div class=\"who\">" + label + "</div><div class=\"body\"></div>";
  const bodyEl = el.querySelector(".body");
  const pulseHtml = '<span class="pulse-dots" style="margin-right:6px;"><span class="pulse-dot"></span><span class="pulse-dot"></span><span class="pulse-dot"></span></span>';
  if (rawHtml) {
    bodyEl.innerHTML = (spinner ? pulseHtml : "") + (text || "");
  } else if (spinner) {
    bodyEl.innerHTML = pulseHtml + renderMarkdownLite(text || "");
  } else if (role === "assistant" || role === "agent-working") {
    bodyEl.innerHTML = renderMarkdownLite(text || "");
  } else {
    bodyEl.textContent = text || "";
  }

  if (attachments && attachments.length) {
    const attsEl = document.createElement("div");
    attsEl.className = "attachments";
    attsEl.style.display = "flex";
    attsEl.style.flexWrap = "wrap";
    attsEl.style.gap = "6px";
    attsEl.style.marginTop = "6px";
    attachments.forEach(a => {
      const imgUrl = a.dataUrl || a.data || a.url;
      if (a.isImage && imgUrl) {
        const img = document.createElement("img");
        img.src = imgUrl;
        img.style.maxWidth = "220px";
        img.style.maxHeight = "160px";
        img.style.borderRadius = "6px";
        img.style.display = "block";
        img.style.border = "1px solid rgba(255,255,255,0.15)";
        img.style.cursor = "pointer";
        img.title = a.name || "Imagen adjunta";
        img.onclick = () => window.open(imgUrl, "_blank");
        attsEl.appendChild(img);
      } else {
        const chip = document.createElement("span");
        chip.className = "att-chip" + (a.kind === "codebase" ? " kind-codebase" : "") + (a.kind === "rag" ? " kind-codebase" : "");
        chip.textContent = (a.isImage ? "🖼️ " : "📎 ") + a.name;
        attsEl.appendChild(chip);
      }
    });
    el.appendChild(attsEl);
  }

  logEl.appendChild(el);
  logEl.scrollTop = logEl.scrollHeight;
  return el;
}

function stopThinkingBubbles(msg) {
  const text = msg || "Operación cancelada.";
  document.querySelectorAll(".agent-thinking-pulse").forEach(pulse => {
    const body = pulse.closest(".body") || pulse.parentElement;
    if (body) {
      body.innerHTML = '<p style="color:var(--warn,#fbbf24);margin:0;">' + text + "</p>";
    } else {
      pulse.remove();
    }
  });
}

function haltAgent(reason) {
  if (state.agentAbort) {
    try { state.agentAbort.abort(); } catch (e) {}
  }
  if (state.orchestrator && typeof state.orchestrator.stop === "function") {
    try { state.orchestrator.stop(); } catch (e) {}
  }
  state.agentRunning = false;
  state.agentQueue = [];
  stopThinkingBubbles(reason);
  const btnSend = document.getElementById("chat-send");
  if (btnSend) {
    btnSend.textContent = state.mode === "agent" ? "Ejecutar" : "Enviar";
    btnSend.classList.remove("btn-danger");
  }
}

function updateMsgText(msgEl, text) {
  const body = msgEl.querySelector(".body");
  const pulseHtml = '<span class="pulse-dots" style="margin-right:6px;"><span class="pulse-dot"></span><span class="pulse-dot"></span><span class="pulse-dot"></span></span>';
  if (body) body.innerHTML = pulseHtml + renderMarkdownLite(text);
  const logEl = document.getElementById("chat-log");
  if (logEl) logEl.scrollTop = 999999;
}

function saveResponseAsFile(text) {
  const name = prompt("Nombre del archivo:", "respuesta.md");
  if (!name) return;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const TEXT_EXTENSIONS = [
  "txt","md","json","js","jsx","ts","tsx","html","htm","css","scss","py","rb","php",
  "java","c","cpp","cs","go","rs","sh","bash","yml","yaml","toml","ini","sql","xml",
  "csv","log","svg"
];

function isTextFile(name, mime) {
  if (mime && mime.startsWith("text/")) return true;
  const ext = (String(name).split(".").pop() || "").toLowerCase();
  return TEXT_EXTENSIONS.includes(ext);
}

function formatSize(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}

function fileIcon(name, isImg) {
  if (isImg) return "&#128444;";
  const ext = (String(name).split(".").pop() || "").toLowerCase();
  if (["js","jsx","ts","tsx"].includes(ext)) return "&#128220;";
  if (["html","htm"].includes(ext)) return "&#127760;";
  if (["css","scss"].includes(ext)) return "&#127912;";
  if (["json","yml","yaml"].includes(ext)) return "&#9881;";
  if (["md","txt"].includes(ext)) return "&#128221;";
  if (ext === "svg") return "&#127912;";
  if (ext === "py") return "&#128013;";
  return "&#128196;";
}

async function addFiles(fileList) {
  for (const file of fileList) {
    if (file.size > 50 * 1024 * 1024) {
      alert(file.name + " > 50 MB");
      continue;
    }

    const tipo = getFileType(file);
    const isImage = tipo === "image" && !file.name.endsWith(".svg");
    const att = {
      kind: "file",
      name: file.name,
      size: file.size,
      type: file.type,
      isImage,
      dataUrl: null,
      text: null,
      fileType: tipo
    };

    try {
      if (isImage) {
        att.dataUrl = await new Promise(res => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.readAsDataURL(file);
        });
        termWrite("Imagen adjuntada: " + file.name, "dim");
      } else if (tipo === "pdf" || tipo === "docx" || tipo === "xlsx") {
        termWrite("Extrayendo texto de " + file.name + " (" + tipo + ")...", "dim");
        const resultado = await readAnyFile(file);
        if (resultado.ok) {
          att.text = resultado.text;
          const extra = tipo === "pdf" && resultado.pages
            ? " (" + resultado.pages + " paginas)"
            : tipo === "xlsx" && resultado.sheets
              ? " (" + resultado.sheets + " hojas)"
              : "";
          termWrite("  OK: " + att.text.length + " caracteres" + extra, "success");
        } else {
          att.text = "[Error extrayendo texto: " + resultado.error + "]";
          termWrite("  Error: " + resultado.error, "error");
        }
      } else if (isTextFile(file.name, file.type)) {
        att.text = await new Promise(res => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.readAsText(file);
        });
        termWrite("Archivo adjuntado: " + file.name, "dim");
      } else {
        att.text = "[Binario: " + file.name + "]";
        termWrite("Binario adjuntado: " + file.name, "warn");
      }
    } catch (e) {
      att.text = "[Error: " + e.message + "]";
      termWrite("Error con " + file.name + ": " + e.message, "error");
    }

    state.attachments.push(att);
  }
  renderAttachPreview();
}

function renderAttachPreview() {
  const box = document.getElementById("attach-preview");
  if (!state.attachments.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  box.classList.remove("hidden");
  box.innerHTML = "";
  state.attachments.forEach((att, i) => {
    const chip = document.createElement("div");
    const kindClass = att.kind === "url" ? " url"
                    : att.kind === "search" ? " search"
                    : (att.kind === "codebase" || att.kind === "rag") ? " kind-codebase" : "";
    chip.className = "attach-chip" + (att.isImage ? " image" : "") + kindClass;

    if (att.isImage && att.dataUrl) {
      const img = document.createElement("img");
      img.className = "ac-thumb";
      img.src = att.dataUrl;
      chip.appendChild(img);
    } else {
      const ico = document.createElement("span");
      ico.className = "ac-icon";
      ico.innerHTML = (att.kind === "codebase" || att.kind === "rag") ? "&#128269;"
                       : att.kind === "url" ? "&#127760;"
                       : att.kind === "search" ? "&#128270;"
                       : fileIcon(att.name, att.isImage);
      chip.appendChild(ico);
    }

    const name = document.createElement("span");
    name.className = "ac-name";
    name.textContent = att.name;
    chip.appendChild(name);

    const rm = document.createElement("button");
    rm.className = "ac-remove";
    rm.textContent = "\u00d7";
    rm.onclick = () => { state.attachments.splice(i, 1); renderAttachPreview(); };
    chip.appendChild(rm);
    box.appendChild(chip);
  });
}

function showSlashMenu() { document.getElementById("slash-menu").classList.remove("hidden"); }
function hideSlashMenu() { document.getElementById("slash-menu").classList.add("hidden"); }

function extractUrls(text) {
  const re = /https?:\/\/[^\s<>"']+/gi;
  return (text.match(re) || []).filter(u =>
    !u.startsWith("https://github.com/") && !u.startsWith("https://api.github.com/"));
}

// ────────────────────────────────────────────────────────────
//  DISCO REAL
// ────────────────────────────────────────────────────────────
async function openDiskFolderByPath(folder) {
  if (!folder) return;
  folder = folder.replace(/[\\\/]+$/, "");

  // v36: Auto-crear carpeta en Windows si no existe
  if (/^[a-zA-Z]:[\\\/]/.test(folder) && typeof tauri !== "undefined" && typeof tauri.createDir === "function") {
    try {
      await tauri.createDir(folder);
      termWrite(" Carpeta creada: " + folder, "success");
    } catch (_) {}
  }
  state.diskFolder = folder; try { localStorage.setItem("gafcoreai_last_disk_folder", folder); } catch (_) {}
  try { localStorage.setItem("gafcoreai_last_disk_folder", folder); } catch (_) {}
  state.validPaths = null;
  state.validPathsRoot = null;
  const diskPathEl = document.getElementById("disk-path");
  if (diskPathEl) diskPathEl.textContent = truncatePath(folder, 30);
  const diskBarEl = document.getElementById("disk-bar");
  if (diskBarEl) diskBarEl.classList.remove("hidden");
  termWrite("Carpeta de trabajo establecida: " + folder, "success");
  log("Carpeta de disco: " + folder);

  if (state.repo) {
    state.repo = null; saveRepo();
    const repoBarEl = document.getElementById("repo-bar");
    if (repoBarEl) repoBarEl.classList.add("hidden");
  }

  if (state.terminalInteractive && state.terminalInteractive.spawned) {
    try { await state.terminalInteractive.restart(folder); } catch (e) {}
  }

  if (Desktop.isDesktop()) {
    await refreshDiskFolder();
  }
  if (state.mentions) state.mentions.items = [];
  if (state.projectWatcher) state.projectWatcher.start(45000);

  // ─────────────────────────────────────────────────────────
  //  CONVERSACIONES POR PROYECTO
  //  Al abrir un proyecto: cambiamos la conversación activa y
  //  restauramos el historial guardado (si existe).
  // ─────────────────────────────────────────────────────────
  if (state.conversation && !state.agentRunning) {
    state.conversation.switchTo(folder);
    const logEl = document.getElementById("chat-log");
    if (logEl) logEl.innerHTML = "";

    const conv = state.conversation.getActive();
    if (conv && conv.messages && conv.messages.length > 0) {
      // Proyecto ya trabajado: restaurar historial
      renderProjectLoadedHeader(folder);
      renderConversationHistory(conv.messages);
      termWrite("💬 Conversación restaurada (" + conv.messages.length + " mensajes)", "dim");
    } else {
      // Proyecto nuevo: chat limpio con header
      renderProjectLoadedHeader(folder);
      termWrite("💬 Nueva conversación para este proyecto", "dim");
    }

    state.activeAgentFile = null;
    state.activeAgentFileHistory = [];
    renderAgentLiveStatus();
  }
}
state.openFolderFromPath = openDiskFolderByPath;

async function openDiskFolder() {
  if (!Desktop.isDesktop()) {
    showAlert("Esta funcion solo esta disponible en la version de escritorio (.exe).\n\n" +
              "Ejecuta gafcoreai.exe en lugar de abrir localhost en el navegador.", "Modo Web");
    return;
  }

  termWrite("");
  termWrite("Abriendo dialogo de carpeta...", "dim");

  let folder = null;
  try {
    folder = await Desktop.pickFolder();
  } catch (e) {
    termWrite("Error en dialog: " + e.message, "error");
    folder = await showPrompt("No se pudo abrir el selector. Escribe la ruta completa:", "D:\\PROGRAMAS IA");
  }

  if (!folder) {
    termWrite("  Cancelado por el usuario", "dim");
    return;
  }

  await openDiskFolderByPath(folder);
}

async function refreshDiskFolder() {
  if (!state.diskFolder) return;
  // v46: boton "subir un nivel" en la barra del proyecto
  (function ensureDiskUpBtn() {
    const bar = document.getElementById("disk-bar");
    if (!bar) return;
    if (document.getElementById("btn-disk-up")) return;
    const pathEl = document.getElementById("disk-path");
    if (!pathEl) return;
    const btn = document.createElement("button");
    btn.id = "btn-disk-up";
    btn.title = "Subir un nivel";
    btn.textContent = "\u2191";
    btn.style.cssText = "margin:0 6px 0 0;padding:1px 8px;font-size:14px;line-height:1.2;cursor:pointer;border-radius:5px;";
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!state.diskFolder) return;
      const clean = state.diskFolder.replace(/[\\\/]+$/, "");
      const parts = clean.split(/[\\\/]+/).filter(p => p.length);
      if (parts.length <= 1) return;
      parts.pop();
      let parent = parts.join("\\");
      if (parent.length === 2 && parent[1] === ":") parent = parent + "\\";
      state.diskFolder = parent;
      const pe = document.getElementById("disk-path");
      if (pe) pe.textContent = truncatePath(parent, 30);
      refreshDiskFolder();
    };
    pathEl.parentElement.insertBefore(btn, pathEl);
  })();
  if (!Desktop.isDesktop()) return;
  try {
    const entries = await tauri.listDir(state.diskFolder);
    state.diskEntries = entries;
    renderFileTree();
    termWrite("  " + entries.length + " elementos en " + state.diskFolder, "dim");
    if (state.mentions) state.mentions.items = [];

    const fileNames = new Set((entries || []).map(e => e.name));
    const isGit = fileNames.has(".git");
    const isSb = fileNames.has("project-infra.json") || fileNames.has(".env") || fileNames.has(".env.local");
    const isVc = fileNames.has(".vercel") || fileNames.has("vercel.json");
    const isPkg = fileNames.has("package.json");
    const hasNodeModules = fileNames.has("node_modules");

    termWrite("📦 Infraestructura detectada:", "head");
    if (isGit) termWrite("   ✓ Git: Repositorio activo", "success");
    else termWrite("   ⚠ Git: No inicializado (.git ausente)", "warn");

    if (isSb) termWrite("   ✓ Supabase: Conectado (GAFCORE Ecosystem)", "success");
    else termWrite("   ℹ Supabase: Falta project-infra.json (puedes pedirle al agente que lo cree)", "dim");

    if (isVc) termWrite("   ✓ Vercel: Proyecto enlazado", "success");

    if (isPkg && !hasNodeModules) {
      termWrite("   ⚠ Dependencias: Falta node_modules (ejecuta npm install)", "warn");
    }

    if (state.proactive) state.proactive.analyze();
  } catch (e) {
    termWrite("Error leyendo carpeta: " + e.message, "error");
    alert("Error: " + e.message);
  }
}

async function closeDiskFolder() {
  // Guardar la conversación actual del proyecto antes de cerrar
  if (state.conversation) {
    state.conversation.save();
    state.conversation.deactivate();
  }

  state.diskFolder = null; try { localStorage.removeItem("gafcoreai_last_disk_folder"); } catch (_) {}
  state.diskEntries = [];
  state.currentDiskFile = null;
  const diskBarEl = document.getElementById("disk-bar");
  if (diskBarEl) diskBarEl.classList.add("hidden");
  const currentFileLabelEl = document.getElementById("current-file-label");
  if (currentFileLabelEl) currentFileLabelEl.innerHTML = "&mdash;";
  renderFileTree();
  termWrite("Carpeta cerrada en el panel de proyectos", "dim");
  if (state.mentions) state.mentions.items = [];

  // Limpiar el chat visualmente y mostrar welcome de nuevo
  state.activeAgentFile = null;
  state.activeAgentFileHistory = [];
  renderAgentLiveStatus();
  renderWelcome();
}
state.closeDiskFolder = closeDiskFolder;

async function openDiskFile(path) {
  if (!Desktop.isDesktop()) return;
  try {
    const content = await tauri.readFile(path);
    state.currentDiskFile = path;
    const name = path.split(/[\\\/]/).pop();
    document.getElementById("current-file-label").textContent = name;
    if (state.editor) {
      state.editor.setValue(content);
      const ext = (path.split(".").pop() || "").toLowerCase();
      const lang =
        ["ts","tsx"].includes(ext) ? "typescript" :
        ["js","jsx"].includes(ext) ? "javascript" :
        ext === "py" ? "python" : ext === "html" ? "html" :
        ext === "css" ? "css" : ext === "json" ? "json" :
        ext === "md" ? "markdown" : (ext === "yml" || ext === "yaml") ? "yaml" :
        ext === "svg" ? "xml" : ext === "sh" ? "shell" : "plaintext";
      try { monaco.editor.setModelLanguage(state.editor.getModel(), lang); } catch (_) {}
    }
    termWrite(path, "dim");
    switchMainTab("editor");

    if (state.lsp) {
      const ext = (path.split(".").pop() || "").toLowerCase();
      const langId = ["ts","tsx"].includes(ext) ? "typescript"
                   : ["js","jsx","mjs","cjs"].includes(ext) ? "typescript"
                   : ext === "py" ? "python"
                   : ["html","htm"].includes(ext) ? "html"
                   : ["css","scss","less"].includes(ext) ? "css"
                   : ["json","jsonc"].includes(ext) ? "json" : null;
      if (langId && state.lsp.servers.has(langId)) {
        const uri = "file:///" + path.replace(/\\/g, "/");
        await state.lsp.openDocument(langId, uri, content, 1);
      }
    }
  } catch (e) {
    termWrite("Error leyendo archivo: " + e.message, "error");
  }
}

async function saveCurrentFile() {
  if (!Desktop.isDesktop()) {
    alert("Guardar al disco solo funciona en la version de escritorio.");
    return;
  }
  if (!state.currentDiskFile) {
    alert("No hay archivo abierto del disco.");
    return;
  }
  try {
    const content = state.editor.getValue();
    await tauri.writeFile(state.currentDiskFile, content);
    termWrite("Guardado: " + state.currentDiskFile, "success");
    log("Archivo guardado");
  } catch (e) {
    termWrite("Error guardando: " + e.message, "error");
    alert("Error: " + e.message);
  }
}

// ────────────────────────────────────────────────────────────
//  PROYECTO / ARBOL
// ────────────────────────────────────────────────────────────
function updateProjectBar() {
  const bar = document.getElementById("project-bar");
  const count = document.getElementById("project-count");
  if (!bar || !count) return;
  const n = Object.keys(state.projectFiles || {}).length;
  if (n > 0) { bar.classList.remove("hidden"); count.textContent = String(n); }
  else bar.classList.add("hidden");
}

function isAgentActiveFile(targetPath) {
  if (!state.activeAgentFile || !state.activeAgentFile.path || !targetPath) return false;
  const p1 = String(state.activeAgentFile.path).replace(/\\/g, "/").toLowerCase().trim();
  const p2 = String(targetPath).replace(/\\/g, "/").toLowerCase().trim();
  const n1 = p1.split("/").pop();
  const n2 = p2.split("/").pop();
  return p1 === p2 || p1.endsWith("/" + p2) || p2.endsWith("/" + p1) || (n1 && n1 === n2);
}

function isAgentTouchedFile(targetPath) {
  if (!state.activeAgentFileHistory || !state.activeAgentFileHistory.length || !targetPath) return false;
  const p2 = String(targetPath).replace(/\\/g, "/").toLowerCase().trim();
  const n2 = p2.split("/").pop();
  return state.activeAgentFileHistory.some(h => {
    const p1 = String(h.path || "").replace(/\\/g, "/").toLowerCase().trim();
    const n1 = p1.split("/").pop();
    return p1 === p2 || p1.endsWith("/" + p2) || p2.endsWith("/" + p1) || (n1 && n1 === n2);
  });
}

function renderFileTree() {
  const c = document.getElementById("file-tree");
  if (!c) return;
  c.innerHTML = "";

  if (state.diskFolder) {
    const isDirActive = isAgentActiveFile(state.diskFolder);
    const label = document.createElement("div");
    label.className = "tree-node dir" + (isDirActive ? " agent-active-file" : "");
    label.style.paddingLeft = "8px";
    label.style.fontWeight = "600";
    label.innerHTML = "📁 <b>" + (state.diskFolder.split(/[\\\/]/).pop() || state.diskFolder) + "</b>" + (isDirActive ? '<span class="agent-dot" title="Agente operando aquí">●</span>' : "");
    label.title = state.diskFolder;
    c.appendChild(label);

    state.diskEntries.forEach(entry => {
      const isActive = isAgentActiveFile(entry.path);
      const wasTouched = !isActive && isAgentTouchedFile(entry.path);
      const el = document.createElement("div");
      el.className = "tree-node file" + (entry.is_dir ? " dir" : "") + (isActive ? " agent-active-file" : "") + (wasTouched ? " agent-touched-file" : "");
      el.style.paddingLeft = "24px";
      const icon = entry.is_dir ? "&#128193; " : fileIcon(entry.name, false) + " ";
      const activeDot = isActive ? `<span class="agent-dot" title="Agente interactuando con este archivo">●</span>` : "";
      const touchedDot = wasTouched ? `<span class="agent-touched-dot" title="Archivo analizado por el agente">●</span>` : "";
      el.innerHTML = icon + entry.name + activeDot + touchedDot;
      el.title = entry.path;
      el.onclick = () => {
        if (entry.is_dir) {
          state.diskFolder = entry.path;
          document.getElementById("disk-path").textContent = truncatePath(entry.path, 30);
          refreshDiskFolder();
        } else {
          openDiskFile(entry.path);
        }
      };
      c.appendChild(el);
    });

    const sep = document.createElement("div");
    sep.style.height = "10px";
    c.appendChild(sep);
  }

  const projFiles = Object.keys(state.projectFiles || {}).sort();
  const pendingPaths = Array.from(state.pendingChanges.keys());

  if (projFiles.length > 0 || pendingPaths.length > 0) {
    const label = document.createElement("div");
    label.className = "tree-node dir";
    label.style.paddingLeft = "8px";
    label.textContent = "&#128230; Proyecto (" + projFiles.length + " aceptados)";
    c.appendChild(label);

    const folders = {};
    projFiles.forEach(p => {
      const parts = p.split("/");
      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
      if (!folders[folder]) folders[folder] = [];
      folders[folder].push(p);
    });

    Object.keys(folders).sort().forEach(folder => {
      if (folder) {
        const isFdActive = isAgentActiveFile(folder);
        const fd = document.createElement("div");
        fd.className = "tree-node dir" + (isFdActive ? " agent-active-file" : "");
        fd.style.paddingLeft = "24px";
        fd.innerHTML = "&#128193; " + folder + (isFdActive ? '<span class="agent-dot">●</span>' : "");
        c.appendChild(fd);
        folders[folder].forEach(p => {
          const isActive = isAgentActiveFile(p);
          const el = document.createElement("div");
          el.className = "tree-node file project-file" + (isActive ? " agent-active-file" : "");
          el.style.paddingLeft = "40px";
          const activeDot = isActive ? '<span class="agent-dot">●</span>' : "";
          el.innerHTML = fileIcon(p, false) + " " + p.split("/").pop() + activeDot;
          el.title = p;
          el.onclick = () => showProjectFile(p);
          c.appendChild(el);
        });
      } else {
        folders[folder].forEach(p => {
          const isActive = isAgentActiveFile(p);
          const el = document.createElement("div");
          el.className = "tree-node file project-file" + (isActive ? " agent-active-file" : "");
          el.style.paddingLeft = "24px";
          const activeDot = isActive ? '<span class="agent-dot">●</span>' : "";
          el.innerHTML = fileIcon(p, false) + " " + p + activeDot;
          el.title = p;
          el.onclick = () => showProjectFile(p);
          c.appendChild(el);
        });
      }
    });

    const sep = document.createElement("div");
    sep.style.height = "10px";
    c.appendChild(sep);
  }

  if (state.repo) {
    const label = document.createElement("div");
    label.className = "tree-node dir";
    label.style.paddingLeft = "8px";
    label.textContent = "&#128218; " + state.repo.owner + "/" + state.repo.name;
    c.appendChild(label);
    state.repo.tree.slice(0, 300).forEach(f => {
      const el = document.createElement("div");
      el.className = "tree-node file";
      const depth = (f.path.match(/\//g) || []).length;
      el.style.paddingLeft = (24 + depth * 12) + "px";
      el.textContent = fileIcon(f.path, false) + " " + f.path.split("/").pop();
      el.title = f.path;
      el.onclick = () => openRepoFile(f.path);
      c.appendChild(el);
    });
  }
}

function showProjectFile(path) {
  if (!state.projectFiles[path]) return;
  const content = state.projectFiles[path];
  if (state.editor) {
    state.editor.setValue(content);
    const ext = (path.split(".").pop() || "").toLowerCase();
    const lang =
      ["ts","tsx"].includes(ext) ? "typescript" :
      ["js","jsx"].includes(ext) ? "javascript" :
      ext === "py" ? "python" : ext === "html" ? "html" :
      ext === "css" ? "css" : ext === "json" ? "json" :
      ext === "md" ? "markdown" : (ext === "yml" || ext === "yaml") ? "yaml" :
      ext === "svg" ? "xml" : ext === "sh" ? "shell" : "plaintext";
    try { monaco.editor.setModelLanguage(state.editor.getModel(), lang); } catch (_) {}
    switchMainTab("editor");
  }
}

// ────────────────────────────────────────────────────────────
//  PREVIEW
// ────────────────────────────────────────────────────────────
async function buildPreviewHtml() {
  const files = state.projectFiles || {};
  const paths = Object.keys(files);
  const sep = (state.diskFolder && state.diskFolder.includes("/")) ? "/" : "\\";

  let htmlPath = paths.find(p => p === "index.html") ||
                 paths.find(p => p.endsWith("/index.html") || p.endsWith("\\index.html")) ||
                 paths.find(p => p.endsWith(".html"));

  let html = htmlPath ? files[htmlPath] : null;

  if (!html && state.diskFolder && typeof tauri !== "undefined" && tauri.readFile) {
    const candidates = [
      "index.html", "public" + sep + "index.html", "public/index.html",
      "src" + sep + "index.html", "src/index.html",
      "dist" + sep + "index.html", "dist/index.html",
      "build" + sep + "index.html", "build/index.html",
      "views" + sep + "index.html", "views/index.html"
    ];

    for (const cand of candidates) {
      const full = state.diskFolder.replace(/[\\\/]$/, "") + sep + cand;
      try {
        const content = await tauri.readFile(full);
        if (content && content.trim().length > 0) {
          html = content;
          htmlPath = cand;
          break;
        }
      } catch (_) {}
    }

    if (!html && state.diskEntries && state.diskEntries.length) {
      const htmlEntry = state.diskEntries.find(e => !e.is_dir && e.name && e.name.toLowerCase().endsWith(".html"));
      if (htmlEntry) {
        const full = state.diskFolder.replace(/[\\\/]$/, "") + sep + htmlEntry.name;
        try {
          html = await tauri.readFile(full);
          htmlPath = htmlEntry.name;
        } catch (_) {}
      }
    }
  }

  if (html && htmlPath) {
    const cssMatches = Array.from(html.matchAll(/<link[^>]+href=["']([^"']+\.css)["'][^>]*\/?>/gi));
    for (const match of cssMatches) {
      const href = match[1];
      if (href.startsWith("http://") || href.startsWith("https://")) continue;
      let cssContent = "";
      if (files[href] || files[href.replace(/^\.?\//, "")]) {
        cssContent = files[href] || files[href.replace(/^\.?\//, "")];
      } else if (state.diskFolder && typeof tauri !== "undefined" && tauri.readFile) {
        const fullCss = state.diskFolder.replace(/[\\\/]$/, "") + sep + href.replace(/^\.?[\/\\]+/, "").replace(/[\/\\]+/g, sep);
        try { cssContent = await tauri.readFile(fullCss); } catch (_) {}
      }
      if (cssContent) {
        html = html.replace(match[0], "<style>\n" + cssContent + "\n</style>");
      }
    }

    const jsMatches = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/gi));
    for (const match of jsMatches) {
      const src = match[1];
      if (src.startsWith("http://") || src.startsWith("https://")) continue;
      let jsContent = "";
      if (files[src] || files[src.replace(/^\.?\//, "")]) {
        jsContent = files[src] || files[src.replace(/^\.?\//, "")];
      } else if (state.diskFolder && typeof tauri !== "undefined" && tauri.readFile) {
        const fullJs = state.diskFolder.replace(/[\\\/]$/, "") + sep + src.replace(/^\.?[\/\\]+/, "").replace(/[\/\\]+/g, sep);
        try { jsContent = await tauri.readFile(fullJs); } catch (_) {}
      }
      if (jsContent) {
        html = html.replace(match[0], "<script>\n" + jsContent + "\n</script>");
      }
    }

    return { ok: true, html, path: htmlPath };
  }

  if (state.diskFolder && typeof tauri !== "undefined" && tauri.readFile) {
    try {
      const pkgRaw = await tauri.readFile(state.diskFolder.replace(/[\\\/]$/, "") + sep + "package.json");
      if (pkgRaw) {
        const pkg = JSON.parse(pkgRaw);
        const name = pkg.name || state.diskFolder.split(/[\\\/]/).pop();
        const scripts = pkg.scripts || {};
        const devCmd = scripts.dev ? "npm run dev" : (scripts.start ? "npm start" : "npm test");

        const currentTheme = (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "dark";
        const dashboardHtml = `<!DOCTYPE html>
<html lang="es" data-theme="${currentTheme}">
<head>
  <meta charset="UTF-8">
  <title>${name} - GafCoreAI Preview</title>
  <style>
    :root { --bg: #0c1017; --card-bg: #131b26; --text: #f1f5f9; --text-muted: #94a3b8; --border: rgba(255,255,255,0.08); --box-shadow: 0 20px 40px rgba(0,0,0,0.5); --info-bg: rgba(0,0,0,0.25); }
    html[data-theme="light"] { --bg: #f8fafc; --card-bg: #ffffff; --text: #0f172a; --text-muted: #64748b; --border: rgba(0,0,0,0.08); --box-shadow: 0 20px 40px rgba(0,0,0,0.08); --info-bg: #f1f5f9; }
    body { margin: 0; padding: 40px 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; transition: background 0.2s, color 0.2s; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; max-width: 580px; width: 100%; box-shadow: var(--box-shadow); text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); border-radius: 20px; color: #818cf8; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 8px 0; color: inherit; }
    p { font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0 0 24px 0; }
    .info-box { background: var(--info-bg); border-radius: 8px; padding: 12px; margin-top: 24px; font-family: Consolas, monospace; font-size: 13px; color: #10b981; text-align: left; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🚀 Proyecto Frontend / Node Activo</div>
    <h1>${name}</h1>
    <p>Este proyecto se ejecuta mediante un servidor de desarrollo. Puedes iniciarlo directamente desde la terminal integrada de GafCoreAI.</p>
    <div class="info-box">
      <div>Comando sugerido: <b>${devCmd}</b></div>
      <div style="color:var(--text-muted);margin-top:4px;">Directorio: ${state.diskFolder}</div>
    </div>
  </div>
</body>
</html>`;
        return { ok: true, html: dashboardHtml, path: "package.json" };
      }
    } catch (_) {}
  }

  const currentTheme = (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "dark";
  const fallbackHtml = `<!DOCTYPE html>
<html lang="es" data-theme="${currentTheme}">
<head>
  <meta charset="UTF-8">
  <style>
    :root { --bg: #0c1017; --card-bg: #131b26; --text: #f1f5f9; --text-muted: #94a3b8; --border: rgba(255,255,255,0.08); --box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    html[data-theme="light"] { --bg: #f8fafc; --card-bg: #ffffff; --text: #0f172a; --text-muted: #64748b; --border: rgba(0,0,0,0.08); --box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
    body { margin: 0; padding: 40px 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; transition: background 0.2s, color 0.2s; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; max-width: 500px; width: 100%; text-align: center; box-shadow: var(--box-shadow); }
    .icon { font-size: 32px; margin-bottom: 12px; }
    h2 { margin: 0 0 12px; font-size: 20px; color: inherit; }
    p { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🌐</div>
    <h2>Espacio de Trabajo Listo</h2>
    <p>Pídele a GafCoreAI en el chat crear una página web, o crea un archivo <code>index.html</code> para visualizar el proyecto en vivo aquí.</p>
  </div>
</body>
</html>`;
  return { ok: true, html: fallbackHtml, path: "preview.html" };
}

function resolveRelativePath(basePath, relative) {
  if (relative.startsWith("http://") || relative.startsWith("https://")) return relative;
  let rel = relative.replace(/^\.\//, "").replace(/^\//, "");
  const baseDir = basePath.includes("/") ? basePath.slice(0, basePath.lastIndexOf("/")) : "";
  if (baseDir && !rel.startsWith(baseDir)) {
    const candidate = baseDir + "/" + rel;
    if (state.projectFiles && state.projectFiles[candidate] !== undefined) return candidate;
  }
  return rel;
}

async function previewProject() {
  const result = await buildPreviewHtml();
  if (!result.ok) { termWrite("Preview: " + result.error, "error"); return; }
  termWrite("Preview: " + result.path + " (" + result.html.length + " bytes)", "success");
  const blob = new Blob([result.html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  state.lastPreviewUrl = url;
  const frame = document.getElementById("browser-frame");
  if (frame) frame.src = url;
  switchMainTab("browser");
  const brUrl = document.getElementById("br-url");
  if (brUrl) brUrl.value = "preview://" + result.path;
}

async function previewProjectNewTab() {
  const result = await buildPreviewHtml();
  if (!result.ok) return;
  const blob = new Blob([result.html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  termWrite("Preview nueva pestana: " + result.path, "success");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function openDownloadModal() {
  const projFiles = Object.keys(state.projectFiles || {}).sort();
  const preview = document.getElementById("dl-preview");
  const nameInput = document.getElementById("dl-name");
  const now = new Date();
  const stamp = now.getFullYear()
    + String(now.getMonth()+1).padStart(2,"0")
    + String(now.getDate()).padStart(2,"0")
    + "-"
    + String(now.getHours()).padStart(2,"0")
    + String(now.getMinutes()).padStart(2,"0");
  nameInput.value = "gafcoreai-proyecto-" + stamp + ".zip";

  if (!projFiles.length) {
    preview.innerHTML = '<div style="color:var(--text-dim)">Aun no hay archivos aceptados.</div>';
  } else {
    preview.innerHTML = "";
    projFiles.forEach(p => {
      const el = document.createElement("div");
      el.innerHTML = fileIcon(p, false) + " " + p + " <span style=\"color:var(--text-dim);font-size:10px\">(" +
        state.projectFiles[p].length + " bytes)</span>";
      preview.appendChild(el);
    });
  }
  openModal("modal-download");
}

async function downloadProjectZip() {
  const name = (document.getElementById("dl-name").value || "").trim();
  if (!name) { alert("Escribe un nombre"); return; }
  const zipName = name.endsWith(".zip") ? name : name + ".zip";
  const projFiles = Object.keys(state.projectFiles || {});
  if (!projFiles.length) { alert("No hay archivos"); return; }

  try {
    termWrite("Generando ZIP nativo...", "dim");
    const { ZipWriter } = await import("./zip-writer.js");
    const zip = new ZipWriter();

    projFiles.forEach(p => {
      const cleanPath = p.replace(/^\/+/, "").replace(/\.\./g, "");
      zip.addFile(cleanPath, state.projectFiles[p]);
    });

    const readme =
      "# Proyecto generado por GafCoreAI\n\n" +
      "Fecha: " + new Date().toLocaleString() + "\n\n" +
      "## Archivos (" + projFiles.length + ")\n\n" +
      projFiles.map(p => "- `" + p + "`").join("\n") + "\n";
    zip.addFile("README_GENERADO.md", readme);

    await zip.download(zipName);
    closeModals();
    termWrite("Proyecto descargado: " + zipName + " (" + projFiles.length + " archivos)", "success");
  } catch (e) {
    console.error("[ZIP] error:", e);
    alert("Error generando ZIP: " + e.message);
  }
}

async function ghApi(path) {
  const cfg = JSON.parse(localStorage.getItem("gafcoreai_github") || "{}");
  const headers = { "Accept": "application/vnd.github+json" };
  if (cfg.token) headers["Authorization"] = "Bearer " + cfg.token;
  const r = await fetch("https://api.github.com" + path, { headers });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

function stripHtml(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, " ");
  html = html.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n");
  html = html.replace(/<br\s*\/?>/gi, "\n");
  html = html.replace(/<[^>]+>/g, "");
  html = html.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
             .replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
  html = html.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return html;
}

async function fetchUrl(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.ok) return { ok: true, text: await r.text(), via: "direct" };
  } catch (e) {}
  try {
    const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
    if (r.ok) return { ok: true, text: await r.text(), via: "allorigins" };
  } catch (e) {}
  try {
    const r = await fetch("https://corsproxy.io/?" + encodeURIComponent(url));
    if (r.ok) return { ok: true, text: await r.text(), via: "corsproxy" };
  } catch (e) {}
  return { ok: false, error: "No se pudo descargar" };
}

function initTools() {
  const tools = new ToolRegistry(core.perms);
  registerAllTools(tools, { state, ghApi, fetchUrl, stripHtml });
  core.tools = tools;
  log("Tools: " + tools.list().length);
  state.onProjectChange = () => {
    saveProject();
    updateProjectBar();
    renderFileTree();
    updatePendingBar();
    renderAgentLiveStatus();
  };
}

function setMode(mode) {
  state.mode = mode || "agent";
  saveMode();
  const btn = document.getElementById("btn-mode-toggle");
  const title = document.getElementById("panel-title");
  const hint = document.getElementById("tool-hint");
  const send = document.getElementById("chat-send");
  const ta = document.getElementById("chat-input");

  if (btn) {
    if (mode === "agent") {
      btn.classList.add("agent-mode");
      const icon = btn.querySelector(".mt-icon");
      if (icon) icon.innerHTML = "&#129302;";
      const label = btn.querySelector(".mt-label");
      if (label) label.textContent = "Agent";
    } else {
      btn.classList.remove("agent-mode");
      const icon = btn.querySelector(".mt-icon");
      if (icon) icon.innerHTML = "&#128172;";
      const label = btn.querySelector(".mt-label");
      if (label) label.textContent = "Chat";
    }
  }
  if (title) {
    title.textContent = "Chat";
  }
  if (hint) {
    hint.style.display = "none";
  }
  if (send && !state.agentRunning) {
    send.textContent = "Enviar";
  }
  if (ta && !ta.placeholder) {
    ta.placeholder = "Pídele algo a GafCoreAI... (usa @ para archivos o / para comandos)";
  }
}

async function handleSend() {
  if (state.agentRunning) {
    termWrite("Agente detenido por el usuario", "warn");
    haltAgent("Cancelado. El modelo no llego a usar herramientas.");
    appendChat("system", "Tarea detenida. Las burbujas de Pensando ya no siguen activas.");
    return;
  }

  if (state.mentions) {
    try {
      const input = document.getElementById("chat-input");
      const original = input.value;
      const { text, attachments } = await state.mentions.resolve(original);
      if (attachments.length) {
        attachments.forEach(a => state.attachments.push(a));
        input.value = text;
        renderAttachPreview();
      }
    } catch (e) { console.warn("Mentions resolve error:", e); }
  }

  if (state.agentBrain) {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    const skillAnalysis = await state.agentBrain.detectSkillUrl(text);
    if (skillAnalysis) {
      await handleSkillInstall(skillAnalysis);
      input.value = "";
      return;
    }
    const mcpDetection = await state.agentBrain.detectMcpUrl(text);
    if (mcpDetection) {
      await handleMcpAdd(mcpDetection);
      input.value = "";
      return;
    }
  }

  const input = document.getElementById("chat-input");
  const rawText = (input ? input.value : "").trim();

  if (isCancelCommand(rawText)) {
    if (input) input.value = "";
    termWrite("Operacion cancelada/detenida por el usuario", "warn");
    haltAgent("Cancelado por el usuario.");
    appendChat("system", "Operacion cancelada. Pensando detenido.");
    return;
  }

  const openProjMatch = rawText.match(/^(?:abre|abrir|carga|cargar|load|open)\s+(?:el\s+)?(?:proyecto|carpeta|folder)?\s*([a-zA-Z0-9_\- ]{2,40})$/i);
  if (openProjMatch) {
    const projName = openProjMatch[1].trim();
    if (!["este", "un", "el", "la", "mi", "tu", "nuevo", "actual", "chat", "agente", "terminal", "diff", "archivo", "archivos"].includes(projName.toLowerCase())) {
      if (input) input.value = "";
      appendChat("user", rawText);
      let targetPath = projName;
      if (!targetPath.includes(":") && !targetPath.startsWith("\\\\") && !targetPath.startsWith("/")) {
        targetPath = "D:\\PROGRAMAS IA\\" + projName.toUpperCase();
      }
      try {
        if (state.openFolderFromPath) {
          await state.openFolderFromPath(targetPath);
        } else {
          state.diskFolder = targetPath;
        }
        termWrite("📂 Proyecto abierto: " + targetPath, "success");
        appendChat("assistant", `📂 **Proyecto cargado en el explorador:**\n\`${targetPath}\`\nLos archivos están listos en el panel derecho.`);
      } catch (err) {
        appendChat("system", `⚠️ No se pudo abrir el proyecto en \`${targetPath}\`: ${err.message}`);
      }
      return;
    }
  }

  const firstWord = rawText.split(/\s/)[0].toLowerCase();

  if (firstWord === "/cinema") {
    if (input) input.value = "";
    if (typeof hideSlashMenu === "function") hideSlashMenu();
    switchMainTab("studio");
    return;
  }
  if (firstWord === "/video") {
    const promptText = rawText.slice(firstWord.length).trim();
    if (input) input.value = "";
    if (typeof hideSlashMenu === "function") hideSlashMenu();
    const atts = (state.attachments || []).slice();
    state.attachments = [];
    if (typeof renderAttachPreview === "function") renderAttachPreview();
    switchMainTab("studio");
    if (state.cinematicStudio) {
      const imgAttachment = atts.find(a => a.isImage || (a.dataUrl && a.dataUrl.startsWith("data:image")) || (a.name && /\.(png|jpe?g|webp|gif)$/i.test(a.name)));
      state.cinematicStudio.openGenerateVideoModal({
        prompt: promptText,
        imageUrl: imgAttachment ? (imgAttachment.dataUrl || imgAttachment.url || imgAttachment.text) : null
      });
    }
    return;
  }

  const query = input.value.trim();
  if (query && state.rag && state.rag.indexed && state.rag.index.length > 0) {
    try {
      const ragCtx = await state.rag.buildContext(query, state.rag.config.topK);
      if (ragCtx) {
        state.attachments.push({
          kind: "rag",
          name: "RAG: " + state.rag.config.topK + " fragmentos",
          isImage: false,
          text: ragCtx
        });
        renderAttachPreview();
      }
    } catch (e) { console.warn("RAG error:", e); }
  }

  const inputVal = document.getElementById("chat-input").value.trim();
  if (!inputVal && state.attachments.length > 0) {
    document.getElementById("chat-input").value = "Analiza los archivos adjuntos";
  }

  await runAgentFromInput();
}

function isCancelCommand(text) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return /^(alto|stop|detente|detener|cancela|cancelar|parar|pausa|basta|abort|abortar|exit|quit)[.!]?$/i.test(t);
}

async function runAgentFromInput() {
  const input = document.getElementById("chat-input");
  const btnSend = document.getElementById("chat-send");

  if (state.agentRunning) {
    const pendingText = input.value.trim();
    input.value = "";

    if (!pendingText || isCancelCommand(pendingText)) {
      if (state.agentAbort) state.agentAbort.abort();
      if (state.orchestrator && typeof state.orchestrator.stop === "function") {
        try { state.orchestrator.stop(); } catch (e) {}
      }
      state.agentRunning = false;
      state.agentQueue = [];
      termWrite("⛔ Agente detenido por el usuario", "warn");
      if (btnSend) {
        btnSend.textContent = "Enviar";
        btnSend.classList.remove("btn-danger");
      }
      appendChat("system", "⛔ Tarea detenida y cancelada por el usuario.");
      return;
    }

    if (!state.agentQueue) state.agentQueue = [];
    state.agentQueue.push(pendingText);
    state.attachments = [];
    if (typeof renderAttachPreview === "function") renderAttachPreview();

    appendChat("user", pendingText);
    appendChat("system", "Mensaje en cola (" + state.agentQueue.length + "). Se procesará al terminar la tarea actual.");
    termWrite("+ En cola: " + pendingText, "dim");
    return;
  }

  const currentAttachments = (state.attachments || []).slice();
  let task = input.value.trim();
  if (isCancelCommand(task)) {
    input.value = "";
    appendChat("user", task);
    appendChat("system", "✓ No hay tareas activas en ejecución.");
    return;
  }

  if (!task && !currentAttachments.length) {
    appendChat("system", "💡 Escribe una pregunta, instrucción o adjunta un archivo para comenzar.");
    return;
  }
  if (!task) task = "[Analizar archivo(s) adjunto(s)]";
  if (!state.activeProvider || !state.activeModel || !state.activeModel.key) {
    appendChat("system", "🔑 **No hay ninguna API Key configurada todavía.**\nSe abrió la ventana de **Proveedores**. Ingresa tu API Key (por ejemplo de DeepSeek, Gemini, Claude o OpenAI) y pulsa **Guardar** para comenzar.");
    recoverKeysFromStorage();
    renderProvidersFull();
    openModal("modal-providers");
    return;
  }

  if (state.mentions && typeof state.mentions.resolve === "function") {
    try {
      const resolvedMentions = await state.mentions.resolve(task);
      task = resolvedMentions.text;
      if (resolvedMentions.attachments && resolvedMentions.attachments.length) {
        resolvedMentions.attachments.forEach(att => currentAttachments.push(att));
      }
    } catch (mErr) {
      console.warn("Mentions error:", mErr);
    }
  }

  state.activeAgentFile = null;
  state.activeAgentFileHistory = [];
  renderAgentLiveStatus();
  renderFileTree();

  input.value = "";
  state.attachments = [];
  if (typeof renderAttachPreview === "function") renderAttachPreview();

  if (!state.conversationHistory) state.conversationHistory = [];
  const historyForTurn = state.conversationHistory.slice(-8);

  state.conversationHistory.push({
    role: "user",
    content: task,
    attachments: currentAttachments
  });
  if (state.conversationHistory.length > 20) state.conversationHistory.shift();

  state.agentRunning = true;
  state.agentAbort = new AbortController();
  if (state._hangTimer) { try { clearTimeout(state._hangTimer); } catch (e) {} }
  state._hangTimer = setTimeout(() => {
    if (!state.agentRunning) return;
    termWrite("Timeout 90s: el proveedor no respondio. Cancelando para no seguir gastando tokens.", "warn");
    haltAgent("Sin respuesta del proveedor en 90s. Cambia de modelo (evita Fable) e intenta de nuevo.");
  }, 90000);

  if (btnSend) {
    btnSend.textContent = "Cancelar";
    btnSend.classList.add("btn-danger");
  }
  appendChat("user", task, currentAttachments);

  // Persistir en la conversación del proyecto activo
  if (state.conversation && state.conversation.getActive()) {
    state.conversation.addMessage("user", task);
  }

  const workingEl = appendChat("agent-working", "", null, false);
  const workingBody = workingEl.querySelector(".body");

  const streamState = {
    currentAgent: "",
    agentsSeen: [],
    perAgentText: {},
    trace: [],
    startTime: Date.now()
  };

  let __rsPending = false;
  function renderStream() { if (__rsPending) return; __rsPending = true; requestAnimationFrame(() => { __rsPending = false; __doRenderStream(); }); }
  function __doRenderStream() {
    // v44: chat limpio - solo el texto plano del agente
    let html = "";
    streamState.agentsSeen.forEach(name => {
      const rawText = (streamState.perAgentText[name] || "");
      const text = maskPartialToolCalls(rawText).trim();
      if (text.length > 0) {
        const cleaned = (typeof AgentOrchestrator !== "undefined" && AgentOrchestrator.cleanForDisplay) ? AgentOrchestrator.cleanForDisplay(text) : text;
        html += renderMarkdownLite(cleaned);
      }
    });
    if (!html) {
      html = '<div class="agent-thinking-pulse"><span class="pulse-dots"><span class="pulse-dot"></span><span class="pulse-dot"></span><span class="pulse-dot"></span></span><span class="pulse-text">Pensando...</span></div>';
    }
    workingBody.innerHTML = html;
    const logEl2 = document.getElementById("chat-log");
    if (logEl2) logEl2.scrollTop = logEl2.scrollHeight;
  }

  renderStream();

  if (state.terminal) state.terminal.clear();
  const fb = document.getElementById("terminal-fallback");
  if (fb) fb.innerHTML = "";

  termWrite("", "normal");
  termWrite("===============================================", "head");
  termWrite("  GafCoreAI - Registro de Operación", "head");
  termWrite("===============================================", "head");
  termWrite("Tarea: " + task, "normal");
  if (state.diskFolder) termWrite("Carpeta destino: " + state.diskFolder, "dim");
  if (state.rag && state.rag.indexed) termWrite("RAG: activo (" + state.rag.index.length + " chunks)", "dim");
  termWrite("", "normal");

  const pendingBefore = state.pendingChanges.size;

  try {
    const resolved = resolveAutoModel(task);
    const useProvider = (resolved && resolved.provider) ? resolved.provider : state.activeProvider;
    let useModel = (resolved && resolved.model) ? resolved.model : state.activeModel;

    if (useModel && useModel.id && useModel.id.startsWith("__AUTO__")) {
      const verifiedList = getVerifiedModels(useProvider);
      if (verifiedList.length) {
        useModel = { id: verifiedList[0].model, key: verifiedList[0].key };
      }
    }

    state.orchestrator = new AgentOrchestrator({
      provider: useProvider,
      model: useModel,
      terminal: state.terminal,
      tools: core.tools,
      cache: core.cache,
      memory: core.memory,
      liveView: state.liveView,
      onProgress: pct => {},
      onStep: () => {},
      onToken: (roleName, token) => {
        const rName = roleName || "GafCoreAI";
        if (streamState.currentAgent !== rName) {
          streamState.currentAgent = rName;
          if (!streamState.agentsSeen.includes(rName)) {
            streamState.agentsSeen.push(rName);
            streamState.perAgentText[rName] = "";
          }
        }
        if (!streamState.lastActivity) streamState.lastActivity = {};
        streamState.lastActivity[rName] = Date.now();
        if (!streamState.perAgentText[rName]) streamState.perAgentText[rName] = "";
        streamState.perAgentText[rName] += token;
        renderStream();
      },
      onTrace: (event) => {
        try {
          streamState.trace.push(event);

          if (event.kind === "tool_call" && (event.name === "read_file" || event.name === "write_file" || event.name === "edit_file")) {
            const args = event.args || {};
            const path = args.path || args.file || "";
            if (path) {
              state.activeAgentFile = {
                path: path,
                action: event.isWrite ? "write" : "read",
                ts: Date.now()
              };
              if (!state.activeAgentFileHistory.some(h => h.path === path)) {
                state.activeAgentFileHistory.push({ path: path, action: event.isWrite ? "write" : "read", ts: Date.now() });
              }
              renderAgentLiveStatus();
              renderFileTree();
            }
          }
          if (event.kind === "observation" && event.path) {
            state.activeAgentFile = {
              path: event.path,
              action: event.ok === false ? "error" : (state.activeAgentFile && state.activeAgentFile.path === event.path ? state.activeAgentFile.action : "read"),
              ts: Date.now()
            };
            renderAgentLiveStatus();
          }

          renderStream();
        } catch (e) { console.warn("[onTrace] error:", e); }
      }
    });

    state.orchestrator.term = (msg) => termWrite(msg, "normal");
    if (state.orchestrator.multi) {
      state.orchestrator.multi.terminal = {
        writeln: (msg) => {
          let kind = "normal";
          if (msg.includes("\x1b[36m") || msg.includes("\x1b[1m")) kind = "head";
          else if (msg.includes("\x1b[32m")) kind = "success";
          else if (msg.includes("\x1b[31m")) kind = "error";
          else if (msg.includes("\x1b[33m")) kind = "warn";
          else if (msg.includes("\x1b[35m")) kind = "agent";
          else if (msg.includes("\x1b[2m")) kind = "dim";
          const clean = msg.replace(/\x1b\[[0-9;]*m/g, "");
          termWrite(clean, kind);
        }
      };
    }

    const result = await state.orchestrator.run(task, {
      repo: state.repo ? state.repo.owner + "/" + state.repo.name : null,
      files: state.repo ? state.repo.tree.slice(0, 50).map(f => f.path) : [],
      diskFolder: state.diskFolder,
      attachments: currentAttachments,
      history: historyForTurn,
      signal: state.agentAbort ? state.agentAbort.signal : null
    });

    const pendingAfter = state.pendingChanges.size;
    const newPending = pendingAfter - pendingBefore;

    const allToolResults = (result.all || []).flatMap(r => r.toolResults || []);
    const createdFiles = allToolResults
      .filter(t => t.ok && t.name === "write_file" && t.path)
      .map(t => t.path);

    const withText = (result.all || [])
      .filter(r => r.responseText && r.responseText.trim().length > 15)
      .map(r => ({
        role: r.role || "GafCoreAI",
        text: (typeof AgentOrchestrator !== "undefined" && AgentOrchestrator.cleanForDisplay) ? AgentOrchestrator.cleanForDisplay(r.responseText) : r.responseText
      }))
      .filter(x => x.text && x.text.trim().length > 10);

    let mainContentHtml = "";

    if (withText.length === 1) {
      mainContentHtml = renderMarkdownLite(withText[0].text);
    } else if (withText.length > 1) {
      const sections = [];
      const seenRoles = new Set();
      withText.forEach(agentResp => {
        if (seenRoles.has(agentResp.role)) return;
        seenRoles.add(agentResp.role);

        let badge = "🤖 " + agentResp.role;
        if (agentResp.role === "Analyst") badge = "🔍 Análisis y Diagnóstico (Analyst)";
        else if (agentResp.role === "Explorer") badge = "📂 Exploración de Archivos (Explorer)";
        else if (agentResp.role === "Security") badge = "🛡️ Seguridad y Permisos (Security)";
        else if (agentResp.role === "Coder") badge = "💻 Solución y Código (Coder)";
        else if (agentResp.role === "Reviewer") badge = "📋 Revisión Técnica (Reviewer)";
        else if (agentResp.role === "Tester") badge = "🧪 Pruebas y Validación (Tester)";

        sections.push(
          '<div class="agent-report-card" style="margin-bottom:14px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">' +
          '<div style="font-weight:600;font-size:13px;margin-bottom:8px;color:var(--accent,#818cf8);">' + badge + '</div>' +
          '<div class="agent-report-text">' + renderMarkdownLite(agentResp.text) + '</div>' +
          '</div>'
        );
      });
      mainContentHtml = sections.join("");
    }

    let filesHtml = "";
    if (createdFiles.length > 0 || newPending > 0) {
      filesHtml += '<div style="margin-top:12px;padding:10px;border-radius:6px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);font-size:12px;">';
      filesHtml += '<div style="font-weight:600;color:#34d399;margin-bottom:4px;">📝 Archivos generados / modificados (' + (createdFiles.length || newPending) + '):</div>';
      filesHtml += '<ul style="margin:0;padding-left:18px;color:#e2e8f0;">';
      if (createdFiles.length > 0) {
        createdFiles.forEach(f => { filesHtml += '<li><code>' + escapeHtml(f) + '</code></li>'; });
      } else {
        Array.from(state.pendingChanges.keys()).slice(0, 10).forEach(f => {
          filesHtml += '<li><code>' + escapeHtml(f) + '</code> (pendiente en pestaña Diff)</li>';
        });
      }
      filesHtml += '</ul></div>';
    }

    let toolsAccordionHtml = "";
    if (allToolResults && allToolResults.length > 0) {
      const toolSummaries = allToolResults.map(t => {
        if (t.name === 'open_folder') return `📂 Carpeta abierta: <code>${escapeHtml(t.folder || t.path || '')}</code> (${t.filesCount || 0} archivos)`;
        if (t.name === 'list_files') return `📋 Archivos indexados: <code>${escapeHtml(t.folder || state.diskFolder || '')}</code> (${t.count || (t.files || []).length} archivos)`;
        if (t.name === 'read_file') return `📄 Archivo consultado: <code>${escapeHtml(t.path || '')}</code>`;
        if (t.name === 'write_file' || t.name === 'edit_file') return `📝 Archivo modificado: <code>${escapeHtml(t.path || '')}</code>`;
        if (t.name === 'run_command' || t.name === 'run_cmd') return `⚡ Comando ejecutado: <code>${escapeHtml(t.cmd || (t.args && t.args.cmd) || '')}</code>`;
        return `🔧 Herramienta <code>${escapeHtml(t.name)}</code>: ${t.ok ? 'Ejecutada correctamente' : 'Error'}`;
      });
      toolsAccordionHtml = '<details class="tools-execution-details" style="margin-bottom:12px;padding:8px 12px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);font-size:12px;">' +
        `<summary style="cursor:pointer;font-weight:600;color:var(--accent,#818cf8);user-select:none;">🔍 Inspección técnica (${allToolResults.length} operaciones realizadas)</summary>` +
        '<ul style="margin:8px 0 0 0;padding-left:18px;color:var(--text-muted,#94a3b8);">' + toolSummaries.map(s => `<li>${s}</li>`).join('') + '</ul>' +
        '</details>';
    }

    const traceAccordionHtml = buildTraceAccordion(streamState.trace);

    let finalRendered = "";
    if (mainContentHtml) {
      finalRendered = mainContentHtml; // v44
    } else {
      finalRendered = '<p style="color:var(--text,#e2e8f0);">Tarea completada.</p>'; // v44
    }

    if (workingBody) {
      workingBody.innerHTML = finalRendered;
    } else {
      appendChat("assistant", finalRendered, null, false, true);
    }

    // Persistir respuesta del asistente en la conversación del proyecto
    if (state.conversation && state.conversation.getActive()) {
      const assistantText = withText.map(w => w.text).join("\n\n") || "[respuesta sin texto]";
      state.conversation.addMessage("assistant", assistantText);
    }

    if (withText.length > 0) {
      state.conversationHistory.push({
        role: "assistant",
        content: withText.map(w => w.text).join("\n\n")
      });
      if (state.conversationHistory.length > 20) state.conversationHistory.shift();
    }

    const logElEnd = document.getElementById("chat-log");
    if (logElEnd) logElEnd.scrollTop = logElEnd.scrollHeight;

    // v36: Auto-abrir preview si hay index.html
    try {
      const hasIndexHtml = Object.keys(state.projectFiles || {}).some(p =>
        p === "index.html" || p.endsWith("/index.html") || p.endsWith("\\index.html")
      );
      if (hasIndexHtml && state.activeMainTab !== "browser") {
        termWrite(" Abriendo preview del proyecto...", "success");
        setTimeout(() => { try { previewProject(); } catch (e) { console.warn("preview error:", e); } }, 800);
      }
    } catch (previewErr) { console.warn("auto-preview setup error:", previewErr); }

    const cacheHits = (result.all || []).filter(r => r.fromCache).length;
    termWrite("", "normal");
    termWrite("Agente completado con éxito", "success");
    termWrite("Ejecuciones: " + (result.all || []).length + " (" + cacheHits + " desde cache)", "dim");
    if (newPending > 0) termWrite(newPending + " cambios pendientes en Diff.", "warn");

    if (state.activeAgentFile) {
      state.activeAgentFile.action = "done";
      renderAgentLiveStatus();
    }

  } catch (e) {
    termWrite("Error: " + e.message, "error");
    appendChat("system", "Error: " + e.message);
    if (state.activeAgentFile) {
      state.activeAgentFile.action = "error";
      renderAgentLiveStatus();
    }
  } finally {
    if (state._hangTimer) { try { clearTimeout(state._hangTimer); } catch (e) {} state._hangTimer = null; }
    state.agentRunning = false;
    const btnSendEnd = document.getElementById("chat-send");
    if (btnSendEnd) {
      btnSendEnd.textContent = state.mode === "agent" ? "Ejecutar" : "Enviar";
      btnSendEnd.classList.remove("btn-danger");
    }
    document.querySelectorAll(".agent-thinking-pulse").forEach(pulse => {
      const body = pulse.closest(".body");
      if (body && !body.innerText.trim()) stopThinkingBubbles("Turno terminado.");
    });
    updatePendingBar();
    // v43: compactar historial del agente si es muy largo
    if (state.memoryManager && state.conversation && state.conversation.getActive()) {
      setTimeout(async () => {
        try {
          const compacted = await state.memoryManager.compactIfNeeded(state.conversation, { threshold: 40, batchSize: 20, keepRecent: 20 });
          if (compacted) {
            termWrite("[memory] bloque compactado (agente)", "dim");
            appendChat("system", "\ud83d\udddc\ufe0f **Contexto comprimido** - Historial resumido para mantener memoria.");
          }
        } catch (_) {}
      }, 500);
    }
  }
}

// ────────────────────────────────────────────────────────────
//  AUTO MODEL
// ────────────────────────────────────────────────────────────
function autoModelGetIntent(text) {
  const t = (text || "").toLowerCase();
  if (/refactor|reorganiza|estructura|arquitectura/.test(t)) return "architecture";
  if (/analiza|explica|como funciona|que hace/.test(t)) return "analysis";
  if (/revisa|review|critica|evalua/.test(t)) return "review";
  if (/crea|codigo|implementa|programa|funcion|clase|script/.test(t)) return "code";
  if (/arregla|corrige|fix|bug|error/.test(t)) return "refactor";
  if (/test|prueba|unitario/.test(t)) return "code";
  if (/imagen|foto|multimodal/.test(t)) return "multimodal";
  if (/rapido|simple|hola|gracias/.test(t)) return "fast";
  if (/matematica|calculo|formula/.test(t)) return "math";
  if (/traduce|escribe|redacta|documento/.test(t)) return "writing";
  return "chat";
}

function resolveAutoModel(taskText) {
  if (!state.activeModel || !state.activeModel.id || !state.activeModel.id.startsWith("__AUTO__")) {
    return state.activeProvider && state.activeModel
      ? { provider: state.activeProvider, model: state.activeModel }
      : null;
  }

  const providerFilter = state.activeModel.id.replace("__AUTO__", "");
  const intent = autoModelGetIntent(taskText);

  const verified = [];
  state.providers.forEach(p => {
    if (providerFilter && p.id !== providerFilter) return;
    getVerifiedModels(p).forEach(v => {
      verified.push({ provider: p, modelId: v.model, key: v.key });
    });
  });

  if (!verified.length) {
    termWrite("Auto: no hay modelos verificados en " + (providerFilter || "ningun proveedor"), "warn");
    return null;
  }

  const scores = {
    "code":         ["claude-opus-4-8", "claude-opus-4.8", "claude-opus-4-7", "gpt-5.6-terra", "claude-sonnet-5", "deepseek-v4-pro", "grok-4.5"],
    "architecture": ["claude-opus-4-8", "claude-opus-4.8", "claude-opus-4-7", "claude-sonnet-5", "gpt-5.6-terra"],
    "analysis":     ["claude-opus-4-8", "claude-opus-4.8", "gpt-5.6-sol", "grok-4.5"],
    "review":       ["claude-sonnet-5", "claude-sonnet-4-6", "claude-sonnet-4.6", "gpt-5.6-sol"],
    "refactor":     ["claude-opus-4-8", "claude-opus-4.8", "gpt-5.6-terra"],
    "multimodal":   ["gemini-2.5-flash", "gpt-5.6-sol"],
    "fast":         ["gemini-2.5-flash", "claude-haiku-4-5", "gpt-5.6-luna"],
    "math":         ["deepseek-v4-pro", "gpt-5.6-sol", "grok-4.5"],
    "writing":      ["claude-sonnet-5", "claude-sonnet-4-6", "claude-fable-5"],
    "chat":         ["claude-sonnet-4-6", "claude-sonnet-4.6", "claude-haiku-4-5", "gpt-5.6-luna", "grok-4.5"]
  };

  const preferred = scores[intent] || scores["chat"];
  for (const wanted of preferred) {
    const normW = wanted.replace(/\./g, "-"); const found = verified.find(v => v.modelId.replace(/\./g, "-") === normW); // v35: normalizar punto/guion
    if (found) {
      termWrite("AUTO (" + found.provider.name + ") -> " + found.provider.name + " / " + found.modelId + " (intent: " + intent + ")", "dim");
      return { provider: found.provider, model: { id: found.modelId, key: found.key } };
    }
  }

  const f = verified[0];
  termWrite("AUTO (" + f.provider.name + ") -> " + f.modelId + " (fallback)", "dim");
  return { provider: f.provider, model: { id: f.modelId, key: f.key } };
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  let text = input.value.trim();
  const atts = state.attachments.slice();
  if (!text && !atts.length) return;

  const urls = extractUrls(text);
  for (const u of urls) {
    const res = await fetchUrl(u);
    if (res.ok) {
      const clean = stripHtml(res.text).slice(0, 20000);
      atts.push({ kind: "url", name: u.replace(/^https?:\/\//, "").slice(0, 60), isImage: false, text: "Contenido de " + u + ":\n\n" + clean });
    }
  }

  let prefix = "";
  const firstWord = text.split(/\s/)[0];

  if (firstWord === "/clear") { input.value = ""; hideSlashMenu(); clearChat(); return; }
  if (firstWord === "/skills") { input.value = ""; hideSlashMenu(); handleSkillsCommand(text); return; }
  if (firstWord === "/mcp") { input.value = ""; hideSlashMenu(); handleMcpCommand(text); return; }
  if (firstWord === "/analyze") { input.value = ""; hideSlashMenu(); runDeepAnalysis(); return; }
  if (firstWord === "/fix") { input.value = ""; hideSlashMenu(); runAutoFix(); return; }
  if (firstWord === "/new") { input.value = ""; hideSlashMenu(); openNewProjectModal(); return; }
  if (firstWord === "/cinema") { input.value = ""; hideSlashMenu(); switchMainTab("studio"); return; }
  if (firstWord === "/video") {
    const promptText = text.slice(firstWord.length).trim();
    input.value = "";
    hideSlashMenu();
    state.attachments = [];
    renderAttachPreview();
    switchMainTab("studio");
    if (state.cinematicStudio) {
      const imgAttachment = atts.find(a => a.isImage || (a.dataUrl && a.dataUrl.startsWith("data:image")) || (a.name && /\.(png|jpe?g|webp|gif)$/i.test(a.name)));
      state.cinematicStudio.openGenerateVideoModal({
        prompt: promptText,
        imageUrl: imgAttachment ? (imgAttachment.dataUrl || imgAttachment.url || imgAttachment.text) : null
      });
    }
    return;
  }

  if (SLASH_COMMANDS[firstWord] && !SLASH_COMMANDS[firstWord].startsWith("__")) {
    prefix = SLASH_COMMANDS[firstWord];
    text = text.slice(firstWord.length).trim();
    if (firstWord === "/remember") {
      core.memory.addFact(text);
      appendChat("system", "Recordado: " + text);
      input.value = ""; state.attachments = []; renderAttachPreview(); hideSlashMenu();
      return;
    }
  }

  input.value = "";
  state.attachments = [];
  renderAttachPreview();
  hideSlashMenu();
  appendChat("user", (prefix ? firstWord + " " : "") + text, atts);

  if (state.conversation && state.conversation.getActive()) {
    state.conversation.addMessage("user", (prefix ? firstWord + " " : "") + text);
  }

  if (state.patterns) state.patterns.recordCommand(text);

  if (!state.activeProvider || !state.activeModel) {
    appendChat("system", "Selecciona un modelo verificado");
    return;
  }
  if (!state.activeModel.key) {
    appendChat("system", "Sin API key");
    return;
  }

  const resolved = resolveAutoModel(text);
  if (resolved) {
    state.activeProvider = resolved.provider;
    state.activeModel = resolved.model;
  }

  const msgEl = appendChat("assistant", "...");
  const bodyEl = msgEl.querySelector(".body");

  const userContent = buildUserContent(prefix + text, atts);
  state.history.push({ role: "user", content: userContent });

  const memCtx = core.memory.getContext();
  const sysCtx = {
    diskFolder: state.diskFolder,
    repo: state.repo,
    projectFiles: state.projectFiles,
    intent: getTaskContext(text)
  };

  let brainCtx = "";
  let taskType = "general";
  if (state.agentBrain) {
    const brainResult = state.agentBrain.buildPrompt(text);
    brainCtx = brainResult.prompt;
    taskType = brainResult.type;
    termWrite("Cerebro: tarea detectada -> " + taskType, "dim");
    if (brainResult.skills.length) {
      termWrite("   Skills sugeridas: " + brainResult.skills.map(s => s.id).join(", "), "dim");
    }
  }

  let mmCtx = "";
  if (state.memoryManager) {
    try { mmCtx = state.memoryManager.buildContext(text, { maxChars: 3000 }); }
    catch (e) { console.warn("MM buildContext error:", e); }
  }

  const fullSystem = buildSystemPrompt(sysCtx) + memCtx + brainCtx + (mmCtx ? "\n\n" + mmCtx : "");
  const convMessages = state.conversation ? state.conversation.getRecentMessages(20) : [];
  const messages = [{ role: "system", content: fullSystem }, ...convMessages];

  const cacheKey = state.activeModel.id;
  const cached = core.cache.get(cacheKey, messages);
  if (cached) {
    bodyEl.innerHTML = renderMarkdownLite(cached);
    state.history.push({ role: "assistant", content: cached });
    updateCacheStats();
    return;
  }

  let acc = "";
  try {
    await chatCompletion(state.activeProvider, state.activeModel, messages, tok => {
      acc += tok;
      const masked = maskPartialToolCalls(acc);
      const cleanAcc = (typeof AgentOrchestrator !== "undefined" && AgentOrchestrator.cleanForDisplay) ? AgentOrchestrator.cleanForDisplay(masked) : masked;
      bodyEl.innerHTML = renderMarkdownLite(cleanAcc);
      const logEl = document.getElementById("chat-log");
      if (logEl) logEl.scrollTop = 999999;
    });
    const finalClean = (typeof AgentOrchestrator !== "undefined" && AgentOrchestrator.cleanForDisplay) ? AgentOrchestrator.cleanForDisplay(acc) : acc;
    if (!finalClean) bodyEl.textContent = "(sin respuesta)";
    else bodyEl.innerHTML = renderMarkdownLite(finalClean);
    state.history.push({ role: "assistant", content: finalClean || acc });
    if (state.conversation && state.conversation.getActive()) {
      state.conversation.addMessage("assistant", finalClean || acc);
    }
    if (acc) core.cache.put(cacheKey, messages, acc);
    if (state.memoryManager && state.conversation) {
      setTimeout(async () => {
        try {
          const compacted = await state.memoryManager.compactIfNeeded(state.conversation, {
            threshold: 40, batchSize: 20, keepRecent: 20
          });
          if (compacted) {
          termWrite("[memory] bloque compactado", "dim");
          appendChat("system", "\ud83d\udddc\ufe0f **Contexto comprimido** - Historial resumido para mantener memoria de la conversacion. Las respuestas anteriores siguen disponibles.");
        }
        } catch (e) { console.warn("compact error:", e); }
      }, 500);
    }
    updateCacheStats();
  } catch (e) {
    bodyEl.textContent = acc || "Error: " + e.message;
  }
}

// ────────────────────────────────────────────────────────────
//  PERMISOS / CACHE / MEMORIA
// ────────────────────────────────────────────────────────────
function ensureDefaultPerms() {
  core.perms.grant(PERMISSION_LEVELS.READ);
  core.perms.grant(PERMISSION_LEVELS.WRITE);
  core.perms.grant(PERMISSION_LEVELS.EXECUTE);
  log("Permisos: read/write/execute ACTIVOS, dangerous OFF");
}

function renderPermissions() {
  const box = document.getElementById("perms-list");
  if (!box) return;
  box.innerHTML = "";
  const levels = [
    { id: PERMISSION_LEVELS.READ, label: "Leer archivos y web", hint: "Siempre activo", locked: true },
    { id: PERMISSION_LEVELS.WRITE, label: "Escribir archivos", hint: "Siempre activo", locked: true },
    { id: PERMISSION_LEVELS.EXECUTE, label: "Ejecutar comandos y clonar", hint: "Siempre activo", locked: true },
    { id: PERMISSION_LEVELS.DANGEROUS, label: "Deploy, SSH, acciones criticas", hint: "Activa manualmente", locked: false }
  ];
  levels.forEach(l => {
    const row = document.createElement("div");
    row.className = "perm-row";
    const checked = core.perms.has(l.id) ? "checked" : "";
    const dis = l.locked ? "disabled" : "";
    row.innerHTML =
      "<label><input type=\"checkbox\" " + checked + " " + dis + " /> " +
      l.label + " <span style=\"color:var(--text-dim);font-size:10.5px;margin-left:6px\">(" + l.hint + ")</span></label>" +
      "<span class=\"perm-badge\">" + l.id + "</span>";
    if (!l.locked) {
      row.querySelector("input").onchange = (e) => {
        if (e.target.checked) core.perms.grant(l.id);
        else core.perms.revoke(l.id);
      };
    }
    box.appendChild(row);
  });
}

function updateCacheStats() {
  const el = document.getElementById("cache-stats");
  if (!el) return;
  const s = core.cache.getStats();
  el.innerHTML = "Hits: <b>" + s.hits + "</b> &middot; Misses: <b>" + s.misses
    + "</b> &middot; Ratio: <b>" + s.ratio + "</b> &middot; Entradas: <b>"
    + s.entries + "</b> &middot; Tokens ahorrados: <b>" + s.savedApprox + "</b>";
}

function renderMemory() {
  const el = document.getElementById("memory-list");
  if (!el) return;
  el.innerHTML = "";
  if (!core.memory.facts.length && !core.memory.summaries.length) {
    el.innerHTML = "<div class=\"repo-empty\">Sin memoria. Usa /remember</div>";
    return;
  }
  core.memory.facts.slice(-20).forEach(f => {
    const d = document.createElement("div");
    d.className = "memory-item";
    d.textContent = "\u2022 " + f.fact;
    el.appendChild(d);
  });
}

function recoverKeysFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const old = JSON.parse(raw);
    if (!Array.isArray(old)) return 0;

    const keyMap = {};
    old.forEach(p => {
      (p.groups || []).forEach(g => {
        if (g.key) {
          (g.models || []).forEach(m => {
            keyMap[p.id + "::" + m] = g.key;
          });
        }
      });
      (p.models || []).forEach(m => {
        if (m.key) keyMap[p.id + "::" + m.id] = m.key;
      });
    });

    let recovered = 0;
    state.providers.forEach(p => {
      (p.groups || []).forEach(g => {
        if (g.key) return;
        g.models.forEach(m => {
          const k = keyMap[p.id + "::" + m];
          if (k) { g.key = k; recovered++; }
        });
      });
    });

    if (recovered > 0) {
      saveProviders();
      termWrite("Recuperadas " + recovered + " keys de modelos", "success");
    }
    return recovered;
  } catch (e) {
    console.warn("recoverKeys error:", e);
    return 0;
  }
}

function openAddProviderModal() {
  const el = document.getElementById("modal-custom");
  if (!el) { showAlert("modal-custom no disponible"); return; }

  el.classList.remove("hidden");
  el.querySelector("#custom-title").textContent = "Agregar proveedor";
  el.querySelector("#custom-body").innerHTML = `
    <label>Nombre del proveedor</label>
    <input id="np-name" placeholder="Ej: Mi Proveedor" />
    <label>URL base (sin /v1)</label>
    <input id="np-url" placeholder="https://api.ejemplo.com" />
    <label>Modelo (uno por linea)</label>
    <textarea id="np-models" rows="4" placeholder="modelo-1&#10;modelo-2&#10;modelo-3" style="resize:vertical;font-family:Consolas,monospace"></textarea>
    <label>Modo de key</label>
    <select id="np-mode">
      <option value="per-model">1 key por modelo</option>
      <option value="per-group">1 key para todo el grupo</option>
    </select>
    <p class="hint" style="margin-top:8px">Se agregara al final de la lista. Podras pegar las keys despues.</p>
  `;

  const actions = el.querySelector("#custom-actions");
  actions.innerHTML = "";

  const cancel = document.createElement("button");
  cancel.className = "btn ghost";
  cancel.textContent = "Cancelar";
  cancel.onclick = () => el.classList.add("hidden");
  actions.appendChild(cancel);

  const save = document.createElement("button");
  save.className = "btn primary";
  save.textContent = "Agregar";
  save.onclick = () => {
    const name = document.getElementById("np-name").value.trim();
    const url = document.getElementById("np-url").value.trim();
    const modelsText = document.getElementById("np-models").value.trim();
    const mode = document.getElementById("np-mode").value;

    if (!name || !url || !modelsText) {
      alert("Completa nombre, URL y al menos 1 modelo");
      return;
    }

    const models = modelsText.split(/\n+/).map(m => m.trim()).filter(m => m);
    if (!models.length) { alert("Sin modelos validos"); return; }

    const id = "custom-" + name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
    const provider = {
      id,
      name,
      url,
      custom: true,
      groups: mode === "per-group"
        ? [{ id: id + "-main", name: name + " (grupo)", key: "", models }]
        : models.map(m => ({
            id: id + "-" + m.replace(/[^a-z0-9]/g, "-"),
            name: m,
            key: "",
            models: [m]
          }))
    };

    state.providers.push(provider);
    saveProviders();
    el.classList.add("hidden");
    renderProvidersFull();
    refreshModelSelect();
    termWrite("Proveedor agregado: " + name + " (" + models.length + " modelos)", "success");
  };
  actions.appendChild(save);
}

async function deleteProvider(providerId) {
  const p = state.providers.find(x => x.id === providerId);
  if (!p) return;
  if (!p.custom) { alert("Solo puedes eliminar proveedores agregados manualmente"); return; }
  const ok = await showConfirm("Eliminar '" + p.name + "' y todas sus keys?");
  if (!ok) return;
  state.providers = state.providers.filter(x => x.id !== providerId);
  saveProviders();
  renderProvidersFull();
  refreshModelSelect();
  termWrite("Proveedor eliminado: " + p.name, "warn");
}

window.__gafDeleteProvider = deleteProvider;

function renderProvidersFull() {
  const box = document.getElementById("providers-full-list");
  if (!box) return;
  box.innerHTML = "";

  state.providers.forEach(provider => {
    const block = document.createElement("div");
    block.className = "provider-block";

    const groups = provider.groups || [];
    const totalModels = groups.reduce((acc, g) => acc + g.models.length, 0);
    const verifiedModels = getVerifiedModels(provider).length;

    const head = document.createElement("div");
    head.className = "provider-block-head";
    head.innerHTML =
      '<div><b>' + escapeHtml(provider.name) + '</b>' +
      '<div class="pb-url">' + escapeHtml(provider.url) + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        '<div class="pb-count">' + verifiedModels + '/' + totalModels + ' listos</div>' +
        '<button class="btn primary small pb-add-model" title="Agregar modelo a este proveedor" style="font-size:11px;padding:3px 10px;font-weight:600">+ Modelo</button>' +
        '<button class="btn ghost small pb-add-group" title="Agregar grupo">+ Grupo</button>' +
        (provider.custom
          ? '<button class="btn ghost small pb-del-prov" style="color:var(--err)" title="Eliminar proveedor">Eliminar</button>'
          : '') +
      '</div>';
    block.appendChild(head);

    head.querySelector(".pb-add-model").onclick = async () => {
      const modelName = await showPrompt(
        "Nombre o identificador del modelo (ej: minimax-m3, gpt-4o, claude-3-7-sonnet, deepseek-v3):",
        "",
        "Agregar Modelo a " + provider.name
      );
      if (!modelName || !modelName.trim()) return;
      const cleanName = modelName.trim();

      let exists = false;
      for (const g of groups) {
        if (g.models.includes(cleanName)) { exists = true; break; }
      }
      if (exists) {
        alert("El modelo '" + cleanName + "' ya está registrado en " + provider.name);
        return;
      }

      const gid = provider.id + "-" + cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
      const defaultKey = (groups.length > 0 && groups[0].key) ? groups[0].key : "";

      groups.push({
        id: gid,
        name: cleanName,
        key: defaultKey,
        models: [cleanName]
      });

      saveProviders();
      renderProvidersFull();
      refreshModelSelect();
      termWrite("Modelo agregado a " + provider.name + ": " + cleanName, "success");
      showAlert("Modelo '" + cleanName + "' agregado a " + provider.name + ".\nIngresa su API Key y haz clic en 'Verificar' para activarlo en el selector de chat y en modo Auto.", "Modelo Registrado");
    };

    head.querySelector(".pb-add-group").onclick = async () => {
      const newName = await showPrompt("Nombre del nuevo grupo:", "grupo-nuevo");
      if (!newName) return;
      const newModels = await showPrompt("Modelos (separados por coma):", "modelo-1, modelo-2");
      if (!newModels) return;
      const models = newModels.split(",").map(m => m.trim()).filter(m => m);
      if (!models.length) { alert("Sin modelos validos"); return; }

      const gid = provider.id + "-" + newName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
      groups.push({ id: gid, name: newName, key: "", models });
      saveProviders();
      renderProvidersFull();
      refreshModelSelect();
      termWrite("Grupo agregado: " + newName + " (" + models.length + " modelos)", "success");
    };

    const delBtn = head.querySelector(".pb-del-prov");
    if (delBtn) {
      delBtn.onclick = async () => {
        const ok = await showConfirm("Eliminar '" + provider.name + "' y todas sus keys?");
        if (!ok) return;
        state.providers = state.providers.filter(x => x.id !== provider.id);
        saveProviders();
        renderProvidersFull();
        refreshModelSelect();
        termWrite("Proveedor eliminado: " + provider.name, "warn");
      };
    }

    groups.forEach(group => {
      const groupRow = document.createElement("div");
      groupRow.className = "group-row";

      const groupHeader = document.createElement("div");
      groupHeader.className = "group-header";
      groupHeader.innerHTML =
        '<span class="group-name">' + escapeHtml(group.name) + '</span>' +
        '<span class="group-count">' + group.models.length + ' modelo' + (group.models.length > 1 ? 's' : '') + '</span>' +
        (group.key ? '<span class="group-badge ok">verificada</span>' : '<span class="group-badge off">sin key</span>') +
        '<button class="btn ghost small gh-add-model" title="Agregar modelo" style="margin-left:6px;padding:2px 8px">+ Modelo</button>' +
        '<button class="btn ghost small gh-del-group" title="Eliminar grupo" style="color:var(--err);padding:2px 8px">&#10005;</button>';
      groupRow.appendChild(groupHeader);

      groupHeader.querySelector(".gh-add-model").onclick = async () => {
        const name = await showPrompt("Nombre del modelo:", "nuevo-modelo");
        if (!name) return;
        if (group.models.includes(name)) { alert("Ese modelo ya existe"); return; }
        group.models.push(name);
        saveProviders();
        renderProvidersFull();
        refreshModelSelect();
        termWrite("Modelo agregado: " + name, "success");
      };

      groupHeader.querySelector(".gh-del-group").onclick = async () => {
        if (groups.length === 1 && !provider.custom) {
          alert("No puedes eliminar el ultimo grupo de un proveedor base");
          return;
        }
        const ok = await showConfirm("Eliminar el grupo '" + group.name + "'?");
        if (!ok) return;
        provider.groups = groups.filter(g => g.id !== group.id);
        saveProviders();
        renderProvidersFull();
        refreshModelSelect();
        termWrite("Grupo eliminado: " + group.name, "warn");
      };

      const keyRow = document.createElement("div");
      keyRow.className = "group-key-row";
      keyRow.innerHTML =
        '<input class="group-key-input" type="password" placeholder="API key del grupo ' + group.id + '" value="' + (group.key || "").replace(/"/g, "&quot;") + '" />' +
        '<button class="btn small primary group-verify">Verificar</button>';

      const input = keyRow.querySelector(".group-key-input");
      const btn = keyRow.querySelector(".group-verify");

      input.oninput = () => { group.key = input.value.trim(); saveProviders(); };

      btn.onclick = async () => {
        const key = input.value.trim();
        if (!key) { alert("Pega una key primero"); return; }
        btn.textContent = "Verificando...";
        btn.disabled = true;
        const result = await verifyGroupKey(provider, group, key);
        btn.disabled = false;

        if (result.ok) {
          group.key = key;
          saveProviders();
          btn.textContent = "OK";
          const badge = groupHeader.querySelector(".group-badge");
          if (badge) {
            badge.className = "group-badge ok";
            badge.textContent = "verificada";
          }
          refreshModelSelect();
          termWrite("Verificado: " + group.name + " (" + group.models.length + " modelos)", "success");
        } else {
          btn.textContent = "Fallo";
          alert("Error al verificar " + group.name + ":\n\n" + result.error);
        }
        setTimeout(() => { btn.textContent = "Verificar"; }, 1500);
      };
      groupRow.appendChild(keyRow);

      const modelsChips = document.createElement("div");
      modelsChips.className = "group-models-chips";
      group.models.forEach(mid => {
        const chip = document.createElement("span");
        chip.className = "model-chip";
        chip.style.display = "inline-flex";
        chip.style.alignItems = "center";
        chip.style.gap = "4px";
        chip.innerHTML = '<span>' + escapeHtml(mid) + '</span><button class="mc-del" title="Eliminar modelo" style="background:transparent;border:none;color:var(--text-mute);cursor:pointer;font-size:12px;padding:0 2px;line-height:1">&#10005;</button>';
        chip.querySelector(".mc-del").onclick = async (ev) => {
          ev.stopPropagation();
          const ok = await showConfirm("Eliminar el modelo '" + mid + "'?");
          if (!ok) return;
          group.models = group.models.filter(m => m !== mid);
          if (group.models.length === 0 && provider.groups.length > 1) {
            provider.groups = provider.groups.filter(g => g.id !== group.id);
          }
          saveProviders();
          renderProvidersFull();
          refreshModelSelect();
          termWrite("Modelo eliminado: " + mid, "warn");
        };
        modelsChips.appendChild(chip);
      });
      groupRow.appendChild(modelsChips);

      block.appendChild(groupRow);
    });

    box.appendChild(block);
  });
}

function refreshModelSelect() {
  const sel = document.getElementById("model-select");
  if (!sel) return;
  sel.innerHTML = "";

  const byProvider = {};
  state.providers.forEach(p => {
    const verified = getVerifiedModels(p);
    if (verified.length > 0) {
      byProvider[p.id] = { provider: p, models: verified };
    }
  });

  const providerIds = Object.keys(byProvider);

  providerIds.forEach(pid => {
    const info = byProvider[pid];
    const optAuto = document.createElement("option");
    optAuto.value = "__AUTO__" + pid;
    optAuto.textContent = "Auto (" + info.provider.name + " - mejor modelo segun tarea)";
    sel.appendChild(optAuto);
  });

  if (providerIds.length === 0) {
    const o = document.createElement("option");
    o.value = "__OPEN_PROVIDERS__";
    o.textContent = "🔑 Clic para configurar API Key";
    sel.appendChild(o);
    state.activeProvider = null;
    state.activeModel = null;
    const dot = document.getElementById("status-provider");
    if (dot) dot.classList.add("off");
    const st = document.getElementById("status-text");
    if (st) {
      st.textContent = "🔑 Sin modelo (clic para configurar)";
      st.style.cursor = "pointer";
    }
    return;
  }

  const allVerified = [];
  providerIds.forEach(pid => {
    byProvider[pid].models.forEach(v => allVerified.push(v));
  });

  const categories = [
    { id: "chat", title: "💬 Modo Chat & Preguntas Rápidas", filter: v => classifyModelCategory(v.model) === MODEL_CATEGORIES.CHAT },
    { id: "analyst", title: "🔍 Agentes de Análisis & Arquitectura", filter: v => classifyModelCategory(v.model) === MODEL_CATEGORIES.ANALYST },
    { id: "coder", title: "💻 Agentes Coder & Creación de Proyectos", filter: v => classifyModelCategory(v.model) === MODEL_CATEGORIES.CODER }
  ];

  categories.forEach(cat => {
    const matching = allVerified.filter(cat.filter);
    if (matching.length > 0) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = cat.title;
      matching.forEach(v => {
        const o = document.createElement("option");
        o.value = v.provider.id + "::" + v.model;
        o.textContent = `${v.model} (${v.provider.name})`;
        optgroup.appendChild(o);
      });
      sel.appendChild(optgroup);
    }
  });

  if (state.activeModel && state.activeModel.id && state.activeModel.id.startsWith("__AUTO__")) {
    const pid = state.activeModel.id.replace("__AUTO__", "");
    if (byProvider[pid]) {
      sel.value = state.activeModel.id;
      const st = document.getElementById("status-text");
      if (st) st.textContent = "Auto (" + byProvider[pid].provider.name + ")";
      const dot = document.getElementById("status-provider");
      if (dot) dot.classList.remove("off");
      return;
    }
  }

  let current = null;
  if (state.activeProvider && state.activeModel) {
    for (const pid of providerIds) {
      const found = byProvider[pid].models.find(v =>
        v.provider.id === state.activeProvider.id && v.model === state.activeModel.id);
      if (found) {
        current = { provider: found.provider, model: found.model, key: found.key };
        break;
      }
    }
  }

  if (!current) {
    const firstPid = providerIds[0];
    const first = byProvider[firstPid].models[0];
    current = { provider: first.provider, model: first.model, key: first.key };
  }

  state.activeProvider = current.provider;
  state.activeModel = { id: current.model, key: current.key };
  sel.value = current.provider.id + "::" + current.model;

  const dot = document.getElementById("status-provider");
  if (dot) dot.classList.remove("off");
  const st = document.getElementById("status-text");
  if (st) st.textContent = current.provider.name + " - " + current.model;
}

// ============================================================
//  PARTE 4/6: UI LSP, RAG, pending diffs, bindUI (botones)
// ============================================================

function openLspModal() {
  if (!state.lsp) { alert("LSP no esta listo"); return; }

  const stats = state.lsp.getStats();
  document.getElementById("lsp-stats").innerHTML =
    "Servidores activos: <b>" + stats.count + "</b><br>" +
    (stats.activeServers.length ? "Corriendo: <b>" + stats.activeServers.join(", ") + "</b>" : "Ninguno corriendo");

  const list = document.getElementById("lsp-servers-list");
  list.innerHTML = "";

  Object.keys(LSP_SERVERS).forEach(langId => {
    const srv = LSP_SERVERS[langId];
    const active = state.lsp.servers.has(langId);

    const row = document.createElement("div");
    row.className = "lsp-server-item" + (active ? " active" : "");
    row.innerHTML =
      '<span class="lsi-icon">' + (langId === "python" ? "&#128013;" : langId === "typescript" ? "&#128216;" : "&#128196;") + '</span>' +
      '<span class="lsi-name">' + escapeHtml(srv.name) + '</span>' +
      '<span class="lsi-status">' + (active ? "ACTIVO" : "detenido") + '</span>' +
      (active
        ? '<button class="lsi-btn lsi-stop">Detener</button>'
        : '<button class="lsi-btn lsi-start">Iniciar</button>');

    if (active) {
      row.querySelector(".lsi-stop").onclick = async () => {
        await state.lsp.stopServer(langId);
        updateLspStatus();
        openLspModal();
      };
    } else {
      row.querySelector(".lsi-start").onclick = async () => {
        closeModals();
        switchMainTab("terminal");
        if (state.activeTermTab !== "logs") switchTermTab("logs");
        const ok = await state.lsp.startServer(langId, state.diskFolder);
        if (ok) {
          updateLspStatus();
          if (state.currentDiskFile && state.editor) {
            const uri = "file:///" + state.currentDiskFile.replace(/\\/g, "/");
            const ext = (state.currentDiskFile.split(".").pop() || "").toLowerCase();
            const langId2 = ["ts","tsx","js","jsx","mjs","cjs"].includes(ext) ? "typescript"
                          : ext === "py" ? "python"
                          : ["html","htm"].includes(ext) ? "html"
                          : ["css","scss","less"].includes(ext) ? "css"
                          : ["json","jsonc"].includes(ext) ? "json" : null;
            if (langId2) {
              await state.lsp.openDocument(langId2, uri, state.editor.getValue(), 1);
            }
          }
        }
        setTimeout(() => openLspModal(), 500);
      };
    }
    list.appendChild(row);
  });

  openModal("modal-lsp");
}

async function autodetectAndStartLsp() {
  if (!state.lsp) { alert("LSP no listo"); return; }
  if (!state.diskFolder) { alert("Abre una carpeta primero"); return; }
  if (!Desktop.isDesktop()) { alert("LSP solo en escritorio"); return; }

  termWrite("");
  termWrite("Detectando lenguajes en el proyecto...", "head");

  const files = [];
  if (state.projectFiles) Object.keys(state.projectFiles).forEach(p => files.push(p));
  if (state.diskFolder && state.diskEntries) state.diskEntries.forEach(e => files.push(e.name));
  if (state.repo && state.repo.tree) state.repo.tree.forEach(f => files.push(f.path));

  const langs = state.lsp.detectLanguages(state.diskFolder, files);
  termWrite("  Detectados: " + (langs.length ? langs.join(", ") : "(ninguno)"), "dim");

  if (!langs.length) {
    termWrite("  No se detectaron lenguajes. Abre un archivo para forzar.", "warn");
    return;
  }

  for (const langId of langs) {
    await state.lsp.startServer(langId, state.diskFolder);
  }

  updateLspStatus();
  termWrite("");
  termWrite("LSP listo. Prueba: Ctrl+clic en una funcion para ir a definicion", "success");
}

function updateLspStatus() {
  const el = document.getElementById("status-lsp");
  const btn = document.getElementById("btn-lsp");
  if (!el || !state.lsp) return;
  const stats = state.lsp.getStats();
  if (stats.count > 0) {
    el.classList.remove("hidden");
    el.textContent = "LSP \u00b7 " + stats.count;
    if (btn) btn.classList.add("active");
  } else {
    el.classList.add("hidden");
    if (btn) btn.classList.remove("active");
  }
}

function updateRagStatus() {
  const el = document.getElementById("status-rag");
  const btn = document.getElementById("btn-rag");
  if (!el || !state.rag) return;
  const s = state.rag.getStats();
  if (s.indexed) {
    el.classList.remove("hidden");
    el.textContent = "RAG " + s.chunks + " chunks \u00b7 " + s.mode;
    if (btn) { btn.classList.remove("indexing"); btn.innerHTML = "RAG ON"; }
  } else {
    el.classList.add("hidden");
    if (btn) { btn.classList.remove("indexing"); btn.innerHTML = "RAG"; }
  }
  if (s.indexing && btn) {
    btn.classList.add("indexing");
    btn.innerHTML = "Indexando...";
  }
}

function openRagModal() {
  if (!state.rag) { alert("RAG no esta listo"); return; }
  const s = state.rag.getStats();
  document.getElementById("rag-stats").innerHTML =
    "Estado: <b>" + (s.indexed ? "Indexado" : "No indexado") + "</b><br>" +
    "Chunks: <b>" + s.chunks + "</b> \u00b7 Archivos: <b>" + s.files + "</b><br>" +
    "Modo: <b>" + s.mode + "</b> \u00b7 Embeddings: <b>" + (s.embeddingsConfigured ? "si" : "no") + "</b>";

  const cfg = state.rag.embeddings.config;
  document.getElementById("rag-embed-url").value = cfg.url || "";
  document.getElementById("rag-embed-key").value = cfg.key || "";
  document.getElementById("rag-embed-model").value = cfg.model || "";

  openModal("modal-rag");
}

async function runRagIndex() {
  if (!state.rag) return;
  closeModals();
  switchMainTab("terminal");
  if (state.activeTermTab !== "logs") switchTermTab("logs");

  try {
    await state.rag.indexAll({
      includeProject: true,
      includeDisk: true,
      includeRepo: true
    });
    updateRagStatus();
    termWrite("RAG indexado", "success");
  } catch (e) {
    termWrite("Error indexando: " + e.message, "error");
    alert("Error indexando: " + e.message);
  }
}

function updatePendingBar() {
  const bar = document.getElementById("pending-bar");
  const count = document.getElementById("pending-count");
  const list = document.getElementById("pending-list");
  if (!bar || !count || !list) return;

  const n = state.pendingChanges.size;
  if (n === 0) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  count.textContent = String(n);
  list.innerHTML = "";

  const items = Array.from(state.pendingChanges.values()).sort((a, b) => a.path.localeCompare(b.path));
  items.forEach(change => {
    const row = document.createElement("div");
    row.className = "pending-item";
    const isNew = change.oldContent === null || change.oldContent === undefined;
    const icon = isNew ? "&#128196;" : "&#9999;";
    const badge = isNew ? '<span class="pi-new">nuevo</span>' : '<span class="pi-mod">modif</span>';
    row.innerHTML =
      '<span class="pi-icon">' + icon + '</span>' +
      '<span class="pi-name" title="' + escapeHtml(change.path) + '">' + escapeHtml(change.path.split("/").pop()) + badge + '</span>' +
      '<div class="pi-actions">' +
        '<button class="pi-btn pi-view" title="Ver diff">&#128065;</button>' +
        '<button class="pi-btn pi-accept" title="Aceptar">&#10003;</button>' +
        '<button class="pi-btn pi-reject" title="Rechazar">&#10007;</button>' +
      '</div>';
    row.querySelector(".pi-view").onclick = () => showPendingDiff(change.path);
    row.querySelector(".pi-accept").onclick = () => acceptPending(change.path);
    row.querySelector(".pi-reject").onclick = () => rejectPending(change.path);
    list.appendChild(row);
  });
}

function showPendingDiff(path) {
  const change = state.pendingChanges.get(path);
  if (!change) return;
  state.currentDiffPath = path;
  document.getElementById("diff-file").textContent = path;
  if (!state.diffEditor) { alert("Monaco diff no disponible"); return; }
  const original = change.oldContent === null || change.oldContent === undefined ? "" : change.oldContent;
  const modified = change.newContent;
  const originalModel = monaco.editor.createModel(original, "plaintext");
  const modifiedModel = monaco.editor.createModel(modified, "plaintext");
  state.diffEditor.setModel({ original: originalModel, modified: modifiedModel });
  switchMainTab("diff");
  state._diffOriginalModel = originalModel;
  state._diffModifiedModel = modifiedModel;
}

function acceptPending(path) {
  if (!state.pendingDiffs) return;
  state.pendingDiffs.accept(path);
  saveProject();
  renderFileTree();
  updatePendingBar();
}

function rejectPending(path) {
  if (!state.pendingDiffs) return;
  state.pendingDiffs.reject(path);
  renderFileTree();
  updatePendingBar();
}

function openConnectionsModal() {
  const cfgSb = JSON.parse(localStorage.getItem("gafcoreai_sb") || "{}");
  const sbUrl = document.getElementById("sb-url");
  const sbKey = document.getElementById("sb-key");
  if (sbUrl && cfgSb.url) sbUrl.value = cfgSb.url;
  if (sbKey && cfgSb.key) sbKey.value = cfgSb.key;

  const cfgGh = JSON.parse(localStorage.getItem("gafcoreai_github") || "{}");
  const ghToken = document.getElementById("gh-token");
  if (ghToken) ghToken.value = cfgGh.token || "";

  const cfgVc = JSON.parse(localStorage.getItem("gafcoreai_vercel") || "{}");
  const vcToken = document.getElementById("vc-token");
  if (vcToken) vcToken.value = cfgVc.token || "";

  updateConnStatus();
  const modal = document.getElementById("modal-connections");
  if (modal) modal.classList.remove("hidden");
}

function updateConnStatus() {
  const cfgSb = JSON.parse(localStorage.getItem("gafcoreai_sb") || "{}");
  const elSb = document.getElementById("conn-supabase-status");
  if (elSb) {
    if (cfgSb.url && cfgSb.key) {
      elSb.textContent = "configurado";
      elSb.style.color = "var(--ok)";
    } else {
      elSb.textContent = "desconectado";
      elSb.style.color = "var(--text-mute)";
    }
  }

  const cfgGh = JSON.parse(localStorage.getItem("gafcoreai_github") || "{}");
  const elGh = document.getElementById("conn-github-status");
  if (elGh) {
    if (cfgGh.token) {
      elGh.textContent = "@" + (cfgGh.user || "conectado");
      elGh.style.color = "var(--ok)";
    } else {
      elGh.textContent = "desconectado";
      elGh.style.color = "var(--text-mute)";
    }
  }

  const cfgVc = JSON.parse(localStorage.getItem("gafcoreai_vercel") || "{}");
  const elVc = document.getElementById("conn-vercel-status");
  if (elVc) {
    if (cfgVc.token) {
      elVc.textContent = cfgVc.email || "conectado";
      elVc.style.color = "var(--ok)";
    } else {
      elVc.textContent = "desconectado";
      elVc.style.color = "var(--text-mute)";
    }
  }
}

async function publishAll() {
  showPrompt("Mensaje del commit:", "feat: cambios desde GafCoreAI").then(async (msg) => {
    if (!msg) return;
    await doPublish(msg);
  });
}

async function verifyModel(provider, modelId, key) {
  const url = provider.url.replace(/\/$/, "") + "/v1/chat/completions";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "hi" }], max_tokens: 1 })
    });
    return res.ok;
  } catch (e) { return false; }
}

function parseRepoUrl(input) {
  const m = input.match(/(?:github\.com[\/:])?([^\/\s]+)\/([^\/\s]+?)(?:\.git)?(?:\/.*)?$/);
  if (!m) throw new Error("URL invalida");
  return { owner: m[1], name: m[2] };
}

function repoStatus(msg) {
  const el = document.getElementById("repo-status");
  if (el) el.innerHTML += "<div>" + escapeHtml(msg) + "</div>";
}

async function loadRepo(url, thenAnalyze) {
  const status = document.getElementById("repo-status");
  if (status) status.innerHTML = "";
  try {
    const { owner, name } = parseRepoUrl(url);
    repoStatus("Consultando...");
    const info = await ghApi("/repos/" + owner + "/" + name);
    const branch = info.default_branch || "main";
    const tree = await ghApi("/repos/" + owner + "/" + name + "/git/trees/" + branch + "?recursive=1");
    const files = (tree.tree || []).filter(f => f.type === "blob");
    state.repo = { owner, name, branch, tree: files, files: {} };
    saveRepo();
    repoStatus(files.length + " archivos");
    const repoNameEl = document.getElementById("repo-name");
    if (repoNameEl) repoNameEl.textContent = owner + "/" + name + " (" + files.length + ")";
    const repoBar = document.getElementById("repo-bar");
    if (repoBar) repoBar.classList.remove("hidden");
    renderFileTree();
    closeModals();
    if (state.mentions) state.mentions.items = [];
    if (thenAnalyze) {
      const summary = "Repositorio: " + owner + "/" + name + "\nRama: " + branch + "\nArchivos (" + files.length + "):\n" +
        files.slice(0, 100).map(f => "  - " + f.path).join("\n");
      const chatInput = document.getElementById("chat-input");
      if (chatInput) chatInput.value = "Analiza este repositorio:\n\n" + summary;
      handleSend();
    }
  } catch (e) { repoStatus("Error: " + e.message); }
}

async function openRepoFile(path) {
  if (!state.repo) return;
  if (state.repo.files[path]) { showProjectFile(path); return; }
  try {
    const data = await ghApi("/repos/" + state.repo.owner + "/" + state.repo.name + "/contents/" + path + "?ref=" + state.repo.branch);
    const content = data.content ? atob(data.content.replace(/\n/g, "")) : "(vacio)";
    state.repo.files[path] = content;
    if (state.editor) state.editor.setValue(content);
  } catch (e) { alert("Error: " + e.message); }
}

function bindUI() {
  const toolsBtn = document.getElementById("btn-tools-menu");
  const toolsMenu = document.getElementById("tools-dropdown-menu");
  if (toolsBtn && toolsMenu) {
    toolsBtn.onclick = (e) => {
      e.stopPropagation();
      toolsMenu.classList.toggle("hidden");
    };
    document.addEventListener("click", (e) => {
      if (!toolsMenu.contains(e.target) && e.target !== toolsBtn && !toolsBtn.contains(e.target)) {
        toolsMenu.classList.add("hidden");
      }
    });
    toolsMenu.querySelectorAll(".dropdown-item").forEach(item => {
      item.addEventListener("click", () => {
        toolsMenu.classList.add("hidden");
      });
    });
  }

  // v53: btn-mode-toggle eliminado del HTML (chat-first por defecto)
  safeBind("btn-problems", "onclick", () => state.problemsPanel && state.problemsPanel.toggle());
  safeBind("btn-suggest", "onclick", openSuggestionsModal);
  safeBind("btn-run", "onclick", runCurrentProject);
  safeBind("btn-auto-toggle", "onclick", toggleAutopilotMode);
  safeBind("btn-clone-real", "onclick", cloneRealRepo);
  safeBind("btn-open-terminal", "onclick", () => {
    if (state.activeMainTab === "terminal") switchMainTab("editor");
    else switchMainTab("terminal");
  });
  safeBind("btn-inline-edit", "onclick", () => {
    if (!state.inlineEdit) { alert("Inline Edit no esta listo"); return; }
    state.inlineEdit.trigger();
  });
  safeBind("btn-ghost-toggle", "onclick", () => {
    if (!state.ghost) { alert("Ghost no esta listo"); return; }
    openGhostModal();
  });
  safeBind("ghost-save", "onclick", saveGhostConfig);
  safeBind("ghost-clear-cache", "onclick", () => {
    if (state.ghost) { state.ghost.clearCache(); }
  });

  safeBind("btn-lsp", "onclick", openLspModal);
  safeBind("lsp-autodetect", "onclick", () => {
    if (!state.lsp) return;
    closeModals();
    switchMainTab("terminal");
    if (state.activeTermTab !== "logs") switchTermTab("logs");
    autodetectAndStartLsp();
  });
  safeBind("lsp-stop-all", "onclick", async () => {
    if (!state.lsp) return;
    await state.lsp.stopAll();
    updateLspStatus();
    openLspModal();
  });

  safeBind("btn-rag", "onclick", openRagModal);
  safeBind("rag-index", "onclick", runRagIndex);
  safeBind("rag-clear", "onclick", async () => {
    if (!state.rag) return;
    const ok = await showConfirm("Limpiar el indice RAG?");
    if (!ok) return;
    state.rag.clear();
    updateRagStatus();
    openRagModal();
  });
  safeBind("rag-embed-save", "onclick", () => {
    if (!state.rag) return;
    state.rag.embeddings.setConfig({
      url: document.getElementById("rag-embed-url").value.trim(),
      key: document.getElementById("rag-embed-key").value.trim(),
      model: document.getElementById("rag-embed-model").value.trim()
    });
    termWrite("Config embeddings guardada", "success");
    alert("Configuracion guardada");
    openRagModal();
  });
  safeBind("rag-embed-test", "onclick", async () => {
    if (!state.rag) return;
    const url = document.getElementById("rag-embed-url").value.trim();
    const key = document.getElementById("rag-embed-key").value.trim();
    const model = document.getElementById("rag-embed-model").value.trim();
    if (!url || !key || !model) { alert("Rellena URL, Key y Modelo"); return; }
    state.rag.embeddings.setConfig({ url, key, model });
    try {
      const vec = await state.rag.embeddings.embed("test");
      alert("Funciona. Vector de " + vec.length + " dimensiones");
    } catch (e) {
      alert("Error: " + e.message);
    }
  });

  safeBind("model-select", "onchange", e => {
    const val = e.target.value;

    if (val === "__OPEN_PROVIDERS__") {
      recoverKeysFromStorage();
      renderProvidersFull();
      openModal("modal-providers");
      return;
    }

    if (val.startsWith("__AUTO__")) {
      const pid = val.replace("__AUTO__", "");
      const prov = state.providers.find(x => x.id === pid);
      state.activeProvider = prov || null;
      state.activeModel = { id: val, key: "__AUTO__" }; try { localStorage.setItem("gafcoreai_active_model", JSON.stringify({ providerId: pid, id: val, key: "__AUTO__" })); } catch (_) {}
      const st = document.getElementById("status-text");
      if (st) st.textContent = "Auto (" + (prov ? prov.name : pid) + ")";
      termWrite("Modo AUTO (" + (prov ? prov.name : pid) + "): mejor modelo del proveedor segun tarea", "dim");
      return;
    }

    const parts = val.split("::");
    const p = state.providers.find(x => x.id === parts[0]);
    if (!p) return;
    const modelId = parts[1];
    const found = findModelWithKey(p, modelId);
    if (!found) return;
    state.activeProvider = p;
    state.activeModel = { id: found.id, key: found.key }; try { localStorage.setItem("gafcoreai_active_model", JSON.stringify({ providerId: p.id, id: found.id, key: found.key })); } catch (_) {}
    const st = document.getElementById("status-text");
    if (st) st.textContent = p.name + " - " + found.id;
    if (state.patterns) state.patterns.recordModel(found.id);
  });

  const openProvidersFn = () => {
    recoverKeysFromStorage();
    renderProvidersFull();
    openModal("modal-providers");
  };
  safeBind("btn-providers", "onclick", openProvidersFn);
  safeBind("btn-topbar-providers", "onclick", openProvidersFn);
  safeBind("status-provider", "onclick", openProvidersFn);
  safeBind("status-text", "onclick", openProvidersFn);
  safeBind("btn-add-provider", "onclick", openAddProviderModal);

  safeBind("chat-send", "onclick", handleSend);
  safeBind("chat-input", "onkeydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") hideSlashMenu();
  });
  safeBind("chat-input", "oninput", e => {
    const v = e.target.value;
    if (v.startsWith("/") && !v.includes(" ")) showSlashMenu();
    else hideSlashMenu();
  });

  document.querySelectorAll(".slash-item").forEach(item => {
    item.onclick = () => {
      const cmd = item.dataset.cmd;
      const ta = document.getElementById("chat-input");
      if (cmd === "/search") { openModal("modal-search"); hideSlashMenu(); return; }
      if (cmd === "/url") { openModal("modal-url"); hideSlashMenu(); return; }
      ta.value = cmd + " " + ta.value.replace(/^\/\w*\s*/, "");
      ta.focus();
      hideSlashMenu();
    };
  });

  safeBind("tool-file", "onclick", () => document.getElementById("file-input").click());
  safeBind("tool-image", "onclick", () => document.getElementById("image-input").click());
  safeBind("tool-url", "onclick", () => openModal("modal-url"));
  safeBind("tool-search", "onclick", () => {
    const k = localStorage.getItem(SEARCH_KEY);
    if (k) document.getElementById("search-key").value = k;
    openModal("modal-search");
  });
  safeBind("tool-slash", "onclick", () => {
    const ta = document.getElementById("chat-input");
    if (!ta.value.startsWith("/")) ta.value = "/" + ta.value;
    ta.focus(); showSlashMenu();
  });

  safeBind("file-input", "onchange", async e => {
    if (e.target.files.length) await addFiles(e.target.files);
    e.target.value = "";
  });
  safeBind("image-input", "onchange", async e => {
    if (e.target.files.length) await addFiles(e.target.files);
    e.target.value = "";
  });

  safeBind("pending-accept-all", "onclick", () => {
    if (!state.pendingDiffs) return;
    state.pendingDiffs.acceptAll();
    saveProject();
    renderFileTree();
    updatePendingBar();
  });
  safeBind("pending-reject-all", "onclick", async () => {
    if (!state.pendingDiffs) return;
    const ok = await showConfirm("Rechazar TODOS los cambios pendientes?");
    if (!ok) return;
    state.pendingDiffs.rejectAll();
    renderFileTree();
    updatePendingBar();
  });

  safeBind("diff-accept", "onclick", () => {
    if (!state.currentDiffPath) return;
    acceptPending(state.currentDiffPath);
    state.currentDiffPath = null;
    switchMainTab("editor");
  });
  safeBind("diff-reject", "onclick", () => {
    if (!state.currentDiffPath) return;
    rejectPending(state.currentDiffPath);
    state.currentDiffPath = null;
    switchMainTab("editor");
  });

  safeBind("btn-open-folder", "onclick", openDiskFolder);
  safeBind("btn-new-project", "onclick", openNewProjectModal);
  safeBind("btn-refresh-disk", "onclick", refreshDiskFolder);
  safeBind("btn-close-disk", "onclick", closeDiskFolder);
  safeBind("btn-save-file", "onclick", saveCurrentFile);

  safeBind("url-go", "onclick", () => {
    const url = document.getElementById("url-input").value.trim();
    const q = document.getElementById("url-question").value.trim();
    if (url) readUrlAndSend(url, q);
  });
  safeBind("search-save", "onclick", () => {
    const k = document.getElementById("search-key").value.trim();
    if (k) { localStorage.setItem(SEARCH_KEY, k); alert("Key guardada"); }
  });
  safeBind("search-go", "onclick", () => {
    const q = document.getElementById("search-query").value.trim();
    if (q) webSearchAndSend(q);
  });

  safeBind("btn-load-repo", "onclick", () => {
    document.getElementById("repo-status").innerHTML = "";
    openModal("modal-repo");
  });
  safeBind("repo-load", "onclick", () => {
    const url = document.getElementById("repo-url").value.trim();
    if (url) loadRepo(url, false);
  });
  safeBind("repo-analyze", "onclick", () => {
    const url = document.getElementById("repo-url").value.trim();
    if (url) loadRepo(url, true);
  });
  safeBind("btn-unload-repo", "onclick", () => {
    state.repo = null; saveRepo();
    document.getElementById("repo-bar").classList.add("hidden");
    renderFileTree();
    if (state.mentions) state.mentions.items = [];
  });

  safeBind("btn-clear-chat", "onclick", clearChat);

  safeBind("btn-update", "onclick", runRealUpdate);
  safeBind("btn-connections", "onclick", openConnectionsModal);
  safeBind("btn-publish", "onclick", publishAll);

  safeBind("btn-perms", "onclick", () => { renderPermissions(); openModal("modal-perms"); });
  safeBind("btn-cache", "onclick", () => { updateCacheStats(); openModal("modal-cache"); });
  safeBind("btn-memory", "onclick", () => { renderAgentMemoryPanel(); openModal("modal-memory"); });
  safeBind("btn-synaptic", "onclick", () => {
    const memory = state.orchestrator && state.orchestrator.teamMemory ? state.orchestrator.teamMemory : null;
    const graph = memory && memory.synapticGraph ? memory.synapticGraph : null;
    const opt = state.orchestrator && state.orchestrator.tokenOptimizer ? state.orchestrator.tokenOptimizer : null;
    const stats = graph ? graph.getStats() : { totalNodes: 0, totalEdges: 0, tokensSavedEstimate: 0, errorFixesApplied: 0, queriesProcessed: 0 };
    const savings = opt ? opt.getSavingsReport() : { costSavedUsd: "$0.0000 USD" };

    const msg = `⚡ RED SINÁPTICA & AHORRO DE TOKENS GAFCOREAI\n\n` +
      `• Nodos Activos en la Red: ${stats.totalNodes}\n` +
      `• Conexiones Sinápticas (Aristas): ${stats.totalEdges}\n` +
      `• Soluciones de Error Aplicadas: ${stats.errorFixesApplied}\n` +
      `• Consultas Procesadas: ${stats.queriesProcessed}\n\n` +
      `💰 Tokens Ahorrados Totales: ~${(stats.tokensSavedEstimate || 0).toLocaleString()} tokens\n` +
      `💵 Ahorro Económico Estimado: ${savings.costSavedUsd}\n\n` +
      `Estado: 🟢 Red neuronal y optimizador de tokens 100% operativos.`;
    alert(msg);
  });
  safeBind("btn-skills", "onclick", openSkillsModal);

  safeBind("live-accept-all", "onclick", () => {
    if (!state.pendingDiffs) return;
    state.pendingDiffs.acceptAll();
    saveProject();
    renderFileTree();
    updatePendingBar();
    if (state.liveView) state.liveView.hideActions();
  });
  safeBind("live-reject-all", "onclick", () => {
    if (!state.pendingDiffs) return;
    showConfirm("Rechazar TODOS los cambios pendientes?").then(ok => {
      if (!ok) return;
      state.pendingDiffs.rejectAll();
      renderFileTree();
      updatePendingBar();
      if (state.liveView) state.liveView.hideActions();
    });
  });

  safeBind("cache-clear", "onclick", () => { core.cache.clear(); updateCacheStats(); });
  safeBind("memory-clear", "onclick", async () => {
    const ok = await showConfirm("Borrar memoria?");
    if (ok) { core.memory.clear(); renderMemory(); }
  });

  document.querySelectorAll(".main-tabs .tab").forEach(t => {
    t.onclick = () => switchMainTab(t.dataset.view);
  });
  document.querySelectorAll(".terminal-tab").forEach(t => {
    t.onclick = () => switchTermTab(t.dataset.termTab);
  });
  safeBind("btn-studio-menu", "onclick", () => switchMainTab("studio"));

  safeBind("br-go", "onclick", () => {
    document.getElementById("browser-frame").src = document.getElementById("br-url").value;
  });
  safeBind("br-read", "onclick", () => {
    readUrlAndSend(document.getElementById("br-url").value, "Resume esta pagina");
  });
  document.querySelectorAll(".resp-btn").forEach(b => {
    b.onclick = () => setPreviewWidth(b.dataset.mode);
  });

  safeBind("btn-preview-project", "onclick", previewProject);
  safeBind("br-preview", "onclick", previewProject);
  safeBind("br-newtab", "onclick", previewProjectNewTab);
  safeBind("btn-download-project", "onclick", openDownloadModal);
  safeBind("dl-go", "onclick", downloadProjectZip);

  safeBind("btn-clear-project", "onclick", async () => {
    if (!Object.keys(state.projectFiles).length) return;
    const ok = await showConfirm("Borrar todos los archivos aceptados?");
    if (!ok) return;
    state.projectFiles = {};
    saveProject();
    updateProjectBar();
    renderFileTree();
    termWrite("Proyecto limpiado", "warn");
    if (state.mentions) state.mentions.items = [];
  });

  safeBind("sb-save", "onclick", () => {
    const url = document.getElementById("sb-url").value.trim();
    const key = document.getElementById("sb-key").value.trim();
    if (!url || !key) { alert("Rellena URL y Anon Key"); return; }
    localStorage.setItem("gafcoreai_sb", JSON.stringify({ url, key }));
    alert("Guardado");
  });
  safeBind("sb-login", "onclick", async () => {
    const url = document.getElementById("sb-url").value.trim();
    const key = document.getElementById("sb-key").value.trim();
    const email = document.getElementById("sb-email").value.trim();
    const pass = document.getElementById("sb-pass").value;
    if (!url || !key) { alert("Falta URL o Anon Key"); return; }
    try {
      if (!window.supabase || !window.supabase.createClient) throw new Error("supabase-js no cargo");
      localStorage.setItem("gafcoreai_sb", JSON.stringify({ url, key }));
      const client = window.supabase.createClient(url, key);
      state.supabaseClient = client;
      const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      state.supabaseUser = data.user;
      closeModals();
      appendChat("system", "Sesion iniciada en " + url);
    } catch (e) { alert("Error: " + e.message); }
  });

  safeBind("gh-connect", "onclick", async () => {
    const token = document.getElementById("gh-token").value.trim();
    if (!token) { alert("Pega un token"); return; }
    try {
      const r = await fetch("https://api.github.com/user", {
        headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json" }
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const user = await r.json();
      localStorage.setItem("gafcoreai_github", JSON.stringify({ token, user: user.login, name: user.name }));
      alert("Conectado como @" + user.login);
    } catch (e) { alert("Error: " + e.message); }
  });
  safeBind("gh-disconnect", "onclick", async () => {
    const ok = await showConfirm("Desconectar GitHub?");
    if (!ok) return;
    localStorage.removeItem("gafcoreai_github");
  });

  safeBind("vc-connect", "onclick", async () => {
    const token = document.getElementById("vc-token").value.trim();
    if (!token) { alert("Pega un token"); return; }
    try {
      const r = await fetch("https://api.vercel.com/v2/user", { headers: { "Authorization": "Bearer " + token } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const u = await r.json();
      localStorage.setItem("gafcoreai_vercel", JSON.stringify({ token, email: u.user?.email || "" }));
      alert("Conectado a Vercel");
    } catch (e) { alert("Error: " + e.message); }
  });
  safeBind("vc-disconnect", "onclick", async () => {
    const ok = await showConfirm("Desconectar Vercel?");
    if (!ok) return;
    localStorage.removeItem("gafcoreai_vercel");
  });

  function applyTheme(name) {
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem("gafcoreai_ui_theme", name);

    const monacoThemes = { dark: "gafcore-dark", gray: "vs-dark", light: "vs" };
    const mTheme = monacoThemes[name] || "gafcore-dark";

    function applyMonaco() {
      if (typeof monaco !== "undefined" && monaco.editor && monaco.editor.setTheme) {
        try { monaco.editor.setTheme(mTheme); return true; } catch (e) { return false; }
      }
      return false;
    }
    if (!applyMonaco()) {
      setTimeout(applyMonaco, 500);
      setTimeout(applyMonaco, 1500);
    }

    const btn = document.getElementById("btn-theme-toggle");
    if (btn) {
      const icons = { dark: "&#127761;", gray: "&#127762;", light: "&#127774;" };
      const labels = { dark: "Oscuro", gray: "Gris", light: "Claro" };
      btn.innerHTML = (icons[name] || "") + " Tema: " + (labels[name] || name);
    }

    try {
      const frame = document.getElementById("browser-frame");
      if (frame && frame.contentDocument && frame.contentDocument.documentElement) {
        frame.contentDocument.documentElement.setAttribute("data-theme", name);
      }
      if (state.activeMainTab === "browser" && document.getElementById("br-url")?.value?.startsWith("preview://")) {
        previewProject();
      }
    } catch (_) {}

    termWrite("Tema UI: " + name + " (Monaco: " + mTheme + ")", "dim");
  }

  safeBind("btn-theme-toggle", "onclick", () => {
    const uiThemes = ["dark", "gray", "light"];
    const current = localStorage.getItem("gafcoreai_ui_theme") || "dark";
    const idx = uiThemes.indexOf(current);
    const next = uiThemes[(idx + 1) % uiThemes.length];
    applyTheme(next);
  });

  (function applyInitialTheme() {
    const saved = localStorage.getItem("gafcoreai_ui_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    const btn = document.getElementById("btn-theme-toggle");
    if (btn) {
      const icons = { dark: "&#127761;", gray: "&#127762;", light: "&#127774;" };
      const labels = { dark: "Oscuro", gray: "Gris", light: "Claro" };
      btn.innerHTML = (icons[saved] || "") + " Tema: " + (labels[saved] || saved);
    }
    let tries = 0;
    const tryApply = () => {
      if (typeof monaco !== "undefined" && monaco.editor && monaco.editor.setTheme) {
        const monacoThemes = { dark: "gafcore-dark", gray: "vs-dark", light: "vs" };
        try { monaco.editor.setTheme(monacoThemes[saved] || "gafcore-dark"); } catch (e) {}
      } else if (tries++ < 20) {
        setTimeout(tryApply, 500);
      }
    };
    tryApply();
  })();

  try {
    const chatTa = document.getElementById("chat-input");
    if (chatTa) {
      chatTa.addEventListener("paste", async (e) => {
        const items = (e.clipboardData || {}).items || [];
        const files = [];
        for (const item of items) {
          if (item.kind === "file") {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
        if (files.length) {
          e.preventDefault();
          await addFiles(files);
          termWrite("Pegados " + files.length + " archivo(s)", "success");
        }
      });

      const chatPanel = document.querySelector(".panel-chat");
      const target = chatPanel || chatTa;

      target.addEventListener("dragover", (e) => {
        e.preventDefault();
        chatTa.classList.add("dragover");
      });

      target.addEventListener("dragleave", (e) => {
        if (!chatPanel || !chatPanel.contains(e.relatedTarget)) {
          chatTa.classList.remove("dragover");
        }
      });

      target.addEventListener("drop", async (e) => {
        e.preventDefault();
        chatTa.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          await addFiles(e.dataTransfer.files);
          termWrite("Soltados " + e.dataTransfer.files.length + " archivo(s)", "success");
        }
      });

      document.addEventListener("dragover", (e) => e.preventDefault());
      document.addEventListener("drop", (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          e.preventDefault();
        }
      });

      chatTa.addEventListener("dragover", (e) => {
        e.preventDefault();
        chatTa.classList.add("dragover");
      });

      chatTa.addEventListener("dragleave", () => {
        chatTa.classList.remove("dragover");
      });

      chatTa.addEventListener("drop", async (e) => {
        e.preventDefault();
        chatTa.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
          await addFiles(e.dataTransfer.files);
          termWrite("Soltados " + e.dataTransfer.files.length + " archivo(s)", "success");
        }
      });
    }
  } catch (e) { console.warn("chat paste/drop setup error:", e); }

  document.querySelectorAll("[data-close]").forEach(b => b.onclick = closeModals);
  document.querySelectorAll(".modal").forEach(m => {
    m.onclick = e => { if (e.target === m) closeModals(); };
  });
}

// ────────────────────────────────────────────────────────────
//  URL / SEARCH HELPERS
// ────────────────────────────────────────────────────────────
async function readUrlAndSend(url, question) {
  const res = await fetchUrl(url);
  if (!res.ok) { alert(res.error); return; }
  const clean = stripHtml(res.text).slice(0, 20000);
  state.attachments.push({
    kind: "url",
    name: url.replace(/^https?:\/\//, "").slice(0, 60),
    isImage: false,
    text: "Contenido de " + url + ":\n\n" + clean
  });
  renderAttachPreview();
  document.getElementById("chat-input").value = question;
  closeModals();
  handleSend();
}

async function webSearchAndSend(query) {
  const key = localStorage.getItem(SEARCH_KEY);
  if (!key) { alert("Falta Brave API key"); return; }
  try {
    const r = await fetch("https://api.search.brave.com/res/v1/web/search?q=" + encodeURIComponent(query) + "&count=8", {
      headers: { "X-Subscription-Token": key, "Accept": "application/json" }
    });
    const data = await r.json();
    const results = (data.web && data.web.results) || [];
    let summary = "Resultados de busqueda para \"" + query + "\":\n\n";
    results.forEach((res, i) => {
      summary += (i + 1) + ". " + res.title + "\n   URL: " + res.url + "\n   " + (res.description || "") + "\n\n";
    });
    state.attachments.push({ kind: "search", name: query, isImage: false, text: summary });
    renderAttachPreview();
    document.getElementById("chat-input").value = "Analiza: " + query;
    closeModals();
    handleSend();
  } catch (e) { alert("Error: " + e.message); }
}

function clearChat() {
  const logEl = document.getElementById("chat-log");
  if (!logEl) return;

  const hasProject = !!state.diskFolder;
  const msg = hasProject
    ? "Borrar el historial del chat de este proyecto? (Se guardará vacío)"
    : "El chat ya está vacío.";

  if (!hasProject && logEl.children.length === 0) {
    termWrite("El chat ya esta vacio", "dim");
    return;
  }

  showConfirm(msg).then(ok => {
    if (!ok) return;

    // Borrar la conversación guardada del proyecto activo
    if (state.conversation) {
      if (state.diskFolder) {
        state.conversation.clearFor(state.diskFolder);
      } else {
        state.conversation.clearFor(null);
      }
    }

    logEl.innerHTML = "";
    state.history = [];

    if (hasProject) {
      renderProjectLoadedHeader(state.diskFolder);
      termWrite("Chat del proyecto limpiado", "success");
    } else {
      renderWelcome();
    }

    state.activeAgentFile = null;
    state.activeAgentFileHistory = [];
    renderAgentLiveStatus();
  });
}

function setPreviewWidth(mode) {
  const frame = document.getElementById("browser-frame");
  const viewport = document.getElementById("browser-viewport") || (frame ? frame.parentElement : null);
  if (!frame || !viewport) return;

  document.querySelectorAll(".resp-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });

  if (mode === "desktop") {
    viewport.classList.remove("responsive-mode");
    frame.style.width = "100%";
    frame.style.maxWidth = "100%";
    frame.style.height = "100%";
    frame.style.borderRadius = "0px";
    frame.style.boxShadow = "none";
    frame.style.margin = "0";
    frame.style.flex = "1";
    return;
  }

  viewport.classList.add("responsive-mode");
  const isMobile = mode === "mobile";
  const widthPx = isMobile ? 375 : 768;
  const heightPx = isMobile ? 667 : 1024;

  frame.style.width = widthPx + "px";
  frame.style.maxWidth = widthPx + "px";
  frame.style.height = heightPx + "px";
  frame.style.borderRadius = isMobile ? "28px" : "18px";
  frame.style.boxShadow = "0 25px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.1)";
  frame.style.margin = "auto";
  frame.style.flex = "0 0 auto";
}

async function runRealUpdate() {
  const btn = document.getElementById("btn-update");
  const originalText = btn ? btn.innerHTML : "";

  if (btn) {
    btn.innerHTML = "&#8635; Verificando...";
    btn.disabled = true;
  }

  termWrite("", "normal");
  termWrite("=== BUSCANDO ACTUALIZACIONES ===", "head");
  termWrite("Consultando servidor...", "dim");

  if (state.activeMainTab !== "terminal") {
    switchMainTab("terminal");
  }
  if (state.activeTermTab !== "logs") {
    switchTermTab("logs");
  }

  function findUpdater() {
    const t = window.__TAURI__;
    if (!t) return null;
    const candidates = [
      t.updater,
      t.plugin && t.plugin.updater,
      t.plugins && t.plugins.updater,
    ];
    for (const c of candidates) {
      if (c && typeof c.check === "function") return c;
    }
    return null;
  }

  function findProcess() {
    const t = window.__TAURI__;
    if (!t) return null;
    return t.process || (t.plugin && t.plugin.process) || (t.plugins && t.plugins.process) || null;
  }

  const updater = findUpdater();
  if (!updater) {
    termWrite("", "normal");
    termWrite("Updater no disponible en este modo.", "warn");
    termWrite("En el .exe final funcionara automaticamente.", "dim");
    termWrite("", "normal");
    if (btn) {
      btn.innerHTML = "&#8635; Solo en .exe";
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2500);
    }
    return;
  }

  try {
    const update = await updater.check();

    if (!update || !update.available) {
      termWrite("", "normal");
      termWrite("Ya tienes la ultima version instalada.", "success");
      termWrite("", "normal");
      if (btn) {
        btn.innerHTML = "&#10003; Actualizado";
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 2500);
      }
      return;
    }

    termWrite("", "normal");
    termWrite("Nueva version disponible: " + update.version, "success");
    if (update.date) termWrite("Fecha: " + update.date, "dim");
    if (update.body) termWrite("Notas: " + String(update.body).slice(0, 200), "dim");
    termWrite("", "normal");

    const ok = await showConfirm(
      "Nueva versión " + update.version + " disponible.\n\nTus proyectos se guardarán antes de actualizar.\n\n¿Descargar e instalar ahora?",
      "Actualizador GafCoreAI"
    );

    if (!ok) {
      termWrite("Actualizacion cancelada por el usuario.", "dim");
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
      return;
    }

    termWrite("Guardando estado actual...", "dim");
    try {
      if (state.projectFiles && Object.keys(state.projectFiles).length) {
        localStorage.setItem("gafcoreai_project_files_backup",
          JSON.stringify(state.projectFiles));
        termWrite("  Proyecto: " + Object.keys(state.projectFiles).length + " archivos", "success");
      }
      if (state.memoryManager) {
        state.memoryManager.save();
        termWrite("  Memoria guardada", "success");
      }
      if (state.conversation && state.conversation.save) {
        state.conversation.save();
        termWrite("  Conversacion guardada", "success");
      }
    } catch (e) {
      termWrite("  Error guardando estado: " + e.message, "warn");
    }

    termWrite("", "normal");
    termWrite("Descargando actualizacion...", "head");

    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        termWrite("  Iniciando descarga (" + (event.data.contentLength || "?") + " bytes)", "dim");
      } else if (event.event === "Progress") {
        termWrite("  +" + event.data.chunkLength + " bytes", "dim");
      } else if (event.event === "Finished") {
        termWrite("  Descarga completa", "success");
      }
    });

    termWrite("", "normal");
    termWrite("Instalada. Reiniciando...", "success");
    if (btn) btn.innerHTML = "&#10003; Reiniciando";

    const process = findProcess();
    if (process && typeof process.relaunch === "function") {
      await process.relaunch();
    } else {
      termWrite("Reinicia la app manualmente para aplicar cambios.", "warn");
    }
  } catch (e) {
    const msg = String(e.message || e);
    termWrite("", "normal");

    if (msg.includes("release JSON") || msg.includes("valid release")) {
      termWrite("No hay releases publicados todavia.", "warn");
      termWrite("Cuando publiques en GitHub Releases, aqui aparecera la actualizacion.", "dim");
    } else if (msg.includes("Network") || msg.includes("fetch")) {
      termWrite("Sin conexion al servidor de actualizaciones.", "warn");
      termWrite("Revisa tu internet y vuelve a intentar.", "dim");
    } else {
      termWrite("Error: " + msg, "error");
    }
    termWrite("", "normal");

    if (btn) {
      btn.innerHTML = "&#8635; Sin updates";
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2500);
    }
  }
}

function scheduleAutoUpdateCheck() {
  const LAST_CHECK = "gafcoreai_last_update_check";
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const last = parseInt(localStorage.getItem(LAST_CHECK) || "0", 10);
  const now = Date.now();
  if (now - last < ONE_DAY) return;
  setTimeout(() => {
    try {
      localStorage.setItem(LAST_CHECK, String(now));
      runRealUpdate();
    } catch (e) {}
  }, 10000);
}

async function doPublish(msg) {
  if (!state.gitReal) {
    termWrite("GitReal no disponible", "error");
    return;
  }
  if (state.liveView) state.liveView.focus();
  const r = await state.gitReal.publishAll(msg);

  const lines = [];
  if (r.commit && r.commit.ok) lines.push("Commit OK");
  else if (r.commit) lines.push("Commit: " + r.commit.error);
  if (r.push && r.push.ok) lines.push("Push OK");
  else if (r.push) lines.push("Push: " + r.push.error);
  if (r.deploy && r.deploy.ok) lines.push("Deploy OK" + (r.deploy.deployment?.url ? " (" + r.deploy.deployment.url + ")" : ""));
  else if (r.deploy) lines.push("Deploy: " + r.deploy.error);

  appendChat("system", "Publicacion completada:\n\n" + lines.join("\n"));
}

function openNewProjectModal() {
  const templates = listTemplates();
  const el = document.getElementById("modal-custom");
  if (!el) { showAlert("Error: modal custom no inicializado"); return; }

  el.classList.remove("hidden");
  el.querySelector("#custom-title").textContent = "Nuevo proyecto";
  el.querySelector("#custom-body").innerHTML =
    '<p class="hint" style="margin-bottom:14px">Elige un template profesional. Se agregara al proyecto actual.</p>' +
    '<div id="tpl-list" style="display:flex;flex-direction:column;gap:8px">' +
    templates.map(t =>
      '<button class="tpl-item" data-tpl="' + t.id + '" style="text-align:left;padding:14px;background:var(--bg-2);border:none;border-radius:10px;cursor:pointer;color:var(--text);font-family:inherit">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
          '<span style="font-size:22px">' + t.icon + '</span>' +
          '<b style="font-size:13.5px">' + escapeHtml(t.name) + '</b>' +
          '<span style="margin-left:auto;font-size:10.5px;color:var(--text-dim)">' + t.filesCount + ' archivos</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-dim);line-height:1.5">' + escapeHtml(t.description) + '</div>' +
      '</button>'
    ).join('') +
    '</div>';

  const actions = el.querySelector("#custom-actions");
  actions.innerHTML = "";
  const cancel = document.createElement("button");
  cancel.className = "btn ghost";
  cancel.textContent = "Cancelar";
  cancel.onclick = () => el.classList.add("hidden");
  actions.appendChild(cancel);

  el.querySelectorAll(".tpl-item").forEach(btn => {
    btn.onmouseenter = () => btn.style.background = "var(--bg-3)";
    btn.onmouseleave = () => btn.style.background = "var(--bg-2)";
    btn.onclick = () => {
      const tplId = btn.dataset.tpl;
      const result = applyTemplate(tplId, state);
      if (!result.ok) { showAlert("Error: " + result.error); return; }
      saveProject();
      renderFileTree();
      updateProjectBar();
      el.classList.add("hidden");
      termWrite("Template aplicado: " + tplId + " (" + result.files + " archivos)", "success");
      appendChat("system", "Template '" + tplId + "' aplicado.\n\nEscribe en el chat como quieres personalizarlo o abre index.html para verlo.");
      setTimeout(() => { try { previewProject(); } catch (e) {} }, 300);
    };
  });
}

function renderAgentMemoryPanel() {
  renderMemory();
  const list = document.getElementById("memory-list");
  if (!list) return;

  if (state.agentMemory) {
    const stats = state.agentMemory.getStats();
    const div = document.createElement("div");
    div.innerHTML =
      '<div style="margin-top:14px;padding:10px;background:var(--bg-2);border-radius:6px;font-size:11.5px;line-height:1.8">' +
        '<b style="display:block;margin-bottom:6px">Memoria compartida de agentes</b>' +
        'Hechos: <b>' + stats.facts + '</b> &middot; ' +
        'Decisiones: <b>' + stats.decisions + '</b> &middot; ' +
        'Handoffs: <b>' + stats.handoffs + '</b> &middot; ' +
        'Locks activos: <b>' + stats.activeLocks + '</b>' +
      '</div>';
    list.appendChild(div);
  }
}

function openSkillsModal() {
  const el = document.getElementById("modal-custom");
  if (!el) { showAlert("Error: modal no inicializado"); return; }

  const cats = getSkillsByCategory();
  const agents = ["Explorer", "Analyst", "Security", "Coder", "Reviewer", "Tester", "Researcher"];

  let html = '<p class="hint" style="margin-bottom:14px">Skills disponibles por categoria y agente.</p>';
  html += '<h3 style="font-size:11px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Por categoria</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">';
  Object.keys(cats).forEach(cat => {
    html += '<div style="padding:10px 12px;background:var(--bg-2);border-radius:8px">';
    html += '<b style="font-size:12px;color:var(--accent-2);text-transform:uppercase;letter-spacing:.3px">' + escapeHtml(cat) + '</b>';
    html += '<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px">';
    cats[cat].forEach(s => {
      html += '<div style="display:flex;align-items:center;gap:8px;font-size:11.5px">';
      html += '<span style="font-family:Consolas,monospace;color:var(--accent);min-width:140px">' + escapeHtml(s.id) + '</span>';
      html += '<span style="color:var(--text-dim);flex:1">' + escapeHtml(s.description) + '</span>';
      const riskColor = s.risk === "low" ? "var(--ok)" : (s.risk === "medium" ? "var(--warn)" : "var(--err)");
      html += '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,.05);color:' + riskColor + '">' + s.risk + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
  });
  html += '</div>';

  html += '<h3 style="font-size:11px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Por agente</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  agents.forEach(agentName => {
    const skills = getSkillsForAgent(agentName);
    html += '<div style="padding:10px 12px;background:var(--bg-2);border-radius:8px">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
    html += '<b style="font-size:12.5px">' + escapeHtml(agentName) + '</b>';
    html += '<span style="margin-left:auto;font-size:10.5px;color:var(--text-dim)">' + skills.length + ' skills</span>';
    html += '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    skills.forEach(s => {
      html += '<span style="font-size:10.5px;padding:3px 8px;background:var(--bg-3);color:var(--text-dim);border-radius:4px;font-family:Consolas,monospace">' + escapeHtml(s.id) + '</span>';
    });
    html += '</div></div>';
  });
  html += '</div>';

  el.classList.remove("hidden");
  el.querySelector("#custom-title").textContent = "Skills disponibles";
  el.querySelector("#custom-body").innerHTML = html;

  const actions = el.querySelector("#custom-actions");
  actions.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Cerrar";
  btn.onclick = () => el.classList.add("hidden");
  actions.appendChild(btn);
}

async function handleSkillInstall(analysis) {
  if (!analysis) return;

  termWrite("");
  termWrite("---------------------------------------------", "head");
  termWrite("  ANALISIS DE SKILL", "head");
  termWrite("---------------------------------------------", "head");

  appendChat("system",
    "Analizando skill desde: " + analysis.url + "\n" +
    "Tipo: " + analysis.type + "\n" +
    "Nombre: " + (analysis.manifest?.name || "(sin nombre)") + "\n" +
    "Descripcion: " + (analysis.manifest?.description || "(sin descripcion)")
  );

  if (!analysis.valid) {
    termWrite("Skill no valida: " + analysis.reason, "error");
    appendChat("system", "No se puede instalar: " + analysis.reason);
    return;
  }

  let viable = true;
  if (state.activeProvider && state.activeModel && state.activeModel.key) {
    try {
      viable = await evaluateSkillViability(analysis);
    } catch (e) { console.warn("Viability check error:", e); }
  }

  if (!viable) {
    termWrite("Skill no recomendada por el cerebro", "warn");
    appendChat("system", "El cerebro detecto que esta skill puede no ser segura. Instalacion cancelada.");
    return;
  }

  termWrite("");
  termWrite("Instalando skill...", "head");
  const result = await state.skillsInstaller.install(analysis);

  if (result.ok) {
    termWrite("Skill instalada: " + result.skill.name, "success");
    appendChat("assistant",
      "## Skill instalada\n\n" +
      "**Nombre:** " + result.skill.name + "\n" +
      "**Tipo:** " + result.skill.type + "\n" +
      "**Autor:** " + (result.skill.author || "(desconocido)") + "\n" +
      "**Descripcion:** " + result.skill.description + "\n\n" +
      "Ya esta disponible para el agente. La usara automaticamente cuando la necesites."
    );
    updateSkillsStatus();
  } else {
    termWrite("Error: " + result.error, "error");
    appendChat("system", "Error al instalar: " + result.error);
  }
}

async function evaluateSkillViability(analysis) {
  const prompt = "Analiza este manifest de skill y decide si es SEGURA de instalar.\n" +
    "Responde SOLO con SI o NO.\n\n" +
    "URL: " + analysis.url + "\n" +
    "Nombre: " + (analysis.manifest?.name || "") + "\n" +
    "Descripcion: " + (analysis.manifest?.description || "") + "\n" +
    "Autor: " + (analysis.manifest?.author || analysis.owner || "") + "\n" +
    "Capacidades: " + JSON.stringify(analysis.manifest?.capabilities || []).slice(0, 500) + "\n\n" +
    "Riesgos: descarta skills que pidan ejecutar codigo arbitrario, borrar archivos masivamente, o enviar datos a terceros.";

  let response = "";
  try {
    await chatCompletion(state.activeProvider, state.activeModel,
      [{ role: "user", content: prompt }],
      tok => { response += tok; }
    );
  } catch (e) {
    return true;
  }

  const clean = response.trim().toLowerCase();
  if (clean.includes("si") || clean.startsWith("s")) return true;
  return false;
}

async function handleMcpAdd(detection) {
  if (!detection) return;
  termWrite("");
  termWrite("MCP detectado: " + detection.url, "head");

  appendChat("system",
    "MCP server detectado: " + detection.url + "\n\n" +
    "Para conectar un MCP server necesito saber como ejecutarlo.\n" +
    "Escribeme algo como:\n" +
    "`mcp add <nombre> <comando> [args...]`\n\n" +
    "Ejemplo: `mcp add filesystem npx -y @modelcontextprotocol/server-filesystem D:\\mi-carpeta`"
  );
}

async function handleMcpCommand(text) {
  const parts = text.split(/\s+/);
  const subcmd = parts[1];

  if (subcmd === "list" || !subcmd) {
    const servers = state.mcpClient.list();
    if (!servers.length) {
      appendChat("system", "No hay MCP servers configurados.");
      return;
    }
    let out = "## MCP servers\n\n";
    servers.forEach(s => {
      out += "- **" + s.name + "** (" + s.status + ")\n";
      if (s.command) out += "  `" + s.command + " " + s.args.join(" ") + "`\n";
      if (s.url) out += "  URL: " + s.url + "\n";
    });
    appendChat("assistant", out);
    return;
  }

  if (subcmd === "add") {
    const name = parts[2];
    const command = parts[3];
    const args = parts.slice(4);
    if (!name || !command) {
      appendChat("system", "Uso: /mcp add <name> <command> [args...]");
      return;
    }
    const result = await state.mcpClient.addServer({ name, command, args });
    if (result.ok) {
      appendChat("system", "Server agregado: " + name);
      const startResult = await state.mcpClient.startServer(name);
      if (startResult.ok) {
        const tools = state.mcpClient.listTools(name);
        appendChat("assistant", "**" + name + "** iniciado con " + tools.length + " tools");
      } else {
        appendChat("system", "Configurado pero no arranco: " + startResult.error);
      }
    } else {
      appendChat("system", "Error: " + result.error);
    }
    return;
  }

  if (subcmd === "remove") {
    const name = parts[2];
    if (!name) { appendChat("system", "Uso: /mcp remove <name>"); return; }
    const ok = await state.mcpClient.removeServer(name);
    appendChat("system", ok ? name + " eliminado" : "No existe: " + name);
    return;
  }

  if (subcmd === "tools") {
    const name = parts[2];
    if (!name) { appendChat("system", "Uso: /mcp tools <name>"); return; }
    const tools = state.mcpClient.listTools(name);
    if (!tools.length) { appendChat("system", "Sin tools en " + name); return; }
    let out = "## Tools de " + name + "\n\n";
    tools.forEach(t => { out += "- **" + t.name + "**: " + (t.description || "") + "\n"; });
    appendChat("assistant", out);
    return;
  }

  appendChat("system", "Comandos MCP:\n/mcp list\n/mcp add <name> <cmd> [args...]\n/mcp remove <name>\n/mcp tools <name>");
}

async function handleSkillsCommand(text) {
  const parts = text.split(/\s+/);
  const subcmd = parts[1];

  if (subcmd === "list" || !subcmd) {
    const installed = state.skillsInstaller.list();
    if (!installed.length) {
      appendChat("system",
        "No hay skills instaladas por el usuario.\n\n" +
        "Tengo " + Object.keys(SKILLS_REGISTRY).length + " skills internas activas.\n\n" +
        "Para instalar mas: pegame una URL de repo con una skill y di 'instalala'."
      );
      return;
    }
    let out = "## Skills instaladas (" + installed.length + ")\n\n";
    installed.forEach(s => {
      out += "- **" + s.name + "** (`" + s.id + "`)\n";
      if (s.description) out += "  " + s.description + "\n";
      if (s.author) out += "  Autor: " + s.author + "\n";
    });
    appendChat("assistant", out);
    return;
  }

  if (subcmd === "uninstall") {
    const id = parts[2];
    if (!id) { appendChat("system", "Uso: /skills uninstall <id>"); return; }
    const ok = state.skillsInstaller.uninstall(id);
    appendChat("system", ok ? "Desinstalada: " + id : "No existe: " + id);
    updateSkillsStatus();
    return;
  }

  if (subcmd === "verify") {
    const id = parts[2];
    if (!id) { appendChat("system", "Uso: /skills verify <id>"); return; }
    const r = await state.skillsInstaller.verify(id);
    appendChat("system", r.ok ? id + " OK" : id + ": " + (r.error || r.status));
    return;
  }

  appendChat("system", "Comandos skills:\n/skills list\n/skills uninstall <id>\n/skills verify <id>");
}

function updateSkillsStatus() {
  const inst = state.skillsInstaller ? state.skillsInstaller.list() : [];
  termWrite("Skills instaladas: " + inst.length + " | internas: " + Object.keys(SKILLS_REGISTRY).length, "dim");
}

async function runDeepAnalysis() {
  if (!state.codeAnalyzer) {
    appendChat("system", "CodeAnalyzer no esta listo");
    return;
  }

  if (!state.activeProvider || !state.activeModel || !state.activeModel.key) {
    appendChat("system", "Necesitas un modelo activo para el analisis");
    return;
  }

  state.codeAnalyzer.provider = state.activeProvider;
  state.codeAnalyzer.model = state.activeModel;

  appendChat("user", "[ANALISIS PROFUNDO DE CODIGO]");
  if (state.liveView) state.liveView.focus();

  const result = await state.codeAnalyzer.analyzeProject();

  if (!result.ok) {
    appendChat("system", "No se pudo analizar: " + result.error);
    return;
  }

  let md = "## Analisis profundo completado\n\n";
  md += "**Archivos analizados:** " + state.codeAnalyzer.report.length + "\n";
  md += "**Issues detectados:** " + result.totalIssues + "\n";
  md += "**Errores criticos:** " + result.errors + "\n\n";

  if (result.totalIssues > 0) {
    md += "### Top archivos con issues\n\n";
    const top = state.codeAnalyzer.report
      .filter(r => r.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 10);
    top.forEach(r => {
      md += "**" + r.path + "** (" + r.issues.length + ")\n";
      r.issues.slice(0, 3).forEach(i => {
        const icon = i.severity === "error" ? "[E]" : i.severity === "warn" ? "[W]" : "[i]";
        md += "  " + icon + " " + i.message + "\n";
      });
      md += "\n";
    });
    md += "\nEjecuta `/fix` para generar correcciones automaticas.";
  } else {
    md += "El proyecto esta en buen estado.";
  }

  appendChat("assistant", md);
}

async function runAutoFix() {
  if (!state.codeAnalyzer) {
    appendChat("system", "CodeAnalyzer no esta listo");
    return;
  }
  if (!state.codeAnalyzer.report.length) {
    appendChat("system", "Primero ejecuta `/analyze` para detectar issues.");
    return;
  }
  if (!state.activeProvider || !state.activeModel || !state.activeModel.key) {
    appendChat("system", "Necesitas un modelo activo");
    return;
  }

  state.codeAnalyzer.provider = state.activeProvider;
  state.codeAnalyzer.model = state.activeModel;

  appendChat("user", "[AUTO-FIX]");
  if (state.liveView) state.liveView.focus();

  const result = await state.codeAnalyzer.autoFix(10);

  if (!result.fixed.length) {
    appendChat("assistant", "No hubo cambios que proponer.");
  } else {
    let md = "## Auto-fix completado\n\n";
    md += "**Archivos con propuestas:** " + result.fixed.length + "\n\n";
    result.fixed.forEach(f => {
      md += "- `" + f.path + "` (" + f.before + " -> " + f.after + " bytes)\n";
    });
    md += "\nRevisa los cambios en el explorador y acepta los que quieras.";
    appendChat("assistant", md);
  }
}

async function runProjectTests() {
  if (!state.liveView) return { ok: true, tests: [] };
  const lv = state.liveView;
  const tests = [
    { name: "Balance de llaves", fn: () => testBalance() },
    { name: "Sin errores de sintaxis", fn: () => testSyntax() },
    { name: "HTML tiene viewport", fn: () => testHtmlViewport() },
    { name: "CSS sin llaves rotas", fn: () => testCssBraces() },
    { name: "Sin console.log olvidados", fn: () => testNoConsoleLog() }
  ];
  lv.testsStart(tests.length);
  for (const t of tests) {
    await new Promise(r => setTimeout(r, 200));
    const result = await t.fn();
    lv.testsAddResult(t.name, result.ok, result.detail);
  }
  lv.testsFinish();
  return { ok: true };
}

function testBalance() {
  const files = Object.keys(state.projectFiles || {});
  for (const p of files) {
    if (!/\.(js|ts|jsx|tsx)$/.test(p)) continue;
    const c = state.projectFiles[p];
    let d = 0;
    for (const ch of c) {
      if (ch === "{") d++;
      if (ch === "}") d--;
      if (d < 0) return { ok: false, detail: p };
    }
    if (d !== 0) return { ok: false, detail: p };
  }
  return { ok: true, detail: "todos los archivos" };
}

function testSyntax() {
  const files = Object.keys(state.projectFiles || {});
  for (const p of files) {
    if (!/\.(js|jsx)$/.test(p)) continue;
    try { new Function(state.projectFiles[p]); }
    catch (e) { return { ok: false, detail: p + ": " + e.message.slice(0, 50) }; }
  }
  return { ok: true, detail: "JS parseable" };
}

function testHtmlViewport() {
  const files = Object.keys(state.projectFiles || {});
  const htmls = files.filter(p => /\.(html|htm)$/i.test(p));
  if (!htmls.length) return { ok: true, detail: "sin HTML" };
  for (const p of htmls) {
    if (!/viewport/i.test(state.projectFiles[p])) return { ok: false, detail: p + " falta viewport" };
  }
  return { ok: true, detail: htmls.length + " HTML OK" };
}

function testCssBraces() {
  const files = Object.keys(state.projectFiles || {});
  const css = files.filter(p => /\.(css|scss|less)$/i.test(p));
  if (!css.length) return { ok: true, detail: "sin CSS" };
  for (const p of css) {
    const c = state.projectFiles[p];
    let d = 0;
    for (const ch of c) {
      if (ch === "{") d++;
      if (ch === "}") d--;
      if (d < 0) return { ok: false, detail: p };
    }
    if (d !== 0) return { ok: false, detail: p };
  }
  return { ok: true, detail: css.length + " CSS OK" };
}

function testNoConsoleLog() {
  const files = Object.keys(state.projectFiles || {});
  for (const p of files) {
    if (!/\.(js|jsx|ts|tsx)$/.test(p)) continue;
    const count = (state.projectFiles[p].match(/console\.log/g) || []).length;
    if (count > 5) return { ok: false, detail: p + " (" + count + " logs)" };
  }
  return { ok: true, detail: "pocos logs" };
}

async function runCurrentProject() {
  if (!state.projectRunner) { showAlert("Project Runner no esta listo"); return; }
  if (!state.diskFolder) { showAlert("Abre una carpeta con Carpeta primero", "Sin proyecto"); return; }

  const stack = await state.projectRunner.detectStack();
  if (!stack) { showAlert("No se pudo detectar el stack del proyecto"); return; }

  termWrite("");
  termWrite("---------------------------------------------", "head");
  termWrite("  EJECUTAR PROYECTO", "head");
  termWrite("  Stack: " + stack.type, "head");
  termWrite("  Comando: " + (stack.run || "(no detectado)"), "head");
  termWrite("---------------------------------------------", "head");

  if (!stack.run) {
    const entry = ["index.html", "public/index.html"].find(p => state.projectFiles[p]);
    if (entry) previewProject();
    else showAlert("Proyecto estatico. No hay comando que ejecutar.\nAbre index.html para verlo.");
    return;
  }

  switchMainTab("terminal");
  if (state.activeTermTab !== "shell") switchTermTab("shell");
  await new Promise(r => setTimeout(r, 700));
  const r = await state.projectRunner.run(stack.run);

  if (r.ok) {
    appendChat("system", "Proyecto ejecutandose:\n`" + stack.run + "`\n\nRevisa la pestana Shell para ver el output.");
    setTimeout(() => {
      const portMatch = stack.run.match(/(\d{4,5})/);
      const port = portMatch ? portMatch[1] : "3000";
      document.getElementById("br-url").value = "http://localhost:" + port;
      switchMainTab("browser");
      document.getElementById("browser-frame").src = "http://localhost:" + port;
    }, 3000);
  }
}

function toggleAutopilotMode() {
  if (!state.autopilot) return;
  const mode = state.autopilot.toggle();
  updateAutoButtonUI();
  appendChat("system",
    mode === "auto"
      ? "**Modo AUTOMATICO activado** - el agente aplica cambios directamente al disco sin pedir aprobacion."
      : "**Modo REVISAR activado** - el agente propone cambios que tu apruebas uno por uno."
  );
}

function updateAutoButtonUI() {
  const btn = document.getElementById("btn-auto-toggle");
  if (!btn || !state.autopilot) return;
  if (state.autopilot.isAuto()) {
    btn.classList.add("auto-mode");
    btn.innerHTML = "&#9997; AUTO";
    btn.title = "Modo automatico: aplica cambios directo";
  } else {
    btn.classList.remove("auto-mode");
    btn.innerHTML = "&#9997; Revisar";
    btn.title = "Modo revisar: aprueba los cambios uno por uno";
  }
}

async function cloneRealRepo() {
  if (!state.gitReal) { showAlert("Git Real no esta listo"); return; }
  if (!state.diskFolder) { showAlert("Abre una carpeta destino con Carpeta primero", "Sin destino"); return; }

  const url = await showPrompt("URL del repositorio a clonar:", "https://github.com/usuario/repo");
  if (!url) return;

  switchMainTab("terminal");
  if (state.activeTermTab !== "shell") switchTermTab("shell");
  appendChat("user", "[CLONAR REPO] " + url);

  const r = await state.gitReal.clone(url);
  if (r.ok) {
    appendChat("assistant",
      "## Repositorio clonado\n\n" +
      "**URL:** " + url + "\n" +
      "**Destino:** `" + r.path + "`\n\n" +
      "Ahora puedes abrirlo con Carpeta o pedirle al agente que lo analice."
    );
    if (state.diskFolder) await refreshDiskFolder();
  } else {
    appendChat("system", "Error al clonar: " + r.error);
  }
}

async function openFileAtLine(path, line) {
  try {
    if (state.diskFolder && Desktop.isDesktop() && (path.includes(":") || path.includes("\\"))) {
      await openDiskFile(path);
    } else {
      showProjectFile(path);
    }
    if (state.editor && line) {
      state.editor.revealLineInCenter(line);
      state.editor.setPosition({ lineNumber: line, column: 1 });
      state.editor.focus();
    }
  } catch (e) { console.warn("openFileAtLine error:", e); }
}

function registerAllCommands() {
  const cp = state.commandPalette;
  if (!cp) return;

  cp.register("providers.open", "Abrir Proveedores", "API keys de modelos", () => document.getElementById("btn-providers").click());
  cp.register("permissions.open", "Abrir Permisos", "del agente", () => document.getElementById("btn-perms").click());
  cp.register("cache.open", "Abrir Cache", "tokens ahorrados", () => document.getElementById("btn-cache").click());
  cp.register("memory.open", "Abrir Memoria", "persistente", () => document.getElementById("btn-memory").click());
  cp.register("skills.open", "Abrir Skills", "instaladas + internas", () => document.getElementById("btn-skills").click());
  cp.register("problems.open", "Ver Problemas", "errores detectados", () => state.problemsPanel && state.problemsPanel.toggle());
  cp.register("suggestions.open", "Ver Sugerencias", "proactivas", openSuggestionsModal);
  cp.register("folder.open", "Abrir Carpeta", "proyecto del disco", () => document.getElementById("btn-open-folder").click());
  cp.register("repo.clone", "Clonar Repositorio", "git clone real", cloneRealRepo);
  cp.register("repo.load", "Cargar Repo (memoria)", "sin clonar", () => document.getElementById("btn-load-repo").click());
  cp.register("zip.download", "Descargar ZIP", "del proyecto actual", () => document.getElementById("btn-download-project").click());
  cp.register("new.project", "Nuevo Proyecto", "desde template", openNewProjectModal);
  cp.register("run.project", "Ejecutar Proyecto", "detecta stack", runCurrentProject);
  cp.register("run.install", "Instalar Dependencias", "npm/pip/cargo install", async () => {
    if (state.projectRunner) await state.projectRunner.installDeps();
  });
  cp.register("mode.toggle", "Alternar Chat/Agent", "modo actual", () => document.getElementById("btn-mode-toggle").click());
  cp.register("autopilot.toggle", "Alternar Auto/Revisar", "modo de aplicacion", toggleAutopilotMode);
  cp.register("publish.all", "Publicar Todo", "commit + push + deploy", publishAll);
  cp.register("rag.index", "Indexar RAG", "busqueda semantica", () => document.getElementById("btn-rag").click());
  cp.register("lsp.start", "Iniciar LSP", "intellisense", () => document.getElementById("btn-lsp").click());
  cp.register("analysis.deep", "Analizar Codigo Profundo", "archivo por archivo", runDeepAnalysis);
  cp.register("analysis.fix", "Auto-Fix", "corregir proyectos danados", runAutoFix);
  cp.register("tests.run", "Ejecutar Tests", "verificacion", async () => {
    if (state.liveView) state.liveView.focus();
    await runProjectTests();
  });
  cp.register("mcp.catalog", "MCP: Catalogo", "servidores disponibles", openMcpCatalogModal);
  cp.register("search.global", "Buscar en Proyecto", "Ctrl+Shift+F", () => state.globalSearch && state.globalSearch.open());
  cp.register("update.check", "Actualizar IDE", "recarga limpia", runRealUpdate);
  cp.register("connections.open", "Conexiones", "GitHub/Vercel/Supabase", openConnectionsModal);
  cp.register("suggestions.analyze", "Analizar Sugerencias", "proactivas", () => state.proactive && state.proactive.analyze());
}

function openSuggestionsModal() {
  const el = document.getElementById("modal-custom");
  if (!el) { showAlert("Modal no inicializado"); return; }
  if (state.proactive) state.proactive.analyze();

  const suggestions = state.proactive ? state.proactive.list() : [];
  el.classList.remove("hidden");
  el.querySelector("#custom-title").textContent = "Sugerencias proactivas";

  if (!suggestions.length) {
    el.querySelector("#custom-body").innerHTML =
      '<div style="padding:30px;text-align:center;color:var(--text-mute)">Sin sugerencias por ahora. Todo en orden.</div>';
  } else {
    let html = '<div style="display:flex;flex-direction:column;gap:8px">';
    suggestions.forEach(s => {
      const cls = s.severity === "error" ? "error" : s.severity === "warn" ? "warn" : "";
      html += '<div class="suggestion-card ' + cls + '">' +
        '<div class="sc-head">' +
          '<span>' + (s.severity === "error" ? "[E]" : s.severity === "warn" ? "[W]" : "[i]") + '</span>' +
          '<span>' + escapeHtml(s.message) + '</span>' +
        '</div>' +
        '<div class="sc-actions">' +
          '<button class="sc-btn primary" data-act="' + s.action + '" data-key="' + s.key + '">' + escapeHtml(actionLabel(s.action)) + '</button>' +
          '<button class="sc-btn sc-dismiss" data-dismiss="' + s.key + '">x</button>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    el.querySelector("#custom-body").innerHTML = html;

    el.querySelectorAll("[data-act]").forEach(b => {
      b.onclick = () => {
        handleSuggestionAction(b.dataset.act);
        if (state.proactive) state.proactive.dismiss(b.dataset.key);
        el.classList.add("hidden");
      };
    });
    el.querySelectorAll("[data-dismiss]").forEach(b => {
      b.onclick = () => {
        if (state.proactive) state.proactive.dismiss(b.dataset.dismiss);
        b.parentElement.parentElement.remove();
      };
    });
  }

  const actions = el.querySelector("#custom-actions");
  actions.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "btn ghost";
  btn.textContent = "Cerrar";
  btn.onclick = () => el.classList.add("hidden");
  actions.appendChild(btn);
}

function actionLabel(action) {
  const labels = {
    "open-providers": "Abrir Proveedores",
    "open-folder": "Abrir Carpeta",
    "index-rag": "Indexar Ahora",
    "review-pending": "Revisar Cambios",
    "toggle-autopilot": "Activar AUTO",
    "open-connections": "Conexiones",
    "generar-tests": "Generar Tests",
    "refactor": "Refactorizar",
    "crear-readme": "Crear README",
    "crear-gitignore": "Crear .gitignore",
    "organize": "Organizar Archivos"
  };
  return labels[action] || "Hacerlo";
}

function handleSuggestionAction(action) {
  switch (action) {
    case "open-providers":   document.getElementById("btn-providers").click(); break;
    case "open-folder":      document.getElementById("btn-open-folder").click(); break;
    case "index-rag":        document.getElementById("btn-rag").click(); break;
    case "review-pending":   document.getElementById("pending-accept-all")?.click(); break;
    case "toggle-autopilot": toggleAutopilotMode(); break;
    case "open-connections": openConnectionsModal(); break;
    case "generar-tests":
      document.getElementById("chat-input").value = "Genera tests para el proyecto";
      runAgentFromInput(); break;
    case "refactor":
      document.getElementById("chat-input").value = "Refactoriza los archivos grandes";
      runAgentFromInput(); break;
    case "crear-readme":
      document.getElementById("chat-input").value = "Crea un README.md completo";
      runAgentFromInput(); break;
    case "crear-gitignore":
      document.getElementById("chat-input").value = "Crea un .gitignore apropiado";
      runAgentFromInput(); break;
    case "organize":
      document.getElementById("chat-input").value = "Reorganiza los archivos sueltos";
      runAgentFromInput(); break;
  }
}

function renderSuggestion(suggestion) {
  document.querySelectorAll(".suggestion-card.toast-float").forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = "suggestion-card toast-float " + (suggestion.severity === "warn" ? "warn" : suggestion.severity === "error" ? "error" : "");
  toast.innerHTML =
    '<div class="sc-head">' +
      '<span>' + (suggestion.severity === "error" ? "[E]" : suggestion.severity === "warn" ? "[W]" : "[i]") + '</span>' +
      '<span>' + escapeHtml(suggestion.message) + '</span>' +
      '<button class="sc-dismiss">x</button>' +
    '</div>' +
    '<div class="sc-actions">' +
      '<button class="sc-btn primary" data-act="' + suggestion.action + '">' + escapeHtml(actionLabel(suggestion.action)) + '</button>' +
    '</div>';
  document.body.appendChild(toast);

  toast.querySelector(".sc-dismiss").onclick = () => toast.remove();
  toast.querySelector("[data-act]").onclick = () => {
    handleSuggestionAction(suggestion.action);
    if (state.proactive) state.proactive.dismiss(suggestion.key);
    toast.remove();
  };
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 7000);
}

function openMcpCatalogModal() {
  const el = document.getElementById("modal-custom");
  if (!el) { showAlert("Modal no inicializado"); return; }
  el.classList.remove("hidden");
  el.querySelector("#custom-title").textContent = "Catalogo MCP";

  let html = '<p class="hint" style="margin-bottom:14px">Servidores MCP listos para conectar.</p>';
  html += '<div style="max-height:420px;overflow-y:auto">';
  MCP_CATALOG.forEach(m => {
    html +=
      '<div class="mcp-catalog-item" data-id="' + m.id + '">' +
        '<div class="mci-icon">' + m.icon + '</div>' +
        '<div style="flex:1">' +
          '<div class="mci-name">' + escapeHtml(m.name) + '</div>' +
          '<div class="mci-desc">' + escapeHtml(m.description) + '</div>' +
        '</div>' +
        '<button class="mci-btn">Instalar</button>' +
      '</div>';
  });
  html += '</div>';

  el.querySelector("#custom-body").innerHTML = html;

  el.querySelectorAll(".mcp-catalog-item").forEach(item => {
    item.querySelector(".mci-btn").onclick = async () => {
      const id = item.dataset.id;
      const m = MCP_CATALOG.find(x => x.id === id);
      if (!m) return;

      let args = m.args.slice();
      if (m.requiresArg) {
        const val = await showPrompt("Valor para " + m.requiresArg + ":", "");
        if (!val) return;
        args[args.length - 1] = val;
      }

      const r = await state.mcpClient.addServer({ name: m.id, command: m.command, args });
      if (r.ok) {
        const sr = await state.mcpClient.startServer(m.id);
        if (sr.ok) {
          showAlert(m.name + " conectado con " + state.mcpClient.listTools(m.id).length + " tools");
        } else {
          showAlert("Configurado pero no arranco: " + sr.error);
        }
      } else {
        showAlert(r.error);
      }
    };
  });

  const actions = el.querySelector("#custom-actions");
  actions.innerHTML = "";
  const b1 = document.createElement("button");
  b1.className = "btn ghost";
  b1.textContent = "Agregar custom";
  b1.onclick = () => {
    el.classList.add("hidden");
    document.getElementById("chat-input").value = "/mcp add ";
    document.getElementById("chat-input").focus();
  };
  const b2 = document.createElement("button");
  b2.className = "btn ghost";
  b2.textContent = "Cerrar";
  b2.onclick = () => el.classList.add("hidden");
  actions.appendChild(b1);
  actions.appendChild(b2);
}

window.__gafOpenFileAtLine = openFileAtLine;

async function boot() {
  try {
    installGlobalDialogs();
    initTerminal();
    initMonaco().catch(e => console.warn("[Monaco] Init async:", e));
    initTools();

    try {
      state.pendingDiffs = new PendingDiffs({
        state, log, termWrite,
        onNotify: () => { updatePendingBar(); renderFileTree(); }
      });
    } catch (e) { console.warn("PendingDiffs init error:", e); }

    try {
      state.rag = new RAG({ state, log, termWrite });
      const loaded = state.rag.loadIndex();
      if (loaded) termWrite("RAG: indice cargado (" + state.rag.index.length + " chunks)", "dim");
    } catch (e) { console.warn("RAG init error:", e); }

    try {
      state.lsp = new LspClient({ state, log, termWrite, editor: null, onDiagnostics: () => {} });
      termWrite("LSP: cliente listo", "dim");
    } catch (e) { console.warn("LSP init error:", e); }

    try {
      state.agentMemory = new AgentMemory();
      const ms = state.agentMemory.getStats();
      termWrite("Memoria compartida: " + ms.facts + " hechos, " + ms.decisions + " decisiones", "dim");
    } catch (e) { console.warn("AgentMemory init error:", e); }

    try {
      state.patterns = new UserPatterns();
      termWrite("Patrones de usuario cargados", "dim");
    } catch (e) { console.warn("UserPatterns init error:", e); }

    try {
      state.problemsPanel = new ProblemsPanel({ log, onOpen: (path, line) => openFileAtLine(path, line) });
      state.problemsPanel.init();
      termWrite("Problems Panel listo", "dim");
    } catch (e) { console.warn("ProblemsPanel init error:", e); }

    try {
      state.proactive = new ProactiveEngine({ state, log, termWrite, live: null });
      state.proactive.onSuggestion = (s) => renderSuggestion(s);
      termWrite("Proactive Engine listo", "dim");
    } catch (e) { console.warn("ProactiveEngine init error:", e); }

    try {
      state.projectWatcher = new ProjectWatcher({ state, log });
      state.projectWatcher.on("opportunity", (opp) => {
        if (state.proactive) state.proactive.push(opp);
      });
      termWrite("Project Watcher listo", "dim");
    } catch (e) { console.warn("ProjectWatcher init error:", e); }

    try {
      state.commandPalette = new CommandPalette({ log });
      state.commandPalette.init();
      registerAllCommands();
      termWrite("Command Palette listo (Ctrl+Shift+P)", "dim");
    } catch (e) { console.warn("CommandPalette init error:", e); }

    try {
      state.globalSearch = new GlobalSearch({ state, log });
      state.globalSearch.init();
      termWrite("Global Search listo (Ctrl+Shift+F)", "dim");
    } catch (e) { console.warn("GlobalSearch init error:", e); }

    try {
      state.projectRunner = new ProjectRunner({ state, log, termWrite });
      termWrite("Project Runner listo", "dim");
    } catch (e) { console.warn("ProjectRunner init error:", e); }

    try {
      state.gitReal = new GitReal({ state, log, termWrite });
      termWrite("Git Real listo", "dim");
    } catch (e) { console.warn("GitReal init error:", e); }

    try {
      state.autopilot = new AgentAutopilot({ state, log, termWrite, live: null });
      if (state.autopilot) state.autopilot.mode = "auto"; // v32: AUTO por defecto
      termWrite("Autopilot en modo: " + state.autopilot.mode.toUpperCase(), "dim");
    } catch (e) { console.warn("Autopilot init error:", e); }

    try {
      state.liveView = new LiveView({ log });
      termWrite("Live View listo", "dim");
      if (state.autopilot) state.autopilot.live = state.liveView;
      if (state.proactive) state.proactive.live = state.liveView;
    } catch (e) { console.warn("LiveView init error:", e); }

    try {
      state.codeAnalyzer = new CodeAnalyzer({
        state, log, termWrite,
        live: state.liveView,
        provider: state.activeProvider,
        model: state.activeModel
      });
      termWrite("Code Analyzer listo", "dim");
    } catch (e) { console.warn("CodeAnalyzer init error:", e); }

    try {
      state.skillsInstaller = new SkillsInstaller({ log, termWrite });
      const inst = state.skillsInstaller.list();
      termWrite("Skills instaladas: " + inst.length, "dim");
    } catch (e) { console.warn("SkillsInstaller init error:", e); }

    try {
      state.mcpClient = new McpClient({ log, termWrite, tauri });
      const servers = state.mcpClient.list();
      termWrite("MCP servers configurados: " + servers.length, "dim");
    } catch (e) { console.warn("McpClient init error:", e); }

    try {
      state.agentBrain = new AgentBrain({
        skillsInstaller: state.skillsInstaller,
        mcpClient: state.mcpClient,
        memory: state.agentMemory,
        log,
        termWrite
      });
      termWrite("Cerebro listo (" + Object.keys(SKILLS_REGISTRY).length + " skills internas)", "dim");
    } catch (e) { console.warn("AgentBrain init error:", e); }

    // ─────────────────────────────────────────────────────────
    //  CONVERSACIONES POR PROYECTO
    //  Ya NO restauramos conversación global al arrancar.
    //  La conversación se carga solo al abrir un proyecto.
    // ─────────────────────────────────────────────────────────
    try {
      state.conversation = new ConversationManager();
      termWrite("Conversaciones por proyecto: listo", "dim");
    } catch (e) { console.warn("Conversation init error:", e); }

    recoverKeysFromStorage();
    ensureDefaultPerms();

    bindUI();

    // v48: adaptar UI segun modo (web vs desktop)
    (function applyWebMode() {
      const isWeb = (typeof Desktop !== "undefined") && !Desktop.isDesktop();
      if (!isWeb) return;

      const hideIds = [
        "btn-open-folder",
        "btn-new-project",
        "btn-clone-real",
        "btn-load-repo",
        "btn-save-file",
        "btn-update",
        "btn-open-terminal",
        "btn-refresh-disk",
        "btn-close-disk",
        "btn-download-project"
      ];
      hideIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });

      const termTab = document.querySelector('.main-tabs .tab[data-view="terminal"]');
      if (termTab) termTab.style.display = "none";

      const btnPublish = document.getElementById("btn-publish");
      if (btnPublish) {
        btnPublish.innerHTML = "&#11015;&#65039; Descargar ZIP";
        btnPublish.title = "Descargar el proyecto como ZIP";
        btnPublish.onclick = (e) => {
          e.preventDefault();
          if (typeof openDownloadModal === "function") {
            openDownloadModal();
          } else {
            alert("Funcion de descarga no disponible.");
          }
        };
        btnPublish.style.background = "linear-gradient(135deg, #7c5cff, #a673ff)";
      }

      setTimeout(() => {
        try { termWrite("Modo Web: proyecto se puede descargar con 'Descargar ZIP'. Terminal, carpetas y git real estan en el .exe.", "dim"); } catch (_) {}
      }, 500);

      console.log("[v48] UI adaptada a modo web");
    })();

    // v48: adaptar UI segun modo (web vs desktop)
    (function applyWebMode() {
      const isWeb = (typeof Desktop !== "undefined") && !Desktop.isDesktop();
      if (!isWeb) return;

      // 1) Ocultar botones que NO funcionan en web (requieren filesystem/OS)
      const hideIds = [
        "btn-open-folder",       // abrir carpeta del disco
        "btn-new-project",       // nuevo proyecto desde template
        "btn-clone-real",        // git clone real
        "btn-load-repo",         // cargar repo GitHub
        "btn-save-file",         // guardar archivo al disco
        "btn-update",            // updater Tauri
        "btn-open-terminal",     // terminal nativa
        "btn-refresh-disk",      // recargar carpeta
        "btn-close-disk",        // cerrar carpeta
        "btn-download-project"   // (lo movemos al boton Publicar)
      ];
      hideIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });

      // 2) Ocultar la pestana "Terminal" del panel central
      const termTab = document.querySelector('.main-tabs .tab[data-view="terminal"]');
      if (termTab) termTab.style.display = "none";

      // 3) Transformar el boton Publicar en "Descargar ZIP"
      const btnPublish = document.getElementById("btn-publish");
      if (btnPublish) {
        btnPublish.innerHTML = "&#11015;&#65039; Descargar ZIP";
        btnPublish.title = "Descargar el proyecto como ZIP";
        btnPublish.onclick = (e) => {
          e.preventDefault();
          if (typeof openDownloadModal === "function") {
            openDownloadModal();
          } else {
            alert("Funcion de descarga no disponible.");
          }
        };
        btnPublish.style.background = "linear-gradient(135deg, #7c5cff, #a673ff)";
      }

      // 4) Aviso al usuario
      setTimeout(() => {
        try { termWrite("Modo Web: proyecto se puede descargar con 'Descargar ZIP'. Terminal, carpetas y git real estan en el .exe.", "dim"); } catch (_) {}
      }, 500);

      console.log("[v48] UI adaptada a modo web");
    })();
    setMode(state.mode);

    try {
      const chatInputEl = document.getElementById("chat-input");
      if (chatInputEl) {
        state.mentions = new Mentions({ state, textarea: chatInputEl, log, fetchUrl, stripHtml });
        state.mentions.init();
        termWrite("Mentions (@) listo en Chat", "dim");
      }
    } catch (e) { console.warn("Mentions init error:", e); }

    const fixBtn = document.getElementById("term-fix-error");
    if (fixBtn) {
      fixBtn.onclick = () => {
        const errorText = state.lastTerminalError || "Error no especificado en la terminal";
        const chatInput = document.getElementById("chat-input");
        if (chatInput) {
          chatInput.value = `Repara este error que ocurrió en la terminal:\n\n\`\`\`\n${errorText}\n\`\`\``;
          fixBtn.style.display = "none";
          fixBtn.classList.add("hidden");
          const btnSend = document.getElementById("chat-send");
          if (btnSend) btnSend.click();
        }
      };
    }

    const undoBtn = document.getElementById("btn-undo-agent");
    if (undoBtn) {
      undoBtn.onclick = async () => {
        if (!state.checkpointHistory || !state.checkpointHistory.length) {
          alert("No hay cambios guardados del agente para revertir.");
          return;
        }
        const last = state.checkpointHistory.pop();
        if (!last) return;
        try {
          if (last.diskPath && typeof tauri !== "undefined" && tauri.writeFile) {
            await tauri.writeFile(last.diskPath, last.originalContent);
          }
          if (state.projectFiles) {
            state.projectFiles[last.path] = last.originalContent;
          }
          if (state.currentDiskFile && state.currentDiskFile.endsWith(last.path) && state.editor) {
            state.editor.setValue(last.originalContent);
          }
          if (typeof renderFileTree === "function") renderFileTree();
          appendChat("system", `⏪ **Cambio revertido:** Se restauró \`${last.path}\` a su estado anterior.`);
          termWrite(`✓ Revertido: ${last.path}`, "success");
        } catch (e) {
          alert("Error al revertir: " + e.message);
        }
      };
    }

    updateProjectBar();
    updatePendingBar();
    renderFileTree();
    renderAgentLiveStatus();

    // v38: restaurar modelo guardado
    try {
      const savedModel = localStorage.getItem("gafcoreai_active_model");
      if (savedModel) {
        const parsed = JSON.parse(savedModel);
        if (parsed && parsed.providerId) {
          const prov = state.providers.find(p => p.id === parsed.providerId);
          if (prov) {
            state.activeProvider = prov;
            state.activeModel = { id: parsed.id, key: parsed.key || "" };
            termWrite("\u21BA Modelo restaurado: " + prov.name + " / " + parsed.id, "dim");
          }
        }
      }
    } catch (_) {}

    refreshModelSelect();
    updateCacheStats();
    updateAutoButtonUI();
    updateRagStatus();
    updateLspStatus();

    if (state.repo) {
      document.getElementById("repo-name").textContent = state.repo.owner + "/" + state.repo.name + " (" + state.repo.tree.length + ")";
      document.getElementById("repo-bar").classList.remove("hidden");
    }

    updateConnStatus();

    try {
      state.mentions = new Mentions({
        state, textarea: document.getElementById("chat-input"), log, fetchUrl, stripHtml
      });
      state.mentions.init();
    } catch (e) { console.warn("Mentions init error:", e); }

    try {
      const btnCfg = document.getElementById("btn-config");
      if (btnCfg) {
        btnCfg.onclick = () => {
          const m = document.getElementById("modal-config");
          if (m) m.classList.remove("hidden");
        };
      }
      document.querySelectorAll("[data-close='modal-config']").forEach(el => {
        el.onclick = () => {
          const m = document.getElementById("modal-config");
          if (m) m.classList.add("hidden");
        };
      });
      const linkAndOpen = (btnId, hiddenId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.onclick = () => {
          const m = document.getElementById("modal-config");
          if (m) m.classList.add("hidden");
          const hidden = document.getElementById(hiddenId);
          if (hidden) hidden.click();
        };
      };
      linkAndOpen("cfg-open-perms", "btn-perms");
      linkAndOpen("cfg-open-cache", "btn-cache");
      linkAndOpen("cfg-open-memory", "btn-memory");
      linkAndOpen("cfg-open-connections", "btn-connections");

      const CFG_STORE_KEY = "gafcoreai_config_switches";
      const loadCfgSwitches = () => {
        try {
          const raw = localStorage.getItem(CFG_STORE_KEY);
          return raw ? JSON.parse(raw) : { rag: true, lsp: true, ghost: false, updater: true };
        } catch (e) {
          return { rag: true, lsp: true, ghost: false, updater: true };
        }
      };
      const cfgSwitches = loadCfgSwitches();
      const bindCfgSwitch = (id, key, onChange) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = !!cfgSwitches[key];
        el.onchange = () => {
          cfgSwitches[key] = el.checked;
          try { localStorage.setItem(CFG_STORE_KEY, JSON.stringify(cfgSwitches)); } catch (e) {}
          if (onChange) onChange(el.checked);
        };
      };
      bindCfgSwitch("cfg-rag", "rag", (val) => {
        const btnRag = document.getElementById("btn-rag");
        if (btnRag) btnRag.style.display = val ? "" : "none";
      });
      bindCfgSwitch("cfg-lsp", "lsp", (val) => {
        const btnLsp = document.getElementById("btn-lsp");
        if (btnLsp) btnLsp.style.display = val ? "" : "none";
      });
      bindCfgSwitch("cfg-ghost", "ghost", (val) => {
        const chk = document.getElementById("ghost-enabled");
        if (chk) { chk.checked = val; chk.dispatchEvent(new Event("change")); }
      });
      bindCfgSwitch("cfg-updater", "updater", () => {});
    } catch (e) { console.warn("[config] init error:", e); }

    termWrite("", "normal");
    termWrite("=============================================", "head");
    termWrite("  GafCoreAI v31 - Conversaciones por Proyecto", "head");
    termWrite("=============================================", "head");
    termWrite("", "normal");
    if (Desktop.isDesktop()) {
      termWrite("Modo ESCRITORIO activo", "success");
    } else {
      termWrite("Modo WEB", "dim");
    }
    const nFiles = Object.keys(state.projectFiles || {}).length;
    if (nFiles) termWrite("Proyecto con " + nFiles + " archivos aceptados", "dim");
    if (state.rag && state.rag.indexed) termWrite("RAG: " + state.rag.index.length + " chunks", "success");
    termWrite("", "normal");

    if (state.projectWatcher && state.diskFolder) state.projectWatcher.start(45000);

    try {
      if (state.memoryManager) {
        const brief = state.memoryManager.getProjectBrief();
        if (brief && brief !== "(sin proyecto activo)") {
          termWrite("", "normal");
          termWrite("--- BRIEF DEL PROYECTO ---", "head");
          brief.split("\n").forEach(l => termWrite("  " + l, "dim"));
          termWrite("--------------------------", "head");
          termWrite("", "normal");
        }
      }
    } catch (e) {}

function printToolReport() {
  termWrite("", "normal");
  termWrite("========= ESTADO DE HERRAMIENTAS =========", "head");

  if (state.memoryManager) {
    const s = state.memoryManager.getStats();
    termWrite("Memoria v2:      ACTIVA", "success");
    termWrite("  Proyecto: " + s.project + " | Bloques: " + s.blocks + " | Hechos: " + s.facts, "dim");
    termWrite("  Archivos: " + s.files + " | Tamaño: " + s.sizeKB + " KB", "dim");
  } else {
    termWrite("Memoria v2:      NO integrada", "warn");
  }

  if (core.cache) {
    const s = core.cache.getStats();
    termWrite("Cache tokens:    ACTIVO", "success");
    termWrite("  Hits: " + s.hits + " | Misses: " + s.misses + " | Ratio: " + s.ratio, "dim");
    termWrite("  Entradas: " + s.entries + " | Ahorro: " + s.savedApprox + " tokens", "dim");
  } else {
    termWrite("Cache tokens:    NO disponible", "warn");
  }

  try {
    const total = Object.keys(SKILLS_REGISTRY || {}).length;
    const cats = Object.keys(getSkillsByCategory ? getSkillsByCategory() : {}).length;
    const instaladas = state.skillsInstaller ? state.skillsInstaller.list().length : 0;
    termWrite("Skills internas: " + total + " en " + cats + " categorias", "success");
    termWrite("  Instaladas: " + instaladas, "dim");
  } catch (e) {
    termWrite("Skills: error " + e.message, "warn");
  }

  if (core.tools) {
    const tools = core.tools.list();
    termWrite("Herramientas:    " + tools.length + " registradas", "success");
    tools.forEach(t => {
      termWrite("  - " + t.name + " [" + t.level + "]", "dim");
    });
  }

  if (state.orchestrator && state.orchestrator.harness) {
    const h = state.orchestrator.harness.getStats();
    termWrite("Harness:         ACTIVO", "success");
    termWrite("  Calls: " + h.calls + " | OK: " + h.success + " | Fallos: " + h.failed, "dim");
    termWrite("  Reintentos: " + h.retried + " | Tiempo prom: " + h.avgTime + " ms", "dim");
  } else {
    termWrite("Harness:         en espera (se activa al usar agente)", "dim");
  }

  if (state.agentMemory) {
    const tm = state.agentMemory.getStats();
    termWrite("Sub-agentes:     Team memory", "success");
    termWrite("  Hechos: " + tm.facts + " | Decisiones: " + tm.decisions + " | Locks: " + tm.activeLocks, "dim");
  }

  termWrite("Providers:", "head");
  state.providers.forEach(p => {
    const groups = p.groups || [];
    const verified = groups.filter(g => g.key).length;
    const total = groups.reduce((acc, g) => acc + g.models.length, 0);
    termWrite("  " + p.name + ": " + groups.length + " grupos | " + verified + " con key | " + total + " modelos", verified > 0 ? "success" : "dim");
  });

  if (state.lsp) {
    const s = state.lsp.getStats();
    termWrite("LSP:             " + s.count + " servidores activos", s.count > 0 ? "success" : "dim");
  }
  if (state.rag) {
    const s = state.rag.getStats();
    termWrite("RAG:             " + (s.indexed ? s.chunks + " chunks" : "no indexado"), s.indexed ? "success" : "dim");
  }

  termWrite("=========================================", "head");
  termWrite("", "normal");
}

    try {
      state.memoryManager = new MemoryManager({
        chatCompletion,
        getProvider: () => state.activeProvider,
        getModel: () => state.activeModel,
        log
      });
      const mmStats = state.memoryManager.getStats();
      termWrite("MemoryManager v2 listo (" + mmStats.blocks + " bloques, " + mmStats.sizeKB + " KB)", "dim");
    } catch (e) { console.warn("MemoryManager init error:", e); }

    try {
      state.mediaRouter = new MediaRouter({
        getProviders: () => state.providers,
        getStorageKey: () => STORAGE_KEY,
        log
      });
      state.mediaTaskManager = new MediaTaskManager({
        getProviderKey: (providerId, modelId) => {
          const p = (state.providers || []).find(x => x.id === providerId);
          if (!p) return "";
          for (const g of (p.groups || [])) {
            if (g.models && g.models.includes(modelId) && g.key) return g.key;
          }
          return (p.groups && p.groups[0] && p.groups[0].key) || "";
        },
        log,
        termWrite
      });
      state.cinematicStudio = new CinematicStudioUI({
        state,
        mediaRouter: state.mediaRouter,
        mediaTaskManager: state.mediaTaskManager,
        log,
        termWrite
      });
      state.cinematicStudio.init();
      termWrite("Cinematic Studio v1.5 listo (Image->Video Pipeline)", "dim");
    } catch (e) { console.warn("CinematicStudio init error:", e); }

    try { printToolReport(); } catch (e) { console.warn("report error:", e); }

    log("Sistema listo");

    try { scheduleAutoUpdateCheck(); } catch (e) {}

    // ─────────────────────────────────────────────────────────
    //  MOSTRAR WELCOME
    //  Si no hay proyecto abierto, mostramos bienvenida limpia.
    // ─────────────────────────────────────────────────────────
    if (!state.diskFolder) {
      renderWelcome();
    }

  } catch (e) {
    console.error("[GafCoreAI] Error en boot:", e);
    alert("Error al iniciar: " + e.message);
  }
}

window.gafcoreaiDebug = {
  get cache()      { return core.cache; },
  get memory()     { return core.memory; },
  get perms()      { return core.perms; },
  get tools()      { return core.tools; },
  get state()      { return state; },
  get orchestrator() { return state.orchestrator; },
  get harness()    { return state.orchestrator && state.orchestrator.harness; },
  get agentBrain() { return state.agentBrain; },
  get skillsInstaller() { return state.skillsInstaller; },
  get mediaRouter() { return state.mediaRouter; },
  get mediaTaskManager() { return state.mediaTaskManager; },
  get cinematicStudio() { return state.cinematicStudio; },
  get conversation() { return state.conversation; },
  getSkillsForAgent: (name) => {
    try { return getSkillsForAgent(name); } catch (e) { return null; }
  },
  getSkillStats: () => {
    try {
      return {
        internas: Object.keys(SKILLS_REGISTRY || {}).length,
        instaladas: state.skillsInstaller ? state.skillsInstaller.list().length : 0,
        categorias: Object.keys(getSkillsByCategory() || {}).length
      };
    } catch (e) { return { error: e.message }; }
  },
  cacheStats: () => core.cache.getStats(),
  harnessStats: () => state.orchestrator && state.orchestrator.harness ? state.orchestrator.harness.getStats() : null,
  resetAll: () => {
    core.cache.clear();
    core.memory.clear();
    if (state.skillsInstaller) state.skillsInstaller.clear();
    console.log("[debug] cache, memoria y skills reseteadas");
  },
  wipeLegacyConversations: () => {
    try {
      localStorage.removeItem("gafcoreai_conversations");
      localStorage.removeItem("gafcoreai_active_conversation");
      localStorage.removeItem("gafcoreai_conversation_history");
      console.log("[debug] conversaciones legacy borradas");
    } catch (e) { console.warn(e); }
  }
};
console.log("[GafCoreAI] Debug expuesto en window.gafcoreaiDebug");
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

setTimeout(() => {
  try { runRealUpdate(); } catch (e) {}
}, 4000);

setInterval(() => {
  const btn = document.getElementById("chat-send");
  if (!btn) return;
  const hasDanger = btn.classList.contains("btn-danger");
  const isRunning = !!state.agentRunning;
  if (hasDanger !== isRunning) {
    if (isRunning) { setSendBtn(true); } else { setSendBtn(false); }
  }
}, 500);