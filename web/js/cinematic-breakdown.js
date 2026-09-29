// web/js/cinematic-breakdown.js
// v59.6 — Fase 2. Imports dinámicos para no romper la UI si providers falla.

const SYSTEM_PROMPT = `Eres un desglosador profesional de guiones para producción audiovisual con IA.
Recibirás un guion en texto plano. Debes analizarlo y devolver EXCLUSIVAMENTE un JSON válido con esta forma:

{
  "title": "string — título inferido del guion, o 'Sin título'",
  "logline": "string — 1-2 frases",
  "characters": [
    {
      "name": "string — nombre exacto del personaje",
      "description": "string — edad aproximada, rasgos físicos visibles, tipo de vestuario dominante, tono de voz",
      "voice": "string — nota breve para TTS (ej: 'masculina, grave, acento neutro')"
    }
  ],
  "scenes": [
    {
      "number": 1,
      "slug": "INT./EXT. LUGAR — DÍA/NOCHE",
      "location": "string",
      "timeOfDay": "DÍA|NOCHE|AMANECER|ATARDECER|CONTINUO",
      "characterIds": ["name1", "name2"],
      "action": "string — resumen de la acción (2-4 frases)",
      "dialogue": "string — diálogos clave de la escena (opcional)",
      "clips": [
        {
          "prompt": "string — prompt visual CINEMATOGRÁFICO para motor de video. Incluye plano (wide/medium/close), movimiento de cámara, iluminación, personajes con su vestuario, acción concreta.",
          "durationSec": 10,
          "notes": "string — qué continúa del clip anterior"
        }
      ]
    }
  ]
}

REGLAS ESTRICTAS:
- Cada clip dura entre 5 y 15 segundos. NUNCA más.
- Cada escena tiene 1 a 5 clips según complejidad.
- "characterIds" usa los NOMBRES EXACTOS de "characters".
- Prompts autocontenidos (el motor de video no conoce el guion).
- NUNCA texto fuera del JSON. NUNCA bloques markdown.
- Si el guion es ambiguo, usa valores razonables. No preguntes.`;

const MAX_WORDS_PER_CALL = 5000;

function _wordCount(s) { return (s || "").trim().split(/\s+/).filter(Boolean).length; }

function _splitByWords(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];
  const chunks = [];
  let i = 0;
  while (i < words.length) { chunks.push(words.slice(i, i + maxWords).join(" ")); i += maxWords; }
  return chunks;
}

// ─── Resolver provider + modelo activo (imports dinámicos) ───
async function _findActiveProviderAndModel() {
  let getSecret = null;
  try {
    const mod = await import("./secrets.js");
    getSecret = mod.getSecret;
  } catch (_) { /* fallback localStorage */ }

  const readKey = (k) => {
    if (getSecret) {
      const v = getSecret(k);
      if (v) return v;
    }
    try { return localStorage.getItem(k); } catch (_) { return null; }
  };

  // Estrategia 1: window.gafcoreaiDebug.state
  try {
    const st = window.gafcoreaiDebug?.state;
    if (st?.activeModel && Array.isArray(st?.providers)) {
      const provider = st.providers.find(p => p.id === st.activeModel.providerId);
      const modelObj = provider?.models?.find(m => m.id === st.activeModel.id);
      if (provider && modelObj) return { provider, modelObj };
    }
  } catch (_) {}

  // Estrategia 2: secrets/localStorage
  try {
    const rawActive = readKey("gafcoreai_active_model");
    const rawProviders = readKey("gafcoreai_providers_v3");
    if (rawActive && rawProviders) {
      const active = JSON.parse(rawActive);
      const providers = JSON.parse(rawProviders);
      const provider = providers.find(p => p.id === active.providerId);
      const modelObj = provider?.models?.find(m => m.id === active.id);
      if (provider && modelObj) return { provider, modelObj };
    }
  } catch (e) {
    console.warn("[breakdown] Error leyendo active_model/providers:", e);
  }

  return null;
}

// ─── Llamada al LLM (import dinámico de providers.js) ───
async function _callLLM(userPrompt, systemPrompt) {
  const am = await _findActiveProviderAndModel();
  if (!am) {
    throw new Error(
      "No hay modelo activo. Ve a la barra superior y elige un proveedor + modelo " +
      "(abajo a la izquierda dice 'Sin modelo'). Vuelve aquí y pulsa Analizar."
    );
  }

  let chatCompletion;
  try {
    const mod = await import("./providers.js");
    chatCompletion = mod.chatCompletion;
    if (typeof chatCompletion !== "function") {
      throw new Error("providers.js no exporta chatCompletion");
    }
  } catch (e) {
    throw new Error("No se pudo cargar providers.js: " + e.message);
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ];

  let streamed = "";
  const onToken = (tok) => { if (typeof tok === "string") streamed += tok; };

  try {
    const result = await chatCompletion(am.provider, am.modelObj, messages, onToken, {});
    if (streamed) return streamed;
    if (typeof result === "string") return result;
    if (result?.text) return result.text;
    if (result?.content) return result.content;
    if (result?.message?.content) return result.message.content;
    if (result?.choices?.[0]?.message?.content) return result.choices[0].message.content;
    throw new Error("Respuesta del modelo vacía o formato no reconocido");
  } catch (e) {
    if (streamed) return streamed;
    throw new Error(
      "Error al llamar al modelo (" + am.provider.id + " / " + am.modelObj.id + "): " + e.message
    );
  }
}

// ─── Parseo robusto ───────────────────────────────────────
function _extractJson(raw) {
  if (!raw) throw new Error("Respuesta vacía del LLM");
  let s = String(raw).trim();
  s = s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No se encontró JSON. Primeros 300 chars:\n" + s.slice(0, 300));
  }
  const candidate = s.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    const repaired = candidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    return JSON.parse(repaired);
  }
}

function _mergeChunks(parts) {
  const merged = { title: "", logline: "", characters: [], scenes: [] };
  const charMap = new Map();
  let sceneCounter = 0;
  for (const p of parts) {
    if (!merged.title && p.title) merged.title = p.title;
    if (!merged.logline && p.logline) merged.logline = p.logline;
    for (const c of (p.characters || [])) {
      const key = (c.name || "").toLowerCase().trim();
      if (key && !charMap.has(key)) { charMap.set(key, c); merged.characters.push(c); }
    }
    for (const s of (p.scenes || [])) { sceneCounter++; merged.scenes.push({ ...s, number: sceneCounter }); }
  }
  return merged;
}

// ─── API pública ──────────────────────────────────────────
export async function analyzeScript(scriptText, { onProgress } = {}) {
  if (!scriptText || scriptText.trim().length < 50) {
    throw new Error("Guion demasiado corto para analizar.");
  }
  const progress = typeof onProgress === "function" ? onProgress : () => {};
  const words = _wordCount(scriptText);

  if (words <= MAX_WORDS_PER_CALL) {
    progress({ step: 1, total: 1, message: "Analizando guion con IA… (10–30 s)" });
    const raw = await _callLLM(scriptText, SYSTEM_PROMPT);
    return _validateBreakdown(_extractJson(raw));
  }

  const chunks = _splitByWords(scriptText, MAX_WORDS_PER_CALL);
  progress({ step: 0, total: chunks.length, message: "Guion largo (" + words + " palabras). " + chunks.length + " bloques…" });

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    progress({ step: i + 1, total: chunks.length, message: "Bloque " + (i + 1) + "/" + chunks.length + "…" });
    const prompt =
      "BLOQUE " + (i + 1) + " de " + chunks.length + " de un guion más largo. " +
      "Analiza SOLO este bloque y devuelve el JSON. Los scene.number serán renumerados.\n\n" +
      "--- INICIO BLOQUE ---\n" + chunks[i] + "\n--- FIN BLOQUE ---";
    try {
      parts.push(_extractJson(await _callLLM(prompt, SYSTEM_PROMPT)));
    } catch (e) {
      console.warn("[breakdown] Bloque " + (i + 1) + " falló:", e);
      parts.push({ characters: [], scenes: [] });
    }
  }
  return _validateBreakdown(_mergeChunks(parts));
}

function _validateBreakdown(data) {
  if (!data || typeof data !== "object") throw new Error("Respuesta del LLM no es objeto");
  const out = { title: String(data.title || "Sin título"), logline: String(data.logline || ""), characters: [], scenes: [] };
  const charNames = new Set();
  for (const c of (data.characters || [])) {
    const name = String(c.name || "").trim();
    if (!name) continue;
    charNames.add(name.toLowerCase());
    out.characters.push({ name, description: String(c.description || ""), voice: String(c.voice || "") });
  }
  let sceneNum = 0;
  for (const s of (data.scenes || [])) {
    sceneNum++;
    const clips = [];
    for (const cl of (s.clips || [])) {
      let dur = parseInt(cl.durationSec, 10);
      if (!Number.isFinite(dur) || dur < 5) dur = 10;
      if (dur > 15) dur = 15;
      clips.push({ prompt: String(cl.prompt || "").trim(), durationSec: dur, notes: String(cl.notes || "") });
    }
    if (clips.length === 0) clips.push({ prompt: String(s.action || s.slug || "Plano de escena").slice(0, 300), durationSec: 10, notes: "" });
    out.scenes.push({
      number: sceneNum,
      slug: String(s.slug || ("ESCENA " + sceneNum)),
      location: String(s.location || ""),
      timeOfDay: String(s.timeOfDay || ""),
      characterIds: Array.isArray(s.characterIds) ? s.characterIds.filter(n => charNames.has(String(n).toLowerCase())) : [],
      action: String(s.action || ""),
      dialogue: String(s.dialogue || ""),
      clips,
    });
  }
  if (out.scenes.length === 0) throw new Error("El LLM no devolvió ninguna escena");
  return out;
}