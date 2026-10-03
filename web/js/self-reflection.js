// ============================================================
//  GafCoreAI - Auto-reflexion del agente
//  Evalua el resultado de un turno ReAct sin gastar tokens y decide
//  si hay que redirigir la tarea antes de entregarla al usuario.
// ============================================================

const WRITE_TOOLS = new Set(["write_file", "edit_file", "delete_file", "create_project", "connect_project", "git_commit", "git_push", "deploy_vercel", "publish_project"]);

const ACTION_RE = /\b(crea|crear|modifica|modificar|corrige|corregir|arregla|arreglar|implementa|implementar|agrega|agregar|añade|añadir|cambia|cambiar|elimina|eliminar|borra|borrar|escribe|escribir|actualiza|actualizar|refactoriza|instala|instalar|procede|aplica|aplicar|hazlo|haz)\b/i;
const QUESTION_RE = /\?|\b(c[oó]mo|qu[eé]|por qu[eé]|cu[aá]l|cu[aá]ndo|explica|explicame|expl[ií]came|significa|diferencia|recomiendas|opinas)\b/i;
const CLAIM_RE = /\b(he creado|he modificado|he actualizado|he corregido|he agregado|he añadido|he aplicado|he escrito|he implementado|cre[eé]|modifiqu[eé]|actualic[eé]|correg[ií]|agregu[eé]|apliqu[eé]|implement[eé]|cambios aplicados|archivos? creados?|listo,? ya|ya qued[oó]|qued[oó] listo)\b/i;
const ERROR_ACK_RE = /\b(error|fall[oó]|fallaron|falla|no pude|no se pudo|no fue posible|imposible|bloquead|denegad|no existe)\b/i;
const API_ERROR_RE = /⚠️ \*\*|⛔|El modelo no respondió|devolvio una respuesta vacia/;

function writePathsStillFailing(toolResults) {
  const state = new Map();
  for (const t of toolResults) {
    if (!WRITE_TOOLS.has(t.name) || !t.path) continue;
    state.set(t.path, t.ok);
  }
  return [...state.entries()].filter(([, ok]) => !ok).map(([p]) => p);
}

/**
 * @returns {{ ok: boolean, issues: string[], redirect: string }}
 */
export function reflectOnResult({ userTask = "", response = "", toolResults = [], diskFolder = "", aborted = false } = {}) {
  const verdict = { ok: true, issues: [], redirect: "" };
  if (aborted || API_ERROR_RE.test(response)) return verdict;

  const task = String(userTask);
  const text = String(response);
  const isAction = ACTION_RE.test(task) && !QUESTION_RE.test(task);
  const okWrites = toolResults.filter(t => t.ok && WRITE_TOOLS.has(t.name));
  const okAny = toolResults.filter(t => t.ok).length;

  if (isAction && CLAIM_RE.test(text) && okWrites.length === 0) {
    verdict.issues.push("La respuesta afirma cambios aplicados, pero ninguna herramienta de escritura se ejecutó con éxito.");
  }

  if (toolResults.length > 0 && okAny === 0 && !ERROR_ACK_RE.test(text)) {
    verdict.issues.push("Todas las herramientas fallaron y la respuesta no lo reconoce.");
  }

  const failing = writePathsStillFailing(toolResults);
  if (failing.length && !ERROR_ACK_RE.test(text)) {
    verdict.issues.push("Quedaron escrituras fallidas sin reintentar: " + failing.slice(0, 4).join(", ") + ".");
  }

  if (isAction && diskFolder && toolResults.length === 0 && /```/.test(text)) {
    verdict.issues.push("Se pidió aplicar cambios en el proyecto abierto, pero solo se mostró código sin escribirlo en disco.");
  }

  if (verdict.issues.length) {
    verdict.ok = false;
    verdict.redirect = "[AUTO-REFLEXIÓN DEL SISTEMA]: Tu resultado no cumple la tarea del usuario.\n" +
      verdict.issues.map((s, i) => (i + 1) + ". " + s).join("\n") +
      "\nCorrige AHORA usando herramientas reales (read_file, edit_file, write_file, run_command). " +
      "Si algo es imposible, dilo con claridad y explica qué falta. No repitas lo que ya hiciste bien.";
  }
  return verdict;
}
