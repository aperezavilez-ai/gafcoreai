const fs=require('fs');
let c=fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');
const start = c.indexOf('async function runRealUpdate() {');
const end = c.indexOf('function scheduleAutoUpdateCheck() {');
c = c.substring(0, start) + 'async function runRealUpdate() {\n  termWrite("Recargando la interfaz para aplicar cambios...", "success");\n  setTimeout(() => {\n    window.location.reload();\n  }, 500);\n}\n\n' + c.substring(end);
fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', c);
console.log('Replaced runRealUpdate safely');
