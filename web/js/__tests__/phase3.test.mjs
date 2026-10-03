import { test } from "node:test";
import assert from "node:assert/strict";
import { SynapticGraph, errorSignature, tokenize, lexicalSimilarity } from "../synaptic-graph.js";
import { reflectOnResult } from "../self-reflection.js";
import { chatCompletion } from "../providers.js";

const newGraph = () => new SynapticGraph({ storageKey: "p3_" + Math.random() });

test("errorSignature ignora rutas, cadenas y numeros", () => {
  const a = errorSignature("Error: Cannot find module 'react' in D:\\PROYECTO\\src\\app.js:12");
  const b = errorSignature("Error: Cannot find module 'vue' in C:\\otro\\main.js:99");
  assert.equal(a, b);
  assert.ok(!/\d/.test(a.replace(/<n>/g, "")));
});

test("learnErrorFix + lookupErrorFix reutilizan la solucion en otro archivo", () => {
  const g = newGraph();
  g.learnErrorFix({
    errorMessage: "old_string not found in D:\\X\\web\\app.js",
    toolName: "edit_file",
    fixSteps: ["read_file D:\\X\\web\\app.js"]
  });
  const fix = g.lookupErrorFix("old_string not found in D:\\Y\\src\\main.js");
  assert.ok(fix, "debe encontrar la solucion aprendida");
  assert.match(fix.fixProposal, /read_file/);
  assert.equal(g.lookupErrorFix("algo totalmente distinto ocurrio aqui"), null);
});

test("learnErrorFix no guarda nada sin pasos intermedios", () => {
  const g = newGraph();
  assert.equal(g.learnErrorFix({ errorMessage: "fallo raro de red", toolName: "run_command", fixSteps: [] }), null);
});

test("lexicalSimilarity reconoce raices comunes", () => {
  const q = tokenize("crear proyectos nuevos en supabase");
  assert.ok(lexicalSimilarity(q, "Crea un proyecto nuevo") > 0);
  assert.equal(lexicalSimilarity(q, "zzz qqq"), 0);
});

test("getRelevantSubgraph prioriza nodos por similitud lexica", () => {
  const g = newGraph();
  g.addNode({ id: "project:lipoblue", type: "project", label: "LIPOBLUE", data: { description: "tienda de suplementos con pagos stripe" } });
  g.addNode({ id: "project:otro", type: "project", label: "OTRO", data: { description: "juego de ajedrez" } });
  const { nodes } = g.getRelevantSubgraph("arregla los pagos de stripe en la tienda", {}, 8);
  const ids = nodes.map(n => n.id);
  assert.ok(ids.includes("project:lipoblue"));
  assert.ok(!ids.includes("project:otro") || ids.indexOf("project:lipoblue") < ids.indexOf("project:otro"));
});

test("getRelevantSubgraphSemantic usa embeddings y cae a lexico si fallan", async () => {
  const g = newGraph();
  g.addNode({ id: "rule:pagos", type: "rule", label: "cobros", data: { note: "facturacion" } });
  const vec = t => (/cobros|dinero/.test(t) ? [1, 0] : [0, 1]);
  const embedder = { embed: async t => vec(t), embedBatch: async ts => ts.map(vec) };
  const sem = await g.getRelevantSubgraphSemantic("necesito dinero", {}, 8, embedder);
  assert.ok(sem.nodes.some(n => n.id === "rule:pagos"));

  const broken = { embed: async () => { throw new Error("sin red"); }, embedBatch: async () => [] };
  const fallback = await g.getRelevantSubgraphSemantic("necesito dinero", {}, 8, broken);
  assert.ok(Array.isArray(fallback.nodes));
});

test("reflectOnResult detecta cambios afirmados sin escritura", () => {
  const v = reflectOnResult({
    userTask: "corrige el boton de login",
    response: "Listo, ya quedó. He modificado el archivo login.js.",
    toolResults: [{ name: "read_file", ok: true, path: "login.js" }]
  });
  assert.equal(v.ok, false);
  assert.match(v.redirect, /AUTO-REFLEXIÓN/);
});

test("reflectOnResult acepta resultados correctos y preguntas", () => {
  assert.equal(reflectOnResult({
    userTask: "corrige el boton de login",
    response: "He modificado login.js para validar el formulario.",
    toolResults: [{ name: "edit_file", ok: true, path: "login.js" }]
  }).ok, true);
  assert.equal(reflectOnResult({
    userTask: "¿cómo creo un componente?",
    response: "Puedes crear un componente así: ```js\nfunction A(){}\n```",
    toolResults: [],
    diskFolder: "D:\\X"
  }).ok, true);
});

test("reflectOnResult detecta escrituras fallidas sin reintento", () => {
  const v = reflectOnResult({
    userTask: "agrega el footer",
    response: "Agregué el footer al sitio.",
    toolResults: [
      { name: "edit_file", ok: false, path: "index.html" },
      { name: "read_file", ok: true, path: "index.html" }
    ]
  });
  assert.equal(v.ok, false);
  assert.ok(v.issues.some(s => s.includes("index.html")));
});

test("reflectOnResult no interviene si hubo error de API o cancelacion", () => {
  assert.equal(reflectOnResult({ userTask: "crea x", response: "⚠️ **El modelo no respondió**", toolResults: [] }).ok, true);
  assert.equal(reflectOnResult({ userTask: "crea x", response: "He creado x", toolResults: [], aborted: true }).ok, true);
});

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  const hadWindow = "window" in globalThis;
  if (!hadWindow) globalThis.window = { fetch: (...a) => globalThis.fetch(...a) };
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
    if (!hadWindow) delete globalThis.window;
  });
}

const jsonResponse = body => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const provider = { url: "http://fake.local" };
const model = { id: "fake-model", key: "k" };

test("chatCompletion lanza EMPTY_RESPONSE cuando el modelo no devuelve texto", async () => {
  await withFetch(async () => jsonResponse({ choices: [{ message: { content: "" }, finish_reason: "length" }] }), async () => {
    const tokens = [];
    await assert.rejects(
      chatCompletion(provider, model, [{ role: "user", content: "hola" }], t => tokens.push(t)),
      e => e.code === "EMPTY_RESPONSE" && /finish_reason: length/.test(e.message)
    );
    assert.deepEqual(tokens, []);
  });
});

test("chatCompletion avisa cuando solo llega razonamiento", async () => {
  await withFetch(async () => jsonResponse({ choices: [{ message: { content: "", reasoning_content: "pensando..." } }] }), async () => {
    await assert.rejects(chatCompletion(provider, model, [], () => {}), e => e.code === "EMPTY_RESPONSE" && /razonamiento/.test(e.message));
  });
});

test("chatCompletion expone json.error con HTTP 200", async () => {
  await withFetch(async () => jsonResponse({ error: { message: "Insufficient credits" } }), async () => {
    await assert.rejects(chatCompletion(provider, model, [], () => {}), /Insufficient credits/);
  });
});

test("chatCompletion devuelve el texto normal", async () => {
  await withFetch(async () => jsonResponse({ choices: [{ message: { content: "hola!" } }] }), async () => {
    const out = await chatCompletion(provider, model, [], () => {});
    assert.equal(out, "hola!");
  });
});
