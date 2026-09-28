// Tests para ZipWriter nativo
import { test } from "node:test";
import assert from "node:assert";
import { ZipWriter } from "../zip-writer.js";

test("ZipWriter - crear instancia", () => {
  const z = new ZipWriter();
  assert.ok(z instanceof ZipWriter);
});

test("ZipWriter - addFile acumula archivos", () => {
  const z = new ZipWriter();
  z.addFile("a.txt", "hola");
  z.addFile("b.txt", "mundo");
  assert.strictEqual(z.files.length, 2);
});

test("ZipWriter - addFile limpia rutas", () => {
  const z = new ZipWriter();
  z.addFile("/sub\\archivo.txt", "x");
  assert.strictEqual(z.files[0].path, "sub/archivo.txt");
});

test("ZipWriter - generate devuelve Blob", async () => {
  const z = new ZipWriter();
  z.addFile("test.txt", "contenido");
  const blob = await z.generate();
  assert.ok(blob instanceof Blob);
  assert.ok(blob.size > 0);
});

test("ZipWriter - blob tiene firma ZIP (PK)", async () => {
  const z = new ZipWriter();
  z.addFile("test.txt", "contenido");
  const blob = await z.generate();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Primera firma: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  assert.strictEqual(bytes[0], 0x50, "byte 0 = P");
  assert.strictEqual(bytes[1], 0x4B, "byte 1 = K");
  assert.strictEqual(bytes[2], 0x03, "byte 2 = 0x03");
  assert.strictEqual(bytes[3], 0x04, "byte 3 = 0x04");
});

test("ZipWriter - zip vacio es valido", async () => {
  const z = new ZipWriter();
  const blob = await z.generate();
  assert.ok(blob.size > 0, "un zip vacio tiene header");
});

test("ZipWriter - CRC32 es consistente", () => {
  const z = new ZipWriter();
  const a = z._crc32(new TextEncoder().encode("test"));
  const b = z._crc32(new TextEncoder().encode("test"));
  assert.strictEqual(a, b, "mismo input = mismo CRC");
});