import { test } from "node:test";
import assert from "node:assert/strict";
import { compareVersions, pickInstallerAsset, summarizeNotes, checkLatestRelease } from "../update-check.js";

test("compareVersions compara numericamente y acepta el prefijo v", () => {
  assert.equal(compareVersions("1.5.10", "1.5.9"), 1);
  assert.equal(compareVersions("v1.5.6", "1.5.6"), 0);
  assert.equal(compareVersions("1.5.6", "1.6.0"), -1);
  assert.equal(compareVersions("2.0.0", "1.99.99"), 1);
});

test("pickInstallerAsset prefiere setup.exe y luego msi", () => {
  const assets = [
    { name: "GafCoreAI_1.5.7_x64_en-US.msi", browser_download_url: "msi" },
    { name: "GafCoreAI_1.5.7_x64-setup.exe", browser_download_url: "exe" }
  ];
  assert.equal(pickInstallerAsset(assets).browser_download_url, "exe");
  assert.equal(pickInstallerAsset([assets[0]]).browser_download_url, "msi");
  assert.equal(pickInstallerAsset([]), null);
});

test("summarizeNotes limpia encabezados y negritas", () => {
  const out = summarizeNotes("## GafCoreAI v1.5.7\n\n### Novedades\n- **Vista previa** mejorada\n### Instalacion\n- setup");
  assert.match(out, /^GafCoreAI v1\.5\.7\nNovedades\n- Vista previa mejorada/);
  assert.ok(!/Instalacion/.test(out));
});

const fakeFetch = (status, body) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test("checkLatestRelease detecta version nueva y devuelve el instalador", async () => {
  const info = await checkLatestRelease({
    currentVersion: "1.5.6",
    fetchImpl: fakeFetch(200, {
      tag_name: "v1.5.7",
      html_url: "https://github.com/x/releases/tag/v1.5.7",
      body: "Novedades",
      assets: [{ name: "GafCoreAI_1.5.7_x64-setup.exe", browser_download_url: "https://dl/setup.exe" }]
    })
  });
  assert.equal(info.hasUpdate, true);
  assert.equal(info.latest, "1.5.7");
  assert.equal(info.downloadUrl, "https://dl/setup.exe");
});

test("checkLatestRelease: misma version no es actualizacion", async () => {
  const info = await checkLatestRelease({ currentVersion: "1.5.6", fetchImpl: fakeFetch(200, { tag_name: "v1.5.6", assets: [] }) });
  assert.equal(info.hasUpdate, false);
});

test("checkLatestRelease explica los errores en español", async () => {
  await assert.rejects(checkLatestRelease({ currentVersion: "1.0.0", fetchImpl: fakeFetch(403, {}) }), /limitó las consultas/);
  await assert.rejects(checkLatestRelease({ currentVersion: "1.0.0", fetchImpl: fakeFetch(404, {}) }), /no hay versiones publicadas/);
  await assert.rejects(checkLatestRelease({ currentVersion: "1.0.0", fetchImpl: async () => { throw new TypeError("fetch failed"); } }), /Sin conexión/);
});
