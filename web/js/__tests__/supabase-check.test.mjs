import { test } from "node:test";
import assert from "node:assert/strict";

const _ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, String(v)),
  removeItem: (k) => _ls.delete(k),
};

const { checkSupabase, getSupabaseConfig, SUPABASE_DEFAULT_URL } = await import("../tools.js");

test("URL por defecto es el stack self-hosted, no Supabase Cloud", () => {
  _ls.clear();
  assert.equal(SUPABASE_DEFAULT_URL, "https://supabase.gafcore.com");
  assert.equal(getSupabaseConfig().url, "https://supabase.gafcore.com");
});

test("checkSupabase falla si no hay anon key", async () => {
  _ls.clear();
  await assert.rejects(checkSupabase(async () => ({ ok: true })), /Anon Key/);
});

test("checkSupabase hace GET a /rest/v1/ con la anon key y acepta 2xx", async () => {
  _ls.set("gafcoreai_sb", JSON.stringify({ url: "https://supabase.gafcore.com/", key: "anon123" }));
  let called = null;
  const url = await checkSupabase(async (u, opts) => { called = { u, opts }; return { ok: true, status: 200 }; });
  assert.equal(url, "https://supabase.gafcore.com");
  assert.equal(called.u, "https://supabase.gafcore.com/rest/v1/");
  assert.equal(called.opts.headers.apikey, "anon123");
  assert.equal(called.opts.headers.Authorization, "Bearer anon123");
});

test("checkSupabase reporta error con HTTP no 2xx", async () => {
  _ls.set("gafcoreai_sb", JSON.stringify({ url: "https://supabase.gafcore.com", key: "k" }));
  await assert.rejects(checkSupabase(async () => ({ ok: false, status: 530 })), /HTTP 530/);
});

test("checkSupabase reporta error de red", async () => {
  _ls.set("gafcoreai_sb", JSON.stringify({ url: "https://supabase.gafcore.com", key: "k" }));
  await assert.rejects(checkSupabase(async () => { throw new Error("Failed to fetch"); }), /No se pudo conectar/);
});
