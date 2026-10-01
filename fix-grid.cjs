const fs = require('fs');
let h = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', 'utf8');

h = h.replace('<main class="layout" style="display:flex; flex-direction:column;">', '<main style="flex:1; display:flex; flex-direction:column; min-height:0; background:var(--bg-0);">');
h = h.replace('<div id="view-workspace" class="app-view" style="display:none; width:100%; height:100%; flex-direction:row; flex:1;">', '<div id="view-workspace" class="layout app-view" style="display:none; width:100%; height:100%;">');

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', h);
console.log('Grid fixed');
