// ============================================================
//  GafCoreAI - ecosystem.js
//  Cerebro de conexiones GAFCORE: detecta en disco como esta
//  conectado cada proyecto (GitHub / Vercel / Supabase GAFCORE)
//  y conecta o crea proyectos nuevos con el estandar del ecosistema.
//  Nunca lee ni escribe secretos: GitHub y Vercel usan la sesion
//  de sus CLIs; la anon key de Supabase es publica.
// ============================================================

export const ECOSYSTEM_ROOT = "D:\\PROGRAMAS IA";
export const ECOSYSTEM_MAP_PATH = ECOSYSTEM_ROOT + "\\DOCUMENTACION\\MAPA_PROYECTOS_Y_ESQUEMAS.txt";
export const GAFCORE_SUPABASE_URL = "https://supabase.gafcore.com";
export const GAFCORE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheGlkcml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTMwMDQsImV4cCI6MjEwNjE1MzAwNH0.tP1IWgKG3pimuIW_oIrCsTf9PKjiOrU1ulVcq-9Btl0";
export const GAFCORE_DB_CONTAINER = "supabase_db_taxidriv";
export const GAFCORE_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const ECOSYSTEM_KNOWLEDGE = `# CEREBRO DE CONEXIONES GAFCORE
- En esta PC ya estan conectados GitHub (CLI gh con sesion iniciada), Vercel (CLI vercel con sesion iniciada) y Supabase GAFCORE self-hosted. NO pidas tokens ni los leas: las CLIs ya estan autenticadas.
- Los proyectos viven en D:\\PROGRAMAS IA\\<NOMBRE>. La MAYORIA ya estan conectados: antes de conectar o crear algo, revisa las conexiones detectadas (seccion CONEXIONES DEL PROYECTO ACTIVO o <tool>project_connections</tool>).
- Proyecto YA conectado: commit / push / deploy directo sobre SU remote y SU vinculacion (git_status -> git_commit -> git_push; deploy_vercel solo si esta vinculado a Vercel; si Vercel despliega por Git, basta con git_push).
- Proyecto existente al que le falta alguna conexion: <tool>connect_project</tool>. Reutiliza el repo / proyecto Vercel que ya exista con ese nombre o el del mapa; solo crea lo que no exista. Repos nuevos SIEMPRE privados.
- Proyecto NUEVO: <tool>create_project|name=Nombre del proyecto</tool> crea carpeta, project-infra.json, .env, .env.local, supabase/migrations, schema dedicado, repo privado en GitHub y proyecto en Vercel. Salvo que el usuario pida otra cosa (github=false, vercel=false, supabase=false).
- NUNCA crees un repo o un proyecto de Vercel nuevo para un proyecto que ya esta conectado. Ante la duda, consulta <tool>ecosystem_map</tool>.
- Supabase GAFCORE: URL publica https://supabase.gafcore.com | Kong local http://127.0.0.1:54321 | Postgres 127.0.0.1:54322 | Studio http://localhost:54323 | Hub http://localhost:4000.
- Cada proyecto tiene su schema dedicado (project-infra.json -> supabase.schema). Tablas como <schema>.<tabla>, nunca en public. Migraciones en supabase/migrations/. Cliente JS: createClient(url, anonKey, { db: { schema: '<schema>' } }).
- PROHIBIDO Supabase Cloud (*.supabase.co). La service role key es solo para backend y vive en .env.local: nunca en el cliente, en git ni en el chat.`;

// ------------------------------------------------------------
//  Nombres
// ------------------------------------------------------------
function stripAccents(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// "Mi Tienda Ñandú" -> slug "mi-tienda-nandu", schema "mi_tienda_nandu", carpeta "MI TIENDA NANDU"
export function projectIds(name) {
  const base = stripAccents(name).replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!base) throw new Error("Nombre de proyecto invalido: " + name);
  const words = base.split(/\s+/);
  const slug = words.join("-").toLowerCase().slice(0, 60).replace(/-+$/, "");
  let schema = words.join("_").toLowerCase().slice(0, 60).replace(/_+$/, "");
  if (/^[0-9]/.test(schema)) schema = "p_" + schema;
  return { name: String(name).trim(), slug, schema, repo: slug, folderName: words.join(" ").toUpperCase() };
}

export function isValidSchema(s) {
  return /^[a-z_][a-z0-9_]{0,62}$/.test(String(s || ""));
}

export function isValidRepoName(s) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(String(s || ""));
}

// ------------------------------------------------------------
//  Parsers (puros)
// ------------------------------------------------------------
export function parseGitRemote(url) {
  const s = String(url || "").trim();
  const m = s.match(/github\.com[\/:]([^\/\s]+)\/([^\/\s]+?)(?:\.git)?\/?$/i);
  return m ? { owner: m[1], repo: m[2], url: s } : null;
}

export function parseGitConfigOrigin(text) {
  const lines = String(text || "").split(/\r?\n/);
  let inOrigin = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\[/.test(line)) { inOrigin = /^\[remote\s+"origin"\]$/.test(line); continue; }
    if (inOrigin) {
      const m = line.match(/^url\s*=\s*(.+)$/);
      if (m) return m[1].trim();
    }
  }
  return null;
}

export function parseGitHead(text) {
  const m = String(text || "").match(/^ref:\s*refs\/heads\/(.+)$/m);
  return m ? m[1].trim() : null;
}

// Devuelve SOLO los nombres de variables; los valores nunca salen de aqui
// salvo las URLs de Supabase (no secretas) para detectar *.supabase.co.
export function parseEnvSummary(text) {
  const keys = [];
  const supabaseUrls = [];
  String(text || "").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) return;
    keys.push(m[1]);
    if (/SUPABASE_URL$/.test(m[1])) supabaseUrls.push(m[2].trim().replace(/^["']|["']$/g, ""));
  });
  return { keys, supabaseUrls };
}

export function parseEcosystemMap(text) {
  const projects = [];
  let cur = null;
  String(text || "").split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    const head = line.match(/^\[(\d+)\]\s+(.+)$/);
    if (head) {
      cur = { index: Number(head[1]), name: head[2].trim() };
      projects.push(cur);
      return;
    }
    if (!cur) return;
    const kv = line.match(/^\*\s*([^:]+):\s*(.+)$/);
    if (!kv) return;
    const key = kv[1].trim().toLowerCase();
    const val = kv[2].trim();
    if (key.startsWith("carpeta")) cur.folder = val;
    else if (key.startsWith("slug")) {
      cur.slug = val.split(/\s+/)[0];
      const sm = val.match(/Schema:\s*([^)]+)\)/i);
      if (sm) cur.schemaNote = sm[1].trim();
    } else if (key.startsWith("base de datos")) {
      const sm = val.match(/Schema:\s*([^)]+)\)/i);
      if (sm) cur.schemaNote = cur.schemaNote || sm[1].trim();
    } else if (key.startsWith("repositorio")) {
      const gh = parseGitRemote(/github\.com/i.test(val) ? val : "https://github.com/" + val);
      if (gh) cur.repo = gh.owner + "/" + gh.repo;
    } else if (key.startsWith("vercel projectid")) cur.vercelProjectId = val;
    else if (key.startsWith("despliegue") || key.startsWith("produccion")) cur.deploy = val;
  });
  projects.forEach(p => {
    const note = p.schemaNote || "";
    const parts = note.split("/").map(s => s.trim()).filter(Boolean);
    const dedicated = parts.find(s => s !== "public");
    p.schema = dedicated || parts[0] || p.slug || null;
  });
  return projects;
}

export function findMapEntry(projects, folder) {
  const norm = s => String(s || "").replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
  const target = norm(folder);
  return (projects || []).find(p => norm(p.folder) === target) || null;
}

// ------------------------------------------------------------
//  Raiz del proyecto
// ------------------------------------------------------------
export function ecosystemProjectRoot(path, root = ECOSYSTEM_ROOT) {
  const norm = String(path || "").replace(/\//g, "\\").replace(/\\+$/, "");
  const prefix = root.toLowerCase() + "\\";
  if (!norm.toLowerCase().startsWith(prefix)) return norm || null;
  const first = norm.slice(prefix.length).split("\\")[0];
  return first ? root + "\\" + first : null;
}

function joinPath(a, b) {
  return String(a).replace(/[\\\/]+$/, "") + "\\" + b;
}

async function exists(bridge, p) {
  try { return !!(await bridge.fileExists(p)); } catch (_) { return false; }
}

async function readOrNull(bridge, p) {
  try { return await bridge.readFile(p); } catch (_) { return null; }
}

export async function findProjectRoot(path, bridge) {
  let cur = String(path || "").replace(/\//g, "\\").replace(/\\+$/, "");
  const floor = ECOSYSTEM_ROOT.toLowerCase();
  for (let i = 0; i < 8 && cur && cur.toLowerCase() !== floor && cur.includes("\\"); i++) {
    if (await exists(bridge, joinPath(cur, ".git")) || await exists(bridge, joinPath(cur, "project-infra.json"))) return cur;
    cur = cur.slice(0, cur.lastIndexOf("\\"));
  }
  return ecosystemProjectRoot(path);
}

// ------------------------------------------------------------
//  Analisis de conexiones (puro)
// ------------------------------------------------------------
export function analyzeConnections({ root, infra, gitConfig, gitHead, hasGitDir, vercelProject, envs, mapEntry, packageJson }) {
  const remoteUrl = parseGitConfigOrigin(gitConfig);
  const gh = parseGitRemote(remoteUrl);
  const envSummary = (envs || []).reduce((acc, t) => {
    const s = parseEnvSummary(t);
    acc.keys.push(...s.keys);
    acc.supabaseUrls.push(...s.supabaseUrls);
    return acc;
  }, { keys: [], supabaseUrls: [] });

  let vercel = null;
  try { vercel = vercelProject ? JSON.parse(vercelProject) : null; } catch (_) {}
  let infraJson = null;
  try { infraJson = infra ? JSON.parse(infra) : null; } catch (_) {}
  let pkg = null;
  try { pkg = packageJson ? JSON.parse(packageJson) : null; } catch (_) {}
  const deps = pkg ? Object.assign({}, pkg.dependencies, pkg.devDependencies) : {};

  // Formato antiguo de EDITCOREAI: supabaseProjectId / vercelProjectId / githubRemoteUrl en la raiz.
  const legacy = !!(infraJson && !infraJson.supabase && (infraJson.supabaseProjectId || infraJson.vercelProjectId || infraJson.githubRemoteUrl));
  const legacyRepo = legacy ? parseGitRemote(infraJson.githubRemoteUrl) : null;
  const schema = (infraJson && infraJson.supabase && infraJson.supabase.schema) || (legacy && infraJson.supabaseProjectId) || null;
  const cloudUrls = envSummary.supabaseUrls.filter(u => /\.supabase\.co/i.test(u));
  const conn = {
    root,
    name: (infraJson && infraJson.projectName) || String(root || "").split("\\").pop(),
    slug: (infraJson && infraJson.projectSlug) || null,
    framework: deps.next ? "next" : deps.vite ? "vite" : pkg ? "node" : "static",
    github: {
      initialized: !!hasGitDir,
      connected: !!gh,
      owner: gh ? gh.owner : null,
      repo: gh ? gh.repo : null,
      remote: remoteUrl || null,
      branch: parseGitHead(gitHead) || null,
      knownRepo: (mapEntry && mapEntry.repo) || (legacyRepo ? legacyRepo.owner + "/" + legacyRepo.repo : null)
    },
    vercel: {
      linked: !!(vercel && vercel.projectId),
      projectId: vercel ? vercel.projectId || null : null,
      projectName: vercel ? vercel.projectName || null : null,
      knownProjectId: (mapEntry && mapEntry.vercelProjectId) || (legacy && infraJson.vercelProjectId) || null,
      deploy: mapEntry && mapEntry.deploy ? mapEntry.deploy : null
    },
    supabase: {
      infra: !!infraJson,
      schema,
      knownSchema: mapEntry && mapEntry.schema ? mapEntry.schema : null,
      envKeys: Array.from(new Set(envSummary.keys.filter(k => /SUPABASE|DATABASE_URL/.test(k)))),
      cloudUrls
    },
    inMap: !!mapEntry,
    missing: [],
    warnings: []
  };
  if (!conn.github.connected) conn.missing.push("github");
  if (!conn.vercel.linked) conn.missing.push("vercel");
  if (!conn.supabase.infra) conn.missing.push("supabase");
  if (legacy) conn.warnings.push("project-infra.json esta en el formato antiguo de EDITCOREAI (sin supabase.schema); se usa supabaseProjectId como schema.");
  if (cloudUrls.length) conn.warnings.push("El .env apunta a Supabase Cloud (*.supabase.co); el ecosistema exige https://supabase.gafcore.com.");
  if (conn.github.knownRepo && conn.github.connected && conn.github.knownRepo.toLowerCase() !== (conn.github.owner + "/" + conn.github.repo).toLowerCase()) {
    conn.warnings.push("El remote (" + conn.github.owner + "/" + conn.github.repo + ") no coincide con el mapa (" + conn.github.knownRepo + ").");
  }
  return conn;
}

export async function detectProjectConnections(folder, bridge, { mapText } = {}) {
  const root = await findProjectRoot(folder, bridge);
  if (!root) return null;
  const [infra, gitConfig, gitHead, vercelProject, envLocal, env, packageJson, hasGitDir] = await Promise.all([
    readOrNull(bridge, joinPath(root, "project-infra.json")),
    readOrNull(bridge, joinPath(root, ".git\\config")),
    readOrNull(bridge, joinPath(root, ".git\\HEAD")),
    readOrNull(bridge, joinPath(root, ".vercel\\project.json")),
    readOrNull(bridge, joinPath(root, ".env.local")),
    readOrNull(bridge, joinPath(root, ".env")),
    readOrNull(bridge, joinPath(root, "package.json")),
    exists(bridge, joinPath(root, ".git"))
  ]);
  const map = mapText != null ? mapText : await readOrNull(bridge, ECOSYSTEM_MAP_PATH);
  const mapEntry = findMapEntry(parseEcosystemMap(map), root);
  return analyzeConnections({ root, infra, gitConfig, gitHead, hasGitDir, vercelProject, envs: [envLocal, env].filter(Boolean), mapEntry, packageJson });
}

// ------------------------------------------------------------
//  Contexto para los agentes
// ------------------------------------------------------------
export function buildEcosystemContext(conn) {
  if (!conn) return "";
  const lines = ["# CONEXIONES DEL PROYECTO ACTIVO (detectadas en disco)", "Proyecto: " + conn.name + " (" + conn.root + ")"];
  const g = conn.github;
  if (g.connected) lines.push("- GitHub: CONECTADO -> " + g.owner + "/" + g.repo + (g.branch ? " (rama " + g.branch + ")" : "") + ". Para guardar y subir: git_status -> git_commit -> git_push.");
  else if (g.knownRepo) lines.push("- GitHub: sin remote local, pero el mapa dice que su repo es " + g.knownRepo + ". connect_project lo vincula (no crea otro).");
  else lines.push("- GitHub: NO conectado" + (g.initialized ? " (git iniciado, sin remote)" : " (sin git)") + ". connect_project crea un repo privado.");
  const v = conn.vercel;
  if (v.linked) lines.push("- Vercel: VINCULADO (" + (v.projectName || v.projectId) + "). Deploy con deploy_vercel; si Vercel esta conectado al repo, git_push tambien despliega.");
  else if (v.knownProjectId) lines.push("- Vercel: carpeta sin vincular, pero el mapa tiene su proyecto (" + v.knownProjectId + "). connect_project lo vincula (no crea otro).");
  else lines.push("- Vercel: NO vinculado. NO uses deploy_vercel hasta vincularlo con connect_project.");
  const s = conn.supabase;
  if (s.infra && s.schema) lines.push("- Supabase GAFCORE: schema \"" + s.schema + "\" (project-infra.json). Tablas en " + s.schema + ".<tabla>; migraciones en supabase/migrations/.");
  else if (s.knownSchema) lines.push("- Supabase GAFCORE: falta project-infra.json; segun el mapa su schema es \"" + s.knownSchema + "\".");
  else lines.push("- Supabase GAFCORE: sin project-infra.json ni schema asignado.");
  if (conn.missing.length) lines.push("Faltan: " + conn.missing.join(", ") + ". Solo conecta si el usuario lo pide o si la tarea lo requiere (commit/push/deploy).");
  conn.warnings.forEach(w => lines.push("AVISO: " + w));
  return "\n\n" + lines.join("\n");
}

export function summarizeConnections(conn) {
  if (!conn) return [];
  const out = [];
  out.push(conn.github.connected ? { ok: true, text: "GitHub: " + conn.github.owner + "/" + conn.github.repo + (conn.github.branch ? " (" + conn.github.branch + ")" : "") } : { ok: false, text: "GitHub: sin remote" + (conn.github.knownRepo ? " (mapa: " + conn.github.knownRepo + ")" : "") });
  out.push(conn.vercel.linked ? { ok: true, text: "Vercel: vinculado (" + (conn.vercel.projectName || conn.vercel.projectId) + ")" } : { ok: false, text: "Vercel: sin vincular" + (conn.vercel.knownProjectId ? " (mapa: " + conn.vercel.knownProjectId + ")" : "") });
  out.push(conn.supabase.infra ? { ok: true, text: "Supabase GAFCORE: schema " + (conn.supabase.schema || "?") } : { ok: false, text: "Supabase: falta project-infra.json" + (conn.supabase.knownSchema ? " (mapa: " + conn.supabase.knownSchema + ")" : "") });
  conn.warnings.forEach(w => out.push({ ok: false, text: w }));
  return out;
}

// ------------------------------------------------------------
//  Archivos estandar (puros)
// ------------------------------------------------------------
export function buildInfraJson(ids) {
  return JSON.stringify({
    version: 1,
    projectName: ids.name,
    projectSlug: ids.slug,
    isolationMode: "dedicated_supabase",
    supabase: { url: GAFCORE_SUPABASE_URL, schema: ids.schema }
  }, null, 2) + "\n";
}

export function buildEnvPublic(ids, framework) {
  const lines = [
    "# GAFCORE Supabase self-hosted (valores publicos)",
    "NEXT_PUBLIC_SUPABASE_URL=" + GAFCORE_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=" + GAFCORE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_SCHEMA=" + ids.schema
  ];
  if (framework === "vite") {
    lines.push("VITE_SUPABASE_URL=" + GAFCORE_SUPABASE_URL, "VITE_SUPABASE_ANON_KEY=" + GAFCORE_ANON_KEY, "VITE_SUPABASE_SCHEMA=" + ids.schema);
  }
  return lines.join("\n") + "\n";
}

export function buildEnvLocal(ids, framework) {
  return buildEnvPublic(ids, framework) + [
    "",
    "# Solo backend / scripts. No se versiona.",
    "# Copia la service role key desde tu documentacion GAFCORE.",
    "SUPABASE_SERVICE_ROLE_KEY=",
    "DATABASE_URL=" + GAFCORE_LOCAL_DB_URL + "?schema=" + ids.schema
  ].join("\n") + "\n";
}

export function ensureGitignore(text) {
  const cur = String(text || "");
  const have = new Set(cur.split(/\r?\n/).map(s => s.trim()));
  const need = ["node_modules", ".env.local", ".env*.local", ".vercel"].filter(e => !have.has(e));
  if (!need.length) return null;
  return (cur && !cur.endsWith("\n") ? cur + "\n" : cur) + need.join("\n") + "\n";
}

// ------------------------------------------------------------
//  Comandos (puros; los nombres se validan antes de usarse)
// ------------------------------------------------------------
export const commands = {
  ghUser: () => "gh api user --jq .login",
  ghRepoExists: (owner, repo) => "gh repo view " + owner + "/" + repo + " --json name",
  gitInit: () => "git init -b main",
  gitAddAll: () => "git add -A",
  gitInitialCommit: () => "git commit -m \"chore: proyecto inicial (GafCoreAI)\"",
  ghCreatePrivate: (owner, repo) => "gh repo create " + owner + "/" + repo + " --private --source . --remote origin --push",
  gitAddRemote: (owner, repo) => "git remote add origin https://github.com/" + owner + "/" + repo + ".git",
  vercelProjectExists: (name) => "vercel project inspect " + name,
  vercelProjectAdd: (name) => "vercel project add " + name,
  vercelLink: (nameOrId) => "vercel link --yes --project " + nameOrId,
  vercelGitConnect: () => "vercel git connect --yes",
  vercelEnvAdd: (key, value, target) => "vercel env add " + key + " " + target + " --value " + value + " --yes --force",
  createSchema: (schema) => "docker exec " + GAFCORE_DB_CONTAINER + " psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \"create schema if not exists " + schema + "; grant usage on schema " + schema + " to anon, authenticated, service_role; alter default privileges in schema " + schema + " grant all on tables to service_role;\""
};

// ------------------------------------------------------------
//  Provisionamiento (crear proyecto nuevo o conectar uno existente)
// ------------------------------------------------------------
function flag(v, def = true) {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  return !/^(false|no|0|off|sin)$/i.test(String(v).trim());
}

export async function provisionProject(opts) {
  const { bridge, log = () => {}, files = null } = opts;
  if (!bridge || typeof bridge.runShellEx !== "function") throw new Error("Solo disponible en la app de escritorio");
  const wantGithub = flag(opts.github);
  const wantVercel = flag(opts.vercel);
  const wantSupabase = flag(opts.supabase);
  const report = [];
  const step = (area, status, text) => { report.push({ area, status, text }); log((status === "error" ? "✗ " : status === "skip" ? "· " : "✓ ") + area + ": " + text); };
  const run = async (cmd, cwd) => {
    const r = await bridge.runShellEx(cmd, cwd);
    return { ok: r.code === 0, out: ((r.stdout || "") + (r.stderr ? "\n" + r.stderr : "")).trim() };
  };

  let root = opts.root || null;
  let ids;
  let conn = null;

  if (opts.isNew) {
    ids = projectIds(opts.name);
    root = root || joinPath(ECOSYSTEM_ROOT, ids.folderName);
    if (await exists(bridge, root)) throw new Error("Ya existe la carpeta " + root + ". Abrela y usa connect_project para conectarla.");
    await bridge.createDir(root);
    step("Carpeta", "ok", root);
    const entries = Object.entries(files || {});
    for (const [rel, content] of entries) {
      const clean = String(rel).replace(/^[\\\/]+/, "");
      if (!clean || clean.split(/[\\\/]+/).includes("..")) continue;
      await bridge.writeFile(joinPath(root, clean.replace(/\//g, "\\")), content);
    }
    if (entries.length) step("Plantilla", "ok", entries.length + " archivos");
  } else {
    if (!root) throw new Error("No hay proyecto abierto");
    conn = await detectProjectConnections(root, bridge, { mapText: opts.mapText });
    root = conn.root;
    const baseName = conn.name || root.split("\\").pop();
    ids = projectIds(baseName);
    if (conn.slug) ids.slug = conn.slug;
    if (conn.supabase.schema) ids.schema = conn.supabase.schema;
    else if (conn.supabase.knownSchema && isValidSchema(conn.supabase.knownSchema)) ids.schema = conn.supabase.knownSchema;
  }

  const framework = conn ? conn.framework : "static";

  // --- Supabase GAFCORE ---
  if (!wantSupabase) step("Supabase", "skip", "omitido por peticion");
  else if (conn && conn.supabase.infra) step("Supabase", "skip", "ya conectado (schema " + conn.supabase.schema + ")");
  else {
    if (!isValidSchema(ids.schema)) throw new Error("Schema invalido: " + ids.schema);
    await bridge.writeFile(joinPath(root, "project-infra.json"), buildInfraJson(ids));
    if (!(await exists(bridge, joinPath(root, ".env")))) await bridge.writeFile(joinPath(root, ".env"), buildEnvPublic(ids, framework));
    if (!(await exists(bridge, joinPath(root, ".env.local")))) await bridge.writeFile(joinPath(root, ".env.local"), buildEnvLocal(ids, framework));
    if (!(await exists(bridge, joinPath(root, "supabase\\migrations")))) await bridge.createDir(joinPath(root, "supabase\\migrations"));
    step("Supabase", "ok", "project-infra.json, .env, .env.local y supabase/migrations (schema " + ids.schema + ")");
    const knownExists = conn && conn.supabase.knownSchema === ids.schema;
    if (knownExists) step("Schema", "skip", ids.schema + " ya existe segun el mapa");
    else {
      const r = await run(commands.createSchema(ids.schema), root);
      step("Schema", r.ok ? "ok" : "error", r.ok ? ids.schema + " creado en la base local" : "no se pudo crear (" + r.out.slice(0, 200) + ")");
      if (r.ok) step("PostgREST", "skip", "para usar el schema por la API hay que agregar \"" + ids.schema + "\" a PGRST_DB_SCHEMAS y reiniciar el contenedor (compartido: requiere confirmacion del usuario)");
    }
  }

  const gi = await readOrNull(bridge, joinPath(root, ".gitignore"));
  const giNext = ensureGitignore(gi);
  if (giNext) await bridge.writeFile(joinPath(root, ".gitignore"), giNext);

  // --- GitHub ---
  let ghConnected = !!(conn && conn.github.connected);
  if (!wantGithub) step("GitHub", "skip", "omitido por peticion");
  else if (ghConnected) step("GitHub", "skip", "ya conectado a " + conn.github.owner + "/" + conn.github.repo);
  else {
    const who = await run(commands.ghUser(), root);
    const login = who.ok ? who.out.split(/\r?\n/).pop().trim() : "";
    if (!login) step("GitHub", "error", "la CLI gh no tiene sesion iniciada (ejecuta gh auth login)");
    else {
      let owner = login;
      let repo = ids.repo;
      if (conn && conn.github.knownRepo) [owner, repo] = conn.github.knownRepo.split("/");
      if (!isValidRepoName(repo) || !isValidRepoName(owner)) throw new Error("Nombre de repo invalido: " + owner + "/" + repo);
      if (!(await exists(bridge, joinPath(root, ".git")))) await run(commands.gitInit(), root);
      const already = await run(commands.ghRepoExists(owner, repo), root);
      if (already.ok) {
        const r = await run(commands.gitAddRemote(owner, repo), root);
        ghConnected = r.ok;
        step("GitHub", r.ok ? "ok" : "error", r.ok ? "vinculado al repo existente " + owner + "/" + repo + " (sin push automatico)" : r.out.slice(0, 200));
      } else {
        await run(commands.gitAddAll(), root);
        await run(commands.gitInitialCommit(), root);
        const r = await run(commands.ghCreatePrivate(owner, repo), root);
        ghConnected = r.ok;
        step("GitHub", r.ok ? "ok" : "error", r.ok ? "repo privado " + owner + "/" + repo + " creado y subido" : r.out.slice(0, 300));
      }
    }
  }

  // --- Vercel ---
  if (!wantVercel) step("Vercel", "skip", "omitido por peticion");
  else if (conn && conn.vercel.linked) step("Vercel", "skip", "ya vinculado (" + (conn.vercel.projectName || conn.vercel.projectId) + ")");
  else {
    let target = conn && conn.vercel.knownProjectId ? conn.vercel.knownProjectId : ids.slug;
    if (!isValidRepoName(target)) throw new Error("Nombre de proyecto Vercel invalido: " + target);
    let created = false;
    if (!(conn && conn.vercel.knownProjectId)) {
      const ex = await run(commands.vercelProjectExists(target), root);
      if (!ex.ok) {
        const add = await run(commands.vercelProjectAdd(target), root);
        if (!add.ok) { step("Vercel", "error", "no se pudo crear el proyecto (" + add.out.slice(0, 200) + ")"); target = null; }
        else created = true;
      }
    }
    if (target) {
      const link = await run(commands.vercelLink(target), root);
      if (!link.ok) step("Vercel", "error", "no se pudo vincular (" + link.out.slice(0, 200) + ")");
      else {
        step("Vercel", "ok", (created ? "proyecto creado y vinculado: " : "vinculado al proyecto existente: ") + target);
        if (created) {
          for (const tgt of ["production", "preview", "development"]) {
            await run(commands.vercelEnvAdd("NEXT_PUBLIC_SUPABASE_URL", GAFCORE_SUPABASE_URL, tgt), root);
            await run(commands.vercelEnvAdd("NEXT_PUBLIC_SUPABASE_ANON_KEY", GAFCORE_ANON_KEY, tgt), root);
          }
          step("Vercel env", "ok", "NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY");
        }
        if (ghConnected) {
          const gc = await run(commands.vercelGitConnect(), root);
          step("Vercel + GitHub", gc.ok ? "ok" : "skip", gc.ok ? "deploy automatico al hacer push" : "no se conecto el repo a Vercel (" + gc.out.slice(0, 160) + ")");
        }
      }
    }
  }

  return { ok: !report.some(r => r.status === "error"), root, ids, report };
}

export function formatProvisionReport(result) {
  const icon = s => s === "ok" ? "✓" : s === "skip" ? "·" : "✗";
  return (result.ok ? "Listo: " : "Terminado con errores: ") + result.root + "\n" + result.report.map(r => icon(r.status) + " " + r.area + ": " + r.text).join("\n");
}
