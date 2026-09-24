// ============================================================
//  GafCoreAI - Live View
//  Muestra el progreso del agente en la pestana "Proceso"
// ============================================================

export class LiveView {
  constructor({ log }) {
    this.log = log || console.log;
    this.activeFile = null;
    this.phase = null;
    this.progress = 0;
    this.startTs = null;
    this.logLines = [];
    this.filesTouched = new Map(); // path -> { status, ts }
    this.testsRunning = false;
    this.testsResults = [];
    this.isRunning = false;
  }

  // ─────────────────────────────────────────────────────
  //  INICIAR SESION DEL AGENTE
  // ─────────────────────────────────────────────────────
  startSession(task) {
    this.isRunning = true;
    this.startTs = Date.now();
    this.logLines = [];
    this.filesTouched.clear();
    this.testsResults = [];
    this.progress = 0;
    this.activeFile = null;

    this.renderPhase("", "Agente iniciado", task?.slice(0, 60) || "");
    this.renderAgents([]);
    this.renderLog();
    this.renderProgress(0);
    this.renderFile(null);
    this.hideTests();
    this.hideActions();
  }

  endSession(success) {
    this.isRunning = false;
    const elapsed = this.startTs ? Math.round((Date.now() - this.startTs) / 1000) : 0;
    if (success) {
      this.renderPhase("", "Tarea completada", "en " + elapsed + "s");
      this.logLine("success", "Agente termino en " + elapsed + "s");
    } else {
      this.renderPhase("", "Tarea con errores", "en " + elapsed + "s");
      this.logLine("error", "Agente termino con errores en " + elapsed + "s");
    }
    this.renderFile(null);
    this.hideActions();
  }

  // ─────────────────────────────────────────────────────
  //  FASE
  // ─────────────────────────────────────────────────────
  renderPhase(icon, title, sub) {
    const el = document.getElementById("live-phase-icon");
    const ti = document.getElementById("live-phase-title");
    const su = document.getElementById("live-phase-sub");
    if (el) el.textContent = icon;
    if (ti) ti.textContent = title;
    if (su) su.textContent = sub || "—";
    this.phase = { icon, title, sub };
  }

  setPhase(icon, title, sub) {
    this.renderPhase(icon, title, sub);
    this.logLine("info", icon + " " + title + (sub ? " · " + sub : ""));
  }

  // ─────────────────────────────────────────────────────
  //  SUB-AGENTES
  // ─────────────────────────────────────────────────────
  renderAgents(agents) {
    const box = document.getElementById("live-agents");
    if (!box) return;
    box.innerHTML = "";
    agents.forEach(a => {
      const chip = document.createElement("div");
      chip.className = "live-agent-chip " + (a.status || "pending");
      chip.innerHTML =
        '<span class="dot"></span>' +
        '<span>' + a.name + '</span>' +
        (a.status === "done" ? '' : "") +
        (a.status === "error" ? '' : "");
      box.appendChild(chip);
    });
  }

  agentStart(name) {
    this.logLine("agent", "· " + name + " iniciado");
  }

  agentDone(name) {
    this.logLine("success", "· " + name + " completado");
  }

  agentError(name, err) {
    this.logLine("error", "  " + name + " · " + err);
  }

  // ─────────────────────────────────────────────────────
  //  PROGRESO
  // ─────────────────────────────────────────────────────
  renderProgress(pct) {
    this.progress = pct;
    const bar = document.getElementById("live-progress-bar");
    if (bar) bar.style.width = pct + "%";
  }

  // ─────────────────────────────────────────────────────
  //  ARCHIVO ACTUAL
  // ─────────────────────────────────────────────────────
  renderFile(path, action) {
    const box = document.getElementById("live-current-file");
    const p = document.getElementById("lcf-path");
    const a = document.getElementById("lcf-action");
    if (!box || !p || !a) return;

    if (!path) {
      box.style.display = "none";
      box.classList.remove("active");
      return;
    }
    box.style.display = "flex";
    box.classList.add("active");
    p.textContent = path;
    a.textContent = action || "editando";
  }

  fileStart(path, action) {
    this.activeFile = path;
    this.renderFile(path, action || "editando");
    this.markFile(path, "live-working");
    this.logLine("file", "  " + path + " · " + (action || "editando"));
  }

  fileDone(path, ok) {
    this.markFile(path, ok ? "live-done" : "live-error");
    this.filesTouched.set(path, { status: ok ? "done" : "error", ts: Date.now() });
    this.logLine(ok ? "success" : "error", (ok ? "✓ " : "✗ ") + path);
    this.renderFile(null);
  }

  filePending(path) {
    this.markFile(path, "live-pending");
    this.logLine("warn", "  " + path + " · pendiente");
  }

  markFile(path, cls) {
    // Buscar el nodo del arbol por title o por texto
    const nodes = document.querySelectorAll(".tree-node");
    let target = null;
    const base = path.split(/[\\\/]/).pop();
    nodes.forEach(n => {
      if (n.title === path) target = n;
      else if (!target && n.textContent.includes(base)) target = n;
    });
    if (!target) return;

    // Limpiar clases de estado previas
    target.classList.remove("live-working", "live-done", "live-error", "live-pending");
    target.classList.add(cls);

    // Agregar el punto si no existe
    if (!target.querySelector(".file-status")) {
      const dot = document.createElement("span");
      dot.className = "file-status";
      target.insertBefore(dot, target.firstChild);
    }
  }

  clearAllMarkers() {
    document.querySelectorAll(".tree-node").forEach(n => {
      n.classList.remove("live-working", "live-done", "live-error", "live-pending");
    });
  }

  // ─────────────────────────────────────────────────────
  //  LOG
  // ─────────────────────────────────────────────────────
  renderLog() {
    const box = document.getElementById("live-log");
    if (!box) return;
    box.innerHTML = "";
    if (!this.logLines.length) {
      box.innerHTML =
        '<div class="live-empty">' +
        '<div class="big">📡</div>' +
        '<div>Esperando actividad del agente...</div>' +
        '</div>';
      return;
    }
    this.logLines.forEach(l => {
      const el = document.createElement("div");
      el.className = "live-log-line " + l.type;
      el.innerHTML =
        '<span class="llt">' + l.time + '</span>' +
        '<span class="llm">' + this.escape(l.msg) + '</span>';
      box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
  }

  logLine(type, msg) {
    const now = new Date();
    const t = String(now.getHours()).padStart(2, "0") + ":" +
              String(now.getMinutes()).padStart(2, "0") + ":" +
              String(now.getSeconds()).padStart(2, "0");
    this.logLines.push({ type, msg, time: t });
    if (this.logLines.length > 500) this.logLines.shift();
    this.renderLog();
  }

  escape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ─────────────────────────────────────────────────────
  //  TESTS
  // ─────────────────────────────────────────────────────
  showTests() {
    const box = document.getElementById("live-tests");
    if (box) box.style.display = "block";
  }

  hideTests() {
    const box = document.getElementById("live-tests");
    if (box) box.style.display = "none";
  }

  testsStart(total) {
    this.testsRunning = true;
    this.testsResults = [];
    this.showTests();
    const badge = document.getElementById("live-tests-badge");
    if (badge) { badge.className = "badge running"; badge.textContent = "ejecutando..."; }
    const list = document.getElementById("live-tests-list");
    if (list) list.innerHTML = "";
    this.logLine("info", "Ejecutando " + total + " tests...");
  }

  testsAddResult(name, ok, detail) {
    this.testsResults.push({ name, ok, detail });
    const list = document.getElementById("live-tests-list");
    if (!list) return;
    const el = document.createElement("div");
    el.className = "test-line " + (ok ? "pass" : "fail");
    el.innerHTML =
      '<span class="icon">' + (ok ? "✓" : "✗") + '</span>' +
      '<span>' + this.escape(name) + '</span>' +
      (detail ? '<span style="margin-left:auto;color:var(--text-dim);font-size:11px">' + this.escape(detail) + '</span>' : "");
    list.appendChild(el);
  }

  testsFinish() {
    this.testsRunning = false;
    const passed = this.testsResults.filter(t => t.ok).length;
    const total = this.testsResults.length;
    const badge = document.getElementById("live-tests-badge");
    if (badge) {
      if (passed === total) {
        badge.className = "badge pass";
        badge.textContent = passed + "/" + total + " pasaron";
      } else {
        badge.className = "badge fail";
        badge.textContent = passed + "/" + total + " pasaron";
      }
    }
    this.logLine(passed === total ? "success" : "error",
      "Tests: " + passed + "/" + total);
  }

  // ─────────────────────────────────────────────────────
  //  ACCIONES
  // ─────────────────────────────────────────────────────
  showActions(onAcceptAll, onRejectAll) {
    const box = document.getElementById("live-actions");
    if (!box) return;
    box.style.display = "flex";
    const bAccept = document.getElementById("live-accept-all");
    const bReject = document.getElementById("live-reject-all");
    if (bAccept) bAccept.onclick = onAcceptAll;
    if (bReject) bReject.onclick = onRejectAll;
  }

  hideActions() {
    const box = document.getElementById("live-actions");
    if (box) box.style.display = "none";
  }

  // ─────────────────────────────────────────────────────
  //  UTILIDAD: ir a la pestana Proceso
  // ─────────────────────────────────────────────────────
  focus() {
    const tab = document.querySelector(".main-tabs .tab[data-view='live']");
    if (tab && !tab.classList.contains("active")) tab.click();
  }
}

export const liveView = new LiveView({});