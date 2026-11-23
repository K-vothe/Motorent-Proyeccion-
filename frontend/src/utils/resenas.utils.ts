/**
 * Utilidades puras para el sistema de Reseñas Bidireccionales y Perfil Público (Fase 6).
 *
 * Mantener estas reglas como funciones puras facilita estudiarlas, explicarlas
 * y comprobarlas con pruebas unitarias sin depender del navegador.
 */

export const MINUTOS_DOBLE_CIEGO = 30;
export const MIN_COMENTARIO_BAJA_NOTA = 10;
export const MAX_COMENTARIO_RESENA = 600;

/**
 * Valida una calificación antes de enviarla al backend.
 * - Estrellas obligatorias: entero entre 1 y 5.
 * - Comentario: obligatorio (mín. 10 caracteres) si la nota es 3 o menos;
 *   opcional si la nota es 4 o 5 para reducir fricción.
 */
export function validarFormularioResena(
  rating: number,
  comment: string
): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Selecciona una calificación entre 1 y 5 estrellas.";
  }

  const limpio = comment.trim();
  if (limpio.length > MAX_COMENTARIO_RESENA) {
    return `El comentario no puede superar los ${MAX_COMENTARIO_RESENA} caracteres.`;
  }

  if (rating <= 3 && limpio.length < MIN_COMENTARIO_BAJA_NOTA) {
    return `Si calificas con ${rating} estrellas o menos, cuéntanos brevemente el motivo (mínimo ${MIN_COMENTARIO_BAJA_NOTA} caracteres).`;
  }

  return null;
}

/** Etiqueta clara y sobria para cada puntuación de 1 a 5. */
export function etiquetaCalificacion(rating: number): string {
  if (rating === 5) return "Excelente";
  if (rating === 4) return "Muy buena";
  if (rating === 3) return "Aceptable";
  if (rating === 2) return "Mejorable";
  if (rating === 1) return "Deficiente";
  return "Sin calificar";
}

/**
 * Aplica la preferencia de privacidad del usuario para nombres públicos:
 * - "inicial": "Carlos Martínez" -> "Carlos M."
 * - "completo": "Carlos Martínez"
 */
export function formatearNombreSegunPreferencia(
  nombre: string,
  formato: "inicial" | "completo"
): string {
  const limpio = nombre.trim();
  if (!limpio) return "Usuario MotoRent";
  if (formato === "completo") return limpio;

  const partes = limpio.split(/\s+/);
  if (partes.length === 1) return partes[0]!;
  return `${partes[0]} ${partes[1]!.charAt(0).toUpperCase()}.`;
}
