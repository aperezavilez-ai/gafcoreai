// ============================================================
//  GafCoreAI - LSP Client (JSON-RPC sobre stdio)
//  Conecta Monaco con language servers reales
// ============================================================
import { tauri } from "./tauri-bridge.js";

const LSP_CONFIG_KEY = "gafcoreai_lsp_config";

// Servidores predefinidos
export const LSP_SERVERS = {
  typescript: {
    name: "TypeScript / JavaScript",
    command: "typescript-language-server",
    args: ["--stdio"],
    extensions: ["ts","tsx","js","jsx","mjs","cjs"],
    detectFiles: ["package.json","tsconfig.json","jsconfig.json"]
  },
  python: {
    name: "Python (Pyright)",
    command: "pyright-langserver",
    args: ["--stdio"],
    extensions: ["py"],
    detectFiles: ["pyproject.toml","setup.py","requirements.txt","Pipfile"]
  },
  html: {
    name: "HTML",
    command: "vscode-html-language-server",
    args: ["--stdio"],
    extensions: ["html","htm"],
    detectFiles: []
  },
  css: {
    name: "CSS",
    command: "vscode-css-language-server",
    args: ["--stdio"],
    extensions: ["css","scss","sass","less"],
    detectFiles: []
  },
  json: {
    name: "JSON",
    command: "vscode-json-language-server",
    args: ["--stdio"],
    extensions: ["json","jsonc"],
    detectFiles: []
  }
};

export class LspClient {
  constructor({ state, log, termWrite, editor, onDiagnostics }) {
    this.state = state;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.editor = editor;
    this.onDiagnostics = onDiagnostics || (() => {});

    this.servers = new Map(); // langId -> { id, process, initialized, documentVersions, requestId }
    this.unlistenStdout = new Map();
    this.unlistenStderr = new Map();
    this.pendingRequests = new Map(); // requestId -> { resolve, reject }
    this.requestCounter = 0;

    this.monacoProviders = new Map(); // langId -> { disposables: [] }
  }

  /**
   * Detectar que lenguajes necesita un proyecto
   */
  detectLanguages(rootPath, files) {
    const detected = new Set();

    // 1) Por archivos de configuracion
    for (const langId in LSP_SERVERS) {
      const srv = LSP_SERVERS[langId];
      for (const cfgFile of srv.detectFiles) {
        if (files.some(f => f.split(/[\\\/]/).pop() === cfgFile)) {
          detected.add(langId);
        }
      }
    }

    // 2) Por extensiones presentes
    for (const langId in LSP_SERVERS) {
      const srv = LSP_SERVERS[langId];
      const hasExt = files.some(f => {
        const ext = f.split(".").pop().toLowerCase();
        return srv.extensions.includes(ext);
      });
      if (hasExt) detected.add(langId);
    }

    return Array.from(detected);
  }

  /**
   * Iniciar un servidor LSP
   */
  async startServer(langId, cwd) {
    if (this.servers.has(langId)) {
      this.log("LSP " + langId + " ya corriendo");
      return true;
    }

    const srv = LSP_SERVERS[langId];
    if (!srv) throw new Error("Lenguaje no soportado: " + langId);

    const serverId = "lsp-" + langId + "-" + Date.now();

    this.termWrite("");
    this.termWrite("🔌 Iniciando LSP: " + srv.name, "dim");
    this.termWrite("   comando: " + srv.command + " " + srv.args.join(" "), "dim");

    try {
      await tauri.lspSpawn(serverId, srv.command, srv.args, cwd || null);

      const serverState = {
        id: serverId,
        langId: langId,
        process: srv.command,
        initialized: false,
        capabilities: null,
        documentVersions: new Map(), // uri -> version
        rootUri: cwd ? "file:///" + cwd.replace(/\\/g, "/") : null
      };
      this.servers.set(langId, serverState);

      // Escuchar stdout
      const unlistenOut = await tauri.onLspStdout(serverId, (msg) => {
        this.handleMessage(langId, msg);
      });
      this.unlistenStdout.set(langId, unlistenOut);

      // Escuchar stderr (logs del server, opcional)
      const unlistenErr = await tauri.onLspStderr(serverId, (line) => {
        this.log("[" + langId + " stderr] " + line);
      });
      this.unlistenStderr.set(langId, unlistenErr);

      // Initialize request
      await this.sendRequest(langId, "initialize", {
        processId: null,
        clientInfo: { name: "GafCoreAI", version: "1.0.0" },
        rootUri: serverState.rootUri,
        capabilities: {
          workspace: {
            applyEdit: false,
            workspaceEdit: { documentChanges: false }
          },
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: true
            },
            completion: {
              dynamicRegistration: false,
              completionItem: {
                snippetSupport: true,
                documentationFormat: ["markdown", "plaintext"]
              }
            },
            hover: { dynamicRegistration: false, contentFormat: ["markdown", "plaintext"] },
            signatureHelp: { dynamicRegistration: false },
            definition: { dynamicRegistration: false, linkSupport: false },
            references: { dynamicRegistration: false },
            documentSymbol: { dynamicRegistration: false },
            formatting: { dynamicRegistration: false },
            rename: { dynamicRegistration: false },
            publishDiagnostics: { relatedInformation: true },
            diagnostic: { dynamicRegistration: false }
          }
        }
      });

      // initialized notification
      this.sendNotification(langId, "initialized", {});

      serverState.initialized = true;
      this.termWrite("   ✅ " + srv.name + " listo", "success");

      // Registrar providers de Monaco
      this.registerMonacoProviders(langId);

      return true;
    } catch (e) {
      this.termWrite("   ✘ Error: " + e.message, "error");
      this.log("LSP error: " + e.message);
      return false;
    }
  }

  async stopServer(langId) {
    const srv = this.servers.get(langId);
    if (!srv) return;
    try { await tauri.lspKill(srv.id); } catch (e) {}
    this.servers.delete(langId);
    const uo = this.unlistenStdout.get(langId);
    const ue = this.unlistenStderr.get(langId);
    if (uo) uo();
    if (ue) ue();
    this.unlistenStdout.delete(langId);
    this.unlistenStderr.delete(langId);
    this.disposeMonacoProviders(langId);
    this.termWrite("🔌 LSP detenido: " + langId, "dim");
  }

  async stopAll() {
    const ids = Array.from(this.servers.keys());
    for (const id of ids) await this.stopServer(id);
  }

  // ============================================================
  //  MENSAJES JSON-RPC
  // ============================================================
  async sendRequest(langId, method, params) {
    const srv = this.servers.get(langId);
    if (!srv) throw new Error("LSP " + langId + " no corriendo");

    const id = ++this.requestCounter;
    const msg = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("LSP timeout: " + method));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      tauri.lspSend(srv.id, JSON.stringify(msg)).catch(reject);
    });
  }

  async sendNotification(langId, method, params) {
    const srv = this.servers.get(langId);
    if (!srv) return;
    const msg = { jsonrpc: "2.0", method, params };
    try { await tauri.lspSend(srv.id, JSON.stringify(msg)); } catch (e) { /* ignore */ }
  }

  handleMessage(langId, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    // Response
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const p = this.pendingRequests.get(msg.id);
      clearTimeout(p.timeout);
      this.pendingRequests.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || "LSP error"));
      else p.resolve(msg.result);
      return;
    }

    // Request del servidor (raro, pero puede pasar)
    if (msg.method && msg.id !== undefined) {
      // Responder vacio
      tauri.lspSend(this.servers.get(langId).id, JSON.stringify({
        jsonrpc: "2.0", id: msg.id, result: null
      })).catch(() => {});
      return;
    }

    // Notification del servidor
    if (msg.method) {
      this.handleNotification(langId, msg.method, msg.params);
    }
  }

  handleNotification(langId, method, params) {
    if (method === "textDocument/publishDiagnostics") {
      this.handleDiagnostics(langId, params);
    }
    // Otros metodos ignorados por ahora
  }

  handleDiagnostics(langId, params) {
    const uri = params.uri;
    const diagnostics = params.diagnostics || [];
    this.log("LSP " + langId + " diagnostics: " + diagnostics.length + " en " + uri);

    // Marcar en Monaco
    if (!this.editor || !window.monaco) return;

    const model = this.findModelByUri(uri);
    if (!model) return;

    const markers = diagnostics.map(d => ({
      severity: this.lspSeverityToMonaco(d.severity),
      startLineNumber: (d.range.start.line || 0) + 1,
      startColumn: (d.range.start.character || 0) + 1,
      endLineNumber: (d.range.end.line || 0) + 1,
      endColumn: (d.range.end.character || 0) + 1,
      message: d.message || "",
      source: d.source || langId
    }));

    monaco.editor.setModelMarkers(model, "lsp-" + langId, markers);

    // Notificar UI
    try { this.onDiagnostics({ langId, uri, diagnostics }); } catch (e) {}
  }

  lspSeverityToMonaco(sev) {
    // 1=Error, 2=Warning, 3=Info, 4=Hint
    const map = { 1: 8, 2: 4, 3: 2, 4: 1 };
    return map[sev] || 1;
  }

  findModelByUri(uri) {
    if (!this.editor) return null;
    const models = monaco.editor.getModels();
    const path = uri.replace(/^file:\/\/\/?/, "").replace(/\//g, "\\").toLowerCase();
    return models.find(m => {
      const mUri = m.uri.toString().replace(/^file:\/\/\/?/, "").replace(/\//g, "\\").toLowerCase();
      return mUri === path || mUri.endsWith(path) || path.endsWith(mUri);
    }) || null;
  }

  // ============================================================
  //  DOCUMENT LIFECYCLE
  // ============================================================
  async openDocument(langId, uri, text, version) {
    const srv = this.servers.get(langId);
    if (!srv) return;
    if (srv.documentVersions.has(uri)) return;
    srv.documentVersions.set(uri, version || 1);

    // Detectar languageId aproximado
    const ext = uri.split(".").pop().toLowerCase();
    const languageId = ext === "ts" || ext === "tsx" ? "typescript"
                     : ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs" ? "javascript"
                     : ext === "py" ? "python"
                     : ext === "html" || ext === "htm" ? "html"
                     : ext === "css" || ext === "scss" || ext === "less" ? "css"
                     : ext === "json" || ext === "jsonc" ? "json"
                     : "plaintext";

    await this.sendNotification(langId, "textDocument/didOpen", {
      textDocument: { uri, languageId, version: version || 1, text }
    });
  }

  async changeDocument(langId, uri, text) {
    const srv = this.servers.get(langId);
    if (!srv) return;
    const version = (srv.documentVersions.get(uri) || 1) + 1;
    srv.documentVersions.set(uri, version);

    await this.sendNotification(langId, "textDocument/didChange", {
      textDocument: { uri, version },
      contentChanges: [{ text }]
    });
  }

  async closeDocument(langId, uri) {
    const srv = this.servers.get(langId);
    if (!srv) return;
    srv.documentVersions.delete(uri);
    await this.sendNotification(langId, "textDocument/didClose", {
      textDocument: { uri }
    });
  }

  // ============================================================
  //  MONACO PROVIDERS
  // ============================================================
  registerMonacoProviders(langId) {
    if (!window.monaco) return;
    if (this.monacoProviders.has(langId)) return;

    const srv = LSP_SERVERS[langId];
    const disposables = [];
    const self = this;

    // Lenguajes de Monaco que aplican
    const monacoLangs = [];
    if (langId === "typescript") monacoLangs.push("typescript", "javascript");
    else if (langId === "python") monacoLangs.push("python");
    else if (langId === "html") monacoLangs.push("html");
    else if (langId === "css") monacoLangs.push("css", "scss", "less");
    else if (langId === "json") monacoLangs.push("json");

    monacoLangs.forEach(mlang => {
      // Completion
      disposables.push(monaco.languages.registerCompletionItemProvider(mlang, {
        triggerCharacters: [".", ":", "<", ">", "(", '"', "'", "/", "@", " "],
        provideCompletionItems: async (model, position) => {
          const uri = model.uri.toString();
          const result = await self.sendRequestSafe(langId, "textDocument/completion", {
            textDocument: { uri },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });
          if (!result) return { suggestions: [] };
          const items = result.items || result;
          return {
            suggestions: (items || []).slice(0, 100).map(item => ({
              label: item.label || "",
              kind: self.lspCompletionKind(item.kind),
              detail: item.detail,
              documentation: item.documentation && (item.documentation.value || item.documentation),
              insertText: item.insertText || item.label,
              insertTextRules: item.insertTextFormat === 2
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : 0,
              range: undefined
            }))
          };
        }
      }));

      // Hover
      disposables.push(monaco.languages.registerHoverProvider(mlang, {
        provideHover: async (model, position) => {
          const uri = model.uri.toString();
          const result = await self.sendRequestSafe(langId, "textDocument/hover", {
            textDocument: { uri },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });
          if (!result || !result.contents) return null;
          const contents = Array.isArray(result.contents) ? result.contents : [result.contents];
          return {
            contents: contents.map(c => ({
              value: typeof c === "string" ? c : (c.value || "")
            }))
          };
        }
      }));

      // Definition
      disposables.push(monaco.languages.registerDefinitionProvider(mlang, {
        provideDefinition: async (model, position) => {
          const uri = model.uri.toString();
          const result = await self.sendRequestSafe(langId, "textDocument/definition", {
            textDocument: { uri },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });
          if (!result) return null;
          const locs = Array.isArray(result) ? result : [result];
          return locs.map(l => ({
            uri: monaco.Uri.parse(l.uri),
            range: {
              startLineNumber: (l.range.start.line || 0) + 1,
              startColumn: (l.range.start.character || 0) + 1,
              endLineNumber: (l.range.end.line || 0) + 1,
              endColumn: (l.range.end.character || 0) + 1
            }
          }));
        }
      }));

      // References
      disposables.push(monaco.languages.registerReferenceProvider(mlang, {
        provideReferences: async (model, position) => {
          const uri = model.uri.toString();
          const result = await self.sendRequestSafe(langId, "textDocument/references", {
            textDocument: { uri },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            context: { includeDeclaration: true }
          });
          if (!result) return [];
          return result.map(l => ({
            uri: monaco.Uri.parse(l.uri),
            range: {
              startLineNumber: (l.range.start.line || 0) + 1,
              startColumn: (l.range.start.character || 0) + 1,
              endLineNumber: (l.range.end.line || 0) + 1,
              endColumn: (l.range.end.character || 0) + 1
            }
          }));
        }
      }));

      // Rename
      disposables.push(monaco.languages.registerRenameProvider(mlang, {
        provideRenameEdits: async (model, position, newName) => {
          const uri = model.uri.toString();
          const result = await self.sendRequestSafe(langId, "textDocument/rename", {
            textDocument: { uri },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            newName
          });
          if (!result || !result.changes) return null;
          const edits = [];
          for (const u in result.changes) {
            for (const edit of result.changes[u]) {
              edits.push({
                resource: monaco.Uri.parse(u),
                textEdit: {
                  range: {
                    startLineNumber: (edit.range.start.line || 0) + 1,
                    startColumn: (edit.range.start.character || 0) + 1,
                    endLineNumber: (edit.range.end.line || 0) + 1,
                    endColumn: (edit.range.end.character || 0) + 1
                  },
                  text: edit.newText
                }
              });
            }
          }
          return { edits };
        }
      }));
    });

    this.monacoProviders.set(langId, { disposables });
    this.log("LSP " + langId + ": " + disposables.length + " providers Monaco registrados");
  }

  disposeMonacoProviders(langId) {
    const entry = this.monacoProviders.get(langId);
    if (!entry) return;
    entry.disposables.forEach(d => { try { d.dispose(); } catch (e) {} });
    this.monacoProviders.delete(langId);
  }

  async sendRequestSafe(langId, method, params) {
    try { return await this.sendRequest(langId, method, params); }
    catch (e) { this.log("LSP " + method + " error: " + e.message); return null; }
  }

  lspCompletionKind(kind) {
    if (!window.monaco) return 1;
    const K = monaco.languages.CompletionItemKind;
    const map = {
      1: K.Text, 2: K.Method, 3: K.Function, 4: K.Constructor,
      5: K.Field, 6: K.Variable, 7: K.Class, 8: K.Interface,
      9: K.Module, 10: K.Property, 11: K.Unit, 12: K.Value,
      13: K.Enum, 14: K.Keyword, 15: K.Snippet, 16: K.Color,
      17: K.File, 18: K.Reference, 19: K.Folder, 20: K.EnumMember,
      21: K.Constant, 22: K.Struct, 23: K.Event, 24: K.Operator,
      25: K.TypeParameter
    };
    return map[kind] || K.Text;
  }

  getStats() {
    const active = Array.from(this.servers.keys());
    return { activeServers: active, count: active.length };
  }
}