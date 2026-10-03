// ============================================================
//  GafCoreAI - providers.js (v8 - SIN emojis, todo lineal)
//
//  APICredits  -> 1 key por grupo (a6-claude, a6-openai, ...)
//  ME AI Cloud -> 7 grupos, 1 key por modelo (lineal)
// ============================================================

export const PROVIDERS_VERSION = 11;

export const DEFAULT_PROVIDERS = [
  {
    id: "apicredits",
    name: "APICredits",
    url: "https://api.apicredits.site",
    groups: [
      {
        id: "a6-claude",
        name: "a6claude",
        key: "",
        models: ["claude-fable-5","claude-haiku-4-5","claude-opus-4-7","claude-opus-4-8","claude-sonnet-4-6","claude-sonnet-5"]
      },
      {
        id: "a6-openai",
        name: "a6openai",
        key: "",
        models: ["gpt-5.6-luna","gpt-5.6-sol","gpt-5.6-terra"]
      },
      {
        id: "a6-grok",
        name: "a6grok",
        key: "",
        models: ["grok-4.5"]
      },
      {
        id: "a6-deepseek",
        name: "a6deepseek",
        key: "",
        models: ["deepseek-v4-pro"]
      },
      {
        id: "a6-gemini",
        name: "a6gemini",
        key: "",
        models: ["gemini-2.5-flash"]
      }
    ]
  },
  {
    id: "meai",
    name: "ME AI Cloud",
    url: "https://api.meai.cloud/",
    groups: [
      { id: "meai-claude-haiku-4-5",  name: "claude-haiku-4-5",  key: "", models: ["claude-haiku-4-5"] },
      { id: "meai-claude-opus-4-8",   name: "claude-opus-4.8",   key: "", models: ["claude-opus-4.8"] },
      { id: "meai-claude-sonnet-4-6", name: "claude-sonnet-4.6", key: "", models: ["claude-sonnet-4.6"] },
      { id: "meai-deepseek-v4-pro",   name: "deepseek-v4-pro",   key: "", models: ["deepseek-v4-pro"] },
      { id: "meai-glm-5",             name: "glm-5",             key: "", models: ["glm-5"] },
      { id: "meai-kimi-k2-6",         name: "kimi-k2.6",         key: "", models: ["kimi-k2.6"] },
      { id: "meai-mimo-v2-5",         name: "mimo-v2.5",         key: "", models: ["mimo-v2.5"] },
      { id: "meai-minimax-m2-7",       name: "minimax-m2.7",      key: "", models: ["minimax-m2.7"] },
      { id: "meai-qwen3-6-plus",      name: "qwen3.6-plus",      key: "", models: ["qwen3.6-plus"] },
      { id: "meai-step-3-7-flash",    name: "Step-3.7-Flash",    key: "", models: ["Step-3.7-Flash"] }
    ]
  }
];

// ═══════════════════════════════════════════════════════════
//  SAFE FETCH: usa Tauri HTTP (bypass CORS) con fallback
// ═══════════════════════════════════════════════════════════
function getTauriFetch() {
  if (typeof window === "undefined" || !window.__TAURI__) return null;
  const t = window.__TAURI__;
  if (t.http && typeof t.http.fetch === "function") return t.http.fetch.bind(t.http);
  if (t.plugin && t.plugin.http && typeof t.plugin.http.fetch === "function") return t.plugin.http.fetch.bind(t.plugin.http);
  if (t.plugins && t.plugins.http && typeof t.plugins.http.fetch === "function") return t.plugins.http.fetch.bind(t.plugins.http);
  return null;
}

export async function safeFetch(url, options) {
  const tauriFetch = getTauriFetch();
  if (tauriFetch) {
    try {
      return await tauriFetch(url, options);
    } catch (e) {
      console.warn("[providers] Tauri HTTP fallo:", e.message);
    }
  }
  return await window.fetch(url, options);
}

export function getAllModels(provider) {
  const out = [];
  if (!provider || !provider.groups) return out;
  provider.groups.forEach(g => {
    g.models.forEach(mid => {
      out.push({ id: mid, groupId: g.id, groupName: g.name, key: g.key || "", providerId: provider.id });
    });
  });
  return out;
}

export function findModelWithKey(provider, modelId) {
  if (!provider || !provider.groups) return null;
  for (const g of provider.groups) {
    if (g.models.includes(modelId) && g.key) {
      return { id: modelId, key: g.key, groupId: g.id };
    }
  }
  return null;
}

export function getVerifiedModels(provider) {
  const out = [];
  if (!provider || !provider.groups) return out;
  provider.groups.forEach(g => {
    if (g.key && typeof g.key === "string" && g.key.trim().length > 0) {
      g.models.forEach(mid => {
        out.push({ provider, model: mid, key: g.key.trim(), groupId: g.id });
      });
    }
  });
  return out;
}

export const MODEL_CATEGORIES = {
  CHAT: "💬 Modo Chat (Preguntas Rápidas)",
  ANALYST: "🔍 Agentes de Análisis & Arquitectura",
  CODER: "💻 Agentes de Código & Creación de Proyectos"
};

export function classifyModelCategory(modelId) {
  const m = (modelId || "").toLowerCase();
  if (m.includes("haiku") || m.includes("flash") || (m.includes("mini") && !m.includes("minimax")) || m.includes("luna") || m.includes("fable")) {
    return MODEL_CATEGORIES.CHAT;
  }
  if (m.includes("opus") || m.includes("sonnet-4-6") || m.includes("sonnet-4.6") || m.includes("deepseek") || m.includes("kimi") || m.includes("terra") || m.includes("reasoner") || m.includes("r1") || m.includes("minimax")) {
    return MODEL_CATEGORIES.ANALYST;
  }
  return MODEL_CATEGORIES.CODER;
}

export function classifyQueryIntent(queryText) {
  if (!queryText || typeof queryText !== "string") return "chat";
  const q = queryText.toLowerCase().trim();

  if (/(crea|create|haz|escribe|programa|agrega|implementa|modifica|edita|corrige|parche|inserta|nuevo proyecto|nueva app|landing|html|css|javascript|react)/i.test(q)) {
    return "coder";
  }
  
  if (/(analiza|diagnostica|explica el error|por que falla|revisa|audita|arquitectura|estructura|como funciona|que hace|busca archivos|lista archivos|abre\s+(?:el\s+)?proyecto|abrir\s+(?:el\s+)?proyecto|carga\s+(?:el\s+)?proyecto|cargar\s+(?:el\s+)?proyecto)/i.test(q)) {
    return "analyst";
  }

  return "chat";
}

export function migrateIfNeeded(savedProviders) {
  if (!savedProviders || !Array.isArray(savedProviders)) return DEFAULT_PROVIDERS;

  // Merge defaults con guardados para preservar keys sin perder nuevos modelos (como minimax-m3)
  DEFAULT_PROVIDERS.forEach(defProv => {
    let targetProv = savedProviders.find(p => p.id === defProv.id);
    if (!targetProv) {
      savedProviders.push(JSON.parse(JSON.stringify(defProv)));
    } else {
      if (!targetProv.groups) targetProv.groups = [];
      defProv.groups.forEach(defGroup => {
        let targetGroup = targetProv.groups.find(g => g.id === defGroup.id);
        if (!targetGroup) {
          targetProv.groups.push(JSON.parse(JSON.stringify(defGroup)));
        } else {
          defGroup.models.forEach(m => {
            if (!targetGroup.models.includes(m)) targetGroup.models.push(m);
          });
        }
      });
    }
  });

  return savedProviders;
}

function providerErrorMessage(data) {
  if (!data || !data.error) return "";
  const e = data.error;
  return typeof e === "string" ? e : (e.message || e.code || JSON.stringify(e)).toString();
}

function emptyResponseError(data, modelId) {
  const c = data && data.choices && data.choices[0];
  const msg = c && c.message;
  const finish = c && c.finish_reason ? " (finish_reason: " + c.finish_reason + ")" : "";
  const reasoningOnly = !!(msg && (msg.reasoning_content || msg.reasoning));
  const err = new Error(reasoningOnly
    ? "El modelo " + modelId + " solo devolvio razonamiento interno, sin respuesta" + finish + ". Prueba con otro modelo."
    : "El modelo " + modelId + " devolvio una respuesta vacia" + finish + ". Prueba con otro modelo o revisa sus creditos.");
  err.code = "EMPTY_RESPONSE";
  return err;
}

function extractText(data) {
  if (!data) return "";
  if (data.choices && data.choices[0]) {
    const c = data.choices[0];
    if (c.message && c.message.content) {
      if (typeof c.message.content === "string") return c.message.content;
      if (Array.isArray(c.message.content)) return c.message.content.map(p => p.text || "").join("");
    }
    if (c.delta && c.delta.content) return c.delta.content;
    if (c.text) return c.text;
  }
  if (data.content && Array.isArray(data.content) && data.content[0]) {
    return data.content[0].text || "";
  }
  if (data.delta && data.delta.text) return data.delta.text;
  return "";
}

export function buildUserContent(text, attachments) {
  if (!attachments || !attachments.length) return text;
  const hasImage = attachments.some(a => a.isImage);
  if (!hasImage) {
    let full = text || "";
    attachments.forEach(att => {
      full += "\n\n--- Archivo: " + att.name + " ---\n" + (att.text || "[binario]");
    });
    return full;
  }
  const parts = [];
  if (text) parts.push({ type: "text", text: text });
  attachments.forEach(att => {
    if (att.isImage) {
      parts.push({ type: "image_url", image_url: { url: att.dataUrl } });
    } else if (att.text) {
      parts.push({ type: "text", text: "\n\n--- Archivo: " + att.name + " ---\n" + att.text });
    }
  });
  return parts;
}

export async function chatCompletion(provider, modelObj, messages, onToken, opts) {
  opts = opts || {};
  const timeoutMs = opts.timeout || 90000;
  const url = provider.url.replace(/\/$/, "") + "/v1/chat/completions";

  if (!modelObj || !modelObj.key) {
    throw new Error('El modelo "' + (modelObj && modelObj.id) + '" no tiene API key');
  }

  const headers = {
    "Authorization": "Bearer " + modelObj.key,
    "Content-Type": "application/json"
  };

  const controller1 = new AbortController();
  const timeout1 = setTimeout(() => controller1.abort(), timeoutMs);
  let lastChunkTime = Date.now();
  const stallWatchdog = setInterval(() => {
    if (Date.now() - lastChunkTime > 30000) controller1.abort();
  }, 5000);

  if (opts.signal) {
    opts.signal.addEventListener("abort", () => {
      try { controller1.abort(); } catch (e) {}
    });
  }

  let fullAcc = "";
  let streamError = "";

  try {
    const res = await safeFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelObj.id,
        messages,
        stream: true,
        temperature: 0.3
      }),
      signal: controller1.signal
    });

    if (res.ok && res.body) {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("event-stream") || ct.includes("stream")) {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buffer = "";
        let got = false;

        while (true) {
          const r = await reader.read();
          if (r.done) break;
          lastChunkTime = Date.now();
          buffer += dec.decode(r.value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") { got = true; break; }
            try {
              const json = JSON.parse(payload);
              const pe = providerErrorMessage(json);
              if (pe) streamError = pe;
              const delta = extractText(json) ||
                (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) || "";
              if (delta) { fullAcc += delta; onToken(delta); got = true; }
            } catch (_) {}
          }
        }
        clearTimeout(timeout1);
        clearInterval(stallWatchdog);
        if (got) return fullAcc;
      } else {
        const data = await res.json();
        const text = extractText(data);
        clearTimeout(timeout1);
        clearInterval(stallWatchdog);
        if (text) { onToken(text); return text; }
        const pe = providerErrorMessage(data);
        if (pe) streamError = pe;
      }
    }
  } catch (e) {
    if (e.name === "AbortError" && opts.signal && opts.signal.aborted) {
      clearTimeout(timeout1);
      clearInterval(stallWatchdog);
      return fullAcc;
    }
  }
  clearTimeout(timeout1);
  clearInterval(stallWatchdog);

  if (fullAcc) return fullAcc;

  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), timeoutMs);

  try {
    const res2 = await safeFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelObj.id,
        messages,
        stream: false,
        temperature: 0.3
      }),
      signal: controller2.signal
    });
    clearTimeout(timeout2);

    if (!res2.ok) {
      const errText = await res2.text().catch(() => "");
      throw new Error("HTTP " + res2.status + (errText ? " - " + errText.slice(0, 200) : ""));
    }
    const data2 = await res2.json();
    const text2 = extractText(data2);
    if (text2) { onToken(text2); return text2; }
    const pe2 = providerErrorMessage(data2) || streamError;
    if (pe2) throw new Error("El proveedor respondio con error: " + pe2.slice(0, 300));
    throw emptyResponseError(data2, modelObj.id);
  } catch (e) {
    clearTimeout(timeout2);
    if (e.name === "AbortError") {
      if (opts.signal && opts.signal.aborted) return "";
      throw new Error("Timeout despues de " + Math.round(timeoutMs/1000) + "s");
    }
    throw e;
  }
}