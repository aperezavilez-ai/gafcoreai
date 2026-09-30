# Análisis forense GafCoreAI v1.5.4 (30/09/2026)

Alcance: backend Rust (`src-tauri/`), frontend (`web/js/`, `web/index.html`), permisos de Tauri,
CI/CD, actualizador, gestión de secretos, cumplimiento de las reglas del ecosistema GAFCORE,
higiene del repositorio y cambios pendientes sin commitear.

## Resumen ejecutivo

La app compila y pasa sus pruebas, pero hay un problema de seguridad de fondo: el agente de IA
puede ejecutar cualquier comando, escribir en cualquier ruta y borrar cualquier carpeta del disco
sin pedir confirmación, y ese permiso no se puede desactivar. Como el agente también lee páginas
web, un texto malicioso en una web (inyección de prompt) puede terminar ejecutando comandos en la PC.

Además hay un bug funcional: las conexiones de GitHub, Vercel y Supabase y el modelo activo
se pierden al reiniciar la app de escritorio.

| Severidad | Cantidad |
|-----------|----------|
| Crítico   | 4 |
| Alto      | 7 |
| Medio     | 8 |
| Bajo      | 8 |

## Verificaciones que pasaron

- `node --check` en todos los `.js`/`.mjs` de `web/js` y `scripts`: 0 errores de sintaxis.
- `npm test`: 19/19 pruebas OK. `secrets.test.mjs` (no incluido en `npm test`): 7/7 OK.
- `cargo check` del backend: compila sin errores.
- Búsqueda de secretos (claves `sk-`, `ghp_`, `AIza`, llaves privadas, service role): no hay secretos
  reales en el código. La anon key de las reglas es pública por diseño.
- El renderizador de Markdown del chat (`renderMarkdownLite`/`renderInlineMarkdown` en `app.js`)
  escapa `&`, `<` y `>` antes de insertar HTML.
- El cambio pendiente de v1.5.4 (fecha/hora en el system prompt de `agent.js` + bump de versión)
  es correcto y seguro de commitear.

---

## CRÍTICO

### C1. El agente ejecuta comandos sin confirmación y el permiso no se puede revocar
- `web/js/core.js` líneas 88-124: `PermissionManager` fuerza `EXECUTE = true` al cargar, y
  `revoke()` / `revokeAll()` ignoran cualquier intento de quitarlo.
- `web/js/tools.js` línea 654 (`run_command`): pasa el texto del modelo directo a `run_shell`.
- `requestPermission()` no muestra ningún diálogo: si el nivel está concedido, ejecuta.
- Riesgo: combinado con `read_url`, `scrape_web` y `search_web` (nivel READ), una página web con
  instrucciones ocultas puede hacer que el agente ejecute comandos arbitrarios (inyección de prompt).

**Corrección:**
1. Permitir revocar `EXECUTE` (quitar las líneas que lo fuerzan a `true`).
2. Para `run_command`, `run_project`, `clone_repo`, `git_commit/push/pull`, `deploy_vercel`,
   `ssh_exec` y `publish_project`: pedir aprobación por llamada con `showConfirm()`, mostrando
   el comando exacto. Ofrecer "permitir siempre en esta sesión" como opción explícita.
3. Si en la misma tarea el agente leyó contenido web, exigir confirmación aunque haya "permitir siempre".

### C2. `write_file` y `delete_file` aceptan cualquier ruta del disco
- `web/js/tools.js` líneas 36-47 (`write_file`) y 536-542 (`delete_file`): si la ruta es absoluta
  (`C:\...`, `\\servidor\...`, `/...`) se usa tal cual. El filtro de `../` no cubre `..\` de Windows.
- `src-tauri/src/fs.rs` líneas 78-88 (`delete_path`): usa `remove_dir_all` sin validar nada.
- Riesgo: el agente puede borrar carpetas completas fuera del proyecto o escribir en rutas
  sensibles (por ejemplo la carpeta de Inicio de Windows).

**Corrección:**
1. En JS: rechazar rutas absolutas y cualquier segmento `..` (con `/` o `\`); construir siempre
   la ruta como `diskFolder + ruta relativa`.
2. En Rust: agregar una función `ensure_inside(root, path)` que haga `canonicalize` y verifique
   `starts_with(root)` en `write_file`, `delete_path`, `rename_path` y `create_dir`.
3. `delete_file` sobre carpetas debe pedir confirmación explícita.

### C3. Inyección de comandos en herramientas git, incluso con nivel READ
- `tools.js` línea 692 (`git_diff`, nivel **READ**): `` `git diff ${file}` `` concatena el parámetro
  del modelo en una línea de shell.
- `tools.js` líneas 728 y 745 (`git_push` / `git_pull`): mismo problema con `branch`.
- `tools.js` líneas 710 y 861 (`git_commit`, `publish_project`): escapa `"` como `\"`, pero
  `cmd.exe` no reconoce `\"`. Un mensaje como `x" & calc & "` ejecuta `calc`.
- Riesgo: aunque se revoque `EXECUTE`, `git_diff` sigue permitiendo ejecutar comandos.

**Corrección:** no construir líneas de shell. Usar los comandos Rust de `git.rs`
(`git_status`, `git_diff`, `git_commit`, `git_push`, `git_pull`), que ya pasan argumentos como
arreglo sin shell. Validar `branch` con `/^[\w.\/-]+$/` y anteponer `--` a las rutas.

### C4. CSP desactivada + API global de Tauri + comandos sin restricción
- `src-tauri/tauri.conf.json`: `"csp": null` y `"withGlobalTauri": true`.
- `app.js` tiene 98 asignaciones a `innerHTML` (más ~60 en otros módulos).
- Riesgo: cualquier XSS (por ejemplo un nombre de archivo o una respuesta de API sin escapar)
  obtiene `window.__TAURI__` y puede llamar `run_shell` = ejecución de código en la PC.

**Corrección:**
1. Definir una CSP, por ejemplo:
   `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ipc: http://ipc.localhost https: http://localhost:* http://127.0.0.1:*; worker-src 'self' blob:`
   (el script inline de `index.html` que configura PDF.js y Monaco debe pasar a un archivo `.js`).
2. Auditar los `innerHTML` que insertan datos externos (nombres de archivo, respuestas de API,
   salida de herramientas) y usar `textContent` o `escapeHtml()`.

---

## ALTO

### A1. Permisos de Tauri demasiado amplios
`src-tauri/capabilities/default.json`: alcance de archivos `**`, `C:\**`, `D:\**` y `$HOME/**`;
`shell:allow-execute` / `allow-spawn`; HTTP a `https://**`. Además, los comandos propios
(`run_shell`, `write_file`, `delete_path`, `lsp_spawn`) no pasan por ningún alcance.

**Corrección:** quitar `"**"`, `C:\**` y `D:\**`; dejar solo `$HOME/**` y `D:\PROGRAMAS IA\**`
si hace falta. Quitar los permisos `shell:*` si no se usa el plugin shell desde JS (la terminal usa
`spawn_terminal` propio). La validación de rutas real va en Rust (ver C2).

### A2. Las conexiones y el modelo activo se pierden al reiniciar (bug funcional)
- `secrets.js` migra estas claves al store de Tauri y **las borra de `localStorage`**:
  `gafcoreai_sb`, `gafcoreai_github`, `gafcoreai_vercel`, `gafcoreai_active_model`,
  `gafcoreai_brave_key`, `gafcoreai_sb_url`, `gafcoreai_sb_key`.
- Pero el resto del código las sigue leyendo y escribiendo directo en `localStorage`:
  - `app.js`: 1923, 3525, 3531, 3535, 3545, 3557, 3569, 3856, 3870, 4093, 4104, 4124, 4131, 4141, 4148, 5736
  - `tools.js`: 587, 607, 785, 786, 825, 1053
  - `git-real.js`: 16, 17 · `mentions.js`: 349 · `rag.js`: 230
- Resultado en escritorio: al guardar funciona, pero al reiniciar `initSecrets()` mueve y borra
  el valor, y la lectura posterior devuelve vacío. GitHub, Vercel, Supabase, Brave y el modelo
  activo aparecen "desconectados" después de cada reinicio.

**Corrección:** reemplazar esas llamadas por `getSecret()`, `setSecret()` y `removeSecret()` de
`secrets.js`. Agregar una prueba que verifique que ninguna clave de `SECRET_KEYS` se lea con
`localStorage.getItem` fuera de `secrets.js`.

### A3. Las API keys NO están cifradas (la documentación dice lo contrario)
- `CHANGELOG.md` (v1.5.1) y `ROADMAP.md` afirman "cifrado con tauri-plugin-store (DPAPI)".
  `tauri-plugin-store` guarda JSON en texto plano en
  `%APPDATA%\com.gafcore.gafcoreai\gafcoreai-secrets.json`.
- `app.js` línea 3870 guarda además una copia de la API key del modelo activo en `localStorage`.

**Corrección:** usar el almacén del sistema operativo (crate `keyring`, que usa el Credential
Manager de Windows) expuesto con dos comandos Tauri (`secret_get` / `secret_set`), o
`tauri-plugin-stronghold`. No guardar `key` dentro de `gafcoreai_active_model`. Corregir la
documentación mientras tanto.

### A4. URLs de Supabase Cloud, contra las reglas del ecosistema
- `web/index.html` línea 301: `value="https://gafcore.supabase.co"`.
- `web/js/tools.js` líneas 775, 785, 822, 825 y 898: fallback y textos con `gafcore.supabase.co`.

**Corrección:** reemplazar por `https://supabase.gafcore.com` (y leer la configuración con
`getSecret`, ver A2).

### A5. Herramientas que reportan éxito falso
- `supabase_sync` (`tools.js` 820-828) siempre devuelve "Supabase conectado y sincronizado" sin probar nada.
- `publish_project` (`tools.js` 898) siempre agrega "✓ Supabase: Conectado".
- Los pasos de `publish_project` marcan ✓ aunque la salida del comando contenga errores
  (`run_shell` no lanza excepción por código de salida distinto de 0).
- Riesgo: el agente y el usuario creen que algo se publicó cuando no pasó.

**Corrección:** hacer una verificación real (`GET {url}/rest/v1/` con la anon key) o devolver
"no implementado". Hacer que `run_shell` devuelva el código de salida y marcar ✗ si no es 0.

### A6. SSH sin verificación de host
`src-tauri/src/ssh.rs` línea 13: `StrictHostKeyChecking=no` acepta cualquier servidor
(ataque de intermediario). `tools.js` 841 usa `root` como usuario por defecto.

**Corrección:** usar `StrictHostKeyChecking=accept-new` y exigir el usuario de forma explícita.

### A7. El auto-actualizador no puede funcionar
- `tauri.conf.json`: `"createUpdaterArtifacts": false`, así que no se generan las firmas `.sig`
  que el actualizador exige.
- `.github/workflows/release.yml`: `releaseDraft: true`. El endpoint
  `releases/latest/download/latest.json` solo apunta a releases publicados, no a borradores.

**Corrección:** poner `"createUpdaterArtifacts": true`, verificar que existan los secretos
`TAURI_SIGNING_PRIVATE_KEY*` en GitHub y publicar el release (o documentar el paso manual de publicarlo).

---

## MEDIO

### M1. Builds no reproducibles
`.gitignore` excluye `Cargo.lock` y `package-lock.json`. En una aplicación ambos deben
versionarse. Además, la clave de caché del CI usa `hashFiles('src-tauri/Cargo.lock')`, que no existe en el repo.
**Corrección:** quitar ambas líneas de `.gitignore` y commitear los lockfiles.

### M2. `npm test` no corre todas las pruebas
`package.json` lista solo `agent.test.mjs` y `zip-writer.test.mjs`; omite `secrets.test.mjs`.
**Corrección:** `"test": "node --test web/js/__tests__/"`.

### M3. Inyección de argumentos en `git.rs`
`git_clone(url, dest)`: una URL que empiece con `--upload-pack=...` se interpreta como opción de git.
`git_commit(files)`: lo mismo con nombres de archivo que empiecen con `-`.
**Corrección:** agregar `"--"` antes de URL/rutas y rechazar valores que empiecen con `-`.

### M4. `lsp.rs` puede tumbar la app
Usa `.lock().unwrap()`: si un hilo entra en pánico con el mutex tomado, la siguiente llamada
tumba la app. Además, `lsp_spawn` ejecuta cualquier comando vía `cmd /C`.
**Corrección:** usar `map_err` como en `shell.rs` y limitar `command` a una lista de servidores LSP conocidos.

### M5. Cambios de secretos que se pierden al cerrar
`secrets.js`: `setSecret()` solo actualiza la caché; el `_store.set()` ocurre 200 ms después en
`_flushAsync`. `_flushSync` (al cerrar) solo llama `save()`, sin haber hecho `set()` de lo pendiente.
**Corrección:** llamar `_store.set(key, str)` dentro de `setSecret()` y dejar el debounce solo para `save()`.

### M6. Cache-busting desactualizado
`index.html` líneas 10 y 533: `styles.css?v=1.5.2` y `js/app.js?v=1.5.2` con la app en 1.5.4.
En la versión web (Vercel) los usuarios pueden quedarse con JS/CSS viejos.
**Corrección:** que el script de bump actualice también estos `?v=`.

### M7. `window.confirm` siempre devuelve `true`
`dialogs.js` línea 140. Hoy no hay llamadas a `confirm()`, pero cualquier código futuro que lo
use aprobaría acciones destructivas automáticamente.
**Corrección:** devolver `false`.

### M8. Niveles de permiso mal asignados
`download_file` y `git_diff` están marcados como READ, pero descargan archivos o ejecutan shell.
**Corrección:** `download_file` a WRITE y `git_diff` a EXECUTE (o migrarlo a `git.rs`, ver C3).

---

## BAJO

- **B1. `CHANGELOG.md` dañado:** la entrada v1.5.4 quedó encima de un segundo encabezado
  `# Changelog` con un BOM en medio del archivo, y hay 6 textos con mojibake
  ("BotÃ³n", "automÃ¡tico"...). Reescribir en UTF-8 sin BOM y con un solo encabezado.
- **B2. `web/js/project-analyzer.js`** empieza con BOM. No rompe nada, pero es inconsistente con el resto.
- **B3. Backups sueltos:** 3 `package.json.bak-*`, `Cargo.toml.bak-*` y `tauri.conf.json.bak-*`,
  y 10 archivos en `_backups/`. **`web/index.html.bak-*` está dentro de `web/`**, así que se
  empaqueta en el `.exe` y se publica en Vercel (`.vercelignore` no excluye `*.bak*`).
  Borrarlos o moverlos a `D:\PROGRAMAS IA\Z RESPALDOS\` y agregar `*.bak*` y `_backups` a `.vercelignore`.
- **B4. Scripts de parche acumulados:** `patch-bump-152/153/154`, `patch-hour-154`,
  `patch-agent-v13`, `patch-tools-v14`. Sustituir por un solo `scripts/bump-version.mjs <versión>`.
- **B5. Código muerto:** `web/js/updater.js` no se importa en ningún lado (`app.js` tiene su propio actualizador).
- **B6. `lib.rs` línea 1** repite `windows_subsystem`, que solo tiene efecto en `main.rs`.
- **B7. Hook `pre-commit`** vive solo en `.git/hooks` (no se versiona, se pierde al clonar) y
  no valida `.mjs`. Moverlo a `scripts/hooks/` y configurarlo con `git config core.hooksPath`.
- **B8. `ANALISIS_FORENSE_20260923.md`** recomendaba cambiar a `gafcore.supabase.co`, lo que
  contradice las reglas del ecosistema. Marcar ese punto como obsoleto.

---

## Estado de correcciones (30/09/2026)

Aplicado y verificado (`npm test` 30/30, `cargo check` sin errores):

- **C1:** `EXECUTE` es revocable desde Permisos. Las herramientas EXECUTE/DANGEROUS y
  `open_folder` piden aprobación por llamada (Rechazar / Permitir siempre en la sesión / Permitir una vez)
  mostrando el comando exacto. Si el agente leyó contenido web en los últimos 10 minutos,
  "permitir siempre" se suspende y se vuelve a preguntar con una advertencia. Sin aprobador, se rechaza.
- **C2:** `write_file` y `delete_file` solo operan dentro de la carpeta abierta (`resolveInsideRoot`):
  se rechazan rutas absolutas externas, `..` con `/` o `\` y `:` en Windows. Borrar una carpeta pide
  confirmación. En Rust, `delete_path` se niega a borrar raíces de disco, carpetas de primer nivel,
  el home del usuario y sus ancestros.
- **C3 / M3 / M8:** `git_diff`, `git_commit`, `git_push`, `git_pull` y `publish_project` usan los
  comandos de `git.rs` (argumentos sin shell). Ramas validadas; `--` antes de rutas y URLs;
  valores que empiezan con `-` rechazados.
- **M7:** `window.confirm` ahora devuelve `false`.
- Nueva prueba: `web/js/__tests__/security.test.mjs` (incluida en `npm test`).

Segunda tanda, release v1.5.4 (`npm test` 46/46, `cargo check` OK):

- **A2:** credenciales migradas a `getSecret`/`setSecret`/`removeSecret` (29 reemplazos) + prueba
  `secrets-usage.test.mjs` que falla si alguna clave de `SECRET_KEYS` vuelve a usarse con `localStorage`.
- **A4:** `gafcore.supabase.co` reemplazado por `https://supabase.gafcore.com`.
- **A5:** `supabase_sync` y `publish_project` hacen GET real a `/rest/v1/`; `run_shell` informa
  `[exit code: N]` y el nuevo `run_shell_ex` devuelve `{ code, stdout, stderr }`.
- **M1:** `Cargo.lock` y `package-lock.json` versionados; `release.yml` usa `shell: bash` en el paso de npm.
- **M2:** `npm test` corre `web/js/__tests__/*.test.mjs`.
- **M5:** `setSecret()` escribe al store de inmediato; `save()` encadenado después.
- **M6:** cache-busting en 1.5.4; `scripts/bump-version.mjs` lo mantiene.
- **B1, B2, B3, B4, B5, B6:** CHANGELOG reescrito en UTF-8; BOM quitado de `project-analyzer.js` y
  `lib.rs`; backups movidos a `_backups/`; scripts `patch-*` reemplazados por `bump-version.mjs`;
  `updater.js` eliminado; `windows_subsystem` solo en `main.rs`.

Pendiente para la siguiente release: C4 (CSP + innerHTML), A1 (permisos Tauri), A3 (keyring),
A6/A7/M4 (SSH, updater, LSP), B7, B8. `read_file` sigue pudiendo leer fuera de la carpeta abierta
(se dejó así para no romper el análisis de otros proyectos).

## Plan de corrección sugerido

| Orden | Qué | Hallazgos | Esfuerzo |
|-------|-----|-----------|----------|
| 1 | Confirmación de comandos + permiso EXECUTE revocable | C1, M7, M8 | Medio |
| 2 | Restringir rutas en JS y Rust | C2, A1 | Medio |
| 3 | Git sin shell (usar `git.rs`) + `--` | C3, M3 | Bajo |
| 4 | Arreglar lecturas de secretos + flush | A2, M5 | Bajo |
| 5 | URLs Supabase + éxito falso | A4, A5 | Bajo |
| 6 | CSP + auditoría de `innerHTML` | C4 | Alto |
| 7 | Keyring real para API keys | A3 | Medio |
| 8 | Updater, lockfiles, tests, SSH | A6, A7, M1, M2, M4 | Bajo |
| 9 | Limpieza (backups, changelog, scripts) | B1-B8, M6 | Bajo |
