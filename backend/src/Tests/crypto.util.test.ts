import test from "node:test";
import assert from "node:assert/strict";

process.env.DATA_ENCRYPTION_KEY = "a".repeat(64);
const { encryptFile, decryptFile, encryptText, decryptText } = await import("../utils/crypto.util.js");

test("encryptFile/decryptFile devuelve el mismo archivo y mime", () => {
  const original = { mime: "image/png", buffer: Buffer.from("contenido-de-prueba".repeat(50)) };
  const blob = encryptFile(original);

  assert.notDeepEqual(blob.subarray(29), original.buffer, "el blob no debe contener el texto plano");
  const resultado = decryptFile(blob);
  assert.strictEqual(resultado.mime, "image/png");
  assert.deepEqual(resultado.buffer, original.buffer);
});

test("cada cifrado usa un IV distinto", () => {
  const f = { mime: "image/jpeg", buffer: Buffer.from("igual") };
  assert.notDeepEqual(encryptFile(f), encryptFile(f));
});

test("un blob alterado falla la autenticación GCM", () => {
  const blob = encryptFile({ mime: "image/png", buffer: Buffer.from("secreto") });
  blob[blob.length - 1] = blob[blob.length - 1]! ^ 0xff;
  assert.throws(() => decryptFile(blob));
});

test("encryptText/decryptText hace ida y vuelta", () => {
  assert.strictEqual(decryptText(encryptText("1234567890")), "1234567890");
});