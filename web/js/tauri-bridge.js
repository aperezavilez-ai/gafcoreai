// ============================================================
//  GafCoreAI - Puente con Tauri v2
//  Detecta plugins y expone API uniforme al resto de la app
// ============================================================

const isTauri = typeof window !== "undefined" && !!window.__TAURI__;

let invoke = null;
let listen = null;
let dialogOpen = null;

if (isTauri) {
  try {
    const t = window.__TAURI__;

    // invoke
    if (t.core && typeof t.core.invoke === "function") {
      invoke = t.core.invoke.bind(t.core);
    } else if (typeof t.invoke === "function") {
      invoke = t.invoke.bind(t);
    }

    // listen
    if (t.event && typeof t.event.listen === "function") {
      listen = t.event.listen.bind(t.event);
    }

    // dialog.open - probar todas las ubicaciones posibles
    const dialogCandidates = [
      t.dialog,
      t.plugin && t.plugin.dialog,
      t.plugins && t.plugins.dialog,
    ];
    for (const cand of dialogCandidates) {
      if (cand && typeof cand.open === "function") {
        dialogOpen = cand.open.bind(cand);
        break;
      }
    }

    console.log("[bridge] Tauri detectado. invoke=" + !!invoke + " listen=" + !!listen + " dialog=" + !!dialogOpen);
  } catch (e) {
    console.error("[bridge] Error inicializando Tauri:", e);
  }
} else {
  console.log("[bridge] Modo web (sin Tauri)");
}

export const tauri = {
  isTauri,

  async pickFolder() {
    if (!dialogOpen) return null;
    try {
      return await dialogOpen({ directory: true, multiple: false, title: "Selecciona una carpeta" });
    } catch (e) {
      console.error("[bridge] pickFolder:", e);
      return null;
    }
  },

  async pickFile(filters) {
    if (!dialogOpen) return null;
    try {
      return await dialogOpen({ directory: false, multiple: false, title: "Selecciona un archivo", filters: filters || [] });
    } catch (e) {
      return null;
    }
  },

  // FS
  async readFile(path) { return await invoke("read_file", { path }); },
  async writeFile(path, content) { return await invoke("write_file", { path, content }); },
  async listDir(path) { return await invoke("list_dir", { path }); },
  async fileExists(path) { return await invoke("file_exists", { path }); },
  async createDir(path) { return await invoke("create_dir", { path }); },
  async deletePath(path) { return await invoke("delete_path", { path }); },
  async renamePath(from, to) { return await invoke("rename_path", { from, to }); },
  async getFileInfo(path) { return await invoke("get_file_info", { path }); },
  async searchInFiles(dir, query, maxResults = 100) { return await invoke("search_in_files", { dir, query, maxResults }); },
  async getProjectRoot() { return await invoke("get_project_root"); },
  async openInExplorer(path) { return await invoke("open_in_explorer", { path }); },

  // Shell
  async runShell(cmd, cwd) { return await invoke("run_shell", { cmd, cwd }); },
  // Devuelve { code, stdout, stderr } para poder distinguir exito de fallo.
  async runShellEx(cmd, cwd) { return await invoke("run_shell_ex", { cmd, cwd }); },
  async spawnTerminal(id, cwd) { return await invoke("spawn_terminal", { id, cwd }); },
  async writeTerminal(id, data) { return await invoke("write_terminal", { id, data }); },
  async resizeTerminal(id, rows, cols) { return await invoke("resize_terminal", { id, rows, cols }); },
  async closeTerminal(id) { return await invoke("close_terminal", { id }); },
  async onTerminalOutput(id, handler) { return listen ? await listen("term-output-" + id, (e) => handler(e.payload)) : null; },
  async onTerminalExit(id, handler) { return listen ? await listen("term-exit-" + id, (e) => handler(e.payload)) : null; },

  // Git
  async gitStatus(cwd) { return await invoke("git_status", { cwd }); },
  async gitInit(cwd) { return await invoke("git_init", { cwd }); },
  async gitCommit(cwd, message, files = []) { return await invoke("git_commit", { cwd, message, files }); },
  async gitPush(cwd, remote, branch) { return await invoke("git_push", { cwd, remote, branch }); },
  async gitPull(cwd, remote = null, branch = null) { return await invoke("git_pull", { cwd, remote, branch }); },
  async gitClone(url, dest) { return await invoke("git_clone", { url, dest }); },
  async gitLog(cwd, limit = 20) { return await invoke("git_log", { cwd, limit }); },
  async gitDiff(cwd, staged = false, file = null) { return await invoke("git_diff", { cwd, staged, file }); },

  // SSH
  async sshExec(host, user, cmd, port, keyPath) { return await invoke("ssh_exec", { host, user, cmd, port, keyPath }); },
  async sshTest(host, user, port, keyPath) { return await invoke("ssh_test", { host, user, port, keyPath }); },

  // LSP
  async lspSpawn(id, command, args, cwd) { return await invoke("lsp_spawn", { id, command, args, cwd }); },
  async lspSend(id, data) { return await invoke("lsp_send", { id, data }); },
  async lspKill(id) { return await invoke("lsp_kill", { id }); },
  async lspKillAll() { return await invoke("lsp_kill_all"); },
  async onLspStdout(id, handler) { return listen ? await listen("lsp-stdout-" + id, (e) => handler(e.payload)) : null; },
  async onLspStderr(id, handler) { return listen ? await listen("lsp-stderr-" + id, (e) => handler(e.payload)) : null; }
};