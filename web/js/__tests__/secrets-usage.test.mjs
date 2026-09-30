// Ninguna clave de SECRET_KEYS debe leerse/escribirse con localStorage fuera de secrets.js:
// en escritorio initSecrets() las mueve al store de Tauri y las borra de localStorage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SECRET_KEYS } from "../secrets.js";

const JS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

test("ninguna clave secreta se usa con localStorage fuera de secrets.js", () => {
  const offenders = [];
  const files = readdirSync(JS_DIR).filter((f) => f.endsWith(".js") && f !== "secrets.js");
  for (const file of files) {
    const src = readFileSync(join(JS_DIR, file), "utf8");
    // Constantes locales que apuntan a una clave secreta, ej. const SEARCH_KEY = "gafcoreai_brave_key";
    const aliases = [];
    for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']([^"']+)["']/g)) {
      if (SECRET_KEYS.includes(m[2])) aliases.push(m[1]);
    }
    const keyAlt = SECRET_KEYS.map((k) => `["']${k}["']`).concat(aliases.map((a) => `\\b${a}\\b`)).join("|");
    const re = new RegExp(`localStorage\\.(?:getItem|setItem|removeItem)\\(\\s*(?:${keyAlt})\\s*[,)]`, "g");
    src.split(/\r?\n/).forEach((line, i) => {
      if (re.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      re.lastIndex = 0;
    });
  }
  assert.deepEqual(offenders, [], "Usar getSecret/setSecret/removeSecret:\n" + offenders.join("\n"));
});
