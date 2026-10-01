const fs = require('fs');
let js = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');

// 1. Desactivar scheduleAutoUpdateCheck
js = js.replace(/function scheduleAutoUpdateCheck\(\) \{[\s\S]*?10000\);\s*\}/, 'function scheduleAutoUpdateCheck() {\n  // Desactivado\n}');

// 2. Eliminar el setTimeout de boot de 4000ms que llama a runRealUpdate
js = js.replace(/setTimeout\(\(\) => \{\s*try \{\s*runRealUpdate\(\);\s*\} catch \(e\) \{\}\s*\}, 4000\);/g, '// setTimeout(() => { try { runRealUpdate(); } catch (e) {} }, 4000);');

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', js);
console.log('Fixed auto-update timers');
