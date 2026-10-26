const TIPOS_POR_DEFECTO = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES_POR_DEFECTO = 5 * 1024 * 1024;

export const parseDataUrl = (
  dataUrl: unknown,
  opts: { allowed?: string[]; maxBytes?: number } = {}
): { mime: string; buffer: Buffer } => {
  const allowed = opts.allowed ?? TIPOS_POR_DEFECTO;
  const maxBytes = opts.maxBytes ?? MAX_BYTES_POR_DEFECTO;

  if (typeof dataUrl !== "string") throw new Error("Falta un archivo en formato Base64");

  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("El archivo debe enviarse como data URL Base64");

  const mime = m[1]!;
  if (!allowed.includes(mime)) {
    throw new Error(`Tipo de archivo no permitido (${mime}). Permitidos: ${allowed.join(", ")}`);
  }

  const buffer = Buffer.from(m[2]!, "base64");
  if (buffer.length === 0) throw new Error("El archivo está vacío");
  if (buffer.length > maxBytes) {
    throw new Error(`El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024 * 10) / 10} MB`);
  }

  return { mime, buffer };
};