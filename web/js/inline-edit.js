// ============================================================
//  GafCoreAI - Inline Edit (Cmd+K)
//  Edicion de codigo seleccionado con IA
// ============================================================
import { chatCompletion } from "./providers.js";

export class InlineEdit {
  constructor({ state, editor, log, termWrite }) {
    this.state = state;
    this.editor = editor;
    this.log = log || console.log;
    this.termWrite = termWrite || (() => {});
    this.active = false;
    this.originalRange = null;
    this.originalText = "";
    this.controller = null;
    this.overlay = null;
  }

  /**
   * Ejecuta el flujo de edicion inline.
   * Se llama desde el comando Ctrl+K del editor.
   */
  async trigger() {
    if (!this.editor) {
      alert("Editor no disponible");
      return;
    }

    const selection = this.editor.getSelection();
    if (!selection || selection.isEmpty()) {
      alert("Selecciona un bloque de codigo primero");
      return;
    }

    const model = this.editor.getModel();
    if (!model) return;

    this.originalText = model.getValueInRange(selection);
    this.originalRange = {
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn
    };

    // Mostrar overlay de input
    this.showOverlay(selection);
  }

  // ============================================================
  //  OVERLAY DE INPUT
  // ============================================================
  showOverlay(selection) {
    this.hideOverlay();

    // Posicion del cursor para colocar el overlay
    const scrolled = this.editor.getScrolledVisiblePosition({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn
    });

    const editorDom = this.editor.getDomNode();
    if (!editorDom) return;

    const editorRect = editorDom.getBoundingClientRect();

    const overlay = document.createElement("div");
    overlay.className = "inline-edit-overlay";
    overlay.innerHTML = `
      <div class="inline-edit-header">
        <span class="ie-icon">&#10024;</span>
        <span class="ie-title">Editar con IA</span>
        <button class="ie-close" title="Cancelar (Esc)">&times;</button>
      </div>
      <input type="text" class="ie-input" placeholder="Que quieres cambiar? Ej: anade validacion, convierte a async..." autocomplete="off" />
      <div class="inline-edit-hints">
        <span><b>Enter</b> generar</span>
        <span><b>Esc</b> cancelar</span>
      </div>
    `;

    overlay.style.left = (editorRect.left + 40) + "px";
    overlay.style.top = (editorRect.top + (scrolled ? scrolled.top : 40) - 100) + "px";
    overlay.style.minWidth = "380px";

    document.body.appendChild(overlay);
    this.overlay = overlay;

    const input = overlay.querySelector(".ie-input");
    const closeBtn = overlay.querySelector(".ie-close");

    closeBtn.onclick = () => this.cancel();

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const instruction = input.value.trim();
        if (!instruction) return;
        this.execute(instruction);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.cancel();
      }
    });

    setTimeout(() => input.focus(), 50);
  }

  hideOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  // ============================================================
  //  EJECUTAR LA EDICION CON IA
  // ============================================================
  async execute(instruction) {
    const modelInfo = this.getModel();
    if (!modelInfo) {
      alert("Selecciona un modelo verificado en Proveedores");
      return;
    }

    // Cerrar overlay
    this.hideOverlay();

    // Cambiar a la pestaña del editor si no esta activa
    const editorTab = document.querySelector(".main-tabs .tab[data-view='editor']");
    if (editorTab) editorTab.click();

    this.active = true;
    this.termWrite("");
    this.termWrite("✨ Cmd+K: " + instruction, "agent");
    this.termWrite("   Modelo: " + modelInfo.provider.name + " / " + modelInfo.model.id, "dim");

    // Mostrar indicador "Generando..." en el editor
    const loadingDeco = this.editor.deltaDecorations([], [{
      range: new monaco.Range(
        this.originalRange.startLineNumber,
        this.originalRange.startColumn,
        this.originalRange.endLineNumber,
        this.originalRange.endColumn
      ),
      options: {
        inlineClassName: "inline-edit-loading",
        hoverMessage: { value: "Generando con IA..." }
      }
    }]);

    this.controller = new AbortController();

    const sysPrompt =
      "Eres un asistente de refactorizacion de codigo. Recibes un bloque de codigo y una instruccion.\n" +
      "REGLAS ESTRICTAS:\n" +
      "- Devuelve UNICAMENTE el codigo modificado, sin explicaciones\n" +
      "- NO uses bloques markdown (nada de ```)\n" +
      "- Mantiene la indentacion original\n" +
      "- Conserva el estilo del codigo\n" +
      "- Si la instruccion no requiere cambio, devuelve el mismo codigo\n" +
      "- No agregues comentarios extra";

    const userPrompt =
      "INSTRUCCION: " + instruction + "\n\n" +
      "CODIGO ACTUAL:\n" +
      this.originalText + "\n\n" +
      "Devuelve SOLO el codigo modificado:";

    const messages = [
      { role: "system", content: sysPrompt },
      { role: "user", content: userPrompt }
    ];

    let newCode = "";
    try {
      newCode = await chatCompletion(
        modelInfo.provider,
        modelInfo.model,
        messages,
        () => {},
        { timeout: 60000, signal: this.controller.signal }
      );
    } catch (e) {
      this.editor.deltaDecorations(loadingDeco, []);
      this.active = false;
      this.termWrite("✘ Error: " + e.message, "error");
      alert("Error al generar: " + e.message);
      return;
    }

    // Limpiar la decoracion de loading
    this.editor.deltaDecorations(loadingDeco, []);

    // Limpiar respuesta
    let clean = (newCode || "").trim();
    clean = clean.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/\n?```$/, "");
    clean = clean.trim();

    if (!clean) {
      this.active = false;
      this.termWrite("✘ Sin respuesta del modelo", "error");
      return;
    }

    // Aplicar el nuevo codigo
    this.applyChange(clean);
  }

  // ============================================================
  //  APLICAR Y MOSTRAR BOTONES ACEPTAR/RECHAZAR
  // ============================================================
  applyChange(newCode) {
    const range = new monaco.Range(
      this.originalRange.startLineNumber,
      this.originalRange.startColumn,
      this.originalRange.endLineNumber,
      this.originalRange.endColumn
    );

    // Guardar texto original para undo
    const originalSnapshot = {
      range: range,
      text: this.originalText
    };

    // Aplicar la edicion de Monaco (registra en el historial de undo)
    this.editor.executeEdits("gafcoreai-inline-edit", [{
      range: range,
      text: newCode,
      forceMoveMarkers: true
    }]);

    // Seleccionar el nuevo codigo
    const lines = newCode.split("\n");
    const endLineNumber = range.startLineNumber + lines.length - 1;
    const endColumn = lines.length === 1
      ? range.startColumn + newCode.length
      : lines[lines.length - 1].length + 1;

    this.editor.setSelection(new monaco.Range(
      range.startLineNumber,
      range.startColumn,
      endLineNumber,
      endColumn
    ));

    this.editor.focus();
    this.termWrite("✓ Cambio aplicado. Ctrl+Z para deshacer.", "success");

    this.active = false;
  }

  cancel() {
    this.hideOverlay();
    if (this.controller) {
      try { this.controller.abort(); } catch (e) {}
      this.controller = null;
    }
    this.active = false;
  }

  // ============================================================
  //  UTILIDADES
  // ============================================================
  getModel() {
    if (typeof this.state.resolveAutoModel === "function") {
      const resolved = this.state.resolveAutoModel();
      if (resolved && resolved.provider && resolved.model && resolved.model.key) {
        return resolved;
      }
    }
    if (!this.state.activeProvider || !this.state.activeModel) return null;
    if (!this.state.activeModel.key) return null;
    return {
      provider: this.state.activeProvider,
      model: this.state.activeModel
    };
  }

  /**
   * Registra el atajo Ctrl+K / Cmd+K en el editor.
   */
  registerKeybinding() {
    if (!this.editor) return;

    const self = this;

    // Ctrl+K / Cmd+K
    this.editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
      () => self.trigger()
    );

    this.log("InlineEdit: Ctrl+K registrado");
  }
}