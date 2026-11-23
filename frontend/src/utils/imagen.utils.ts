/**
 * Comprime una imagen en el navegador antes de enviarla al servidor.
 *
 * Las fotos de celular suelen pesar 3-8 MB. Reducirlas a un lado máximo de
 * 1600 px en JPEG (calidad 0.82) las deja en ~200-500 KB sin pérdida visible,
 * lo que acelera la subida y respeta el límite de 5 MB por foto del backend.
 */
export async function comprimirImagen(
  file: File,
  ladoMaximo = 1600,
  calidad = 0.82
): Promise<string> {
  const bitmap = await createImageBitmap(file);

  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const contexto = canvas.getContext("2d");
  if (!contexto) {
    bitmap.close();
    throw new Error("El navegador no permite procesar imágenes.");
  }

  contexto.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", calidad);
}
