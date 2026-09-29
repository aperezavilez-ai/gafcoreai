// web/js/__tests__/secrets.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

// Mock mínimo de window + localStorage para Node
const _ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, String(v)),
  removeItem: (k) => _ls.delete(k),
  get length() { return _ls.size; },
  key: (i) => Array.from(_ls.keys())[i],
};
globalThis.window = { addEventListener: () => {} };

const {
  initSecrets, getSecret, setSecret, removeSecret,
  isTauriSecrets, listSecretKeys, SECRET_KEYS,
} = await import("../secrets.js");

test("SECRET_KEYS incluye providers y github", () => {
  assert.ok(SECRET_KEYS.includes("gafcoreai_providers_v3"));
  assert.ok(SECRET_KEYS.includes("gafcoreai_github"));
});

test("initSecrets en modo web (sin Tauri) usa localStorage", async () => {
  await initSecrets();
  assert.equal(isTauriSecrets(), false);
});

test("setSecret + getSecret en modo web persiste a localStorage", () => {
  setSecret("gafcoreai_github", '{"token":"abc"}');
  assert.equal(getSecret("gafcoreai_github"), '{"token":"abc"}');
  assert.equal(localStorage.getItem("gafcoreai_github"), '{"token":"abc"}');
});

test("setSecret con null elimina la key", () => {
  setSecret("gafcoreai_vercel", '{"token":"xyz"}');
  assert.ok(getSecret("gafcoreai_vercel"));
  setSecret("gafcoreai_vercel", null);
  assert.equal(getSecret("gafcoreai_vercel"), null);
  assert.equal(localStorage.getItem("gafcoreai_vercel"), null);
});

test("removeSecret es alias de setSecret(key, null)", () => {
  setSecret("gafcoreai_sb", "data");
  removeSecret("gafcoreai_sb");
  assert.equal(getSecret("gafcoreai_sb"), null);
});

test("getSecret de key inexistente devuelve null", () => {
  assert.equal(getSecret("__nunca_existio__"), null);
});

test("listSecretKeys devuelve solo las keys en caché", () => {
  setSecret("gafcoreai_github", "x");
  const keys = listSecretKeys();
  assert.ok(keys.includes("gafcoreai_github"));
});