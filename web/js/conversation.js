// ============================================================
//  GafCoreAI - Gestor de conversaciones multi-turno
//  Mantiene contexto entre mensajes del mismo chat
// ============================================================

const CONV_STORAGE_KEY = "gafcoreai_conversations";

export class ConversationManager {
  constructor() {
    this.conversations = this.load();
    this.activeId = localStorage.getItem("gafcoreai_active_conversation") || null;
  }

  /**
   * Crea una conversacion nueva. Devuelve su ID.
   */
  create(title) {
    const id = "conv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    this.conversations[id] = {
      id,
      title: title || "Nueva conversacion",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.activeId = id;
    this.save();
    return id;
  }

  /**
   * Cambia a una conversacion existente.
   */
  switch(id) {
    if (!this.conversations[id]) return false;
    this.activeId = id;
    localStorage.setItem("gafcoreai_active_conversation", id);
    return true;
  }

  /**
   * Devuelve la conversacion activa (la crea si no existe).
   */
  getActive() {
    if (!this.activeId || !this.conversations[this.activeId]) {
      this.create();
    }
    return this.conversations[this.activeId];
  }

  /**
   * Agrega un mensaje a la conversacion activa.
   */
  addMessage(role, content) {
    const conv = this.getActive();
    conv.messages.push({ role, content, ts: Date.now() });
    conv.updatedAt = Date.now();

    // Auto-titulo si es el primer mensaje del usuario
    if (role === "user" && conv.title === "Nueva conversacion") {
      conv.title = content.slice(0, 60).replace(/\n/g, " ");
    }

    // Limitar a 200 mensajes por conversacion
    if (conv.messages.length > 200) {
      conv.messages = conv.messages.slice(-200);
    }

    this.save();
    return conv.messages[conv.messages.length - 1];
  }

  /**
   * Devuelve los ultimos N mensajes para enviar al modelo.
   */
  getRecentMessages(maxMessages) {
    const n = maxMessages || 30;
    const conv = this.getActive();
    return conv.messages.slice(-n);
  }

  /**
   * Limpia la conversacion activa.
   */
  clearActive() {
    const conv = this.getActive();
    conv.messages = [];
    conv.title = "Nueva conversacion";
    this.save();
    return true;
  }

  /**
   * Elimina la conversacion activa.
   */
  deleteActive() {
    if (!this.activeId) return false;
    delete this.conversations[this.activeId];
    this.activeId = null;
    localStorage.removeItem("gafcoreai_active_conversation");
    this.save();
    return true;
  }

  /**
   * Lista de conversaciones ordenadas por actualizacion.
   */
  list() {
    return Object.values(this.conversations)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(c => ({
        id: c.id,
        title: c.title,
        messageCount: c.messages.length,
        updatedAt: c.updatedAt
      }));
  }

  save() {
    try {
      localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(this.conversations));
      localStorage.setItem("gafcoreai_active_conversation", this.activeId || "");
    } catch (e) {
      console.warn("Conversation save error:", e);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(CONV_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }
}