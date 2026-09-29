// web/js/cinematic-breakdown.js
// v59.5 — Fase 2. Integración real con providers.js::chatCompletion.

import { getSecret } from "./secrets.js";
import { chatCompletion } from "./providers.js";

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
          "prompt": "string — prompt visual CINEMATOGRÁFICO para motor de video. Debe incluir: plano (wide/medium/close), movimiento de cámara, iluminación, personajes presentes con su vestuario, acción concreta. Máximo 10-15 segundos.",
          "durationSec": 10,
          "notes": "string — qué continúa del clip anterior (para mantener continuidad)"
        }
      ]
    }
  ]
}

REGLAS ESTRICTAS:
- Cada clip debe durar entre 5 y 15 segundos. NUNCA más.
- Cada escena puede tener 1 a 5 clips según su complejidad.
- Los "characterIds" usan los NOMBRES EXACTOS de la lista "characters".
- Si el guion menciona un personaje en una escena, DEBE estar en "characters".
- Los prompts de clips deben ser autocontenidos (el motor de video no conoce el guion).
- NUNCA devuelvas texto fuera del JSON. NUNCA uses bloques de código markdown.
- Si el guion es ambiguo, usa valores razonables. No preguntes.`;

const MAX_WORDS_PER_CALL = 5000;

function _wordCount(s) {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

function _splitByWords(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
    i += maxWords;
  }
  return chunks;
}

// ─── Resolver provider + modelo activo ────────────────────
function _findActiveProviderAndModel() {
  // 1) window.gafcoreaiDebug.state (si está expuesto)
  try {
    const st = window.gafcoreaiDebug?.state;
    if (st?.activeModel && Array.isArray(st?.providers)) {
      const provider = st.providers.find(p => p.id === st.activeModel.providerId);
      const modelObj = provider?.models?.find(m => m.id === st.activeModel.id);
      if (provider && modelObj) return { provider, modelObj };
    }
  } catch (_) {}

  // 2) secrets (cifrado)
  try {
    const rawActive = getSecret("gafcoreai_active_model");
    const rawProviders = getSecret("gafcoreai_providers_v3");
    if (rawActive && rawProviders) {
      const active = JSON.parse(rawActive);
      const providers = JSON.parse(rawProviders);
      const provider = providers.find(p => p.id === active.providerId);
      const modelObj = provider?.models?.find(m => m.id === active.id);
      if (provider && modelObj) return { provider, modelObj };
    }
  } catch (e) {
    console.warn("[breakdown] No se pudo leer secrets:", e);
  }

  // 3) localStorage directo (fallback PWA o si secrets no cargó aún)
  try {
    const rawActive = localStorage.getItem("gafcoreai_active_model");
    const rawProviders = localStorage.getItem("gafcoreai_providers_v3");
    if (rawActive && rawProviders) {
      const active = JSON.parse(rawActive);
      const providers = JSON.parse(rawProviders);
      const provider = providers.find(p => p.id === active.providerId);
      const modelObj = provider?.models?.find(m => m.id === active.id);
      if (provider && modelObj) return { provider, modelObj };
    }
  } catch (_) {}

  return null;
}

// ─── Llamada al LLM ───────────────────────────────────────
async function _callLLM(userPrompt, systemPrompt) {
  const am = _findActiveProviderAndModel();
  if (!am) {
    throw new Error(
      "No hay modelo activo. Ve a la barra superior, elige un proveedor y un modelo " +
      "(ahora mismo la app dice 'Sin modelo'). Después vuelve a pulsar Analizar."
    );
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Intentar streaming (acumular tokens) — si chatCompletion no lo soporta, caerá al return
  let streamed = "";
  const onToken = (tok) => {
    if (typeof tok === "string") streamed += tok;
  };

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
    // Si falló y teníamos tokens parciales, devolverlos (mejor que nada)
    if (streamed) {
      console.warn("[breakdown] chatCompletion lanzó error pero hay stream:", e);
      return streamed;
    }
    throw new Error("Error al llamar al modelo (" + am.provider.id + " / " + am.modelObj.id + "): " + e.message);
  }
}

// ─── Parseo robusto de JSON ───────────────────────────────
function _extractJson(raw) {
  if (!raw) throw new Error("Respuesta vacía del LLM");
  let s = String(raw).trim();

  // Quitar fences markdown si el LLM se empeña
  s = s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");

  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No se encontró JSON en la respuesta. Primeros 300 chars:\n" + s.slice(0, 300));
  }
  const candidate = s.slice(first, last + 1);

  try {
    return JSON.parse(candidate);
  } catch (e) {
    // Reparación: comas finales, keys sin comillas
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
      if (key && !charMap.has(key)) {
        charMap.set(key, c);
        merged.characters.push(c);
      }
    }

    for (const s of (p.scenes || [])) {
      sceneCounter++;
      merged.scenes.push({ ...s, number: sceneCounter });
    }
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
    progress({ step: 1, total: 1, message: "Analizando guion con IA… (puede tardar 10–30 s)" });
    const raw = await _callLLM(scriptText, SYSTEM_PROMPT);
    const parsed = _extractJson(raw);
    return _validateBreakdown(parsed);
  }

  const chunks = _splitByWords(scriptText, MAX_WORDS_PER_CALL);
  progress({
    step: 0,
    total: chunks.length,
    message: "Guion largo (" + words + " palabras). Procesando " + chunks.length + " bloques…",
  });

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    progress({
      step: i + 1,
      total: chunks.length,
      message: "Bloque " + (i + 1) + "/" + chunks.length + "…",
    });
    const prompt =
      "Este es el BLOQUE " + (i + 1) + " de " + chunks.length + " de un guion más largo. " +
      "Analiza SOLO este bloque y devuelve el JSON. Los \"scene.number\" serán renumerados después.\n\n" +
      "--- INICIO BLOQUE ---\n" + chunks[i] + "\n--- FIN BLOQUE ---";
    try {
      const raw = await _callLLM(prompt, SYSTEM_PROMPT);
      parts.push(_extractJson(raw));
    } catch (e) {
      console.warn("[breakdown] Bloque " + (i + 1) + " falló:", e);
      parts.push({ characters: [], scenes: [] });
    }
  }

  return _validateBreakdown(_mergeChunks(parts));
}

function _validateBreakdown(data) {
  if (!data || typeof data !== "object") throw new Error("Respuesta del LLM no es objeto");
  const out = {
    title: String(data.title || "Sin título"),
    logline: String(data.logline || ""),
    characters: [],
    scenes: [],
  };

  const charNames = new Set();
  for (const c of (data.characters || [])) {
    const name = String(c.name || "").trim();
    if (!name) continue;
    charNames.add(name.toLowerCase());
    out.characters.push({
      name,
      description: String(c.description || ""),
      voice: String(c.voice || ""),
    });
  }

  let sceneNum = 0;
  for (const s of (data.scenes || [])) {
    sceneNum++;
    const clips = [];
    for (const cl of (s.clips || [])) {
      let dur = parseInt(cl.durationSec, 10);
      if (!Number.isFinite(dur) || dur < 5) dur = 10;
      if (dur > 15) dur = 15;
      clips.push({
        prompt: String(cl.prompt || "").trim(),
        durationSec: dur,
        notes: String(cl.notes || ""),
      });
    }
    if (clips.length === 0) {
      clips.push({
        prompt: String(s.action || s.slug || "Plano de escena").slice(0, 300),
        durationSec: 10,
        notes: "",
      });
    }
    out.scenes.push({
      number: sceneNum,
      slug: String(s.slug || ("ESCENA " + sceneNum)),
      location: String(s.location || ""),
      timeOfDay: String(s.timeOfDay || ""),
      characterIds: Array.isArray(s.characterIds)
        ? s.characterIds.filter(n => charNames.has(String(n).toLowerCase()))
        : [],
      action: String(s.action || ""),
      dialogue: String(s.dialogue || ""),
      clips,
    });
  }

  if (out.scenes.length === 0) throw new Error("El LLM no devolvió ninguna escena");
  return out;
}