const fs = require('fs');

// 1. MEJORAR fetchUrl en app.js para usar curl en Tauri (Desktop) sin restricciones de CORS
let appJs = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', 'utf8');

const newFetchUrl = `
async function fetchUrl(url) {
  // Limpiar URL si trae .git al final para navegación web
  let targetUrl = url;
  if (targetUrl.endsWith(".git") && targetUrl.includes("github.com/")) {
    targetUrl = targetUrl.replace(/\\.git$/, "");
  }

  // 1. En Tauri / Desktop: usar curl nativo (sin CORS)
  if (typeof tauriBridge !== "undefined" && tauriBridge && typeof tauriBridge.runShell === "function") {
    try {
      const res = await tauriBridge.runShell('curl.exe -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "' + targetUrl + '"');
      if (res && res.stdout && res.stdout.length > 20) {
        return { ok: true, text: res.stdout, via: "tauri-curl" };
      }
    } catch (e) {}
  }

  // 2. Fetch directo
  try {
    const r = await fetch(targetUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.ok) return { ok: true, text: await r.text(), via: "direct" };
  } catch (e) {}

  // 3. Proxies web (para navegador)
  try {
    const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl));
    if (r.ok) return { ok: true, text: await r.text(), via: "allorigins" };
  } catch (e) {}
  try {
    const r = await fetch("https://corsproxy.io/?" + encodeURIComponent(targetUrl));
    if (r.ok) return { ok: true, text: await r.text(), via: "corsproxy" };
  } catch (e) {}

  return { ok: false, error: "No se pudo descargar la URL: " + targetUrl };
}
`;

appJs = appJs.replace(/async function fetchUrl\(url\) \{[\s\S]*?return \{ ok: false, error: "No se pudo descargar" \};\s*\}/, newFetchUrl.trim());
fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/app.js', appJs);
console.log('fetchUrl mejorado en app.js');

// 2. ELIMINAR FALLBACK PELIGROSO EN _extractWriteIntents (agent.js)
let agentJs = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/agent.js', 'utf8');
const badFallback = `    if (!out.length) {
      const fileM = text.match(/\\b([a-zA-Z0-9_\\-]+\\.(?:txt|md|json|html|css|js))\\b/i);
      const dirM = text.match(/([A-Z]:\\\\[^\\n]+?)(?:\\\\)?(?=\\s*$|\\s+con\\s)/i) || text.match(/([A-Z]:\\\\PROGRAMAS IA\\\\[^\\n]+)/i);
      const bodyM = text.match(/\\btexto\\s+([^\\n]+?)(?:\\s+en\\s+|$)/i);
      if (fileM && dirM) {
        let dir = dirM[1].trim().replace(/\\\\$/, "");
        if (!/\\.[a-z0-9]+$/i.test(dir)) push(dir + "\\\\" + fileM[1], bodyM ? bodyM[1].trim() : "");
      }
    }`;

agentJs = agentJs.replace(badFallback, '    // Fallback eliminado para evitar archivos fantasma');
fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/agent.js', agentJs);
console.log('Fallback eliminado en agent.js');

// 3. MEJORAR clone en git-real.js para target default a D:\PROGRAMAS IA\<repo>
let gitRealJs = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/git-real.js', 'utf8');
gitRealJs = gitRealJs.replace(
  'const target = dest || (this.state.diskFolder + "\\\\" + url.split("/").pop().replace(".git", ""));',
  'const repoName = url.split("/").pop().replace(".git", "").trim();\n    const target = dest || (this.state.diskFolder ? (this.state.diskFolder + "\\\\" + repoName) : ("D:\\\\PROGRAMAS IA\\\\" + repoName));'
);
fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/git-real.js', gitRealJs);
console.log('git-real.js mejorado');

// 4. MEJORAR read_url en tools.js para leer repos de GitHub (README automático)
let toolsJs = fs.readFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/tools.js', 'utf8');
const readUrlTool = `
  tools.register("read_url", {
    level: PERMISSION_LEVELS.READ,
    description: "Lee una pagina web o repositorio de GitHub",
    params: [{ name: "url", type: "string" }],
    run: async ({ url }) => {
      let cleanUrl = String(url).trim();
      // Si es un repo de GitHub, intentar obtener el README directo de raw.githubusercontent.com
      const ghMatch = cleanUrl.match(/github\\.com\\/([^\\/\\s]+)\\/([^\\/\\s#?]+)/i);
      if (ghMatch) {
        const owner = ghMatch[1];
        const repo = ghMatch[2].replace(/\\.git$/, "");
        const branches = ["main", "master"];
        for (const b of branches) {
          try {
            const rawRes = await fetchUrl("https://raw.githubusercontent.com/" + owner + "/" + repo + "/" + b + "/README.md");
            if (rawRes.ok && rawRes.text && rawRes.text.length > 50) {
              return "[GitHub Repo: " + owner + "/" + repo + " | README.md]\\n\\n" + rawRes.text.slice(0, 15000);
            }
          } catch (_) {}
        }
      }

      const res = await fetchUrl(cleanUrl);
      if (!res.ok) throw new Error(res.error);
      return stripHtml(res.text).slice(0, 15000);
    }
  });
`;

toolsJs = toolsJs.replace(/tools\.register\("read_url",[\s\S]*?\}\);\s*\n\s*\/\/\s*={10,}/, readUrlTool.trim() + '\n\n  // ============================================================');
fs.writeFileSync('d:/PROGRAMAS IA/GAFCOREAI/web/js/tools.js', toolsJs);
console.log('tools.js mejorado');
