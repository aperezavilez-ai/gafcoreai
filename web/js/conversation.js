// ============================================================
//  GafCoreAI - Gestor de conversaciones POR PROYECTO
//  v2: cada proyecto (diskFolder) tiene su propia conversación.
//  Sin proyecto abierto = sin conversación activa.
// ============================================================

const STORAGE_KEY = "gafcoreai_conversations_v2";
const ACTIVE_KEY = "gafcoreai_active_project_key";
const LEGACY_STORAGE_KEY = "gafcoreai_conversations";

/**
 * Normaliza la ruta del proyecto para usarla como clave.
 *  D:\PROGRAMAS IA\CALILI  ->  d:/programas ia/calili
 */
function projectKey(projectPath) {
  if (!projectPath) return "__no_project__";
  return String(projectPath)
    .replace(/[\\\/]+$/, "")
    .replace(/\\/g, "/")
    .toLowerCase()
    .trim();
}

/**
 * Nombre corto del proyecto (última carpeta de la ruta).
 */
function projectName(projectPath) {
  if (!projectPath) return "Sin proyecto";
  const parts = String(projectPath).replace(/[\\\/]+$/, "").split(/[\\\/]/);
  return parts[parts.length - 1] || "Sin proyecto";
}

export class ConversationManager {
  constructor() {
    this.conversations = this.load();
    this.activeProjectKey = localStorage.getItem(ACTIVE_KEY) || null;

    // Migración: si existía la versión vieja (global), la ignoramos.
    // El usuario decidió separar por proyecto, así que la vieja se descarta.
    try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch (_) {}
    try { localStorage.removeItem("gafcoreai_active_conversation"); } catch (_) {}
    try { localStorage.removeItem("gafcoreai_conversation_history"); } catch (_) {}
  }

  /**
   * Devuelve la conversación del proyecto, la crea si no existe.
   */
  getForProject(projectPath) {
    const key = projectKey(projectPath);
    if (!this.conversations[key]) {
      this.conversations[key] = {
        key: key,
        projectPath: projectPath || null,
        title: projectName(projectPath),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.save();
    }
    return this.conversations[key];
  }

  /**
   * Cambia la conversación activa al proyecto indicado.
   * Devuelve la conversación activa.
   */
  switchTo(projectPath) {
    this.activeProjectKey = projectKey(projectPath);
    localStorage.setItem(ACTIVE_KEY, this.activeProjectKey);
    return this.getForProject(projectPath);
  }

  /**
   * Desactiva la conversación actual (por ejemplo, al cerrar el proyecto).
   */
  deactivate() {
    this.activeProjectKey = null;
    localStorage.removeItem(ACTIVE_KEY);
  }

  /**
   * Devuelve la conversación activa, o null si no hay proyecto activo.
   */
  getActive() {
    if (!this.activeProjectKey) return null;
    return this.conversations[this.activeProjectKey] || null;
  }

  /**
   * Chequea si un proyecto tiene conversación guardada.
   */
  hasFor(projectPath) {
    const key = projectKey(projectPath);
    const conv = this.conversations[key];
    return !!(conv && conv.messages && conv.messages.length);
  }

  /**
   * Agrega un mensaje a la conversación activa.
   * Si no hay proyecto activo, no hace nada y devuelve null.
   */
  addMessage(role, content) {
    if (!this.activeProjectKey) return null;
    const conv = this.conversations[this.activeProjectKey];
    if (!conv) return null;

    conv.messages.push({ role, content, ts: Date.now() });
    conv.updatedAt = Date.now();

    // Limitar a 200 mensajes por conversación
    if (conv.messages.length > 200) {
      conv.messages = conv.messages.slice(-200);
    }

    this.save();
    return conv.messages[conv.messages.length - 1];
  }

  /**
   * Devuelve los últimos N mensajes de la conversación activa
   * para enviar al modelo.
   */
  getRecentMessages(maxMessages) {
    const n = maxMessages || 30;
    const conv = this.getActive();
    if (!conv || !conv.messages) return [];
    return conv.messages.slice(-n);
  }

  /**
   * Limpia los mensajes de la conversación activa (o de un proyecto concreto).
   * Devuelve el número de mensajes eliminados.
   */
  clearFor(projectPath) {
    const key = projectPath ? projectKey(projectPath) : this.activeProjectKey;
    if (!key) return 0;
    const conv = this.conversations[key];
    if (!conv) return 0;
    const removed = conv.messages.length;
    conv.messages = [];
    conv.updatedAt = Date.now();
    this.save();
    return removed;
  }

  /**
   * Elimina por completo la conversación de un proyecto.
   */
  deleteFor(projectPath) {
    const key = projectKey(projectPath);
    const existed = !!this.conversations[key];
    delete this.conversations[key];
    if (this.activeProjectKey === key) {
      this.deactivate();
    }
    this.save();
    return existed;
  }

  /**
   * Lista de conversaciones ordenadas por actualización (útil para futura UI).
   */
  list() {
    return Object.values(this.conversations)
      .filter(c => c.messages && c.messages.length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(c => ({
        key: c.key,
        title: c.title,
        projectPath: c.projectPath,
        messageCount: c.messages.length,
        updatedAt: c.updatedAt
      }));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.conversations));
      if (this.activeProjectKey) {
        localStorage.setItem(ACTIVE_KEY, this.activeProjectKey);
      }
    } catch (e) {
      console.warn("[ConversationManager] save error:", e);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed;
    } catch (e) {
      console.warn("[ConversationManager] load error:", e);
      return {};
    }
  }
}