const fs = require('fs');
let js = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');

// Expose openDiskFolderByPath globally so inline onclick works
if (!js.includes("window.openDiskFolderByPath = openDiskFolderByPath;")) {
  js = js.replace('state.openFolderFromPath = openDiskFolderByPath;', 'state.openFolderFromPath = openDiskFolderByPath;\nwindow.openDiskFolderByPath = openDiskFolderByPath;\nwindow.openDiskFolder = openDiskFolder;\nwindow.openNewProjectModal = openNewProjectModal;\nwindow.cloneRealRepo = cloneRealRepo;');
}

// Fix setupViewRouterEvents and renderRecentProjects
const updatedRouter = `
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
      const safePath = path.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
      return '<div class="recent-item" onclick="window.openDiskFolderByPath(\\'' + safePath + '\\')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; cursor:pointer; border-radius:6px; background:var(--bg-1, transparent); transition:background 0.2s;" onmouseover="this.style.background=\\'var(--bg-2, rgba(255,255,255,0.05))\\'" onmouseout="this.style.background=\\'var(--bg-1, transparent)\\'">' +
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
    if (typeof openDiskFolder === "function") {
      openDiskFolder();
    }
  });

  safeBind("btn-home-new", "onclick", () => {
    if (typeof openNewProjectModal === "function") {
      openNewProjectModal();
    }
  });

  // Estado inicial
  if (state.diskFolder) {
    switchAppView("workspace");
  } else {
    switchAppView("home");
  }
}
`;

const routerIdx = js.indexOf('function renderRecentProjects() {');
if (routerIdx !== -1) {
  js = js.substring(0, routerIdx) + updatedRouter.trim();
}

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', js);
console.log('Router and click handlers fixed');
