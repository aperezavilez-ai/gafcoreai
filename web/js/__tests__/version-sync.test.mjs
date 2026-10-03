import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = p => readFileSync(join(ROOT, p), "utf8");

test("la version coincide en package.json, Cargo.toml, tauri.conf.json e index.html", () => {
  const pkg = JSON.parse(read("package.json")).version;
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
  const cargo = (read("src-tauri/Cargo.toml").match(/^\[package\][^[]*?^version\s*=\s*"([^"]+)"/m) || [])[1];
  const html = read("web/index.html");
  const found = {
    "src-tauri/Cargo.toml": cargo,
    "tauri.conf.json version": conf.version,
    "tauri.conf.json titulo": (conf.app.windows[0].title.match(/v(\S+)$/) || [])[1],
    "index.html <title>": (html.match(/<title>GafCoreAI v([^<]+)<\/title>/) || [])[1],
    "index.html version-badge": (html.match(/class="version-badge">v([^<]+)</) || [])[1],
    "index.html styles.css?v": (html.match(/styles\.css\?v=([^"]+)"/) || [])[1],
    "index.html app.js?v": (html.match(/js\/app\.js\?v=([^"]+)"/) || [])[1]
  };
  const wrong = Object.entries(found).filter(([, v]) => v !== pkg);
  assert.deepEqual(wrong, [], `package.json dice ${pkg}. Ejecuta: node scripts/bump-version.mjs ${pkg}`);
});
