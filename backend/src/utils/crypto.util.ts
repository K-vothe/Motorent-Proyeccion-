import crypto from "node:crypto";
import zlib from "node:zlib";

const getKey = (): Buffer => {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("DATA_ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (32 bytes)");
  }
  return Buffer.from(hex, "hex");
};

// Formato guardado: [1 byte flag compresión][12 iv][16 auth tag][datos cifrados]
export const encryptBuffer = (plain: Buffer): Buffer => {
  const gz = zlib.gzipSync(plain);
  const compressed = gz.length < plain.length; // solo comprime si realmente ayuda
  const payload = compressed ? gz : plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([Buffer.from([compressed ? 1 : 0]), iv, tag, enc]);
};

export const decryptBuffer = (blob: Uint8Array): Buffer => {
  const buf = Buffer.from(blob);
  const compressed = buf[0] === 1;
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(13, 29);
  const enc = buf.subarray(29);

  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);

  return compressed ? zlib.gunzipSync(plain) : plain;
};

// Un archivo = mime + bytes, cifrados juntos en una sola columna
export const encryptFile = (file: { mime: string; buffer: Buffer }): Buffer => {
  const mime = Buffer.from(file.mime, "utf8");
  return encryptBuffer(Buffer.concat([Buffer.from([mime.length]), mime, file.buffer]));
};

export const decryptFile = (blob: Uint8Array): { mime: string; buffer: Buffer } => {
  const plain = decryptBuffer(blob);
  const mimeLen = plain[0]!;
  return {
    mime: plain.subarray(1, 1 + mimeLen).toString("utf8"),
    buffer: plain.subarray(1 + mimeLen),
  };
};

// Para textos sensibles (ej. Owner.accountNumber): se guarda en una columna String
export const encryptText = (text: string): string =>
  encryptBuffer(Buffer.from(text, "utf8")).toString("base64");

export const decryptText = (b64: string): string =>
  decryptBuffer(Buffer.from(b64, "base64")).toString("utf8");

export const sha256 = (data: string | Buffer): string =>
  crypto.createHash("sha256").update(data).digest("hex");