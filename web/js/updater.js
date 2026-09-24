// Auto-updater GafCoreAI (Tauri v2, sin bundler)
// Usa window.__TAURI__ para evitar bare specifiers

export async function checkForUpdates() {
  try {
    const tauri = window.__TAURI__;
    if (!tauri) {
      console.warn("[updater] window.__TAURI__ no disponible. Ignorando updater.");
      return;
    }

    const updaterApi = tauri.updater || (tauri.plugin && tauri.plugin.updater);
    const processApi = tauri.process || (tauri.plugin && tauri.plugin.process);

    if (!updaterApi || !updaterApi.check) {
      console.warn("[updater] Plugin updater no expuesto en window.__TAURI__.");
      return;
    }

    const update = await updaterApi.check();
    if (!update) {
      console.log("[updater] Sin actualizaciones.");
      return;
    }

    console.log("[updater] Nueva version disponible:", update.version);

    await update.downloadAndInstall((event) => {
      if (event.event === "Started")  console.log("[updater] Descargando:", event.data.contentLength, "bytes");
      if (event.event === "Progress") console.log("[updater] +", event.data.chunkLength);
      if (event.event === "Finished") console.log("[updater] Descarga completa.");
    });

    if (processApi && processApi.relaunch) {
      await processApi.relaunch();
    }
  } catch (e) {
    console.warn("[updater] No se pudo verificar actualizaciones:", e);
  }
}