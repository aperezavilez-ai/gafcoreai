import { test } from "node:test";
import assert from "node:assert/strict";
import { SynapticSync, SYNC_SCHEMA, isRoutingEdge } from "../synaptic-sync.js";
import { SynapticGraph } from "../synaptic-graph.js";

const CFG = () => ({ url: "https://supabase.gafcore.com/", key: "anon-test" });

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

test("SynapticSync - push manda solo aristas de enrutamiento al schema gafcoreai", async () => {
  const graph = new SynapticGraph({ storageKey: "t_push" });
  graph.reinforce("task_type:code", "agent:Coder", "routes", true);
  graph.reinforce("agent:Coder", "tool:write_file", "uses_tool", true);
  graph.addNode({ id: "fact:abc", type: "fact", label: "secreto de conversacion" });
  graph.connect("fact:abc", "tool:read_file", "related_to");

  const calls = [];
  const sync = new SynapticSync({ graph, getConfig: CFG, fetchImpl: async (u, o) => { calls.push({ u, o }); return okResponse([]); } });
  const r = await sync.push();

  assert.equal(r.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].u, "https://supabase.gafcore.com/rest/v1/synaptic_edges?on_conflict=source,target");
  assert.equal(calls[0].o.headers["Content-Profile"], SYNC_SCHEMA);
  assert.equal(calls[0].o.headers["Accept-Profile"], SYNC_SCHEMA);
  assert.equal(SYNC_SCHEMA, "gafcoreai");
  const rows = JSON.parse(calls[0].o.body);
  assert.ok(rows.length >= 2);
  assert.ok(rows.every(row => /^(agent|task_type):/.test(row.source)));
  assert.ok(!calls[0].o.body.includes("fact:"));

  const again = await sync.push();
  assert.equal(again.pushed, 0, "no reenvia aristas sin cambios");
});

test("SynapticSync - pull fusiona aristas remotas mas nuevas e ignora las que no son de enrutamiento", async () => {
  const graph = new SynapticGraph({ storageKey: "t_pull" });
  const future = new Date(Date.now() + 60000).toISOString();
  const rows = [
    { source: "task_type:security", target: "agent:Security", relation: "routes", weight: 4.2, successes: 9, failures: 1, updated_at: future },
    { source: "fact:zzz", target: "agent:Coder", relation: "x", weight: 9, successes: 0, failures: 0, updated_at: future }
  ];
  const sync = new SynapticSync({ graph, getConfig: CFG, fetchImpl: async (u, o) => {
    assert.equal(o.headers["Accept-Profile"], "gafcoreai");
    return okResponse(rows);
  } });
  const r = await sync.pull();
  assert.equal(r.ok, true);
  assert.equal(r.merged, 1);
  assert.equal(graph.getEdgeWeight("task_type:security", "agent:Security"), 4.2);
  assert.equal(graph.getEdgeWeight("fact:zzz", "agent:Coder", -1), -1);
});

test("SynapticSync - nunca usa Supabase Cloud ni falla sin configuracion", async () => {
  const graph = new SynapticGraph({ storageKey: "t_cloud" });
  graph.reinforce("task_type:code", "agent:Coder", "routes", true);
  let called = false;
  const fetchImpl = async () => { called = true; return okResponse([]); };
  const cloud = new SynapticSync({ graph, getConfig: () => ({ url: "https://abc.supabase.co", key: "k" }), fetchImpl });
  assert.equal((await cloud.push()).ok, false);
  const none = new SynapticSync({ graph, getConfig: () => ({ url: "", key: "" }), fetchImpl });
  assert.equal((await none.pull()).ok, false);
  assert.equal(called, false);
});

test("SynapticSync - errores de red no lanzan excepcion", async () => {
  const graph = new SynapticGraph({ storageKey: "t_err" });
  graph.reinforce("task_type:code", "agent:Coder", "routes", true);
  const logs = [];
  const sync = new SynapticSync({ graph, getConfig: CFG, fetchImpl: async () => ({ ok: false, status: 530 }), log: (m) => logs.push(m) });
  const r = await sync.push();
  assert.equal(r.ok, false);
  assert.match(r.error, /530/);
  assert.equal(logs.length, 1);
  await sync.push();
  assert.equal(logs.length, 1, "avisa una sola vez");
});

test("isRoutingEdge - valida el origen", () => {
  assert.equal(isRoutingEdge({ source: "agent:Coder", target: "tool:read_file" }), true);
  assert.equal(isRoutingEdge({ source: "file:/etc/passwd", target: "agent:Coder" }), false);
  assert.equal(isRoutingEdge({ source: "agent:'; drop table", target: "agent:Coder" }), false);
});
