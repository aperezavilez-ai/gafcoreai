// ============================================================
//  GafCoreAI - Busqueda de actualizaciones en GitHub Releases
//  Sin firma ni claves: consulta el ultimo release publico y, si es
//  mas nuevo, ofrece descargar el instalador.
// ============================================================

export const RELEASES_API = "https://api.github.com/repos/aperezavilez-ai/gafcoreai/releases/latest";
export const RELEASES_PAGE = "https://github.com/aperezavilez-ai/gafcoreai/releases/latest";

/** Compara versiones tipo 1.5.10 vs v1.5.9. Devuelve 1, 0 o -1. */
export function compareVersions(a, b) {
  const parse = v => String(v || "").trim().replace(/^v/i, "").split(/[.-]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
  const pa = parse(a), pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

/** Prefiere el instalador setup.exe; si no hay, el .msi. */
export function pickInstallerAsset(assets) {
  const list = Array.isArray(assets) ? assets : [];
  return list.find(a => /-setup\.exe$/i.test(a.name)) || list.find(a => /\.msi$/i.test(a.name)) || null;
}

/** Primeras lineas utiles de las notas del release, sin markdown pesado. */
export function summarizeNotes(body, maxLines = 6) {
  return String(body || "")
    .split(/\r?\n/)
    .map(l => l.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim())
    .filter(l => l && !/^instalaci[oó]n$/i.test(l))
    .slice(0, maxLines)
    .join("\n");
}

/**
 * @returns {Promise<{ hasUpdate: boolean, current: string, latest: string, downloadUrl: string, pageUrl: string, notes: string }>}
 */
export async function checkLatestRelease({ currentVersion, fetchImpl = fetch, timeoutMs = 15000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(RELEASES_API, { headers: { Accept: "application/vnd.github+json" }, signal: ctrl.signal });
  } catch (e) {
    throw new Error(e && e.name === "AbortError" ? "GitHub tardó demasiado en responder." : "Sin conexión con GitHub. Revisa tu internet.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 403 || res.status === 429) throw new Error("GitHub limitó las consultas por un rato. Intenta de nuevo en unos minutos.");
  if (res.status === 404) throw new Error("Todavía no hay versiones publicadas en GitHub.");
  if (!res.ok) throw new Error("GitHub respondió con error " + res.status + ".");
  const data = await res.json();
  const latest = String(data.tag_name || "").replace(/^v/i, "");
  const asset = pickInstallerAsset(data.assets);
  return {
    hasUpdate: !!latest && compareVersions(latest, currentVersion) > 0,
    current: String(currentVersion || "").replace(/^v/i, ""),
    latest,
    downloadUrl: asset ? asset.browser_download_url : (data.html_url || RELEASES_PAGE),
    pageUrl: data.html_url || RELEASES_PAGE,
    notes: summarizeNotes(data.body)
  };
}
