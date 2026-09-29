import { getSecret, setSecret, removeSecret } from "./secrets.js";
// ============================================================
//  GafCoreAI - MCP Client (Model Context Protocol)
//  Conecta servers MCP via stdio (Tauri) o HTTP
// ============================================================

const MCP_SERVERS_KEY = "gafcoreai_mcp_servers";

export class McpClient {
  constructor({ log, termWrite, tauri }) {
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.tauri = tauri;
    this.servers = this.loadServers();
    this.processes = new Map(); // serverName -> { id, tools, pending }
    this.requestCounter = 0;
  }

  /**
   * Agrega un server MCP (stdio o HTTP)
   */
  async addServer(config) {
    const { name, command, args, url, env } = config;
    if (!name) return { ok: false, error: "Falta nombre" };
    if (!command && !url) return { ok: false, error: "Falta command o url" };

    if (this.servers[name]) {
      return { ok: false, error: "Ya existe: " + name };
    }

    this.servers[name] = {
      name,
      command: command || null,
      args: args || [],
      url: url || null,
      env: env || {},
      addedAt: Date.now(),
      status: "configured"
    };
    this.saveServers();

    this.termWrite("🔌 MCP server agregado: " + name, "success");
    return { ok: true, server: this.servers[name] };
  }

  async removeServer(name) {
    if (!this.servers[name]) return false;
    await this.stopServer(name);
    delete this.servers[name];
    this.saveServers();
    return true;
  }

  /**
   * Inicia un server MCP (stdio via Tauri)
   */
  async startServer(name) {
    const srv = this.servers[name];
    if (!srv) return { ok: false, error: "No existe" };

    if (srv.url) {
      // HTTP: no necesita spawn
      srv.status = "ready";
      this.servers[name] = srv;
      this.saveServers();
      return await this.initializeHttp(name);
    }

    if (!this.tauri || !this.tauri.isTauri) {
      return { ok: false, error: "MCP stdio requiere app de escritorio" };
    }

    const serverId = "mcp-" + name + "-" + Date.now();

    try {
      await this.tauri.lspSpawn(serverId, srv.command, srv.args, null);

      // Escuchar respuestas
      const unlisten = await this.tauri.onLspStdout(serverId, (msg) => {
        this.handleMessage(name, msg);
      });

      this.processes.set(name, {
        id: serverId,
        unlisten,
        tools: [],
        pending: new Map(),
        initialized: false
      });

      srv.status = "running";
      this.servers[name] = srv;
      this.saveServers();

      // Inicializar protocolo MCP
      return await this.initializeStdio(name);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async stopServer(name) {
    const proc = this.processes.get(name);
    if (!proc) return true;
    if (proc.unlisten) proc.unlisten();
    if (this.tauri && this.tauri.isTauri) {
      try { await this.tauri.lspKill(proc.id); } catch (e) {}
    }
    this.processes.delete(name);
    if (this.servers[name]) {
      this.servers[name].status = "stopped";
      this.saveServers();
    }
    return true;
  }

  /**
   * Inicializacion MCP (JSON-RPC 2.0)
   */
  async initializeStdio(name) {
    try {
      const result = await this.sendRequest(name, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        clientInfo: { name: "GafCoreAI", version: "1.0.0" }
      });
      await this.sendNotification(name, "notifications/initialized", {});
      const proc = this.processes.get(name);
      proc.initialized = true;
      await this.refreshTools(name);
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async initializeHttp(name) {
    const srv = this.servers[name];
    try {
      const r = await fetch(srv.url + "/tools/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
      });
      if (!r.ok) return { ok: false, error: "HTTP " + r.status };
      const data = await r.json();
      const tools = data.result?.tools || [];
      if (!this.processes.has(name)) {
        this.processes.set(name, { tools, pending: new Map(), initialized: true });
      } else {
        this.processes.get(name).tools = tools;
      }
      return { ok: true, tools };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async refreshTools(name) {
    try {
      const result = await this.sendRequest(name, "tools/list", {});
      const proc = this.processes.get(name);
      if (proc) proc.tools = result.tools || [];
      return result.tools || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Lista tools de un server
   */
  listTools(name) {
    const proc = this.processes.get(name);
    return proc ? proc.tools : [];
  }

  /**
   * Invoca un tool de un server
   */
  async callTool(name, toolName, args) {
    const srv = this.servers[name];
    if (!srv) return { ok: false, error: "Server no existe" };

    if (srv.url) {
      try {
        const r = await fetch(srv.url + "/tools/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: ++this.requestCounter,
            method: "tools/call",
            params: { name: toolName, arguments: args }
          })
        });
        const data = await r.json();
        return { ok: true, result: data.result };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    try {
      const result = await this.sendRequest(name, "tools/call", {
        name: toolName,
        arguments: args
      });
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async sendRequest(name, method, params) {
    const proc = this.processes.get(name);
    if (!proc) throw new Error("Server no iniciado");
    const id = ++this.requestCounter;
    const msg = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        proc.pending.delete(id);
        reject(new Error("Timeout: " + method));
      }, 20000);

      proc.pending.set(id, { resolve, reject, timeout });

      const t = this.tauri;
      if (!t || !t.isTauri) {
        reject(new Error("No disponible"));
        return;
      }
      t.lspSend(proc.id, JSON.stringify(msg)).catch(reject);
    });
  }

  async sendNotification(name, method, params) {
    const proc = this.processes.get(name);
    if (!proc || !this.tauri) return;
    const msg = { jsonrpc: "2.0", method, params };
    try { await this.tauri.lspSend(proc.id, JSON.stringify(msg)); } catch (e) {}
  }

  handleMessage(name, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    const proc = this.processes.get(name);
    if (!proc) return;

    if (msg.id !== undefined && proc.pending.has(msg.id)) {
      const p = proc.pending.get(msg.id);
      clearTimeout(p.timeout);
      proc.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || "MCP error"));
      else p.resolve(msg.result);
    }
  }

  /**
   * Bloque de texto para el system prompt
   */
  buildMcpContext() {
    const servers = Object.keys(this.servers);
    if (!servers.length) return "";

    let out = "\n\n=== MCP SERVERS CONECTADOS ===\n";
    servers.forEach(name => {
      const srv = this.servers[name];
      const tools = this.listTools(name);
      out += `\n[${name}] (${srv.status})\n`;
      if (tools.length) {
        tools.forEach(t => {
          out += `  - ${t.name}: ${t.description || ""}\n`;
        });
      } else {
        out += "  (sin tools detectadas)\n";
      }
    });
    return out;
  }

  saveServers() {
    try {
      setSecret(MCP_SERVERS_KEY, JSON.stringify(this.servers));
    } catch (e) {}
  }

  loadServers() {
    try {
      const raw = getSecret(MCP_SERVERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  list() {
    return Object.values(this.servers);
  }
}