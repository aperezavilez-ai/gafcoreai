const fs = require('fs');
let js = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');
js = js.replace('workspaceView.style.display = "flex";', 'workspaceView.style.display = "grid";');
fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', js);
