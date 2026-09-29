import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
const p = "web/js/app.js";
copyFileSync(p, p + ".bak-fix");
let s = readFileSync(p, "utf-8");
const variants = [
  '    if (input) input.value = "";\r\n    if (typeof hideSlashMenu === "function") hideSlashMenu();\r\n    switchMainTab("studio");\r\n    return;\r\n  }\r\n',
  '    if (input) input.value = "";\n    if (typeof hideSlashMenu === "function") hideSlashMenu();\n    switchMainTab("studio");\n    return;\n  }\n',
];
let done = false;
for (const bad of variants) {
  if (s.includes(bad)) {
    s = s.replace(bad, "");
    done = true;
    break;
  }
}
if (done) {
  writeFileSync(p, s, "utf-8");
  console.log("OK - bloque huerfano eliminado");
} else {
  console.log("NO ENCONTRADO - el patron es distinto. Revisa manualmente.");
}