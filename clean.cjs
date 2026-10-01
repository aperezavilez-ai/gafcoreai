const fs = require('fs');

// 1. CLEAN INDEX.HTML
let html = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', 'utf8');
const startHtml = html.indexOf('<div id="welcome-overlay"');
if (startHtml !== -1) {
  const endStr = '</div>\n  <aside class="panel panel-chat">';
  const endHtml = html.indexOf(endStr, startHtml);
  if (endHtml !== -1) {
    html = html.substring(0, startHtml) + html.substring(endHtml + '</div>\n  '.length);
    html = html.replace('<main class="layout" style="position:relative;">', '<main class="layout">');
    fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', html);
    console.log('Cleaned index.html');
  } else {
    console.log('Could not find end of overlay in HTML');
  }
}

// 2. CLEAN APP.JS
let js = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');

// Remove updateWelcomeOverlay definitions
while(true) {
  const fnStart = js.indexOf('function updateWelcomeOverlay() {');
  if (fnStart === -1) break;
  let fnEnd = js.indexOf('}\n', fnStart);
  if (fnEnd === -1) break;
  
  // Actually, wait, there might be nested braces. Let's just remove the block we injected.
  const blockStart = js.indexOf('// ==========================================');
  if (blockStart !== -1) {
    const blockEnd = js.indexOf('}\n', js.indexOf('safeBind("btn-welcome-new-window"'));
    if (blockEnd !== -1) {
       js = js.substring(0, blockStart) + js.substring(blockEnd + 2);
    }
  }
  break; // just break for now, we'll use a better replace below if needed
}

// Just remove ALL the code injected by inject-js.cjs
const blockStart = js.indexOf('// ==========================================');
if (blockStart !== -1) {
    const blockEndStr = '  });\n}'; // end of setupWelcomeEvents
    const blockEnd = js.indexOf(blockEndStr, blockStart);
    if (blockEnd !== -1) {
        js = js.substring(0, blockStart) + js.substring(blockEnd + blockEndStr.length);
    }
}

// Remove calls
js = js.replace(/addToRecentProjects\(folder\); updateWelcomeOverlay\(\); /g, '');
js = js.replace(/updateWelcomeOverlay\(\); /g, '');
js = js.replace(/updateWelcomeOverlay\(\);/g, '');
js = js.replace(/setupWelcomeEvents\(\);\n  updateWelcomeOverlay\(\);/g, '');

fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', js);
console.log('Cleaned app.js');
