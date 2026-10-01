const fs = require('fs');
let html = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', 'utf8');

// 1. Modificar TOPBAR para añadir navegación
const topNav = `
  <nav class="top-nav" style="display:flex; gap:16px; margin-left: 24px; align-items:center;">
    <button id="btn-nav-home" class="btn ghost small" style="font-size:13px; font-weight:600;">Inicio</button>
    <button id="btn-nav-window" class="btn ghost small" style="font-size:13px; font-weight:600;">Ventana +</button>
  </nav>
`;
if (!html.includes('id="btn-nav-home"')) {
  html = html.replace('</div>\n  \n  <div class="toolbar">', '</div>\n' + topNav + '\n  <div class="toolbar">');
}

// 2. Modificar MAIN LAYOUT para añadir VISTAS
const homeView = `
  <!-- HOME VIEW (EDITCOREAI STYLE) -->
  <div id="view-home" class="app-view active" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; background:var(--bg-1, #0f1115);">
    <div style="text-align:center; margin-bottom:40px;">
      <h1 style="font-size:32px; font-weight:bold; margin:0; display:flex; align-items:center; justify-content:center; gap:12px;">
        <span style="color:#a78bfa;">&#9670;</span> GafCoreAI
      </h1>
      <div style="font-size:14px; color:var(--text-dim, #888); margin-top:12px;">Elige un proyecto para empezar</div>
    </div>

    <div style="display:flex; flex-direction:column; gap:16px; width: 100%; max-width: 480px; margin-bottom:40px;">
      <button id="btn-home-open" style="background:var(--bg-2, #181a1f); color:var(--text, #fff); border:1px solid var(--border-soft, #333); border-radius:8px; padding:20px; display:flex; align-items:center; gap:16px; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor='#a78bfa'" onmouseout="this.style.borderColor='var(--border-soft, #333)'">
        <span style="font-size:24px; color:#3b82f6;">&#128193;</span>
        <div style="text-align:left;">
          <div style="font-size:16px; font-weight:bold; margin-bottom:4px;">Abrir proyecto</div>
          <div style="font-size:12px; color:var(--text-dim, #888);">Carpeta existente en el disco</div>
        </div>
      </button>
      
      <button id="btn-home-new" style="background:var(--bg-2, #181a1f); color:var(--text, #fff); border:1px solid var(--border-soft, #333); border-radius:8px; padding:20px; display:flex; align-items:center; gap:16px; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor='#a78bfa'" onmouseout="this.style.borderColor='var(--border-soft, #333)'">
        <span style="font-size:24px; color:#3b82f6;">&#10133;</span>
        <div style="text-align:left;">
          <div style="font-size:16px; font-weight:bold; margin-bottom:4px;">Nuevo proyecto / Clonar</div>
          <div style="font-size:12px; color:var(--text-dim, #888);">Crear carpeta en blanco o desde Git</div>
        </div>
      </button>
    </div>

    <div style="width:100%; max-width:480px; margin-bottom:60px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-dim, #888); margin-bottom:16px; font-weight:bold;">
        <span>Últimos proyectos</span>
        <span style="cursor:pointer; color:#3b82f6;" onclick="document.getElementById('home-recent-list').innerHTML=''">Ver todos</span>
      </div>
      <div id="home-recent-list" style="display:flex; flex-direction:column; gap:8px;">
        <!-- Populated by JS -->
      </div>
    </div>
  </div>

  <!-- WORKSPACE VIEW -->
  <div id="view-workspace" class="app-view" style="display:none; width:100%; height:100%; flex-direction:row; flex:1;">
`;

if (!html.includes('id="view-home"')) {
  html = html.replace('<main class="layout">', '<main class="layout" style="display:flex; flex-direction:column;">\n' + homeView);
  html = html.replace('</main>', '  </div>\n</main>');
}

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', html);
console.log('HTML Modificado');
