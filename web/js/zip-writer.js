// ============================================================
//  GafCoreAI - ZipWriter nativo (sin JSZip, sin dependencias)
//  Genera archivos ZIP con metodo "stored" (sin compresion)
//  Compatible con cualquier navegador moderno. Cero conflictos AMD.
// ============================================================

export class ZipWriter {
  constructor() {
    this.files = [];
    this._crcTable = null;
  }

  addFile(path, content) {
    const cleanPath = String(path).replace(/\\/g, "/").replace(/^\/+/, "");
    const data = new TextEncoder().encode(content || "");
    this.files.push({ path: cleanPath, data });
  }

  _crc32(buf) {
    if (!this._crcTable) {
      this._crcTable = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        this._crcTable[i] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = this._crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  _dosDateTime(d = new Date()) {
    const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
    const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    return { time, date };
  }

  async generate() {
    const chunks = [];
    const centralDir = [];
    let offset = 0;
    const { time, date } = this._dosDateTime();

    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.path);
      const crc = this._crc32(file.data);
      const size = file.data.length;

      const localHeader = new ArrayBuffer(30);
      const lh = new DataView(localHeader);
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true);
      lh.setUint16(12, date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, size, true);
      lh.setUint32(22, size, true);
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);

      chunks.push(new Uint8Array(localHeader));
      chunks.push(nameBytes);
      chunks.push(file.data);

      centralDir.push({ nameBytes, crc, size, offset, time, date });
      offset += 30 + nameBytes.length + size;
    }

    const centralDirStart = offset;
    for (const e of centralDir) {
      const cd = new ArrayBuffer(46);
      const v = new DataView(cd);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 20, true);
      v.setUint16(8, 0, true);
      v.setUint16(10, 0, true);
      v.setUint16(12, e.time, true);
      v.setUint16(14, e.date, true);
      v.setUint32(16, e.crc, true);
      v.setUint32(20, e.size, true);
      v.setUint32(24, e.size, true);
      v.setUint16(28, e.nameBytes.length, true);
      v.setUint16(30, 0, true);
      v.setUint16(32, 0, true);
      v.setUint16(34, 0, true);
      v.setUint16(36, 0, true);
      v.setUint32(38, 0, true);
      v.setUint32(42, e.offset, true);

      chunks.push(new Uint8Array(cd));
      chunks.push(e.nameBytes);
      offset += 46 + e.nameBytes.length;
    }

    const centralDirSize = offset - centralDirStart;
    const end = new ArrayBuffer(22);
    const ev = new DataView(end);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, this.files.length, true);
    ev.setUint16(10, this.files.length, true);
    ev.setUint32(12, centralDirSize, true);
    ev.setUint32(16, centralDirStart, true);
    ev.setUint16(20, 0, true);

    chunks.push(new Uint8Array(end));
    return new Blob(chunks, { type: "application/zip" });
  }

  async download(filename = "proyecto.zip") {
    const blob = await this.generate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}