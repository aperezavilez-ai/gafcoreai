// ============================================================
//  GafCoreAI - Modales nativos oscuros
// ============================================================

let currentResolve = null;

function ensureModal() {
  if (document.getElementById("modal-custom")) return;

  const el = document.createElement("div");
  el.id = "modal-custom";
  el.className = "modal hidden";
  el.innerHTML = `
    <div class="modal-box small">
      <div class="modal-head">
        <h2 id="custom-title">GafCoreAI</h2>
        <button class="btn ghost small" id="custom-close">×</button>
      </div>
      <div id="custom-body"></div>
      <div class="custom-actions" id="custom-actions"></div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector("#custom-close").onclick = () => close(null);
  el.onclick = (e) => { if (e.target === el) close(null); };
}

function close(value) {
  const el = document.getElementById("modal-custom");
  if (!el) return;
  el.classList.add("hidden");
  if (currentResolve) {
    currentResolve(value);
    currentResolve = null;
  }
}

export function showAlert(message, title) {
  ensureModal();
  return new Promise((resolve) => {
    currentResolve = resolve;
    const el = document.getElementById("modal-custom");
    el.querySelector("#custom-title").textContent = title || "GafCoreAI";
    el.querySelector("#custom-body").innerHTML = '<div class="custom-message"></div>';
    el.querySelector(".custom-message").textContent = message || "";

    const actions = el.querySelector("#custom-actions");
    actions.innerHTML = "";
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = "Aceptar";
    btn.onclick = () => close(true);
    actions.appendChild(btn);

    el.classList.remove("hidden");
    setTimeout(() => btn.focus(), 50);
  });
}

export function showConfirm(message, title) {
  ensureModal();
  return new Promise((resolve) => {
    currentResolve = resolve;
    const el = document.getElementById("modal-custom");
    el.querySelector("#custom-title").textContent = title || "Confirmar";
    el.querySelector("#custom-body").innerHTML = '<div class="custom-message"></div>';
    el.querySelector(".custom-message").textContent = message || "";

    const actions = el.querySelector("#custom-actions");
    actions.innerHTML = "";
    const btnNo = document.createElement("button");
    btnNo.className = "btn ghost";
    btnNo.textContent = "Cancelar";
    btnNo.onclick = () => close(false);
    const btnYes = document.createElement("button");
    btnYes.className = "btn primary";
    btnYes.textContent = "Aceptar";
    btnYes.onclick = () => close(true);
    actions.appendChild(btnNo);
    actions.appendChild(btnYes);

    el.classList.remove("hidden");
    setTimeout(() => btnYes.focus(), 50);
  });
}

export function showPrompt(message, defaultValue, title) {
  ensureModal();
  return new Promise((resolve) => {
    currentResolve = resolve;
    const el = document.getElementById("modal-custom");
    el.querySelector("#custom-title").textContent = title || "GafCoreAI";
    el.querySelector("#custom-body").innerHTML =
      '<div class="custom-message"></div><input type="text" class="custom-input" id="custom-prompt-input" />';
    el.querySelector(".custom-message").textContent = message || "";

    const input = el.querySelector("#custom-prompt-input");
    input.value = defaultValue || "";
    input.onkeydown = (e) => {
      if (e.key === "Enter") { e.preventDefault(); close(input.value); }
      if (e.key === "Escape") { e.preventDefault(); close(null); }
    };

    const actions = el.querySelector("#custom-actions");
    actions.innerHTML = "";
    const btnNo = document.createElement("button");
    btnNo.className = "btn ghost";
    btnNo.textContent = "Cancelar";
    btnNo.onclick = () => close(null);
    const btnYes = document.createElement("button");
    btnYes.className = "btn primary";
    btnYes.textContent = "Aceptar";
    btnYes.onclick = () => close(input.value);
    actions.appendChild(btnNo);
    actions.appendChild(btnYes);

    el.classList.remove("hidden");
    setTimeout(() => { input.focus(); input.select(); }, 50);
  });
}

// Reemplaza los nativos
export function installGlobalDialogs() {
  window.__gafAlert = window.alert;
  window.__gafConfirm = window.confirm;
  window.__gafPrompt = window.prompt;

  window.alert = (msg) => { showAlert(String(msg)); };
  // confirm/prompt se manejan donde se usen async
}