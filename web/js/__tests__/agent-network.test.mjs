import { test } from "node:test";
import assert from "node:assert/strict";
import { AgentMemory } from "../agent-memory.js";
import { ToolRegistry, PermissionManager, PERMISSION_LEVELS, MultiAgentOrchestrator, extractHandoff } from "../core.js";

function makeMemory(initialScope) {
  let scope = initialScope;
  const mem = new AgentMemory({ scopeResolver: () => scope });
  mem.facts = []; mem.decisions = []; mem.handoffs = [];
  return { mem, setScope: (s) => { scope = s; } };
}

test("AgentMemory - los facts de otra conversacion no entran al contexto", () => {
  const { mem, setScope } = makeMemory("conv:a");
  mem.addFact("Analyst", "A usa Next.js", "t1");
  setScope("conv:b");
  mem.addFact("Analyst", "B usa Vite", "t2");

  const ctxB = mem.buildContext("Coder");
  assert.match(ctxB, /B usa Vite/);
  assert.doesNotMatch(ctxB, /A usa Next\.js/);

  setScope("conv:a");
  const ctxA = mem.buildContext("Coder");
  assert.match(ctxA, /A usa Next\.js/);
  assert.doesNotMatch(ctxA, /B usa Vite/);
});

test("AgentMemory - entradas legacy sin scope nunca se inyectan", () => {
  const { mem } = makeMemory("conv:a");
  mem.facts.push({ agent: "Explorer", fact: "fact viejo global", ts: 1, taskId: null });
  assert.equal(mem.buildContext("Coder"), "");
});

test("AgentMemory - sin conversacion activa solo ve la tarea actual", () => {
  const { mem } = makeMemory(null);
  mem.addFact("Explorer", "de la tarea 1", "t1");
  mem.addFact("Explorer", "de la tarea 2", "t2");
  const ctx = mem.buildContext("Coder", { taskId: "t2" });
  assert.match(ctx, /de la tarea 2/);
  assert.doesNotMatch(ctx, /de la tarea 1/);
  assert.equal(mem.buildContext("Coder"), "");
});

test("AgentMemory - handoffs filtrados por scope y clearScope", () => {
  const { mem, setScope } = makeMemory("conv:a");
  mem.handoff("Analyst", "Coder", "arregla app.js", "t1");
  setScope("conv:b");
  assert.equal(mem.getPendingHandoffs("Coder").length, 0);
  setScope("conv:a");
  assert.equal(mem.getPendingHandoffs("Coder").length, 1);
  mem.addFact("Analyst", "x", "t1");
  assert.equal(mem.clearScope("conv:a"), 2);
  assert.equal(mem.buildContext("Coder"), "");
});

test("extractHandoff - quita el bloque y normaliza campos", () => {
  const text = "Hallazgo principal.\n\n```handoff\n" +
    JSON.stringify({ summary: "ok", facts: ["a.js:10 usa eval"], decisions: [{ decision: "quitar eval", reason: "xss" }], next: "coder", confidence: 3 }) +
    "\n```";
  const { text: visible, handoff } = extractHandoff(text);
  assert.equal(visible, "Hallazgo principal.");
  assert.equal(handoff.next, "Coder");
  assert.equal(handoff.confidence, 1);
  assert.deepEqual(handoff.facts, ["a.js:10 usa eval"]);
  assert.equal(handoff.decisions[0].decision, "quitar eval");
});

test("extractHandoff - JSON invalido o next desconocido", () => {
  assert.equal(extractHandoff("```handoff\n{no json}\n```").handoff, null);
  assert.equal(extractHandoff("```handoff\n{\"next\":\"Hacker\"}\n```").handoff.next, null);
  assert.equal(extractHandoff("```handoff\n{\"next\":\"Hacker\"}\n```").handoff.closed, false);
  assert.equal(extractHandoff("```handoff\n{\"next\":\"none\"}\n```").handoff.closed, true);
  assert.equal(extractHandoff("sin bloque").handoff, null);
});

function makeOrchestrator(answers) {
  const reg = new ToolRegistry(new PermissionManager());
  const asked = [];
  reg.setApprover(async (req) => { asked.push(req); return answers.shift(); });
  reg.register("write_file", { level: PERMISSION_LEVELS.WRITE, run: async () => "ok" });
  reg.register("read_file", { level: PERMISSION_LEVELS.READ, run: async () => "x" });
  const { mem } = makeMemory("conv:a");
  const orch = new MultiAgentOrchestrator({ tools: reg, teamMemory: mem, taskId: "t1" });
  return { orch, asked, mem };
}

test("Gate - escritura fuera del rol pide aprobacion y respeta el rechazo", async () => {
  const { orch, asked } = makeOrchestrator(["deny"]);
  const reviewer = { name: "Reviewer", allowedTools: ["read_file"] };
  const r = await orch._gateToolCall(reviewer, { name: "write_file", args: { path: "a.js" } });
  assert.equal(r.ok, false);
  assert.equal(asked.length, 1);
  assert.equal(asked[0].allowAlways, false);
});

test("Gate - lectura y escritura propia del rol no piden aprobacion", async () => {
  const { orch, asked } = makeOrchestrator([]);
  const reviewer = { name: "Reviewer", allowedTools: ["read_file"] };
  const coder = { name: "Coder", allowedTools: ["write_file"] };
  assert.equal((await orch._gateToolCall(reviewer, { name: "read_file", args: { path: "a.js" } })).ok, true);
  assert.equal((await orch._gateToolCall(coder, { name: "write_file", args: { path: "a.js" } })).ok, true);
  assert.equal(asked.length, 0);
});

test("Gate - un archivo bloqueado por otro agente no se puede escribir", async () => {
  const { orch, mem } = makeOrchestrator([]);
  mem.lockFile("a.js", "Tester");
  const coder = { name: "Coder", allowedTools: ["write_file"] };
  const r = await orch._gateToolCall(coder, { name: "write_file", args: { path: "a.js" } });
  assert.equal(r.ok, false);
  assert.match(r.error, /bloqueado por Tester/);
});
