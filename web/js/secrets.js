// web/js/secrets.js
// v59.1 — FIX: tauri-plugin-store v2 usa API async (get/set/delete/save son Promise)
// Cache en memoria + persistencia async con debounce.
// Fallback transparente a localStorage cuando NO estamos en Tauri (web PWA).

const SECRETS_STORE_FILE = "gafcoreai-secrets.json";

export const SECRET_KEYS = [
  "gafcoreai_providers_v3",
  "gafcoreai_brave_key",
  "gafcoreai_sb",
  "gafcoreai_github",
  "gafcoreai_vercel",
  "gafcoreai_active_model",
  "gafcoreai_embed_config",
  "gafcoreai_ghost_config",
  "gafcoreai_rag_config",
  "gafcoreai_sb_url",
  "gafcoreai_sb_key",
  "gafcoreai_mcp_servers",
];

const _cache = new Map();
let _store = null;
let _dirty = false;
let _flushTimer = null;
let _initialized = false;
let _isTauriMode = false;

async function _tryLoadStore() {
  if (typeof window === "undefined") return null;
  const looksTauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
  if (!looksTauri) return null;
  try {
    const g = window.__TAURI__?.store;
    if (g?.Store) {
      return await g.Store.load(SECRETS_STORE_FILE, { autoSave: false });
    }
  } catch (e) {
    console.warn("[secrets] Fallo intento global:", e);
  }
  console.warn("[secrets] No se pudo cargar tauri-plugin-store. Fallback a localStorage.");
  return null;
}

export async function initSecrets() {
  if (_initialized) return;
  _initialized = true;

  _store = await _tryLoadStore();
  _isTauriMode = !!_store;

  if (_isTauriMode) {
    await _migrateLegacyToStore();
  }
  await _loadCacheFromStore();

  window.addEventListener("beforeunload", _flushSync);
}

async function _migrateLegacyToStore() {
  let migrated = 0;
  for (const k of SECRET_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw !== null && raw !== "[object Promise]") {
      try {
        await _store.set(k, raw);
        localStorage.removeItem(k);
        migrated++;
      } catch (e) {
        console.warn(`[secrets] No se pudo migrar ${k}:`, e);
      }
    }
  }
  if (migrated > 0) {
    await _store.save();
    console.info(`[secrets] Migrados ${migrated} secret(s) a store cifrado.`);
  }
}

async function _loadCacheFromStore() {
  if (!_isTauriMode) {
    for (const k of SECRET_KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) _cache.set(k, v);
    }
    return;
  }

  let corrupted = 0;
  for (const k of SECRET_KEYS) {
    try {
      const v = await _store.get(k); // v2: async
      if (String(v) === "[object Promise]") {
        // Valor corrupto de v59.0 — borrar del store
        await _store.delete(k);
        corrupted++;
      } else if (v !== null && v !== undefined) {
        _cache.set(k, String(v));
      }
    } catch (_) {}
  }
  if (corrupted > 0) {
    await _store.save();
    console.warn(`[secrets] Eliminados ${corrupted} valor(es) corruptos del store.`);
  }
}

export function getSecret(key) {
  // FALLBACK localStorage: si la caché no tiene el valor (initSecrets aún no corrió),
  // leer directo de localStorage. Permite inicializar state sincrónicamente.
  if (_cache.has(key)) return _cache.get(key);
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch (_) {}
  return null;
}

// Las operaciones al store se encadenan para que save() siempre corra despues de los set/delete previos.
let _opChain = Promise.resolve();
function _enqueue(op) {
  _opChain = _opChain.then(op).catch((e) => console.warn("[secrets] Error al escribir en store:", e));
  return _opChain;
}

export function setSecret(key, value) {
  if (value === null || value === undefined) {
    _cache.delete(key);
    if (_isTauriMode) {
      _enqueue(() => _store.delete(key));
    } else {
      try { localStorage.removeItem(key); } catch (_) {}
    }
  } else {
    const str = String(value);
    _cache.set(key, str);
    if (_isTauriMode) {
      _enqueue(() => _store.set(key, str));
    } else {
      try { localStorage.setItem(key, str); } catch (_) {}
    }
  }
  _scheduleFlush();
}

export function removeSecret(key) { setSecret(key, null); }
export function isTauriSecrets() { return _isTauriMode; }
export function listSecretKeys() { return Array.from(_cache.keys()); }

function _scheduleFlush() {
  if (!_isTauriMode) return;
  _dirty = true;
  if (_flushTimer) return;
  _flushTimer = setTimeout(_flushAsync, 200);
}

async function _flushAsync() {
  _flushTimer = null;
  if (!_dirty || !_store) return;
  _dirty = false;
  try {
    await _opChain;
    await _store.save();
  } catch (e) {
    console.warn("[secrets] Error al persistir:", e);
    _dirty = true;
  }
}

export function flushSecrets() {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  return _flushAsync();
}

function _flushSync() {
  if (!_store) return;
  _opChain.then(() => _store.save()).catch(() => {});
}