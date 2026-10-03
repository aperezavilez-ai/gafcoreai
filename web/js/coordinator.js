// ============================================================
//  GafCoreAI - Coordinador dinamico de agentes (red neuronal, Fase 2)
//  En cada paso puntua los roles y elige el siguiente segun:
//    prior heuristico + peso aprendido task_type->agent + handoffs + penalizaciones.
//  Tras cada agente refuerza las aristas del grafo sinaptico.
// ============================================================

import { AGENT_ROLES } from "./core.js";

const WRITE_TOOLS = ["write_file", "edit_file", "delete_file"];
const CRITIC_ROLES = new Set(["Reviewer", "Security", "Tester"]);
const MIN_SCORE = 0.5;
const PARALLEL_GAP = 0.5;
const CLOSE_CONFIDENCE = 0.7;

export function classifyTaskType(text) {
  const t = (text || "").toLowerCase();
  if (/segurid|vulnerab|auditor[ií]a de seguridad|xss|inyecc|cve|hardening/.test(t)) return "security";
  if (/\btest|prueba|unitari|e2e|cobertura/.test(t)) return "test";
  if (/investiga|documentaci[oó]n oficial|busca en (la )?web|compar[ae] librer|mejores pr[aá]cticas/.test(t)) return "research";
  if (/arregla|corrige|\bfix\b|\bbug|error|falla|crash/.test(t)) return "fix";
  if (/crea|implementa|agrega|a[nñ]ade|programa|escribe c[oó]digo|refactori|migra/.test(t)) return "code";
  if (/revisa|review|eval[uú]a|critica/.test(t)) return "review";
  if (/analiza|audita|explica|diagnostica|arquitectura|estructura/.test(t)) return "analysis";
  return "general";
}

// Relevancia inicial de cada rol por tipo de tarea (se suma mientras el rol no haya corrido).
const RELEVANCE = {
  analysis: { Explorer: 1.0, Analyst: 1.0, Security: 0.8, Reviewer: 0.6 },
  code:     { Explorer: 1.0, Planner: 0.6, Coder: 1.2, Reviewer: 1.0, Tester: 0.8 },
  fix:      { Explorer: 1.0, Analyst: 1.0, Coder: 1.2, Reviewer: 1.0, Tester: 0.8 },
  security: { Explorer: 1.0, Security: 1.2, Analyst: 0.8, Reviewer: 0.6 },
  test:     { Explorer: 1.0, Tester: 1.2, Coder: 0.8, Reviewer: 0.6 },
  research: { Researcher: 1.2, Analyst: 0.6 },
  review:   { Explorer: 1.0, Reviewer: 1.2, Security: 0.8 },
  general:  { Explorer: 1.0, Analyst: 1.0, Reviewer: 0.6 }
};
const NEEDS_CODE = new Set(["code", "fix"]);

function isWriter(role) {
  return (role.allowedTools || []).some(t => WRITE_TOOLS.includes(t));
}

function producedSomething(r) {
  return !!((r.handoff && (r.handoff.facts.length || r.handoff.summary))
    || (r.toolResults || []).some(t => t.ok));
}

function wroteFiles(r) {
  return (r.toolResults || []).some(t => t.ok && WRITE_TOOLS.includes(t.name));
}

export class AgentCoordinator {
  constructor({ roles, runAgents, graph, isAborted, emit, summarize, log, rng, maxSteps, epsilon }) {
    this.roles = roles || Object.values(AGENT_ROLES);
    this.runAgents = runAgents;
    this.graph = graph || null;
    this.isAborted = isAborted || (() => false);
    this.emit = emit || (() => {});
    this.summarize = summarize || (() => "");
    this.log = log || (() => {});
    this.rng = rng || Math.random;
    this.maxSteps = maxSteps || 8;
    this.epsilon = typeof epsilon === "number" ? epsilon : 0.1;
  }

  _newState() {
    return {
      runs: {},
      lastRole: null,
      results: [],
      handoffs: {},          // rol destino -> { from, confidence }
      coderPending: false,   // el Coder escribio y aun no paso un critico
      noProgress: 0,
      decisions: []
    };
  }

  score(taskType, st) {
    const typeNode = "task_type:" + taskType;
    const fresh = st.results.length === 0;
    const relevance = RELEVANCE[taskType] || RELEVANCE.general;

    return this.roles.map(role => {
      const name = role.name;
      const parts = { prior: 0, learned: 0, handoff: 0, penalty: 0 };

      if (!st.runs[name]) parts.prior += relevance[name] || 0;
      if (fresh && name === "Explorer") parts.prior += 1.5;
      if (!fresh && name === "Planner") parts.penalty += 1.0;
      if (st.coderPending) {
        if (name === "Reviewer") parts.prior += 2.5;
        if (name === "Tester") parts.prior += 1.5;
        if (name === "Security") parts.prior += 0.5;
      }
      if (isWriter(role) && fresh) parts.penalty += 6.0;

      if (this.graph) {
        const w = this.graph.getEdgeWeight(typeNode, "agent:" + name, 1.0);
        parts.learned = Math.max(-2, Math.min(4, 2.0 * (w - 1.0)));
      }

      const h = st.handoffs[name];
      if (h) parts.handoff = Math.min(3, 2.0 * (h.confidence == null ? 0.6 : h.confidence) + 0.8);

      parts.penalty += (st.runs[name] || 0) * 1.5;
      if (st.lastRole === name) parts.penalty += 3.0;

      const total = parts.prior + parts.learned + parts.handoff - parts.penalty;
      return { name, role, score: Math.round(total * 100) / 100, parts };
    }).sort((a, b) => b.score - a.score);
  }

  choose(scored) {
    const candidates = scored.filter(s => s.score > MIN_SCORE);
    if (!candidates.length) return null;
    const top = candidates[0];

    // Solo se explora entre roles que no escriben archivos.
    if (candidates.length > 1 && this.rng() < this.epsilon) {
      const pool = candidates.slice(1).filter(c => !isWriter(c.role));
      if (pool.length) {
        const pick = pool[Math.floor(this.rng() * pool.length) % pool.length];
        return { picks: [pick], explored: true };
      }
    }

    const second = candidates[1];
    if (second && !isWriter(top.role) && !isWriter(second.role) && top.score - second.score < PARALLEL_GAP) {
      return { picks: [top, second], explored: false };
    }
    return { picks: [top], explored: false };
  }

  learn(r, taskType, st) {
    if (!this.graph || !r || !r.role) return;
    const typeNode = "task_type:" + taskType;
    const agentNode = "agent:" + r.role;
    const conf = r.handoff && r.handoff.confidence;
    const success = !r.error
      && (r.responseText || "").trim().length > 20
      && !(r.hallucinations && r.hallucinations.length)
      && (conf == null || conf >= 0.5)
      && producedSomething(r);

    this.graph.reinforce(typeNode, agentNode, "routes", success);

    const via = st.handoffs[r.role];
    if (via && via.from) this.graph.reinforce("agent:" + via.from, agentNode, "handoff", success);

    if (CRITIC_ROLES.has(r.role) && (st.runs.Coder || 0) > 0 && r.handoff) {
      if (r.handoff.next === "Coder") this.graph.reinforce(typeNode, "agent:Coder", "routes", false);
      else if (r.handoff.closed && (conf || 0) >= CLOSE_CONFIDENCE) this.graph.reinforce(typeNode, "agent:Coder", "routes", true);
    }
    return success;
  }

  async run(userTask, baseContext) {
    const taskType = classifyTaskType(userTask);
    const st = this._newState();
    let stopReason = "limite de pasos";
    this.log("[coordinador] tipo de tarea: " + taskType);

    for (let step = 0; step < this.maxSteps; step++) {
      if (this.isAborted()) { stopReason = "cancelado"; break; }

      const scored = this.score(taskType, st);
      const choice = this.choose(scored);
      if (!choice) { stopReason = "ningun agente aporta mas"; break; }

      const names = choice.picks.map(p => p.name);
      const decision = {
        step: step + 1,
        chosen: names,
        explored: choice.explored,
        scores: scored.slice(0, 5).map(s => ({ name: s.name, score: s.score, parts: s.parts }))
      };
      st.decisions.push(decision);
      this.emit("coordinator_decision", decision);
      this.log("[coordinador] paso " + (step + 1) + " -> " + names.join(" + ") + (choice.explored ? " (exploracion)" : "")
        + " | " + decision.scores.map(s => s.name + "=" + s.score).join(", "));

      const ctx = (baseContext || "") + (st.results.length ? "\n\nRESULTADOS PREVIOS DEL EQUIPO:\n" + this.summarize(st.results.slice(-3)) : "");
      const results = (await this.runAgents(choice.picks.map(p => p.role), userTask, ctx, step)) || [];

      const abortedNow = this.isAborted();
      let progressed = false;
      results.forEach(r => {
        const ok = abortedNow ? false : this.learn(r, taskType, st);
        if (ok) progressed = true;
        st.runs[r.role] = (st.runs[r.role] || 0) + 1;
        delete st.handoffs[r.role];
        if (r.role === "Coder" && wroteFiles(r)) st.coderPending = true;
        if (CRITIC_ROLES.has(r.role) && !r.error) st.coderPending = false;
        if (r.handoff && r.handoff.next && r.handoff.next !== r.role) {
          st.handoffs[r.handoff.next] = { from: r.role, confidence: r.handoff.confidence };
        }
        st.results.push(r);
      });
      st.lastRole = names[names.length - 1];
      st.noProgress = progressed ? 0 : st.noProgress + 1;

      if (this.isAborted()) { stopReason = "cancelado"; break; }
      if (st.noProgress >= 2) { stopReason = "dos pasos sin progreso"; break; }
      const closer = results.find(r => r.handoff && r.handoff.closed && (r.handoff.confidence || 0) >= CLOSE_CONFIDENCE
        && (!NEEDS_CODE.has(taskType) || (CRITIC_ROLES.has(r.role) && (st.runs.Coder || 0) > 0)));
      if (closer && !st.coderPending && !Object.keys(st.handoffs).length) {
        stopReason = "cerrada por " + closer.role;
        break;
      }
    }

    this.emit("coordinator_done", { taskType, stopReason, steps: st.decisions.length });
    this.log("[coordinador] fin: " + stopReason);
    return { results: st.results, decisions: st.decisions, taskType, stopReason };
  }
}
