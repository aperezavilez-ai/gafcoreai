import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectIds, isValidSchema, parseGitRemote, parseGitConfigOrigin, parseGitHead, parseEnvSummary,
  parseEcosystemMap, findMapEntry, ecosystemProjectRoot, analyzeConnections, buildEcosystemContext,
  buildInfraJson, buildEnvLocal, ensureGitignore, detectProjectConnections, provisionProject, commands
} from "../ecosystem.js";

const MAP = `[05] LIPOBLUE
  * Carpeta:          D:\\PROGRAMAS IA\\LIPOBLUE
  * Slug / Esquema:   lipoblue
  * Base de Datos:    PostgreSQL (Schema: lipoblue)
  * Repositorio:      https://github.com/aperezavilez-ai/lipoblue.git
  * Vercel ProjectId: prj_lipo

[16] IA RESTAURANT
  * Carpeta:          D:\\PROGRAMAS IA\\IA RESTAURANT
  * Slug / Esquema:   ia-restaurant
  * Base de Datos:    PostgreSQL (Schema: public / iarestaurant)

[07] CALILI
  * Carpeta:          D:\\PROGRAMAS IA\\CALILI
  * Slug / Esquema:   calili
  * Repositorio:      aperezavilez/calili
`;

const GIT_CONFIG = `[core]
\tbare = false
[remote "upstream"]
\turl = https://github.com/otro/x.git
[remote "origin"]
\turl = https://github.com/aperezavilez-ai/lipoblue.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
`;

function fakeBridge(files = {}, { shell = () => ({ code: 0, stdout: "" }) } = {}) {
  const fs = new Map(Object.entries(files).map(([k, v]) => [k.toLowerCase(), v]));
  const dirs = new Set();
  const calls = [];
  return {
    calls, fs, dirs,
    async readFile(p) { const v = fs.get(p.toLowerCase()); if (v == null) throw new Error("no existe"); return v; },
    async fileExists(p) {
      const k = p.toLowerCase();
      if (fs.has(k) || dirs.has(k)) return true;
      return [...fs.keys(), ...dirs].some(x => x.startsWith(k + "\\"));
    },
    async writeFile(p, c) { fs.set(p.toLowerCase(), c); },
    async createDir(p) { dirs.add(p.toLowerCase()); },
    async runShellEx(cmd, cwd) { calls.push(cmd); return shell(cmd, cwd); }
  };
}

test("projectIds - slug, schema y carpeta sin acentos", () => {
  const ids = projectIds("Mi Tienda Ñandú");
  assert.equal(ids.slug, "mi-tienda-nandu");
  assert.equal(ids.schema, "mi_tienda_nandu");
  assert.equal(ids.folderName, "MI TIENDA NANDU");
  assert.equal(projectIds("3D Studio").schema, "p_3d_studio");
  assert.throws(() => projectIds("!!!"));
  assert.ok(isValidSchema("mi_tienda"));
  assert.ok(!isValidSchema("fuxion-service"));
});

test("parsers de git y env no exponen valores secretos", () => {
  assert.deepEqual(parseGitRemote("git@github.com:aperezavilez-ai/taxidriv.git").repo, "taxidriv");
  assert.equal(parseGitConfigOrigin(GIT_CONFIG), "https://github.com/aperezavilez-ai/lipoblue.git");
  assert.equal(parseGitHead("ref: refs/heads/develop\n"), "develop");
  const env = parseEnvSummary("NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=secreto\n");
  assert.deepEqual(env.keys, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  assert.deepEqual(env.supabaseUrls, ["https://abc.supabase.co"]);
  assert.ok(!JSON.stringify(env).includes("secreto"));
});

test("parseEcosystemMap - repo, schema dedicado y proyecto de Vercel", () => {
  const map = parseEcosystemMap(MAP);
  const lipo = findMapEntry(map, "D:\\PROGRAMAS IA\\LIPOBLUE\\");
  assert.equal(lipo.repo, "aperezavilez-ai/lipoblue");
  assert.equal(lipo.vercelProjectId, "prj_lipo");
  assert.equal(lipo.schema, "lipoblue");
  assert.equal(findMapEntry(map, "D:\\PROGRAMAS IA\\IA RESTAURANT").schema, "iarestaurant");
  assert.equal(findMapEntry(map, "D:\\PROGRAMAS IA\\CALILI").repo, "aperezavilez/calili");
});

test("ecosystemProjectRoot - subcarpetas apuntan a la raiz del proyecto", () => {
  assert.equal(ecosystemProjectRoot("D:\\PROGRAMAS IA\\LIPOBLUE\\src\\components"), "D:\\PROGRAMAS IA\\LIPOBLUE");
  assert.equal(ecosystemProjectRoot("C:\\otro\\proyecto"), "C:\\otro\\proyecto");
});

test("analyzeConnections - proyecto conectado y aviso de Supabase Cloud", () => {
  const conn = analyzeConnections({
    root: "D:\\PROGRAMAS IA\\LIPOBLUE",
    infra: JSON.stringify({ projectName: "LipoBlue", supabase: { schema: "lipoblue" } }),
    gitConfig: GIT_CONFIG, gitHead: "ref: refs/heads/main", hasGitDir: true,
    vercelProject: JSON.stringify({ projectId: "prj_lipo", orgId: "team_x" }),
    envs: ["NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co"]
  });
  assert.deepEqual(conn.missing, []);
  assert.equal(conn.github.branch, "main");
  assert.equal(conn.vercel.projectId, "prj_lipo");
  assert.equal(conn.warnings.length, 1);
  const ctx = buildEcosystemContext(conn);
  assert.match(ctx, /aperezavilez-ai\/lipoblue \(rama main\)/);
  assert.match(ctx, /schema "lipoblue"/);
});

test("analyzeConnections - entiende el project-infra.json antiguo de EDITCOREAI", () => {
  const conn = analyzeConnections({
    root: "D:\\PROGRAMAS IA\\FUXION SERVICE",
    infra: JSON.stringify({ projectName: "FUXION SERVICE", githubRemoteUrl: "https://github.com/aperezavilez-ai/FUXION-SERVICE.git", vercelProjectId: "prj_fux", supabaseProjectId: "fuxion-service" }),
    gitConfig: "", hasGitDir: true
  });
  assert.equal(conn.supabase.schema, "fuxion-service");
  assert.equal(conn.vercel.knownProjectId, "prj_fux");
  assert.equal(conn.github.knownRepo, "aperezavilez-ai/FUXION-SERVICE");
  assert.ok(conn.warnings.some(w => /formato antiguo/.test(w)));
});

test("archivos estandar - infra, env.local sin service role y gitignore", () => {
  const ids = projectIds("Mi Tienda");
  const infra = JSON.parse(buildInfraJson(ids));
  assert.equal(infra.supabase.url, "https://supabase.gafcore.com");
  assert.equal(infra.supabase.schema, "mi_tienda");
  const envLocal = buildEnvLocal(ids, "static");
  assert.match(envLocal, /^SUPABASE_SERVICE_ROLE_KEY=$/m);
  assert.match(envLocal, /DATABASE_URL=.*\?schema=mi_tienda/);
  assert.ok(!/supabase\.co\b/.test(envLocal));
  assert.match(ensureGitignore("dist\n"), /\.env\.local/);
  assert.equal(ensureGitignore("node_modules\n.env.local\n.env*.local\n.vercel\n"), null);
});

test("detectProjectConnections - usa el mapa cuando falta el remote local", async () => {
  const bridge = fakeBridge({
    "D:\\PROGRAMAS IA\\LIPOBLUE\\.git\\HEAD": "ref: refs/heads/main",
    "D:\\PROGRAMAS IA\\LIPOBLUE\\.git\\config": "[core]\n",
    "D:\\PROGRAMAS IA\\LIPOBLUE\\package.json": JSON.stringify({ dependencies: { vite: "5" } })
  });
  const conn = await detectProjectConnections("D:\\PROGRAMAS IA\\LIPOBLUE\\src", bridge, { mapText: MAP });
  assert.equal(conn.root, "D:\\PROGRAMAS IA\\LIPOBLUE");
  assert.equal(conn.framework, "vite");
  assert.deepEqual(conn.missing, ["github", "vercel", "supabase"]);
  assert.equal(conn.github.knownRepo, "aperezavilez-ai/lipoblue");
  assert.equal(conn.vercel.knownProjectId, "prj_lipo");
});

test("provisionProject - proyecto ya conectado no crea nada", async () => {
  const root = "D:\\PROGRAMAS IA\\LIPOBLUE";
  const bridge = fakeBridge({
    [root + "\\project-infra.json"]: JSON.stringify({ projectName: "LIPOBLUE", supabase: { schema: "lipoblue" } }),
    [root + "\\.git\\config"]: GIT_CONFIG,
    [root + "\\.git\\HEAD"]: "ref: refs/heads/main",
    [root + "\\.vercel\\project.json"]: JSON.stringify({ projectId: "prj_lipo" }),
    [root + "\\.gitignore"]: "node_modules\n.env.local\n.env*.local\n.vercel\n"
  });
  const r = await provisionProject({ bridge, root, isNew: false, mapText: MAP });
  assert.ok(r.ok);
  assert.deepEqual(bridge.calls, []);
  assert.ok(r.report.every(x => x.status === "skip"));
});

test("provisionProject - existente sin remote ni vinculo reutiliza repo y proyecto del mapa", async () => {
  const root = "D:\\PROGRAMAS IA\\LIPOBLUE";
  const bridge = fakeBridge({
    [root + "\\project-infra.json"]: JSON.stringify({ projectName: "LIPOBLUE", supabase: { schema: "lipoblue" } }),
    [root + "\\.git\\HEAD"]: "ref: refs/heads/main",
    [root + "\\.git\\config"]: "[core]\n"
  }, { shell: (cmd) => cmd === commands.ghUser() ? { code: 0, stdout: "aperezavilez-ai\n" } : { code: 0, stdout: "" } });
  const r = await provisionProject({ bridge, root, isNew: false, mapText: MAP });
  assert.ok(r.ok, JSON.stringify(r.report));
  assert.ok(bridge.calls.includes(commands.gitAddRemote("aperezavilez-ai", "lipoblue")));
  assert.ok(!bridge.calls.some(c => c.startsWith("gh repo create")));
  assert.ok(bridge.calls.includes(commands.vercelLink("prj_lipo")));
  assert.ok(!bridge.calls.some(c => c.startsWith("vercel project add")));
});

test("provisionProject - proyecto nuevo: carpeta, plantilla, infra, schema, repo privado y Vercel", async () => {
  const bridge = fakeBridge({}, {
    shell: (cmd) => {
      if (cmd === commands.ghUser()) return { code: 0, stdout: "aperezavilez-ai" };
      if (cmd.startsWith("gh repo view") || cmd.startsWith("vercel project inspect")) return { code: 1, stderr: "not found" };
      return { code: 0, stdout: "" };
    }
  });
  const r = await provisionProject({ bridge, name: "Mi Tienda", isNew: true, files: { "index.html": "<h1>hola</h1>", "css/app.css": "body{}" } });
  assert.ok(r.ok, JSON.stringify(r.report));
  const root = "d:\\programas ia\\mi tienda";
  assert.equal(r.root, "D:\\PROGRAMAS IA\\MI TIENDA");
  assert.ok(bridge.fs.has(root + "\\index.html"));
  assert.ok(bridge.fs.has(root + "\\css\\app.css"));
  assert.equal(JSON.parse(bridge.fs.get(root + "\\project-infra.json")).supabase.schema, "mi_tienda");
  assert.ok(bridge.fs.has(root + "\\.env.local"));
  assert.match(bridge.fs.get(root + "\\.gitignore"), /\.env\.local/);
  assert.ok(bridge.calls.includes(commands.createSchema("mi_tienda")));
  assert.ok(bridge.calls.includes(commands.ghCreatePrivate("aperezavilez-ai", "mi-tienda")));
  assert.ok(bridge.calls.includes(commands.vercelProjectAdd("mi-tienda")));
  assert.ok(bridge.calls.includes(commands.vercelLink("mi-tienda")));
  assert.ok(bridge.calls.some(c => c.startsWith("vercel env add NEXT_PUBLIC_SUPABASE_URL production")));
});

test("provisionProject - respeta github/vercel=false y no pisa una carpeta existente", async () => {
  const bridge = fakeBridge({});
  const r = await provisionProject({ bridge, name: "Solo Local", isNew: true, github: false, vercel: "false" });
  assert.ok(!bridge.calls.some(c => c.startsWith("gh ") || c.startsWith("vercel ")));
  assert.ok(r.report.some(x => x.area === "GitHub" && x.status === "skip"));
  await assert.rejects(provisionProject({ bridge, name: "Solo Local", isNew: true }), /Ya existe la carpeta/);
});
