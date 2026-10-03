// ============================================================
//  GafCoreAI - Sincronizacion del grafo sinaptico con Supabase self-hosted
//  Solo pesos de enrutamiento (agent:* / task_type:*), nunca facts de conversaciones.
//  Schema fijo del proyecto: gafcoreai (aislado de los demas proyectos de supabase.gafcore.com).
// ============================================================

export const SYNC_SCHEMA = "gafcoreai";
export const SYNC_TABLE = "synaptic_edges";
const ROUTING_SOURCE = /^(agent|task_type):[A-Za-z0-9_.\-]{1,60}$/;
const REQUEST_TIMEOUT_MS = 8000;

export function isRoutingEdge(edge) {
  return !!(edge && ROUTING_SOURCE.test(edge.source || "") && typeof edge.target === "string"
    && edge.target.length >= 3 && edge.target.length <= 120);
}

export class SynapticSync {
  // getConfig: () => ({ url, key }) ; fetchImpl: (url, opts) => Response
  constructor({ graph, getConfig, fetchImpl, log }) {
    this.graph = graph;
    this.getConfig = getConfig;
    this.fetchImpl = fetchImpl || ((u, o) => fetch(u, o));
    this.log = log || (() => {});
    this.lastPushAt = 0;
    this._pushTimer = null;
    this._warned = false;
  }

  _endpoint() {
    const cfg = (this.getConfig && this.getConfig()) || {};
    const url = String(cfg.url || "").replace(/\/+$/, "");
    if (!url || !cfg.key) return null;
    let host;
    try { host = new URL(url).hostname; } catch (_) { return null; }
    if (/\.supabase\.co$/i.test(host)) return null;
    return { base: url + "/rest/v1/" + SYNC_TABLE, key: cfg.key };
  }

  _headers(key, extra) {
    return Object.assign({
      apikey: key,
      Authorization: "Bearer " + key,
      "Accept-Profile": SYNC_SCHEMA,
      "Content-Profile": SYNC_SCHEMA
    }, extra || {});
  }

  async _request(url, opts) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS) : null;
    try {
      const r = await this.fetchImpl(url, Object.assign({}, opts, ctrl ? { signal: ctrl.signal } : {}));
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  _fail(action, e) {
    if (!this._warned) {
      this._warned = true;
      this.log("[red neuronal] Supabase no disponible (" + action + "): " + (e && e.message ? e.message : e) + ". Se sigue aprendiendo en local.", "dim");
    }
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }

  async pull() {
    const ep = this._endpoint();
    if (!ep) return { ok: false, error: "sin configuracion de Supabase" };
    try {
      const r = await this._request(ep.base + "?select=source,target,relation,weight,successes,failures,updated_at", {
        method: "GET",
        headers: this._headers(ep.key)
      });
      const rows = await r.json();
      let merged = 0;
      (Array.isArray(rows) ? rows : []).forEach(row => {
        if (!isRoutingEdge(row)) return;
        if (this.graph.mergeRemoteEdge({ ...row, updatedAt: row.updated_at })) merged++;
      });
      this._warned = false;
      return { ok: true, merged };
    } catch (e) {
      return this._fail("pull", e);
    }
  }

  async push() {
    const ep = this._endpoint();
    if (!ep) return { ok: false, error: "sin configuracion de Supabase" };
    const since = this.lastPushAt;
    const rows = this.graph.exportEdges(e => isRoutingEdge(e) && (e.updatedAt || 0) > since).map(e => ({
      source: e.source,
      target: e.target,
      relation: String(e.relation || "related_to").slice(0, 40),
      weight: Math.max(0, Math.min(10, e.weight)),
      successes: e.successes || 0,
      failures: e.failures || 0,
      updated_at: new Date(e.updatedAt || Date.now()).toISOString()
    }));
    if (!rows.length) return { ok: true, pushed: 0 };
    const startedAt = Date.now();
    try {
      await this._request(ep.base + "?on_conflict=source,target", {
        method: "POST",
        headers: this._headers(ep.key, {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        }),
        body: JSON.stringify(rows)
      });
      this.lastPushAt = startedAt;
      this._warned = false;
      return { ok: true, pushed: rows.length };
    } catch (e) {
      return this._fail("push", e);
    }
  }

  schedulePush(delayMs = 3000) {
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => { this._pushTimer = null; this.push(); }, delayMs);
  }
}
