const fs = require('fs');
let js = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');

const appJsCode = `
// ==========================================
// View Router Logic (EditCoreAI Style)
// ==========================================
function switchAppView(viewName) {
  const homeView = document.getElementById("view-home");
  const workspaceView = document.getElementById("view-workspace");
  const navHome = document.getElementById("btn-nav-home");

  if (!homeView || !workspaceView) return;

  if (viewName === 'home') {
    homeView.style.display = "flex";
    workspaceView.style.display = "none";
    if (navHome) navHome.style.color = "var(--text, #fff)";
    renderRecentProjects();
  } else if (viewName === 'workspace') {
    homeView.style.display = "none";
    workspaceView.style.display = "flex";
    if (navHome) navHome.style.color = "var(--text-dim, #888)";
    
    // Trigger resize para monaco
    if (window.monaco && window.editor) {
      setTimeout(() => window.editor.layout(), 50);
    }
  }
}

function addToRecentProjects(path) {
  if (!path) return;
  try {
    let recents = JSON.parse(localStorage.getItem("gafcoreai_recent_projects") || "[]");
    recents = recents.filter(p => p !== path);
    recents.unshift(path);
    if (recents.length > 10) recents = recents.slice(0, 10);
    localStorage.setItem("gafcoreai_recent_projects", JSON.stringify(recents));
    if (document.getElementById("view-home").style.display !== "none") {
      renderRecentProjects();
    }
  } catch (e) {}
}

function renderRecentProjects() {
  const list = document.getElementById("home-recent-list");
  if (!list) return;
  try {
    let recents = JSON.parse(localStorage.getItem("gafcoreai_recent_projects") || "[]");
    if (recents.length === 0) {
      list.innerHTML = '<div style="color:var(--text-dim, #555); font-size:12px; padding:4px;">No hay proyectos recientes</div>';
      return;
    }
    list.innerHTML = recents.map(path => {
      const name = path.split(/[\\\\/]/).pop() || path;
      return '<div class="recent-item" onclick="openDiskFolder(\\'' + path.replace(/\\\\/g, '\\\\\\\\') + '\\')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; cursor:pointer; border-radius:6px; background:var(--bg-1, transparent); transition:background 0.2s;" onmouseover="this.style.background=\\'var(--bg-2, rgba(255,255,255,0.05))\\'" onmouseout="this.style.background=\\'var(--bg-1, transparent)\\'">' +
        '<span style="font-size:13px; color:var(--text, #fff); font-weight:600;">' + name + '</span>' +
        '<span style="font-size:11px; color:var(--text-dim, #888); max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + path + '</span>' +
      '</div>';
    }).join("");
  } catch (e) {}
}

function setupViewRouterEvents() {
  safeBind("btn-nav-home", "onclick", () => switchAppView("home"));
  safeBind("btn-nav-window", "onclick", () => {
    try {
      if (window.__TAURI__ && window.__TAURI__.window) {
        new window.__TAURI__.window.WebviewWindow('gafcoreai-win-' + Date.now(), { url: 'index.html', title: 'GafCoreAI', width: 1280, height: 800 });
      } else {
        window.open(window.location.href, '_blank');
      }
    } catch (e) {
      alert("Multiventana disponible nativamente.");
    }
  });

  safeBind("btn-home-open", "onclick", () => {
    if (window.__TAURI__ && window.__TAURI__.dialog) {
      window.__TAURI__.dialog.open({ directory: true }).then(sel => {
        if (sel) openDiskFolder(sel);
      });
    } else {
      showPrompt("Ruta absoluta del proyecto:", "D:\\\\PROGRAMAS IA\\\\MI_PROYECTO").then(p => {
        if (p) openDiskFolder(p);
      });
    }
  });

  safeBind("btn-home-new", "onclick", () => {
    showPrompt("URL de GitHub a clonar o crear nueva carpeta:", "").then(url => {
      if (url && state.gitReal && url.includes("github.com")) {
        state.gitReal.clone(url).then(r => {
           if (r.ok && r.path) openDiskFolder(r.path);
           else alert("Error clonando: " + r.error);
        });
      } else if (url) {
        openDiskFolder(url); // Simplificación para demo
      }
    });
  });

  // Estado inicial
  if (state.diskFolder) {
    switchAppView("workspace");
  } else {
    switchAppView("home");
  }
}
`;

if (!js.includes("switchAppView")) {
  js += '\n\n' + appJsCode;
  
  // Modificar openDiskFolder para inyectar addToRecentProjects y switchAppView
  js = js.replace(/state\.diskFolder = folder;/g, 'state.diskFolder = folder; addToRecentProjects(folder); switchAppView("workspace");');
  
  // Modificar closeDiskFolder
  js = js.replace(/state\.diskFolder = null;/g, 'state.diskFolder = null; switchAppView("home");');
  
  // Modificar el registro inicial
  js = js.replace('registerAllCommands();', 'registerAllCommands();\n  setupViewRouterEvents();');
  
  fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', js);
  console.log('JS Modificado');
} else {
  console.log('El router ya está inyectado');
}
