import { test } from "node:test";
import assert from "node:assert/strict";
import { AgentCoordinator, classifyTaskType } from "../coordinator.js";
import { SynapticGraph } from "../synaptic-graph.js";

const NO_EXPLORE = () => 0.99;

function result(role, { text = "Hallazgo suficientemente largo para contar.", facts = ["x.js:1 hecho"], next = null, closed = false, confidence = 0.8, wrote = false, error = null } = {}) {
  return {
    role,
    error,
    responseText: text,
    hallucinations: [],
    toolResults: wrote ? [{ name: "write_file", ok: true, path: "a.js" }] : [{ name: "read_file", ok: true }],
    handoff: { summary: "ok", facts, decisions: [], next, closed, confidence }
  };
}

function makeCoordinator(script, opts = {}) {
  const calls = [];
  const graph = opts.graph || new SynapticGraph({ storageKey: "test_" + Math.random() });
  const coord = new AgentCoordinator({
    graph,
    rng: opts.rng || NO_EXPLORE,
    maxSteps: opts.maxSteps || 8,
    isAborted: opts.isAborted,
    runAgents: async (roles) => {
      calls.push(roles.map(r => r.name));
      return roles.map(r => (script[r.name] ? script[r.name](calls.length) : result(r.name, { facts: [] })));
    }
  });
  return { coord, calls, graph };
}

test("classifyTaskType - tipos basicos", () => {
  assert.equal(classifyTaskType("audita la seguridad del login"), "security");
  assert.equal(classifyTaskType("arregla el bug del carrito"), "fix");
  assert.equal(classifyTaskType("crea una pagina de contacto"), "code");
  assert.equal(classifyTaskType("analiza la arquitectura"), "analysis");
  assert.equal(classifyTaskType("hola"), "general");
});

test("Coordinador - el primer paso explora y nunca empieza por el Coder", () => {
  const { coord } = makeCoordinator({});
  const st = coord._newState();
  const choice = coord.choose(coord.score("code", st));
  const names = choice.picks.map(p => p.name);
  assert.ok(names.includes("Explorer"));
  assert.ok(!names.includes("Coder"));
});

test("Coordinador - ni con peso aprendido maximo el Coder arranca primero", () => {
  const graph = new SynapticGraph({ storageKey: "test_c" });
  for (let i = 0; i < 40; i++) graph.reinforce("task_type:code", "agent:Coder", "routes", true);
  const { coord } = makeCoordinator({}, { graph });
  const choice = coord.choose(coord.score("code", coord._newState()));
  assert.ok(choice.picks.every(p => p.name !== "Coder"));
});

test("Coordinador - si el Coder escribio, el Reviewer va despues", () => {
  const { coord } = makeCoordinator({});
  const st = coord._newState();
  st.results.push(result("Explorer"), result("Coder", { wrote: true }));
  st.runs = { Explorer: 1, Coder: 1 };
  st.lastRole = "Coder";
  st.coderPending = true;
  const choice = coord.choose(coord.score("code", st));
  assert.equal(choice.picks[0].name, "Reviewer");
});

test("Coordinador - los pesos aprendidos cambian el enrutamiento", () => {
  const graph = new SynapticGraph({ storageKey: "test_w" });
  for (let i = 0; i < 12; i++) graph.reinforce("task_type:analysis", "agent:Security", "routes", true);
  const { coord } = makeCoordinator({}, { graph });
  const top = coord.score("analysis", coord._newState())[0];
  assert.equal(top.name, "Security");
});

test("Coordinador - la exploracion nunca elige un rol que escribe", () => {
  const { coord } = makeCoordinator({}, { rng: () => 0 });
  const st = coord._newState();
  st.results.push(result("Explorer"));
  st.runs = { Explorer: 1 };
  st.handoffs = { Reviewer: { from: "Explorer", confidence: 0.9 } };
  const scored = coord.score("code", st);
  assert.ok(scored.filter(s => s.score > 0.5).some(s => s.name === "Coder"), "el Coder es candidato");
  const choice = coord.choose(scored);
  assert.equal(choice.explored, true);
  assert.ok(choice.picks.every(p => p.name !== "Coder"));
});

test("Coordinador - flujo completo: explora, codifica, revisa y cierra aprendiendo", async () => {
  const { coord, calls, graph } = makeCoordinator({
    Explorer: () => result("Explorer", { next: "Coder" }),
    Analyst: () => result("Analyst", { next: "Coder" }),
    Planner: () => result("Planner", { next: "Coder" }),
    Coder: () => result("Coder", { wrote: true, next: "Reviewer" }),
    Reviewer: () => result("Reviewer", { closed: true, confidence: 0.9 })
  });
  const out = await coord.run("crea un formulario de contacto", "{}");
  const flat = calls.flat();
  assert.ok(flat.indexOf("Coder") > 0, "el Coder corre despues de explorar");
  assert.ok(flat.indexOf("Reviewer") > flat.indexOf("Coder"), "el Reviewer revisa al Coder");
  assert.match(out.stopReason, /cerrada por Reviewer/);
  assert.ok(graph.getEdgeWeight("task_type:code", "agent:Coder") > 1.0, "el Reviewer refuerza al Coder");
  assert.ok(graph.getEdgeWeight("agent:Coder", "agent:Reviewer") > 1.0, "se refuerza la arista de handoff");
  assert.ok(out.decisions.length >= 3);
});

test("Coordinador - el rechazo del Reviewer debilita al Coder", async () => {
  let reviews = 0;
  const { coord, graph } = makeCoordinator({
    Explorer: () => result("Explorer", { next: "Coder" }),
    Analyst: () => result("Analyst"),
    Planner: () => result("Planner"),
    Coder: () => result("Coder", { wrote: true, next: "Reviewer" }),
    Reviewer: () => (++reviews === 1 ? result("Reviewer", { next: "Coder" }) : result("Reviewer", { closed: true, confidence: 0.9 }))
  }, { maxSteps: 3 });
  await coord.run("crea un formulario", "{}");
  const edge = graph.exportEdges(e => e.source === "task_type:code" && e.target === "agent:Coder")[0];
  assert.ok(edge && edge.failures >= 1);
});

test("Coordinador - se detiene tras dos pasos sin progreso", async () => {
  const { coord, calls } = makeCoordinator({}, { maxSteps: 8 });
  const empty = { responseText: "", toolResults: [], hallucinations: [], handoff: null };
  coord.runAgents = async (roles) => { calls.push(roles.map(r => r.name)); return roles.map(r => ({ role: r.name, ...empty })); };
  const out = await coord.run("analiza el proyecto", "{}");
  assert.equal(out.stopReason, "dos pasos sin progreso");
  assert.equal(calls.length, 2);
});

test("Coordinador - cancelado no aprende ni sigue", async () => {
  let aborted = false;
  const { coord, calls, graph } = makeCoordinator({
    Explorer: () => { aborted = true; return result("Explorer", { error: "cancelado" }); }
  }, { isAborted: () => aborted });
  const out = await coord.run("analiza el proyecto", "{}");
  assert.equal(out.stopReason, "cancelado");
  assert.equal(calls.length, 1);
  assert.equal(graph.exportEdges(e => e.relation === "routes").length, 0);
});
