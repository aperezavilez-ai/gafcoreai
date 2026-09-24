================================================================
  REPORTE FORENSE GafCoreAI - 23/09/2026
  Analisis completo de errores de sintesis y funcionamiento
================================================================

## 1. CORRUPCION DE ENCODING (CRITICO)

El archivo app.js contiene multiples secuencias de corrupcion UTF-8
interpretadas como Latin-1. Los caracteres corruptos son:

  â•"  →  ─  (box drawing light horizontal)
  â•‘  →  │  (box drawing light vertical)
  â•š  →  ┘  (box drawing light up and left)
  â•—  →  ┐  (box drawing light down and left)
  ðŸ"  →  emojis varios (corrupcion de caracteres multibyte)

Lineas afectadas en app.js:
  - 3932: â•"â•â•"â•... (borde superior del box)
  - 3933: â•‘  GafCoreAI v25... (contenido del box)
  - 3934: â•šâ•... (borde inferior del box)
  - 3857-3960: multiples emojis corruptos en termWrite()

Esto causara que la terminal muestre caracteres basura en vez de
un box dibujado con lineas Unicode.

CAUSA: El archivo se guardo en Latin-1 o se proceso con codificacion
incorrecta durante alguna edicion.

## 2. DOMINIO SUPABASE INCORRECTO (CRITICO)

En index.html linea 261:
  "Supabase (gafcore.com)"  ← nombre mostrado

En index.html linea 266:
  value="https://supabase.gafcore.com"  ← URL por defecto

En app.js linea 3918:
  if (sb.url.includes("gafcore.com"))  ← check de conexion

El usuario solicito dominio "gafcore" no "gafcore.com".
El dominio correcto deberia ser algo como:
  https://gafcore.supabase.co
o el dominio custom que el usuario tenga configurado.

AFECTA: El check de conexion en boot() no detectara correctamente
la conexion si el dominio no contiene "gafcore.com".

## 3. IMPORTS DUPLICADOS (ERROR DE SINTAXIS)

En app.js:
  Linea 31: import { SKILL_CATALOG, getSkillsForAgent, getSkillsByCategory } from "./skills.js";
  Linea 32: import { getSkillsByCategory } from "./skills.js";

Ambas importan getSkillsByCategory desde el mismo modulo.
No causa error en runtime pero es redundante y confuso.

## 4. MODULO config.js FALTANTE (ERROR CRITICO)

En REPORTE se listan exports de config.js (Config, openConfigModal,
closeConfigModal, initConfig), pero el archivo NO EXISTE en web/js/.

Ademas, en ARQUITECTURA se menciona que app.js importa de config.js,
pero en el app.js actual NO hay import de config.js.

POSIBLE CAUSA: El archivo fue eliminado o nunca se creo. Si el codigo
lo necesita en algun punto, causara un error 404 al cargar.

## 5. BOTONES SIN HANDLERS (ERRORES DE FUNCIONALIDAD)

Botones en index.html sin handler en app.js:
  - btn-config       → No existe handler ni funcion
  - btn-theme-toggle → No existe handler ni funcion
  - cfg-open-perms   → No existe en HTML, solo en reporte
  - cfg-open-cache   → No existe en HTML, solo en reporte
  - cfg-open-memory  → No existe en HTML, solo en reporte
  - cfg-open-connections → No existe en HTML, solo en reporte

Botones con handlers EXISTENTES pero en codigo diferente:
  - term-toggle-view  → Handler existe (linea 211-219)
  - term-restart      → Handler existe (linea 225-232)
  - term-clear        → Handler existe (linea 221-222)
  - term-close        → Handler existe (linea 223-224)

El reporte inicial listo estos como "sin handler" pero SI tienen
handler. El reporte estaba desactualizado.

## 6. FUNCIONES FALTANTES (ERRORES DE SINTAXIS)

Funciones referenciadas pero no definidas en app.js:
  - initTheme     → No definida, llamada en checkForUpdates?
  - applyTheme    → No definida
  - cycleTheme    → No definida

Nota: checkForUpdates SI existe (linea 2586) y es llamada en boot.

El sistema de temas parece estar incompleto. Solo se define un
tema "gafcore-dark" en initMonaco() pero no hay sistema de
cambio de tema global.

## 7. ELEMENTOS HTML REFERENCIADOS QUE NO EXISTEN

Referenciados en app.js pero no en index.html:
  - btn-supabase   → No existe en HTML, solo en conexiones modal
  - modal-config   → No existe en HTML

Esto causara errores en consola:
  "Cannot read properties of null (reading 'classList')"

## 8. API TAURI v1 vs v2 (INCOMPATIBILIDAD)

tauri.conf.json usa schema Tauri v2:
  "$schema": "https://schema.tauri.app/config/2"

Pero tauri-bridge.js usa patron v1:
  window.__TAURI__.core.invoke
  window.__TAURI__.event.listen
  window.__TAURI__.dialog.open

En Tauri v2, la API es diferente:
  import { invoke } from '@tauri-apps/api/core'
  import { listen } from '@tauri-apps/api/event'

Como el proyecto usa "withGlobalTauri: true" y "type": "module",
deberia funcionar con el patron actual, pero es una configuracion
mixta que podria causar problemas.

## 9. CAPABILITIES DESACTUALIZADAS

El capabilities/default.json usa permisos de Tauri v1:
  "fs:scope-home-recursive"
  "@{identifier=fs:scope; allow=System.Object[]}"

En Tauri v2, el sistema de capabilities es diferente.

## 10. BACKUPS EXCESIVOS

27 archivos .bak en el proyecto, incluyendo 9 de app.js solo.
Esto indica muchas iteraciones de edicion. Se recomienda limpiar.

## 11. VERIFICACION DE PARENTESIS

  Llaves { }: balanceadas (894 abiertas, 894 cerradas)
  Parentesis ( ): casi balanceados (2956 vs 2961)
  Diferencia de 5 parentesis - probablemente en llamadas
  a funciones multi-linea, no es error critico.

================================================================
 RESUMEN DE CORRECCIONES RECOMENDADAS
================================================================

PRIORIDAD ALTA (bloquean funcionamiento):
  1. Corregir encoding de caracteres Unicode en app.js
  2. Corregir dominio Supabase a "gafcore"
  3. Remover imports duplicados
  4. Remover referencias a btn-supabase inexistente
  5. Remover import de config.js si no existe

PRIORIDAD MEDIA (mejoran experiencia):
  6. Implementar sistema de temas (initTheme, applyTheme, cycleTheme)
  7. Agregar btn-config con su handler
  8. Limpiar backups antiguos
  9. Actualizar API Tauri a patron v2 consistente

PRIORIDAD BAJA:
  10. Agregar btn-supabase al HTML o remover referencias
  11. Limpiar capabilities a formato v2

================================================================
 Reporte generado: 23/09/2026
================================================================
