const fs = require('fs');
let html = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', 'utf8');

html = html.replace('style="position:absolute; top:0; left:0; width:100%; height:100%;', 'style="position:relative; flex:1; width:100%;');

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', html);

let js = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');
const newOverlayLogic = `
function updateWelcomeOverlay() {
  const overlay = document.getElementById("welcome-overlay");
  const chatPanel = document.querySelector(".panel-chat");
  const rightPanel = document.querySelector(".panel-right");
  const centerPanel = document.querySelector(".panel-center");

  if (!overlay) return;
  if (state.diskFolder) {
    overlay.style.display = "none";
    if (chatPanel) chatPanel.style.display = "flex";
    if (rightPanel) rightPanel.style.display = "flex";
    if (centerPanel) centerPanel.style.display = "flex";
  } else {
    overlay.style.display = "flex";
    if (chatPanel) chatPanel.style.display = "none";
    if (rightPanel) rightPanel.style.display = "none";
    if (centerPanel) centerPanel.style.display = "none";
    renderRecentProjects();
  }
}
`;

// Replace the old updateWelcomeOverlay in app.js
const start = js.indexOf('function updateWelcomeOverlay() {');
if (start !== -1) {
  const end = js.indexOf('function addToRecentProjects', start);
  js = js.substring(0, start) + newOverlayLogic + js.substring(end);
  fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', js);
}
console.log('Fixed CSS and overlay logic');
