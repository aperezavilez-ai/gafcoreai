// ============================================================
//  GafCoreAI - Templates Extra (batch 2/4)
//  Wiki, Chat, Tasks, SaaS, ERP
// ============================================================

export const TEMPLATES_EXTRA2 = {

  // ═══════════════════════════════════════════════════════════
  //  5. WIKI / DOCUMENTACION
  // ═══════════════════════════════════════════════════════════
  "wiki-docs": {
    name: "Wiki / Documentacion",
    icon: "&#128218;",
    description: "Documentacion con sidebar, busqueda y markdown",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Wiki</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<aside class="sidebar">
  <div class="brand">&#9670; Wiki</div>
  <input class="search" id="search" placeholder="Buscar...">
  <nav class="nav" id="nav"></nav>
</aside>
<main class="main">
  <article class="content" id="content"></article>
</main>
<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0c;--bg-2:#14141a;--bg-3:#1e1e26;--text:#f0f0f5;--dim:#8a8a96;--accent:#5b7cfa;--border:rgba(255,255,255,.06)}
body{font-family:-apple-system,Inter,sans-serif;background:var(--bg);color:var(--text);display:grid;grid-template-columns:280px 1fr;height:100vh}
.sidebar{background:var(--bg-2);border-right:1px solid var(--border);padding:20px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:16px}
.brand{font-weight:800;color:var(--accent);font-size:16px}
.search{background:var(--bg-3);border:none;color:var(--text);padding:9px 12px;border-radius:8px;font-size:13px;outline:none}
.nav{display:flex;flex-direction:column;gap:2px}
.nav a{padding:8px 12px;color:var(--dim);text-decoration:none;border-radius:6px;font-size:13px;cursor:pointer;transition:.15s}
.nav a:hover{background:var(--bg-3);color:var(--text)}
.nav a.active{background:var(--bg-3);color:var(--accent)}
.nav a.cat{padding:12px 12px 6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#5a5a66;font-weight:700;cursor:default}
.main{overflow-y:auto}
.content{max-width:800px;margin:0 auto;padding:60px 40px;line-height:1.8}
.content h1{font-size:36px;font-weight:800;margin-bottom:24px;letter-spacing:-.02em}
.content h2{font-size:22px;font-weight:700;margin:32px 0 12px}
.content p{margin-bottom:16px;color:#c8c8d0}
.content code{background:var(--bg-3);padding:2px 8px;border-radius:4px;font-family:Consolas,monospace;font-size:12.5px;color:#f0abfc}
.content pre{background:var(--bg-2);padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0;border:1px solid var(--border)}
.content ul,.content ol{margin:16px 0 16px 24px;color:#c8c8d0}
.content li{margin-bottom:8px}`,
      "script.js": `const PAGES = [
  { cat:"Empezando", title:"Introduccion", body:"# Introduccion\\n\\nBienvenido a la documentacion.\\n\\n## Instalacion\\n\\n\`\`\`\\nnpm install mi-libreria\\n\`\`\`\\n\\n## Uso basico\\n\\nImporta el modulo y comienza a usar sus funciones." },
  { cat:"Empezando", title:"Instalacion", body:"# Instalacion\\n\\n## Requisitos\\n\\n- Node.js 18+\\n- npm o yarn\\n\\n## Pasos\\n\\n1. Clona el repo\\n2. Ejecuta npm install\\n3. Inicia el servidor" },
  { cat:"Guias", title:"Primeros pasos", body:"# Primeros pasos\\n\\nEsta guia te llevara paso a paso por los conceptos basicos." },
  { cat:"Guias", title:"Configuracion", body:"# Configuracion\\n\\nLa libreria usa un archivo config.json." },
  { cat:"API", title:"Referencia", body:"# Referencia API\\n\\n## Funciones principales\\n\\n- createApp()\\n- mount()\\n- unmount()" },
  { cat:"API", title:"Ejemplos", body:"# Ejemplos\\n\\nCasos de uso comunes y como resolverlos." }
];

let activePage = 0;

function renderNav() {
  const cats = {};
  PAGES.forEach((p, i) => {
    if (!cats[p.cat]) cats[p.cat] = [];
    cats[p.cat].push({...p, index:i});
  });
  document.getElementById("nav").innerHTML = Object.keys(cats).map(cat =>
    '<div class="cat">' + cat + '</div>' +
    cats[cat].map(p =>
      '<a data-index="' + p.index + '" class="' + (p.index===activePage?'active':'') + '">' + p.title + '</a>'
    ).join("")
  ).join("");
  document.querySelectorAll(".nav a").forEach(a => {
    a.onclick = () => { activePage = parseInt(a.dataset.index); renderNav(); renderContent(); };
  });
}

function renderContent() {
  const p = PAGES[activePage];
  let html = p.body
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre>$1</pre>')
    .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
    .replace(/\\n\\n/g, '</p><p>');
  document.getElementById("content").innerHTML = '<p>' + html + '</p>';
}

document.getElementById("search").oninput = (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".nav a").forEach(a => {
    a.style.display = a.textContent.toLowerCase().includes(q) ? "" : "none";
  });
};

renderNav();
renderContent();`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  6. CHAT EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════
  "chat-realtime": {
    name: "Chat en Tiempo Real",
    icon: "&#128172;",
    description: "Chat estilo WhatsApp con contactos y mensajes",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Chat</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<aside class="contacts">
  <div class="contacts-head">
    <div class="avatar me">T</div>
    <input class="search" placeholder="Buscar chat..." id="search">
  </div>
  <div class="list" id="list"></div>
</aside>
<main class="chat" id="chat">
  <div class="chat-empty">
    <div class="big">&#128172;</div>
    <p>Selecciona un chat para empezar</p>
  </div>
</main>
<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0c;--bg-2:#13131a;--bg-3:#1c1c24;--text:#f0f0f5;--dim:#8a8a96;--accent:#5b7cfa;--ok:#4ec9a0}
body{font-family:-apple-system,Inter,sans-serif;background:var(--bg);color:var(--text);display:grid;grid-template-columns:340px 1fr;height:100vh;overflow:hidden}
.contacts{background:var(--bg-2);border-right:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;overflow:hidden}
.contacts-head{padding:16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,.06)}
.avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;background:linear-gradient(135deg,#5b7cfa,#a673ff)}
.search{flex:1;background:var(--bg-3);border:none;color:var(--text);padding:9px 14px;border-radius:999px;font-size:13px;outline:none}
.list{flex:1;overflow-y:auto}
.contact{padding:14px 16px;display:flex;gap:12px;cursor:pointer;transition:background .15s;align-items:center}
.contact:hover{background:var(--bg-3)}
.contact.active{background:var(--bg-3)}
.contact-info{flex:1;min-width:0}
.contact-name{font-weight:600;font-size:14px;margin-bottom:2px}
.contact-preview{font-size:12px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.contact-meta{text-align:right;flex-shrink:0}
.contact-time{font-size:11px;color:var(--dim);margin-bottom:4px}
.contact-badge{background:var(--accent);color:#fff;font-size:10.5px;padding:2px 7px;border-radius:10px;font-weight:700}

.chat{display:flex;flex-direction:column;background:var(--bg);position:relative}
.chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--dim);gap:16px}
.chat-empty .big{font-size:64px;opacity:.3}
.chat-head{padding:14px 20px;background:var(--bg-2);border-bottom:1px solid rgba(255,255,255,.06);display:flex;gap:12px;align-items:center}
.chat-head-info{flex:1}
.chat-head-name{font-weight:600;font-size:15px}
.chat-head-status{font-size:12px;color:var(--ok)}
.chat-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:4px}
.msg{max-width:65%;padding:9px 14px;border-radius:18px;font-size:14px;line-height:1.45;word-wrap:break-word;animation:in .2s ease-out}
@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.msg.in{background:var(--bg-3);border-bottom-left-radius:4px;align-self:flex-start}
.msg.out{background:var(--accent);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
.msg-time{font-size:10.5px;opacity:.7;margin-top:3px}
.chat-input{padding:16px;background:var(--bg-2);border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px}
.chat-input input{flex:1;background:var(--bg-3);border:none;color:var(--text);padding:12px 18px;border-radius:999px;font-size:14px;outline:none}
.chat-input button{width:44px;height:44px;border-radius:50%;background:var(--accent);border:none;color:#fff;cursor:pointer;font-size:18px}

@media (max-width:768px){body{grid-template-columns:1fr}.contacts{display:none}}`,
      "script.js": `const CONTACTS = [
  { id:1, name:"Ana García", avatar:"A", color:"#ff6b9d", msgs:[{text:"Hola! Como va el proyecto?", time:"10:24", mine:false},{text:"Todo bien, ya casi termino", time:"10:25", mine:true}], unread:2 },
  { id:2, name:"Carlos Dev", avatar:"C", color:"#5b7cfa", msgs:[{text:"Subi los cambios al repo", time:"09:12", mine:false}], unread:0 },
  { id:3, name:"Equipo Design", avatar:"E", color:"#4ec9a0", msgs:[{text:"Nuevo mockup listo para revisar", time:"Ayer", mine:false},{text:"Excelente, lo veo hoy", time:"Ayer", mine:true}], unread:1 }
];

let activeId = null;

function renderContacts() {
  document.getElementById("list").innerHTML = CONTACTS.map(c =>
    '<div class="contact' + (c.id===activeId?' active':'') + '" data-id="' + c.id + '">' +
      '<div class="avatar" style="background:' + c.color + '">' + c.avatar + '</div>' +
      '<div class="contact-info">' +
        '<div class="contact-name">' + c.name + '</div>' +
        '<div class="contact-preview">' + (c.msgs[c.msgs.length-1]?.text || "") + '</div>' +
      '</div>' +
      '<div class="contact-meta">' +
        '<div class="contact-time">' + (c.msgs[c.msgs.length-1]?.time || "") + '</div>' +
        (c.unread ? '<span class="contact-badge">' + c.unread + '</span>' : "") +
      '</div>' +
    '</div>'
  ).join("");
  document.querySelectorAll(".contact").forEach(el => {
    el.onclick = () => openChat(parseInt(el.dataset.id));
  });
}

function openChat(id) {
  activeId = id;
  const c = CONTACTS.find(x => x.id === id);
  c.unread = 0;
  document.getElementById("chat").innerHTML =
    '<div class="chat-head">' +
      '<div class="avatar" style="background:' + c.color + '">' + c.avatar + '</div>' +
      '<div class="chat-head-info">' +
        '<div class="chat-head-name">' + c.name + '</div>' +
        '<div class="chat-head-status">en linea</div>' +
      '</div>' +
    '</div>' +
    '<div class="chat-body" id="chatBody">' +
      c.msgs.map(m =>
        '<div class="msg ' + (m.mine?'out':'in') + '">' +
          m.text +
          '<div class="msg-time">' + m.time + '</div>' +
        '</div>'
      ).join("") +
    '</div>' +
    '<div class="chat-input">' +
      '<input id="msgInput" placeholder="Escribe un mensaje..." autofocus>' +
      '<button id="sendBtn">&#10148;</button>' +
    '</div>';
  const body = document.getElementById("chatBody");
  body.scrollTop = body.scrollHeight;
  const input = document.getElementById("msgInput");
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    const now = new Date();
    const time = now.getHours().toString().padStart(2,"0") + ":" + now.getMinutes().toString().padStart(2,"0");
    c.msgs.push({ text, time, mine:true });
    input.value = "";
    openChat(id);
    // Respuesta simulada
    setTimeout(() => {
      c.msgs.push({ text:"Recibido! Respondere en un momento.", time, mine:false });
      if (activeId === id) openChat(id);
      else { c.unread++; renderContacts(); }
    }, 1200);
  };
  document.getElementById("sendBtn").onclick = send;
  input.onkeydown = (e) => { if (e.key === "Enter") send(); };
  renderContacts();
}

renderContacts();`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  7. APP DE TAREAS (KANBAN)
  // ═══════════════════════════════════════════════════════════
  "tasks-kanban": {
    name: "App de Tareas (Kanban)",
    icon: "&#128203;",
    description: "Tablero kanban con columnas, drag & drop y tags",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Kanban</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="header">
  <h1>&#128203; Mi Tablero</h1>
  <button class="btn-primary" id="addBtn">+ Nueva tarea</button>
</header>
<main class="board" id="board"></main>
<div class="modal hidden" id="modal">
  <div class="modal-box">
    <h2>Nueva tarea</h2>
    <input id="taskTitle" placeholder="Titulo de la tarea">
    <textarea id="taskDesc" placeholder="Descripcion (opcional)"></textarea>
    <select id="taskCol">
      <option value="todo">Por hacer</option>
      <option value="doing">En progreso</option>
      <option value="done">Completado</option>
    </select>
    <div class="modal-actions">
      <button class="btn-ghost" id="cancelBtn">Cancelar</button>
      <button class="btn-primary" id="saveBtn">Crear</button>
    </div>
  </div>
</div>
<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0c;--bg-2:#14141a;--bg-3:#1e1e26;--text:#f0f0f5;--dim:#8a8a96;--accent:#5b7cfa;--ok:#4ec9a0;--warn:#f0a545;--err:#ef5a5a}
body{font-family:-apple-system,Inter,sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden}
.header{padding:20px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.06)}
.header h1{font-size:20px;font-weight:700}
.btn-primary{background:var(--accent);color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px}
.btn-primary:hover{filter:brightness(1.1)}
.btn-ghost{background:transparent;color:var(--text);border:1px solid rgba(255,255,255,.1);padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px}
.board{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:24px 32px;overflow-x:auto;overflow-y:hidden}
.col{background:var(--bg-2);border-radius:12px;padding:16px;display:flex;flex-direction:column;min-width:280px;max-height:100%;overflow:hidden}
.col-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.06)}
.col-head h3{font-size:12.5px;text-transform:uppercase;letter-spacing:.5px;color:var(--dim);font-weight:700}
.col-count{background:var(--bg-3);padding:2px 8px;border-radius:10px;font-size:11px;color:var(--dim);font-weight:600}
.col.todo .col-head h3{color:var(--dim)}
.col.doing .col-head h3{color:var(--warn)}
.col.done .col-head h3{color:var(--ok)}
.col-body{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px}
.col-body::-webkit-scrollbar{width:4px}
.col-body::-webkit-scrollbar-thumb{background:var(--bg-3);border-radius:2px}
.card{background:var(--bg-3);padding:14px;border-radius:10px;cursor:grab;transition:transform .15s,box-shadow .15s}
.card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.3)}
.card.dragging{opacity:.5;cursor:grabbing}
.card-title{font-size:13.5px;font-weight:600;margin-bottom:6px}
.card-desc{font-size:12px;color:var(--dim);line-height:1.4}
.card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
.card-tag{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600}
.tag-todo{background:rgba(138,138,150,.15);color:var(--dim)}
.tag-doing{background:rgba(240,165,69,.15);color:var(--warn)}
.tag-done{background:rgba(78,201,160,.15);color:var(--ok)}
.card-del{background:none;border:none;color:var(--dim);cursor:pointer;font-size:13px;padding:0 4px}
.card-del:hover{color:var(--err)}
.col.dragover{background:var(--bg-3);border:1px dashed var(--accent)}

.modal{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px)}
.modal.hidden{display:none}
.modal-box{background:var(--bg-2);padding:28px;border-radius:16px;width:480px;max-width:90vw;display:flex;flex-direction:column;gap:16px}
.modal-box h2{font-size:18px;margin-bottom:4px}
.modal-box input,.modal-box textarea,.modal-box select{background:var(--bg-3);border:none;color:var(--text);padding:12px;border-radius:8px;font-family:inherit;font-size:14px;outline:none;width:100%}
.modal-box textarea{resize:vertical;min-height:80px}
.modal-actions{display:flex;justify-content:flex-end;gap:10px}`,
      "script.js": `const STORAGE = "kanban-tasks";
const COLS = [
  { id:"todo", name:"Por hacer" },
  { id:"doing", name:"En progreso" },
  { id:"done", name:"Completado" }
];

let tasks = JSON.parse(localStorage.getItem(STORAGE) || "null") || [
  { id:1, title:"Diseñar landing", desc:"Wireframe + mockup en Figma", col:"todo" },
  { id:2, title:"Setup proyecto", desc:"React + Vite + Tailwind", col:"doing" },
  { id:3, title:"Deploy inicial", desc:"Subir a Vercel", col:"done" }
];

function save(){ localStorage.setItem(STORAGE, JSON.stringify(tasks)); }

function render() {
  document.getElementById("board").innerHTML = COLS.map(col => {
    const items = tasks.filter(t => t.col === col.id);
    return '<div class="col ' + col.id + '" data-col="' + col.id + '">' +
      '<div class="col-head"><h3>' + col.name + '</h3><span class="col-count">' + items.length + '</span></div>' +
      '<div class="col-body">' + items.map(t =>
        '<div class="card" draggable="true" data-id="' + t.id + '">' +
          '<div class="card-title">' + t.title + '</div>' +
          (t.desc ? '<div class="card-desc">' + t.desc + '</div>' : '') +
          '<div class="card-footer">' +
            '<span class="card-tag tag-' + col.id + '">' + col.name + '</span>' +
            '<button class="card-del" data-id="' + t.id + '">&#10005;</button>' +
          '</div>' +
        '</div>'
      ).join("") + '</div>' +
    '</div>';
  }).join("");

  document.querySelectorAll(".card").forEach(card => {
    card.ondragstart = (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.id);
      card.classList.add("dragging");
    };
    card.ondragend = () => card.classList.remove("dragging");
  });

  document.querySelectorAll(".col").forEach(col => {
    col.ondragover = (e) => { e.preventDefault(); col.classList.add("dragover"); };
    col.ondragleave = () => col.classList.remove("dragover");
    col.ondrop = (e) => {
      e.preventDefault();
      col.classList.remove("dragover");
      const id = parseInt(e.dataTransfer.getData("text/plain"));
      const t = tasks.find(x => x.id === id);
      if (t) { t.col = col.dataset.col; save(); render(); }
    };
  });

  document.querySelectorAll(".card-del").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      tasks = tasks.filter(t => t.id !== id);
      save(); render();
    };
  });
}

document.getElementById("addBtn").onclick = () => {
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDesc").value = "";
  document.getElementById("taskTitle").focus();
};
document.getElementById("cancelBtn").onclick = () => document.getElementById("modal").classList.add("hidden");
document.getElementById("saveBtn").onclick = () => {
  const title = document.getElementById("taskTitle").value.trim();
  if (!title) return;
  tasks.push({
    id: Date.now(),
    title,
    desc: document.getElementById("taskDesc").value.trim(),
    col: document.getElementById("taskCol").value
  });
  save(); render();
  document.getElementById("modal").classList.add("hidden");
};

render();`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  8. SAAS CON PRICING
  // ═══════════════════════════════════════════════════════════
  "saas-pricing": {
    name: "SaaS con Pricing",
    icon: "&#128640;",
    description: "SaaS landing con pricing tiers, features y FAQ",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Mi SaaS</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<nav class="nav">
  <div class="brand">&#9670; MiSaaS</div>
  <div class="nav-links">
    <a href="#features">Features</a>
    <a href="#pricing">Precios</a>
    <a href="#faq">FAQ</a>
  </div>
  <div class="nav-actions">
    <a href="#" class="btn-ghost">Iniciar sesion</a>
    <a href="#" class="btn-primary">Empezar gratis</a>
  </div>
</nav>

<section class="hero">
  <span class="badge">&#127881; Nuevo: IA integrada</span>
  <h1>Automatiza tu trabajo.<br><span class="gradient">Multiplica resultados.</span></h1>
  <p>La plataforma todo-en-uno que tu equipo necesita para trabajar el doble de rapido.</p>
  <div class="hero-cta">
    <a href="#pricing" class="btn-primary big">Empezar gratis</a>
    <a href="#" class="btn-ghost big">Ver demo &#8594;</a>
  </div>
  <div class="hero-logos">
    <span>Trusted by</span>
    <div>Acme · TechCorp · Startup</div>
  </div>
</section>

<section class="section" id="features">
  <h2 class="section-title">Todo lo que necesitas</h2>
  <div class="features-grid">
    <div class="feature"><div class="ficon">&#9889;</div><h3>Ultra rapido</h3><p>Rendimiento optimizado desde el primer click.</p></div>
    <div class="feature"><div class="ficon">&#128274;</div><h3>Seguro</h3><p>Cifrado end-to-end y cumplimiento SOC2.</p></div>
    <div class="feature"><div class="ficon">&#129302;</div><h3>IA integrada</h3><p>Asistente que aprende de tu equipo.</p></div>
    <div class="feature"><div class="ficon">&#128202;</div><h3>Analytics</h3><p>Metricas en tiempo real de todo tu negocio.</p></div>
    <div class="feature"><div class="ficon">&#128101;</div><h3>Colaborativo</h3><p>Trabaja en equipo sin fricciones.</p></div>
    <div class="feature"><div class="ficon">&#128640;</div><h3>Escalable</h3><p>De 1 a 10,000 usuarios sin reescribir.</p></div>
  </div>
</section>

<section class="section" id="pricing">
  <h2 class="section-title">Precios simples</h2>
  <div class="pricing-grid">
    <div class="plan">
      <div class="plan-name">Free</div>
      <div class="plan-price"><span>$0</span>/mes</div>
      <ul class="plan-features">
        <li>&#10003; Hasta 3 usuarios</li>
        <li>&#10003; 1 GB storage</li>
        <li>&#10003; Soporte comunidad</li>
      </ul>
      <a href="#" class="btn-ghost full">Empezar gratis</a>
    </div>
    <div class="plan featured">
      <div class="plan-badge">Mas popular</div>
      <div class="plan-name">Pro</div>
      <div class="plan-price"><span>$29</span>/mes</div>
      <ul class="plan-features">
        <li>&#10003; Hasta 20 usuarios</li>
        <li>&#10003; 100 GB storage</li>
        <li>&#10003; IA asistente</li>
        <li>&#10003; Analytics avanzado</li>
        <li>&#10003; Soporte prioritario</li>
      </ul>
      <a href="#" class="btn-primary full">Empezar ahora</a>
    </div>
    <div class="plan">
      <div class="plan-name">Enterprise</div>
      <div class="plan-price"><span>Custom</span></div>
      <ul class="plan-features">
        <li>&#10003; Usuarios ilimitados</li>
        <li>&#10003; Storage ilimitado</li>
        <li>&#10003; SSO + SAML</li>
        <li>&#10003; SLA 99.99%</li>
        <li>&#10003; Onboarding dedicado</li>
      </ul>
      <a href="#" class="btn-ghost full">Contactar ventas</a>
    </div>
  </div>
</section>

<section class="section" id="faq">
  <h2 class="section-title">Preguntas frecuentes</h2>
  <div class="faq">
    <details><summary>Puedo cambiar de plan cuando quiera?</summary><p>Si, puedes upgradar o downgradar en cualquier momento. Solo pagas la diferencia proporcional.</p></details>
    <details><summary>Hay periodo de prueba?</summary><p>El plan Free es para siempre. No necesitas tarjeta de credito.</p></details>
    <details><summary>Que metodos de pago aceptan?</summary><p>Tarjetas de credito/debito, transferencia bancaria y PayPal.</p></details>
    <details><summary>Tienen API?</summary><p>Si, la API REST esta disponible en todos los planes. La documentacion esta en docs.misaas.com</p></details>
  </div>
</section>

<footer class="footer">
  <div class="footer-brand">&#9670; MiSaaS</div>
  <div class="footer-cols">
    <div><h5>Producto</h5><a>Features</a><a>Pricing</a><a>Changelog</a></div>
    <div><h5>Compania</h5><a>About</a><a>Blog</a><a>Carreras</a></div>
    <div><h5>Legal</h5><a>Privacy</a><a>Terms</a><a>Security</a></div>
  </div>
  <div class="footer-bottom">&copy; 2026 MiSaaS. Todos los derechos reservados.</div>
</footer>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--bg-2:#13131a;--bg-3:#1c1c24;--border:rgba(255,255,255,.08);--text:#f0f0f5;--dim:#8a8a96;--accent:#5b7cfa;--accent-2:#a673ff}
body{font-family:-apple-system,Inter,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:rgba(10,10,15,.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.brand{font-weight:800;font-size:16px;color:var(--text)}
.nav-links{display:flex;gap:32px}
.nav-links a{color:var(--dim);text-decoration:none;font-size:14px;transition:.15s}
.nav-links a:hover{color:var(--text)}
.nav-actions{display:flex;gap:12px;align-items:center}
.btn-primary{background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;text-decoration:none;display:inline-block;transition:.15s}
.btn-primary:hover{background:#6d8cff;transform:translateY(-1px)}
.btn-primary.big{padding:14px 28px;font-size:15px}
.btn-primary.full{display:block;text-align:center;padding:12px;width:100%}
.btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border);padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;display:inline-block;transition:.15s}
.btn-ghost:hover{background:var(--bg-2);border-color:rgba(255,255,255,.15)}
.btn-ghost.big{padding:14px 28px;font-size:15px}
.btn-ghost.full{display:block;text-align:center;padding:12px;width:100%}

.hero{padding:120px 40px 80px;text-align:center;max-width:900px;margin:0 auto}
.badge{display:inline-block;background:rgba(91,124,250,.15);color:#8b9eff;padding:6px 16px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:24px;border:1px solid rgba(91,124,250,.3)}
.hero h1{font-size:clamp(40px,6vw,72px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:24px}
.gradient{background:linear-gradient(135deg,#5b7cfa,#a673ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:18px;color:var(--dim);max-width:600px;margin:0 auto 40px}
.hero-cta{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:60px}
.hero-logos{color:var(--dim);font-size:13px}
.hero-logos div{margin-top:8px;font-weight:600;letter-spacing:.1em}

.section{padding:100px 40px;max-width:1200px;margin:0 auto}
.section-title{font-size:clamp(28px,4vw,44px);font-weight:800;text-align:center;letter-spacing:-.02em;margin-bottom:60px}

.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.feature{background:var(--bg-2);padding:32px;border-radius:16px;border:1px solid var(--border);transition:.2s}
.feature:hover{transform:translateY(-4px);border-color:rgba(91,124,250,.3)}
.ficon{font-size:32px;margin-bottom:16px}
.feature h3{font-size:18px;font-weight:700;margin-bottom:8px}
.feature p{color:var(--dim);font-size:14px}

.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;align-items:start}
.plan{background:var(--bg-2);padding:36px 28px;border-radius:20px;border:1px solid var(--border);position:relative}
.plan.featured{border-color:var(--accent);transform:scale(1.03);background:linear-gradient(180deg,rgba(91,124,250,.05),var(--bg-2))}
.plan-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#5b7cfa,#a673ff);color:#fff;padding:4px 14px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.plan-name{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--dim);margin-bottom:16px}
.plan-price{font-size:48px;font-weight:800;margin-bottom:28px;letter-spacing:-.02em}
.plan-price span{font-size:48px}
.plan-price:not(:has(span)){font-size:48px}
.plan-features{list-style:none;margin-bottom:28px;display:flex;flex-direction:column;gap:12px}
.plan-features li{font-size:14px;color:#c8c8d0}

.faq{max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.faq details{background:var(--bg-2);border:1px solid var(--border);border-radius:12px;padding:20px 24px;transition:.15s}
.faq details[open]{border-color:rgba(91,124,250,.4)}
.faq summary{font-weight:600;font-size:15px;cursor:pointer;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";float:right;font-size:20px;color:var(--dim);transition:.2s}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq p{margin-top:12px;color:var(--dim);font-size:14px}

.footer{background:var(--bg-2);border-top:1px solid var(--border);padding:60px 40px 30px;margin-top:100px}
.footer-brand{font-size:18px;font-weight:800;margin-bottom:40px;text-align:center}
.footer-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:40px;max-width:900px;margin:0 auto 40px}
.footer-cols h5{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--text);margin-bottom:16px;font-weight:700}
.footer-cols a{display:block;color:var(--dim);text-decoration:none;font-size:13.5px;padding:5px 0;cursor:pointer;transition:.15s}
.footer-cols a:hover{color:var(--text)}
.footer-bottom{text-align:center;color:var(--dim);font-size:12px;padding-top:30px;border-top:1px solid var(--border)}

@media (max-width:768px){
  .nav-links,.nav-actions{display:none}
  .hero{padding:80px 20px 60px}
  .section{padding:60px 20px}
}`,
      "script.js": `// Smooth scroll para anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.onclick = (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
});

// Animacion de fade-in on scroll
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = "1";
      e.target.style.transform = "translateY(0)";
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".feature, .plan").forEach(el => {
  el.style.opacity = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = "opacity .6s ease-out, transform .6s ease-out";
  obs.observe(el);
});`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  9. ERP COMPLETO (¡NUEVO!)
  // ═══════════════════════════════════════════════════════════
  "erp-complete": {
    name: "ERP Completo",
    icon: "&#127970;",
    description: "ERP con inventario, ventas, compras, clientes y reportes",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ERP</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<aside class="sidebar">
  <div class="logo">&#127970; ERP System</div>
  <nav class="nav">
    <div class="nav-section">Principal</div>
    <a class="active" data-view="dashboard">&#128202; Dashboard</a>
    <a data-view="inventory">&#128230; Inventario</a>
    <a data-view="sales">&#128176; Ventas</a>
    <a data-view="purchases">&#128722; Compras</a>
    <div class="nav-section">Contactos</div>
    <a data-view="clients">&#128101; Clientes</a>
    <a data-view="suppliers">&#127981; Proveedores</a>
    <div class="nav-section">Sistema</div>
    <a data-view="reports">&#128200; Reportes</a>
    <a data-view="settings">&#9881; Configuracion</a>
  </nav>
</aside>

<main class="main">
  <header class="topbar">
    <div>
      <h1 id="pageTitle">Dashboard</h1>
      <p id="pageSubtitle" class="subtitle">Vista general de tu negocio</p>
    </div>
    <div class="topbar-actions">
      <div class="user-chip">
        <div class="user-avatar">A</div>
        <span>Admin</span>
      </div>
    </div>
  </header>

  <!-- DASHBOARD -->
  <section id="view-dashboard" class="view active">
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-icon" style="background:rgba(78,201,160,.15);color:#4ec9a0">&#128176;</div>
        <div>
          <div class="kpi-label">Ventas mes</div>
          <div class="kpi-value">$48,290</div>
          <div class="kpi-trend up">&#8593; 12.5%</div>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-icon" style="background:rgba(91,124,250,.15);color:#5b7cfa">&#128230;</div>
        <div>
          <div class="kpi-label">Productos</div>
          <div class="kpi-value">1,247</div>
          <div class="kpi-trend up">&#8593; 3.2%</div>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-icon" style="background:rgba(240,165,69,.15);color:#f0a545">&#128101;</div>
        <div>
          <div class="kpi-label">Clientes</div>
          <div class="kpi-value">892</div>
          <div class="kpi-trend up">&#8593; 8.1%</div>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-icon" style="background:rgba(166,115,255,.15);color:#a673ff">&#128200;</div>
        <div>
          <div class="kpi-label">Margen</div>
          <div class="kpi-value">34.2%</div>
          <div class="kpi-trend down">&#8595; 1.8%</div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card-chart">
        <div class="card-head">
          <h3>Ingresos ultimos 30 dias</h3>
          <select class="mini-select"><option>30 dias</option><option>7 dias</option></select>
        </div>
        <div class="chart" id="chartMain"></div>
      </div>
      <div class="card-chart">
        <div class="card-head">
          <h3>Top productos</h3>
        </div>
        <div class="top-list" id="topProducts"></div>
      </div>
    </div>

    <div class="card-chart full">
      <div class="card-head">
        <h3>Ultimas transacciones</h3>
        <a class="link" data-view="sales">Ver todas &#8594;</a>
      </div>
      <table class="mini-table">
        <thead><tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody id="recentTx"></tbody>
      </table>
    </div>
  </section>

  <!-- INVENTARIO -->
  <section id="view-inventory" class="view">
    <div class="view-actions">
      <input class="search" placeholder="Buscar producto..." id="invSearch">
      <button class="btn-primary">+ Nuevo producto</button>
    </div>
    <div class="card-chart full">
      <table class="mini-table">
        <thead><tr><th>SKU</th><th>Producto</th><th>Categoria</th><th>Stock</th><th>Precio</th><th>Estado</th></tr></thead>
        <tbody id="inventoryTable"></tbody>
      </table>
    </div>
  </section>

  <!-- VENTAS -->
  <section id="view-sales" class="view">
    <div class="view-actions">
      <input class="search" placeholder="Buscar venta..." id="salesSearch">
      <button class="btn-primary">+ Nueva venta</button>
    </div>
    <div class="card-chart full">
      <table class="mini-table">
        <thead><tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Items</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody id="salesTable"></tbody>
      </table>
    </div>
  </section>

  <!-- COMPRAS -->
  <section id="view-purchases" class="view">
    <div class="view-actions">
      <input class="search" placeholder="Buscar compra..." id="purchSearch">
      <button class="btn-primary">+ Nueva orden</button>
    </div>
    <div class="card-chart full">
      <table class="mini-table">
        <thead><tr><th>ID</th><th>Proveedor</th><th>Fecha</th><th>Items</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody id="purchasesTable"></tbody>
      </table>
    </div>
  </section>

  <!-- CLIENTES -->
  <section id="view-clients" class="view">
    <div class="view-actions">
      <input class="search" placeholder="Buscar cliente..." id="cliSearch">
      <button class="btn-primary">+ Nuevo cliente</button>
    </div>
    <div class="card-chart full">
      <table class="mini-table">
        <thead><tr><th>Cliente</th><th>Email</th><th>Telefono</th><th>Compras</th><th>Total gastado</th><th>Estado</th></tr></thead>
        <tbody id="clientsTable2"></tbody>
      </table>
    </div>
  </section>

  <!-- PROVEEDORES -->
  <section id="view-suppliers" class="view">
    <div class="view-actions">
      <input class="search" placeholder="Buscar proveedor..." id="supSearch">
      <button class="btn-primary">+ Nuevo proveedor</button>
    </div>
    <div class="card-chart full">
      <table class="mini-table">
        <thead><tr><th>Proveedor</th><th>Contacto</th><th>Email</th><th>Productos</th><th>Deuda</th><th>Estado</th></tr></thead>
        <tbody id="suppliersTable"></tbody>
      </table>
    </div>
  </section>

  <!-- REPORTES -->
  <section id="view-reports" class="view">
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-icon" style="background:rgba(78,201,160,.15);color:#4ec9a0">&#128176;</div><div><div class="kpi-label">Ingresos anuales</div><div class="kpi-value">$512K</div></div></div>
      <div class="kpi"><div class="kpi-icon" style="background:rgba(239,90,90,.15);color:#ef5a5a">&#128184;</div><div><div class="kpi-label">Costos anuales</div><div class="kpi-value">$336K</div></div></div>
      <div class="kpi"><div class="kpi-icon" style="background:rgba(91,124,250,.15);color:#5b7cfa">&#128202;</div><div><div class="kpi-label">Utilidad</div><div class="kpi-value">$176K</div></div></div>
      <div class="kpi"><div class="kpi-icon" style="background:rgba(166,115,255,.15);color:#a673ff">&#128200;</div><div><div class="kpi-label">ROI</div><div class="kpi-value">52.4%</div></div></div>
    </div>
    <div class="card-chart full">
      <div class="card-head"><h3>Reporte de ventas por categoria</h3></div>
      <div class="chart" id="chartReport"></div>
    </div>
  </section>

  <!-- SETTINGS -->
  <section id="view-settings" class="view">
    <div class="card-chart full" style="max-width:640px">
      <div class="card-head"><h3>Configuracion general</h3></div>
      <div class="form-row"><label>Nombre de la empresa</label><input value="Mi Empresa S.A."></div>
      <div class="form-row"><label>RUC / NIT</label><input value="123456789"></div>
      <div class="form-row"><label>Moneda</label><select><option>USD ($)</option><option>EUR (€)</option><option>MXN ($)</option></select></div>
      <div class="form-row"><label>IVA / Impuesto (%)</label><input type="number" value="16"></div>
      <button class="btn-primary" style="margin-top:16px">Guardar cambios</button>
    </div>
  </section>
</main>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0c;--bg-2:#13131a;--bg-3:#1c1c24;--bg-4:#25252f;--border:rgba(255,255,255,.07);--text:#f0f0f5;--dim:#8a8a96;--accent:#5b7cfa;--ok:#4ec9a0;--warn:#f0a545;--err:#ef5a5a}
body{font-family:-apple-system,Inter,sans-serif;background:var(--bg);color:var(--text);display:grid;grid-template-columns:250px 1fr;height:100vh;overflow:hidden}

.sidebar{background:var(--bg-2);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto}
.logo{padding:24px 20px;font-weight:800;font-size:15px;color:var(--accent);border-bottom:1px solid var(--border)}
.nav{padding:12px 8px;display:flex;flex-direction:column;gap:2px}
.nav-section{padding:14px 12px 6px;font-size:10.5px;color:#5a5a66;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
.nav a{padding:9px 12px;color:var(--dim);text-decoration:none;border-radius:8px;font-size:13.5px;cursor:pointer;transition:.15s;font-weight:500}
.nav a:hover{background:var(--bg-3);color:var(--text)}
.nav a.active{background:rgba(91,124,250,.15);color:var(--accent);font-weight:600}

.main{overflow-y:auto;padding:24px 32px 40px}
.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}
.topbar h1{font-size:22px;font-weight:800;letter-spacing:-.02em}
.subtitle{color:var(--dim);font-size:13px;margin-top:2px}
.topbar-actions{display:flex;gap:12px;align-items:center}
.user-chip{display:flex;align-items:center;gap:10px;background:var(--bg-2);padding:6px 14px 6px 6px;border-radius:999px;border:1px solid var(--border)}
.user-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#5b7cfa,#a673ff);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff}
.user-chip span{font-size:13px}

.view{display:none;animation:fade .2s}
.view.active{display:block}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px}
.kpi{background:var(--bg-2);border:1px solid var(--border);border-radius:14px;padding:20px;display:flex;gap:14px;align-items:center}
.kpi-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.kpi-label{font-size:11.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:4px}
.kpi-value{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-bottom:2px}
.kpi-trend{font-size:12px;font-weight:600}
.kpi-trend.up{color:var(--ok)}
.kpi-trend.down{color:var(--err)}

.dashboard-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px}
.card-chart{background:var(--bg-2);border:1px solid var(--border);border-radius:14px;padding:20px}
.card-chart.full{margin-top:16px}
.card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.card-head h3{font-size:14px;font-weight:700}
.mini-select{background:var(--bg-3);border:none;color:var(--text);padding:6px 10px;border-radius:6px;font-size:11.5px;outline:none}
.link{color:var(--accent);font-size:12.5px;cursor:pointer;text-decoration:none;font-weight:600}

.chart{display:flex;align-items:flex-end;gap:8px;height:180px;padding:0 4px}
.chart .bar{flex:1;background:linear-gradient(180deg,#5b7cfa,#a673ff);border-radius:6px 6px 0 0;min-height:10px;transition:height .4s;position:relative}
.chart .bar:hover{filter:brightness(1.2)}

.top-list{display:flex;flex-direction:column;gap:12px}
.top-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)}
.top-item:last-child{border-bottom:none}
.top-name{font-size:13px}
.top-value{font-weight:700;font-size:13px;color:var(--ok)}

.mini-table{width:100%;border-collapse:collapse}
.mini-table th{text-align:left;padding:12px 14px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;border-bottom:1px solid var(--border)}
.mini-table td{padding:12px 14px;font-size:13px;border-bottom:1px solid var(--border)}
.mini-table tr:last-child td{border-bottom:none}
.mini-table tbody tr:hover{background:var(--bg-3);cursor:pointer}

.view-actions{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}
.search{flex:1;max-width:340px;background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:13px;outline:none}
.search:focus{border-color:var(--accent)}
.btn-primary{background:var(--accent);color:#fff;border:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:13px;cursor:pointer;transition:.15s}
.btn-primary:hover{background:#6d8cff}
.badge{font-size:11px;padding:3px 10px;border-radius:10px;font-weight:600}
.badge.ok{background:rgba(78,201,160,.15);color:var(--ok)}
.badge.warn{background:rgba(240,165,69,.15);color:var(--warn)}
.badge.err{background:rgba(239,90,90,.15);color:var(--err)}

.form-row{margin-bottom:16px}
.form-row label{display:block;font-size:11.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:6px}
.form-row input,.form-row select{width:100%;background:var(--bg-3);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:13px;outline:none;font-family:inherit}
.form-row input:focus,.form-row select:focus{border-color:var(--accent)}

@media (max-width:1024px){.dashboard-grid{grid-template-columns:1fr}}
@media (max-width:768px){body{grid-template-columns:1fr}.sidebar{display:none}.main{padding:16px}}`,
      "script.js": `// ═══════════════════════════════════════════════════════════
//  DATOS SIMULADOS
// ═══════════════════════════════════════════════════════════
const DATA = {
  inventory: [
    { sku:"PRD-001", name:"Laptop Pro 15", cat:"Computo", stock:24, price:1499, status:"ok" },
    { sku:"PRD-002", name:"Mouse Inalambrico", cat:"Accesorios", stock:156, price:29, status:"ok" },
    { sku:"PRD-003", name:"Monitor 27 4K", cat:"Computo", stock:8, price:599, status:"warn" },
    { sku:"PRD-004", name:"Teclado Mecanico", cat:"Accesorios", stock:0, price:129, status:"err" },
    { sku:"PRD-005", name:"Webcam HD", cat:"Accesorios", stock:42, price:89, status:"ok" },
    { sku:"PRD-006", name:"SSD 1TB", cat:"Almacenamiento", stock:73, price:119, status:"ok" }
  ],
  sales: [
    { id:"V-1001", client:"Ana Garcia", date:"2026-09-20", items:3, total:1820, status:"ok" },
    { id:"V-1002", client:"Carlos Ruiz", date:"2026-09-19", items:1, total:599, status:"ok" },
    { id:"V-1003", client:"Maria Lopez", date:"2026-09-18", items:5, total:2450, status:"warn" },
    { id:"V-1004", client:"Juan Perez", date:"2026-09-17", items:2, total:718, status:"ok" },
    { id:"V-1005", client:"Sofia Martin", date:"2026-09-16", items:1, total:129, status:"err" }
  ],
  purchases: [
    { id:"O-2001", supplier:"TechDistributor", date:"2026-09-20", items:10, total:5200, status:"ok" },
    { id:"O-2002", supplier:"GlobalParts", date:"2026-09-18", items:25, total:3400, status:"ok" },
    { id:"O-2003", supplier:"ImportDirect", date:"2026-09-15", items:5, total:8900, status:"warn" }
  ],
  clients: [
    { name:"Ana Garcia", email:"ana@tech.com", phone:"+52 555 1234", buys:12, total:18400, status:"ok" },
    { name:"Carlos Ruiz", email:"carlos@design.io", phone:"+52 555 5678", buys:5, total:5200, status:"ok" },
    { name:"Maria Lopez", email:"maria@startup.co", phone:"+52 555 9012", buys:28, total:34200, status:"ok" },
    { name:"Juan Perez", email:"juan@bigco.com", phone:"+52 555 3456", buys:3, total:2400, status:"warn" },
    { name:"Sofia Martin", email:"sofia@agency.es", phone:"+52 555 7890", buys:8, total:9800, status:"ok" }
  ],
  suppliers: [
    { name:"TechDistributor", contact:"Roberto Silva", email:"ventas@techd.com", products:124, debt:0, status:"ok" },
    { name:"GlobalParts", contact:"Laura Vega", email:"contacto@gparts.com", products:87, debt:2400, status:"warn" },
    { name:"ImportDirect", contact:"Miguel Torres", email:"sales@importdirect.com", products:45, debt:0, status:"ok" }
  ]
};

const SUBTITLES = {
  dashboard: "Vista general de tu negocio",
  inventory: "Control de productos y stock",
  sales: "Historial de ventas",
  purchases: "Ordenes de compra a proveedores",
  clients: "Base de datos de clientes",
  suppliers: "Gestion de proveedores",
  reports: "Reportes y analisis",
  settings: "Configuracion del sistema"
};

// ═══════════════════════════════════════════════════════════
//  NAVEGACION
// ═══════════════════════════════════════════════════════════
function switchView(viewId) {
  document.querySelectorAll(".nav a").forEach(a => a.classList.remove("active"));
  const link = document.querySelector('.nav a[data-view="' + viewId + '"]');
  if (link) link.classList.add("active");
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const view = document.getElementById("view-" + viewId);
  if (view) view.classList.add("active");
  document.getElementById("pageTitle").textContent =
    (link ? link.textContent.replace(/[^a-zA-Z ]/g,"").trim() : viewId);
  document.getElementById("pageSubtitle").textContent = SUBTITLES[viewId] || "";
}

document.querySelectorAll(".nav a[data-view]").forEach(a => {
  a.onclick = () => switchView(a.dataset.view);
});
document.querySelectorAll(".link[data-view]").forEach(l => {
  l.onclick = () => switchView(l.dataset.view);
});

// ═══════════════════════════════════════════════════════════
//  RENDER TABLAS
// ═══════════════════════════════════════════════════════════
function renderInventory() {
  document.getElementById("inventoryTable").innerHTML = DATA.inventory.map(p => {
    const badge = p.status === "ok" ? '<span class="badge ok">En stock</span>'
                : p.status === "warn" ? '<span class="badge warn">Stock bajo</span>'
                : '<span class="badge err">Sin stock</span>';
    return '<tr><td><b>' + p.sku + '</b></td><td>' + p.name + '</td><td>' + p.cat +
           '</td><td>' + p.stock + '</td><td>$' + p.price + '</td><td>' + badge + '</td></tr>';
  }).join("");
}

function renderSales() {
  document.getElementById("salesTable").innerHTML = DATA.sales.map(s => {
    const badge = s.status === "ok" ? '<span class="badge ok">Pagada</span>'
                : s.status === "warn" ? '<span class="badge warn">Pendiente</span>'
                : '<span class="badge err">Cancelada</span>';
    return '<tr><td><b>' + s.id + '</b></td><td>' + s.client + '</td><td>' + s.date +
           '</td><td>' + s.items + '</td><td>$' + s.total + '</td><td>' + badge + '</td></tr>';
  }).join("");
}

function renderPurchases() {
  document.getElementById("purchasesTable").innerHTML = DATA.purchases.map(p => {
    const badge = p.status === "ok" ? '<span class="badge ok">Recibida</span>'
                : '<span class="badge warn">En transito</span>';
    return '<tr><td><b>' + p.id + '</b></td><td>' + p.supplier + '</td><td>' + p.date +
           '</td><td>' + p.items + '</td><td>$' + p.total + '</td><td>' + badge + '</td></tr>';
  }).join("");
}

function renderClients() {
  document.getElementById("clientsTable2").innerHTML = DATA.clients.map(c => {
    const badge = c.status === "ok" ? '<span class="badge ok">Activo</span>'
                : '<span class="badge warn">Inactivo</span>';
    return '<tr><td><b>' + c.name + '</b></td><td>' + c.email + '</td><td>' + c.phone +
           '</td><td>' + c.buys + '</td><td>$' + c.total.toLocaleString() + '</td><td>' + badge + '</td></tr>';
  }).join("");
}

function renderSuppliers() {
  document.getElementById("suppliersTable").innerHTML = DATA.suppliers.map(s => {
    const badge = s.status === "ok" ? '<span class="badge ok">Activo</span>'
                : '<span class="badge warn">Con deuda</span>';
    return '<tr><td><b>' + s.name + '</b></td><td>' + s.contact + '</td><td>' + s.email +
           '</td><td>' + s.products + '</td><td>$' + s.debt + '</td><td>' + badge + '</td></tr>';
  }).join("");
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard() {
  // Chart principal
  const values = [45,62,38,71,55,82,68,91,74,88,95,79];
  document.getElementById("chartMain").innerHTML = values.map(v =>
    '<div class="bar" style="height:' + v + '%"></div>'
  ).join("");

  // Top productos
  const top = DATA.inventory.slice(0,4);
  document.getElementById("topProducts").innerHTML = top.map(p =>
    '<div class="top-item"><span class="top-name">' + p.name + '</span><span class="top-value">$' + (p.price*p.stock).toLocaleString() + '</span></div>'
  ).join("");

  // Transacciones recientes
  document.getElementById("recentTx").innerHTML = DATA.sales.slice(0,5).map(s => {
    const badge = s.status === "ok" ? '<span class="badge ok">Pagada</span>'
                : s.status === "warn" ? '<span class="badge warn">Pendiente</span>'
                : '<span class="badge err">Cancelada</span>';
    return '<tr><td><b>' + s.id + '</b></td><td>' + s.client + '</td><td>' + s.date + '</td><td>$' + s.total + '</td><td>' + badge + '</td></tr>';
  }).join("");
}

function renderReports() {
  const values = [62,78,45,89,56,71,84,92];
  document.getElementById("chartReport").innerHTML = values.map(v =>
    '<div class="bar" style="height:' + v + '%"></div>'
  ).join("");
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
renderDashboard();
renderInventory();
renderSales();
renderPurchases();
renderClients();
renderSuppliers();
renderReports();

// Busquedas
document.getElementById("invSearch")?.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll("#inventoryTable tr").forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
  });
});`
    }
  }
};