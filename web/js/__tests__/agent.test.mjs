// Tests unitarios para funciones de agent.js
// Estrategia: leer el archivo fuente y evaluar funciones puras en contexto aislado
import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENT_SRC = readFileSync(join(__dirname, "..", "agent.js"), "utf-8");

function extractFn(name, src) {
  const start = src.indexOf(`export function ${name}`);
  if (start < 0) return null;
  let depth = 0, started = false, end = start;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") { depth++; started = true; }
    else if (src[i] === "}") { depth--; if (started && depth === 0) { end = i + 1; break; } }
  }
  return src.slice(start, end).replace(/^export /, "");
}

const fnSrc = [
  extractFn("extractDiskPath", AGENT_SRC),
  extractFn("sanitizeApiErrorMessage", AGENT_SRC),
].filter(Boolean).join("\n");

const module = new Function(fnSrc + "\nreturn { extractDiskPath, sanitizeApiErrorMessage };")();
const { extractDiskPath, sanitizeApiErrorMessage } = module;

//  extractDiskPath 
test("extractDiskPath - Windows path valido", () => {
  const r = extractDiskPath("abre el proyecto D:\\mi-carpeta");
  assert.ok(r, "deberia encontrar path");
  assert.ok(r.includes("mi-carpeta"), "deberia incluir mi-carpeta");
});

test("extractDiskPath - UNIX path valido", () => {
  const r = extractDiskPath("abre /home/user/proyecto");
  assert.strictEqual(r, "/home/user/proyecto");
});

test("extractDiskPath - sin path devuelve null", () => {
  assert.strictEqual(extractDiskPath("hola mundo"), null);
});

test("extractDiskPath - ignorar palabras genericas", () => {
  const r = extractDiskPath("abre el proyecto este");
  assert.strictEqual(r, null, "'este' deberia ser ignorado");
});

test("extractDiskPath - texto vacio devuelve null", () => {
  assert.strictEqual(extractDiskPath(""), null);
  assert.strictEqual(extractDiskPath(null), null);
});

//  sanitizeApiErrorMessage 
test("sanitizeApiErrorMessage - HTTP 401", () => {
  const r = sanitizeApiErrorMessage("Unauthorized 401", "gpt-4");
  assert.ok(r.includes("401"), "deberia mencionar 401");
  assert.ok(r.includes("gpt-4"), "deberia mencionar el modelo");
});

test("sanitizeApiErrorMessage - HTTP 402", () => {
  const r = sanitizeApiErrorMessage("Payment Required 402", "claude-3");
  assert.ok(r.includes("402"));
});

test("sanitizeApiErrorMessage - HTTP 429", () => {
  const r = sanitizeApiErrorMessage("Rate limit 429", "deepseek");
  assert.ok(r.includes("429"));
});

test("sanitizeApiErrorMessage - error de red", () => {
  const r = sanitizeApiErrorMessage("Failed to fetch", "gpt-4");
  assert.ok(r.toLowerCase().includes("red") || r.toLowerCase().includes("conexion"));
});

test("sanitizeApiErrorMessage - error generico", () => {
  const r = sanitizeApiErrorMessage("algo raro paso", "modelo-x");
  assert.ok(r.includes("modelo-x"), "deberia incluir el modelo");
});

test("sanitizeApiErrorMessage - error nulo", () => {
  const r = sanitizeApiErrorMessage(null);
  assert.ok(typeof r === "string" && r.length > 0);
});