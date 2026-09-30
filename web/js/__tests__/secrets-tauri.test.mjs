// secrets.js en modo Tauri con un store simulado.
import { test } from "node:test";
import assert from "node:assert/strict";

const _ls = new Map([["gafcoreai_github", '{"token":"legacy"}']]);
globalThis.localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, String(v)),
  removeItem: (k) => _ls.delete(k),
};

const ops = [];
const data = new Map();
const fakeStore = {
  async get(k) { return data.has(k) ? data.get(k) : null; },
  async set(k, v) { ops.push(["set", k]); data.set(k, v); },
  async delete(k) { ops.push(["delete", k]); data.delete(k); },
  async save() { ops.push(["save"]); },
};
globalThis.window = {
  addEventListener: () => {},
  __TAURI__: { store: { Store: { load: async () => fakeStore } } },
};

const { initSecrets, getSecret, setSecret, removeSecret, isTauriSecrets, flushSecrets } = await import("../secrets.js");

test("initSecrets migra claves legacy de localStorage al store", async () => {
  await initSecrets();
  assert.equal(isTauriSecrets(), true);
  assert.equal(getSecret("gafcoreai_github"), '{"token":"legacy"}');
  assert.equal(localStorage.getItem("gafcoreai_github"), null);
});

test("setSecret escribe al store de inmediato, sin esperar al debounce", async () => {
  ops.length = 0;
  setSecret("gafcoreai_vercel", '{"token":"v"}');
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(ops[0], ["set", "gafcoreai_vercel"]);
  assert.equal(data.get("gafcoreai_vercel"), '{"token":"v"}');
  assert.equal(localStorage.getItem("gafcoreai_vercel"), null, "no debe volver a localStorage");
});

test("flushSecrets hace save() despues de los set/delete pendientes", async () => {
  ops.length = 0;
  setSecret("gafcoreai_sb", '{"url":"u","key":"k"}');
  removeSecret("gafcoreai_vercel");
  await flushSecrets();
  assert.deepEqual(ops, [["set", "gafcoreai_sb"], ["delete", "gafcoreai_vercel"], ["save"]]);
  assert.equal(getSecret("gafcoreai_vercel"), null);
});
