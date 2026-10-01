const fs = require('fs');
let c = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');

// Function to update recent projects and show/hide welcome overlay
const UI_MODS = `
// ==========================================
// Welcome Overlay & Recent Projects Logic
// ==========================================
function updateWelcomeOverlay() {
  const overlay = document.getElementById("welcome-overlay");
  if (!overlay) return;
  if (state.diskFolder) {
    overlay.style.display = "none";
  } else {
    overlay.style.display = "flex";
    renderRecentProjects();
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
    renderRecentProjects();
  } catch (e) {}
}

function renderRecentProjects() {
  const list = document.getElementById("welcome-recent-list");
  if (!list) return;
  try {
    let recents = JSON.parse(localStorage.getItem("gafcoreai_recent_projects") || "[]");
    if (recents.length === 0) {
      list.innerHTML = '<div style="color:#555; font-size:12px; padding:4px;">No recent projects</div>';
      return;
    }
    list.innerHTML = recents.map(path => {
      const name = path.split(/[\\\\/]/).pop() || path;
      return '<div class="recent-item" onclick="openDiskFolder(\\'' + path.replace(/\\\\/g, '\\\\\\\\') + '\\')" style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; cursor:pointer; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background=\\'rgba(255,255,255,0.05)\\'" onmouseout="this.style.background=\\'transparent\\'">' +
        '<span style="font-size:13px; color:#ddd; font-weight:500;">' + name + '</span>' +
        '<span style="font-size:11px; color:#555; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + path + '</span>' +
      '</div>';
    }).join("");
  } catch (e) {}
}

function setupWelcomeEvents() {
  safeBind("btn-welcome-open", "onclick", () => {
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

  safeBind("btn-welcome-clone", "onclick", () => {
    showPrompt("URL de GitHub a clonar:", "https://github.com/owner/repo.git").then(url => {
      if (url && state.gitReal) {
        state.gitReal.clone(url).then(r => {
           if (r.ok && r.path) openDiskFolder(r.path);
           else alert("Error clonando: " + r.error);
        });
      }
    });
  });

  safeBind("btn-welcome-web", "onclick", () => {
    if (window.__TAURI__) {
      window.__TAURI__.shell.open("https://gafcore.com/dashboard");
    } else {
      window.open("https://gafcore.com/dashboard", "_blank");
    }
  });

  safeBind("btn-welcome-settings", "onclick", (e) => {
    e.preventDefault();
    openSettingsModal();
  });

  safeBind("btn-welcome-new-window", "onclick", () => {
    try {
      const { WebviewWindow } = window.__TAURI__.window;
      new WebviewWindow('gafcoreai-win-' + Date.now(), { url: 'index.html', title: 'GafCoreAI', width: 1280, height: 800 });
    } catch (e) {
      alert("Multiventana solo disponible en versión .exe Tauri compilada: " + e.message);
    }
  });
}
`;

if (!c.includes("updateWelcomeOverlay")) {
  c += '\n\n' + UI_MODS;
}

// Hook into openDiskFolder
c = c.replace(/state\.diskFolder = folder;/g, 'state.diskFolder = folder; addToRecentProjects(folder); updateWelcomeOverlay();');
c = c.replace(/state\.diskFolder = null;/g, 'state.diskFolder = null; updateWelcomeOverlay();');

// Setup events in boot
if (!c.includes("setupWelcomeEvents();")) {
  c = c.replace('registerAllCommands();', 'registerAllCommands();\n  setupWelcomeEvents();\n  updateWelcomeOverlay();');
}

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', c);
console.log('App.js patched for welcome overlay');
