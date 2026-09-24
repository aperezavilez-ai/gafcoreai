// ============================================================
//  GafCoreAI - File Handlers
//  Lee y crea: PDF, Word (docx), Excel (xlsx)
//  Requiere: pdf.js, mammoth.js, xlsx (SheetJS), jspdf, docx
// ============================================================

// ────────────────────────────────────────────────────────────
//  PDF (lectura)
// ────────────────────────────────────────────────────────────
export async function readPDF(file) {
  try {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("pdf.js no esta cargado");
    }
    // Configurar worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const totalPages = pdf.numPages;

    let texto = "";
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = content.items.map(it => it.str).join(" ");
      texto += "\n\n--- Pagina " + i + " ---\n" + items;
    }

    return {
      ok: true,
      text: texto.trim(),
      pages: totalPages,
      meta: {
        pages: totalPages,
        info: pdf._pdfInfo || null
      }
    };
  } catch (e) {
    return { ok: false, error: "Error leyendo PDF: " + e.message };
  }
}

// ────────────────────────────────────────────────────────────
//  WORD (lectura .docx)
// ────────────────────────────────────────────────────────────
export async function readDOCX(file) {
  try {
    if (typeof mammoth === "undefined") {
      throw new Error("mammoth.js no esta cargado");
    }
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return {
      ok: true,
      text: result.value.trim(),
      meta: {
        messages: result.messages || []
      }
    };
  } catch (e) {
    return { ok: false, error: "Error leyendo DOCX: " + e.message };
  }
}

// ────────────────────────────────────────────────────────────
//  EXCEL (lectura .xlsx / .xls / .csv)
// ────────────────────────────────────────────────────────────
export async function readXLSX(file) {
  try {
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS no esta cargado");
    }
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    let texto = "";
    const sheets = [];
    wb.SheetNames.forEach(name => {
      const sheet = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      sheets.push({ name, rows: csv.split("\n").length, csv });
      texto += "\n\n=== Hoja: " + name + " ===\n" + csv;
    });

    return {
      ok: true,
      text: texto.trim(),
      sheets: sheets.length,
      meta: { sheetNames: wb.SheetNames, sheets }
    };
  } catch (e) {
    return { ok: false, error: "Error leyendo XLSX: " + e.message };
  }
}

// ────────────────────────────────────────────────────────────
//  CREAR PDF
// ────────────────────────────────────────────────────────────
export function createPDF(text, options) {
  try {
    const opts = options || {};
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) throw new Error("jsPDF no esta cargado");

    const doc = new jsPDF({
      orientation: opts.orientation || "portrait",
      unit: "mm",
      format: opts.format || "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 6;
    let y = margin;

    doc.setFontSize(11);

    const lines = String(text).split("\n");
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line || " ", maxWidth);
      for (const w of wrapped) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(w, margin, y);
        y += lineHeight;
      }
    }

    const blob = doc.output("blob");
    return { ok: true, blob, filename: opts.filename || "documento.pdf" };
  } catch (e) {
    return { ok: false, error: "Error creando PDF: " + e.message };
  }
}

// ────────────────────────────────────────────────────────────
//  CREAR WORD (.docx)
// ────────────────────────────────────────────────────────────
export async function createDOCX(text, options) {
  try {
    const opts = options || {};
    const docxLib = window.docx;
    if (!docxLib) throw new Error("docx.js no esta cargado");

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docxLib;
    const paragraphs = [];

    const lines = String(text).split("\n");
    for (const line of lines) {
      // Detectar titulos con #
      const h1 = line.match(/^#\s+(.+)$/);
      const h2 = line.match(/^##\s+(.+)$/);
      const h3 = line.match(/^###\s+(.+)$/);

      if (h1) {
        paragraphs.push(new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 }));
      } else if (h2) {
        paragraphs.push(new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 }));
      } else if (h3) {
        paragraphs.push(new Paragraph({ text: h3[1], heading: HeadingLevel.HEADING_3 }));
      } else if (line.trim() === "") {
        paragraphs.push(new Paragraph({ text: "" }));
      } else {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line })]
        }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    const blob = await Packer.toBlob(doc);
    return { ok: true, blob, filename: opts.filename || "documento.docx" };
  } catch (e) {
    return { ok: false, error: "Error creando DOCX: " + e.message };
  }
}

// ────────────────────────────────────────────────────────────
//  CREAR EXCEL (.xlsx)
// ────────────────────────────────────────────────────────────
export function createXLSX(data, options) {
  try {
    const opts = options || {};
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS no esta cargado");
    }

    const wb = XLSX.utils.book_new();

    // data puede ser:
    //   - array de arrays: [["A","B"], [1,2]]
    //   - array de objetos: [{col1: "a", col2: "b"}, ...]
    //   - {sheetName: [data], sheetName2: [data]}

    if (Array.isArray(data) && data.length > 0 && !Array.isArray(data[0]) && typeof data[0] === "object") {
      // Array de objetos -> una sola hoja
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, opts.sheetName || "Hoja1");
    } else if (Array.isArray(data) && Array.isArray(data[0])) {
      // Array de arrays -> una sola hoja
      const sheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, opts.sheetName || "Hoja1");
    } else if (typeof data === "object") {
      // Multiples hojas
      Object.keys(data).forEach(name => {
        const sheetData = data[name];
        const sheet = Array.isArray(sheetData[0])
          ? XLSX.utils.aoa_to_sheet(sheetData)
          : XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, sheet, name);
      });
    } else {
      throw new Error("Formato de datos no reconocido");
    }

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    return { ok: true, blob, filename: opts.filename || "datos.xlsx" };
  } catch (e) {
    return { ok: false, error: "Error creando XLSX: " + e.message };
  }
}

// ────────────────────────────────────────────────────────────
//  DETECTOR de tipo de archivo
// ────────────────────────────────────────────────────────────
export function getFileType(file) {
  const name = (file.name || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();

  if (name.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (name.endsWith(".docx") || mime.includes("wordprocessingml")) return "docx";
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv") ||
      mime.includes("spreadsheet") || mime === "text/csv") return "xlsx";
  if (mime.startsWith("image/")) return "image";
  return "text";
}

// ────────────────────────────────────────────────────────────
//  LECTOR UNIVERSAL
//  Detecta el tipo y llama al handler correcto
// ────────────────────────────────────────────────────────────
export async function readAnyFile(file) {
  const type = getFileType(file);

  if (type === "pdf") return await readPDF(file);
  if (type === "docx") return await readDOCX(file);
  if (type === "xlsx") return await readXLSX(file);

  // Texto plano
  const text = await file.text();
  return { ok: true, text };
}

// ────────────────────────────────────────────────────────────
//  DESCARGA un blob
// ────────────────────────────────────────────────────────────
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}