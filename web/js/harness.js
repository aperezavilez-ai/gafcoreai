// ============================================================
//  GafCoreAI - Harness de ejecucion robusto
//  Retries, validacion, timeout, logs estructurados
// ============================================================

export class Harness {
  constructor({ log, termWrite }) {
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.stats = {
      calls: 0,
      success: 0,
      failed: 0,
      retried: 0,
      totalTime: 0
    };
    this.history = [];
  }

  /**
   * Ejecuta una funcion con retry automatico y timeout.
   */
  async run(label, fn, opts = {}) {
    const maxRetries = opts.retries || 2;
    const timeoutMs = opts.timeout || 90000;
    const backoffMs = opts.backoff || 800;
    const startTs = Date.now();

    this.stats.calls++;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this.stats.retried++;
        this.termWrite(`   [retry ${attempt}/${maxRetries}] ${label}`, "warn");
        await this.sleep(backoffMs * attempt);
      }

      try {
        const result = await this.withTimeout(fn(), timeoutMs, label);
        const elapsed = Date.now() - startTs;
        this.stats.success++;
        this.stats.totalTime += elapsed;
        this.history.push({ label, ok: true, attempt, elapsed, ts: Date.now() });
        return result;
      } catch (e) {
        lastError = e;
        this.log(`Harness [${label}] intento ${attempt + 1} fallo: ${e.message}`);
        if (!this.shouldRetry(e)) break;
      }
    }

    this.stats.failed++;
    const elapsed = Date.now() - startTs;
    this.stats.totalTime += elapsed;
    this.history.push({ label, ok: false, error: lastError?.message, elapsed, ts: Date.now() });
    throw lastError || new Error("Error desconocido en " + label);
  }

  withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout ${ms/1000}s en ${label}`)), ms);
      })
    ]);
  }

  shouldRetry(error) {
    const msg = (error && error.message || "").toLowerCase();
    // No reintentar en errores de validacion
    if (msg.includes("permiso")) return false;
    if (msg.includes("invalid") || msg.includes("400")) return false;
    if (msg.includes("401") || msg.includes("403")) return false;
    return true;
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  getStats() {
    return {
      ...this.stats,
      avgTime: this.stats.calls ? Math.round(this.stats.totalTime / this.stats.calls) : 0,
      last100: this.history.slice(-100)
    };
  }

  reset() {
    this.stats = { calls: 0, success: 0, failed: 0, retried: 0, totalTime: 0 };
    this.history = [];
  }
}