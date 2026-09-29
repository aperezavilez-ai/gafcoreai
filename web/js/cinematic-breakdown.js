// web/js/cinematic-breakdown.js
// v60.1 — Timeout 5 min + MAX_WORDS 1500 + logs de progreso.

const SYSTEM_PROMPT = `Eres un desglosador profesional de guiones para producción audiovisual con IA.
Analiza el guion y devuelve EXCLUSIVAMENTE un JSON válido con esta forma:

{
  "title": "string",
  "logline": "string — 1-2 frases",
  "characters": [
    { "name": "string", "description": "string", "voice": "string" }
  ],
  "scenes": [
    {
      "number": 1,
      "slug": "INT./EXT. LUGAR — DÍA/NOCHE",
      "location": "string",
      "timeOfDay": "DÍA|NOCHE|AMANECER|ATARDECER|CONTINUO",
      "characterIds": ["name1", "name2"],
      "action": "string — resumen de la acción (2-3 frases)",
      "clips": [
        {
          "prompt": "string — prompt visual CINEMATOGRÁFICO: plano, cámara, luz, personajes con vestuario, acción.",
          "durationSec": 10,
          "notes": "string"
        }
      ]
    }
  ]
}

REGLAS:
- Clips de 5 a 15 segundos. NUNCA más.
- 1 a 4 clips por escena.
- "characterIds" con NOMBRES EXACTOS de "characters".
- Prompts autocontenidos.
- NUNCA texto fuera del JSON. NUNCA markdown. Sé conciso.`;

const MAX_WORDS_PER_CALL = 1500;
const TIMEOUT_MS = 300_000; // 5 minutos

function _wordCount(s) { return (s || "").trim().split(/\s+/).filter(Boolean).length; }

function _splitByWords(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];
  const chunks = [];
  let i = 0;
  while (i < words.length) { chunks.push(words.slice(i, i + maxWords).join(" ")); i += maxWords; }
  return chunks;
}

async function _findActiveProviderAndModel() {
  try {
    const st = window.gafcoreaiDebug?.state;
    if (st?.activeModel?.id && Array.isArray(st?.providers)) {
      const modelId = String(st.activeModel.id);
      const apiKey = String(st.activeModel.key || "");
      let provider = null, group = null;
      for (const prov of st.providers) {
        for (const g of (prov.groups || [])) {
          if ((g.models || []).some(m => (typeof m === "string" ? m : m?.id) === modelId)) {
            provider = prov; group = g; break;
          }
        }
        if (provider) break;
      }
      if (!provider && st.activeProvider?.id) provider = st.activeProvider;
      if (provider) {
        const modelObj = { id: modelId, name: modelId, key: apiKey || group?.key || "" };
        return { provider, modelObj, group };
      }
    }
  } catch (e) { console.warn("[breakdown] E1:", e); }
  return null;
}

async function _callLLM(userPrompt, systemPrompt) {
  const am = await _findActiveProviderAndModel();
  if (!am) throw new Error("No hay modelo activo.");

  const mod = await import("./providers.js");
  const chatCompletion = mod.chatCompletion;
  if (typeof chatCompletion !== "function") throw new Error("providers.js sin chatCompletion");

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ];

  let streamed = "";
  const onToken = (tok) => { if (typeof tok === "string") streamed += tok; };

  console.log("[breakdown] 🚀 →", am.provider.id, "/", am.modelObj.id);

  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("TIMEOUT " + (TIMEOUT_MS / 1000) + "s")), TIMEOUT_MS)
  );

  try {
    const result = await Promise.race([
      chatCompletion(am.provider, am.modelObj, messages, onToken, {}),
      timeout,
    ]);
    console.log("[breakdown] ✅ respuesta:", typeof result, "| stream:", streamed.length);
    if (streamed) return streamed;
    if (typeof result === "string") return result;
    if (result?.text) return result.text;
    if (result?.content) return result.content;
    if (result?.choices?.[0]?.message?.content) return result.choices[0].message.content;
    throw new Error("Formato de respuesta no reconocido");
  } catch (e) {
    if (streamed) return streamed;
    throw new Error("(" + am.provider.id + "/" + am.modelObj.id + "): " + e.message);
  }
}

function _extractJson(raw) {
  if (!raw) throw new Error("Respuesta vacía");
  let s = String(raw).trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) throw new Error("Sin JSON. Primos 300:\n" + s.slice(0, 300));
  const c = s.slice(a, b + 1);
  try { return JSON.parse(c); }
  catch (_) {
    const r = c.replace(/,\s*([}\]])/g, "$1")
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    return JSON.parse(r);
  }
}

function _merge(parts) {
  const m = { title: "", logline: "", characters: [], scenes: [] };
  const cm = new Map(); let n = 0;
  for (const p of parts) {
    if (!m.title && p.title) m.title = p.title;
    if (!m.logline && p.logline) m.logline = p.logline;
    for (const c of (p.characters || [])) {
      const k = (c.name || "").toLowerCase().trim();
      if (k && !cm.has(k)) { cm.set(k, c); m.characters.push(c); }
    }
    for (const s of (p.scenes || [])) { n++; m.scenes.push({ ...s, number: n }); }
  }
  return m;
}

export async function analyzeScript(scriptText, { onProgress } = {}) {
  if (!scriptText || scriptText.trim().length < 50) throw new Error("Guion demasiado corto.");
  const progress = typeof onProgress === "function" ? onProgress : () => {};
  const words = _wordCount(scriptText);
  const chunks = _splitByWords(scriptText, MAX_WORDS_PER_CALL);

  console.log("[breakdown] Guion:", words, "palabras →", chunks.length, "bloque(s)");

  if (chunks.length === 1) {
    progress({ step: 1, total: 1, message: "Analizando (" + words + " palabras)… puede tardar 1-3 min" });
    const raw = await _callLLM(scriptText, SYSTEM_PROMPT);
    return _validate(_extractJson(raw));
  }

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    progress({ step: i + 1, total: chunks.length,
      message: "Bloque " + (i + 1) + "/" + chunks.length + " (≈" + MAX_WORDS_PER_CALL + " palabras)…" });
    const prompt =
      "BLOQUE " + (i + 1) + "/" + chunks.length + " de un guion. Analiza SOLO este bloque.\n\n" +
      "--- INICIO ---\n" + chunks[i] + "\n--- FIN ---";
    try {
      parts.push(_extractJson(await _callLLM(prompt, SYSTEM_PROMPT)));
    } catch (e) {
      console.warn("[breakdown] bloque " + (i + 1) + " falló:", e.message);
      parts.push({ characters: [], scenes: [] });
    }
  }
  return _validate(_merge(parts));
}

function _validate(data) {
  if (!data || typeof data !== "object") throw new Error("Respuesta no es objeto");
  const out = { title: String(data.title || "Sin título"), logline: String(data.logline || ""),
    characters: [], scenes: [] };
  const names = new Set();
  for (const c of (data.characters || [])) {
    const name = String(c.name || "").trim();
    if (!name) continue;
    names.add(name.toLowerCase());
    out.characters.push({ name, description: String(c.description || ""), voice: String(c.voice || "") });
  }
  let n = 0;
  for (const s of (data.scenes || [])) {
    n++;
    const clips = [];
    for (const cl of (s.clips || [])) {
      let d = parseInt(cl.durationSec, 10);
      if (!Number.isFinite(d) || d < 5) d = 10;
      if (d > 15) d = 15;
      clips.push({ prompt: String(cl.prompt || "").trim(), durationSec: d, notes: String(cl.notes || "") });
    }
    if (clips.length === 0)
      clips.push({ prompt: String(s.action || s.slug || "Plano").slice(0, 300), durationSec: 10, notes: "" });
    out.scenes.push({
      number: n, slug: String(s.slug || ("ESCENA " + n)),
      location: String(s.location || ""), timeOfDay: String(s.timeOfDay || ""),
      characterIds: Array.isArray(s.characterIds)
        ? s.characterIds.filter(x => names.has(String(x).toLowerCase())) : [],
      action: String(s.action || ""), dialogue: String(s.dialogue || ""), clips,
    });
  }
  if (out.scenes.length === 0) throw new Error("El LLM no devolvió escenas");
  return out;
}