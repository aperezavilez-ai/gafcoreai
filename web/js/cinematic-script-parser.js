// web/js/cinematic-script-parser.js
// v59.3 — Fase 2. Carga .docx (mammoth) / .txt / .fdx (Final Draft XML).
// Devuelve { text, source, warnings[] }.

const MAX_CHARS = 400_000; // ~70k palabras — evita reventar el LLM

export async function parseScriptFile(file) {
  if (!file) throw new Error("No se recibió archivo");
  const name = (file.name || "").toLowerCase();
  const warnings = [];

  let text = "";
  let source = "unknown";

  if (name.endsWith(".docx")) {
    text = await _parseDocx(file);
    source = "docx";
  } else if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".fountain")) {
    text = await file.text();
    source = "txt";
  } else if (name.endsWith(".fdx")) {
    text = await _parseFdx(file);
    source = "fdx";
  } else {
    throw new Error("Formato no soportado. Usa .docx, .txt, .fountain o .fdx");
  }

  text = _normalize(text);

  if (text.length > MAX_CHARS) {
    warnings.push(`Guion muy largo (${text.length} chars). Se recortó a ${MAX_CHARS}. Considera dividirlo por actos.`);
    text = text.slice(0, MAX_CHARS);
  }

  if (text.length < 50) {
    warnings.push("El guion resultante es muy corto (<50 chars). Verifica el archivo.");
  }

  return { text, source, warnings, originalName: file.name, chars: text.length };
}

async function _parseDocx(file) {
  const buf = await file.arrayBuffer();
  const mammoth = window.mammoth;
  if (!mammoth || typeof mammoth.extractRawText !== "function") {
    throw new Error(
      "mammoth no está cargado. Debe estar vendorizado en web/vendor/mammoth.browser.min.js " +
      "y accesible como window.mammoth."
    );
  }
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value || "";
}

async function _parseFdx(file) {
  const xml = await file.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("FDX inválido: " + err.textContent);

  const paragraphs = Array.from(doc.querySelectorAll("Paragraph"));
  const lines = [];

  for (const p of paragraphs) {
    const type = (p.getAttribute("Type") || "").trim();
    const texts = Array.from(p.querySelectorAll("Text"))
      .map(t => t.textContent.trim())
      .filter(Boolean);
    const joined = texts.join(" ");

    if (!joined) continue;

    switch (type) {
      case "Scene Heading":
        lines.push("");
        lines.push(joined.toUpperCase());
        break;
      case "Character":
        lines.push("");
        lines.push(joined.toUpperCase());
        break;
      case "Parenthetical":
        lines.push(`(${joined})`);
        break;
      case "Dialogue":
        lines.push(joined);
        break;
      case "Transition":
        lines.push("");
        lines.push(joined.toUpperCase());
        break;
      default:
        lines.push(joined);
    }
  }

  return lines.join("\n");
}

function _normalize(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}