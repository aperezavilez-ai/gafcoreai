const fs = require('fs');
let c = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');

c = c.replace(/async function runRealUpdate\(\) \{\\n  window\.location\.reload\(\);\\n  return;/g, 'async function runRealUpdate() {\n  window.location.reload();\n  return;');

// In case it's literally just the string:
const idx = c.indexOf('async function runRealUpdate() {\\n');
if (idx !== -1) {
  c = c.substring(0, idx) + 'async function runRealUpdate() {\n  window.location.reload();\n  return;' + c.substring(idx + 70);
}

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', c);
