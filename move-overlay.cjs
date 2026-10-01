const fs = require('fs');
let c = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', 'utf8');

const start = c.indexOf('<div id="welcome-overlay"');
// Find the end of the welcome-overlay div. It ends right before `</div>\n</section>` or just `</section>`.
// Actually, let's just find `</div>\n  <div id="view-editor"` which is right after it.
const end = c.indexOf('  <div id="view-editor"');

if (start !== -1 && end !== -1) {
  let overlay = c.substring(start, end);
  // remove the overlay from panel-center
  c = c.substring(0, start) + c.substring(end);
  
  // Clean up any extra closing divs if we missed one
  
  // Inject it into <main class="layout">
  c = c.replace('<main class="layout">', '<main class="layout" style="position:relative;">\n' + overlay);
  
  fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', c);
  console.log('Overlay moved to main layout');
} else {
  console.log('Overlay not found or already moved');
}
