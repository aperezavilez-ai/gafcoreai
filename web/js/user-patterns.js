// ============================================================
//  GafCoreAI - User Patterns
//  Aprende que usa mas el usuario y prioriza
// ============================================================

const PATTERNS_KEY = "gafcoreai_user_patterns";

export class UserPatterns {
  constructor() {
    this.data = this.load();
  }

  track(event, value) {
    if (!this.data[event]) this.data[event] = {};
    const key = String(value).slice(0, 80);
    this.data[event][key] = (this.data[event][key] || 0) + 1;
    this.save();
  }

  top(event, n) {
    const obj = this.data[event] || {};
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n || 5)
      .map(e => ({ value: e[0], count: e[1] }));
  }

  getFavoriteModel() {
    const top = this.top("model-used", 1);
    return top[0]?.value || null;
  }

  getFavoriteCommand() {
    const top = this.top("slash-command", 1);
    return top[0]?.value || null;
  }

  getRecentActions() {
    return (this.data["recent-actions"] || {});
  }

  /**
   * Aprende de un comando ejecutado
   */
  recordCommand(text) {
    const first = text.split(/\s/)[0];
    if (first.startsWith("/")) this.track("slash-command", first);
    this.track("total-commands", "all");
  }

  recordModel(modelId) {
    this.track("model-used", modelId);
  }

  save() {
    try { localStorage.setItem(PATTERNS_KEY, JSON.stringify(this.data)); } catch (e) {}
  }

  load() {
    try {
      const raw = localStorage.getItem(PATTERNS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  clear() {
    this.data = {};
    this.save();
  }
}