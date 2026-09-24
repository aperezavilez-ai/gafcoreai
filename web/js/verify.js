// ============================================================
//  GafCoreAI - verify.js
//  Usa Tauri HTTP (bypass CORS) con fallback a fetch nativo
// ============================================================

function getTauriFetch() {
  if (typeof window === "undefined" || !window.__TAURI__) return null;
  const t = window.__TAURI__;
  if (t.http && typeof t.http.fetch === "function") return t.http.fetch.bind(t.http);
  if (t.plugin && t.plugin.http && typeof t.plugin.http.fetch === "function") return t.plugin.http.fetch.bind(t.plugin.http);
  if (t.plugins && t.plugins.http && typeof t.plugins.http.fetch === "function") return t.plugins.http.fetch.bind(t.plugins.http);
  return null;
}

async function safeFetch(url, options) {
  const tauriFetch = getTauriFetch();
  if (tauriFetch) {
    try {
      const r = await tauriFetch(url, options);
      console.log("[verify] Tauri HTTP OK");
      return r;
    } catch (e) {
      console.warn("[verify] Tauri HTTP fallo:", e.message, "- intentando fetch nativo");
    }
  }
  console.log("[verify] usando fetch nativo (CORS puede bloquear)");
  return await fetch(url, options);
}

export async function verifyGroupKey(provider, group, key) {
  if (!key) return { ok: false, error: "Key vacia" };
  if (!group.models || !group.models.length) {
    return { ok: false, error: "Grupo sin modelos" };
  }

  const testModel = group.models[0];
  const url = provider.url.replace(/\/$/, "") + "/v1/chat/completions";

  try {
    const res = await safeFetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
        stream: false
      })
    });

    if (!res.ok) {
      let errMsg = "HTTP " + res.status;
      try {
        const err = await res.json();
        if (err.error) errMsg += " - " + (err.error.message || JSON.stringify(err.error));
      } catch (_) {}
      return { ok: false, error: errMsg };
    }

    return { ok: true, model: testModel };
  } catch (e) {
    return { ok: false, error: e.message || "Error de red" };
  }
}