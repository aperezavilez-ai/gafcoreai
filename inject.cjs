const fs = require('fs');
let c = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', 'utf8');

const html = `
<div id="welcome-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:var(--bg-dark); z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ccc; font-family:system-ui,sans-serif;">
  <div style="text-align:center; margin-bottom:40px;">
    <h1 style="font-size:28px; color:#fff; font-weight:600; margin:0; display:flex; align-items:center; justify-content:center; gap:10px;"><span style="color:#a78bfa;">&#9670;</span> GafCoreAI</h1>
    <div style="font-size:13px; color:#888; margin-top:8px;">Pro - <a href="#" id="btn-welcome-settings" style="color:#888; text-decoration:none;">Settings</a></div>
  </div>

  <div style="display:flex; gap:12px; margin-bottom:40px;">
    <button id="btn-welcome-open" style="width:140px; height:80px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:6px; color:#ccc; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; padding:16px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
      <span style="font-size:16px; margin-bottom:8px;">&#128193;</span>
      <span style="font-size:13px; font-weight:500;">Open project</span>
    </button>
    <button id="btn-welcome-clone" style="width:140px; height:80px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:6px; color:#ccc; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; padding:16px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
      <span style="font-size:16px; margin-bottom:8px;">&#128423;</span>
      <span style="font-size:13px; font-weight:500;">Clone repo</span>
    </button>
    <button id="btn-welcome-web" style="width:140px; height:80px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:6px; color:#ccc; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; padding:16px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
      <span style="font-size:16px; margin-bottom:8px;">&#127760;</span>
      <span style="font-size:13px; font-weight:500;">GafCore Web</span>
    </button>
  </div>

  <div style="width:100%; max-width:444px; margin-bottom:60px;">
    <div style="display:flex; justify-content:space-between; font-size:11px; color:#666; margin-bottom:12px; text-transform:uppercase; font-weight:600; padding:0 4px;">
      <span>Recent projects</span>
      <span style="cursor:pointer;" onclick="document.getElementById('welcome-recent-list').innerHTML=''">Clear All</span>
    </div>
    <div id="welcome-recent-list" style="display:flex; flex-direction:column; gap:4px;">
      <!-- Populated by JS -->
    </div>
  </div>

  <div style="position:absolute; bottom:30px;">
    <button id="btn-welcome-new-window" style="background:transparent; border:none; color:#888; font-size:12px; cursor:pointer; padding:8px 16px; border-radius:4px; transition:color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#888'">Try a new window for running parallel agents &#8599;</button>
  </div>
</div>
`;

if (!c.includes('id="welcome-overlay"')) {
  c = c.replace('<section class="panel panel-center">', '<section class="panel panel-center" style="position:relative;">\n' + html);
  fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/index.html', c);
  console.log('Injected welcome overlay');
} else {
  console.log('Overlay already exists');
}
