/**
 * Utilidades y validaciones compartidas para los formularios de verificación
 * de Arrendatario (Renter) y Propietario (Owner).
 *
 * Mantener estas funciones aquí permite:
 * 1. Evitar código repetido entre VerificarRenter.tsx y VerificarOwner.tsx.
 * 2. Probar cada regla de validación de forma aislada con tests unitarios.
 * 3. Mantener los componentes de React más limpios y fáciles de leer.
 */

// ============================================================================
// 1. CONSTANTES DE CONFIGURACIÓN
// ============================================================================

export const MAX_TAMANO_ARCHIVO_MB = 5;
export const MAX_TAMANO_ARCHIVO_BYTES = MAX_TAMANO_ARCHIVO_MB * 1024 * 1024;

export const TIPOS_IMAGEN_PERMITIDOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const TIPOS_DOCUMENTO_PERMITIDOS = [
  ...TIPOS_IMAGEN_PERMITIDOS,
  "application/pdf",
];

export const CATEGORIAS_LICENCIA_VALIDAS = ["A1", "A2"] as const;

// ============================================================================
// 2. TIPOS DE DATOS (Interfaces claras para TypeScript)
// ============================================================================

/** Representa un archivo cargado en el formulario junto con su URL de vista previa. */
export interface ArchivoCargado {
  file: File;
  previewUrl: string;
  esPdf: boolean;
}

/** Datos básicos necesarios para validar un archivo sin depender del DOM del navegador. */
export interface ArchivoParaValidar {
  name: string;
  type: string;
  size: number;
}

/** Campos del paso de Identificación personal (compartido por Renter y Owner). */
export interface DatosIdentidad {
  cedulaNumero: string;
  cedulaFront: ArchivoCargado | null;
  cedulaBack: ArchivoCargado | null;
  photo: ArchivoCargado | null;
}

/** Campos del paso de Licencia de conducción (solo Renter). */
export interface DatosLicencia {
  licenseNumber: string;
  licenseCategory: string;
  licenseFront: ArchivoCargado | null;
  licenseBack: ArchivoCargado | null;
}

/** Campos del paso de Comprobante de domicilio (compartido por Renter y Owner). */
export interface DatosDomicilio {
  bill: ArchivoCargado | null;
}

/** Mapa de errores por nombre de campo. Ejemplo: { cedulaNumero: "Mensaje de error" } */
export type ErroresFormulario = Record<string, string>;

// ============================================================================
// 3. FUNCIONES AUXILIARES PARA ARCHIVOS
// ============================================================================

/**
 * Convierte un tamaño en bytes a un texto legible para el usuario (KB o MB).
 */
export function formatearTamanoArchivo(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(1)} MB`;
}

/**
 * Valida que un archivo tenga un formato permitido y no supere el peso máximo.
 * Retorna un mensaje de error si es inválido, o null si todo está bien.
 */
export function validarArchivo(
  archivo: ArchivoParaValidar,
  permitirPdf = false
): string | null {
  const tiposPermitidos = permitirPdf
    ? TIPOS_DOCUMENTO_PERMITIDOS
    : TIPOS_IMAGEN_PERMITIDOS;

  if (!tiposPermitidos.includes(archivo.type)) {
    return permitirPdf
      ? "Formato no permitido. Usa PNG, JPG, WEBP o PDF."
      : "Formato no permitido. Usa únicamente imágenes PNG, JPG o WEBP.";
  }

  if (archivo.size <= 0) {
    return "El archivo seleccionado parece estar vacío.";
  }

  if (archivo.size > MAX_TAMANO_ARCHIVO_BYTES) {
    return `El archivo supera el límite máximo de ${MAX_TAMANO_ARCHIVO_MB} MB.`;
  }

  return null;
}

/**
 * Crea el objeto ArchivoCargado con su vista previa local en memoria.
 * Nota: Cuando el archivo se reemplace o elimine, se debe liberar previewUrl
 * con URL.revokeObjectURL para no consumir memoria del navegador.
 */
export function crearArchivoCargado(file: File): ArchivoCargado {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    esPdf: file.type === "application/pdf",
  };
}

// ============================================================================
// 4. FUNCIONES DE VALIDACIÓN DE CAMPOS DE TEXTO
// ============================================================================

/**
 * Valida el número de cédula colombiana (solo dígitos, entre 6 y 12 caracteres).
 */
export function validarNumeroCedula(cedula: string): string | null {
  const valorLimpio = cedula.trim();

  if (!valorLimpio) {
    return "El número de cédula es obligatorio.";
  }

  if (!/^\d+$/.test(valorLimpio)) {
    return "La cédula solo debe contener números, sin puntos ni espacios.";
  }

  if (valorLimpio.length < 6 || valorLimpio.length > 12) {
    return "El número de cédula debe tener entre 6 y 12 dígitos.";
  }

  return null;
}

/**
 * Valida el número de licencia de conducción (entre 6 y 15 caracteres alfanuméricos).
 */
export function validarNumeroLicencia(licencia: string): string | null {
  const valorLimpio = licencia.trim();

  if (!valorLimpio) {
    return "El número de licencia es obligatorio.";
  }

  if (!/^[A-Za-z0-9-]+$/.test(valorLimpio)) {
    return "La licencia solo puede contener letras, números o guiones.";
  }

  if (valorLimpio.length < 6 || valorLimpio.length > 15) {
    return "El número de licencia debe tener entre 6 y 15 caracteres.";
  }

  return null;
}

// ============================================================================
// 5. VALIDACIONES POR PASO DEL WIZARD
// ============================================================================

/**
 * Valida el Paso 1 (Identidad) usado tanto en VerificarRenter como en VerificarOwner.
 */
export function validarPasoIdentidad(datos: DatosIdentidad): ErroresFormulario {
  const errores: ErroresFormulario = {};

  const errorCedula = validarNumeroCedula(datos.cedulaNumero);
  if (errorCedula) {
    errores.cedulaNumero = errorCedula;
  }

  if (!datos.cedulaFront) {
    errores.cedulaFront = "Debes subir la fotografía frontal de tu cédula.";
  }

  if (!datos.cedulaBack) {
    errores.cedulaBack = "Debes subir la fotografía posterior de tu cédula.";
  }

  if (!datos.photo) {
    errores.photo = "Debes subir una fotografía reciente de tu rostro.";
  }

  return errores;
}

/**
 * Valida el Paso 2 (Licencia de conducción) usado en VerificarRenter.
 */
export function validarPasoLicencia(datos: DatosLicencia): ErroresFormulario {
  const errores: ErroresFormulario = {};

  const errorLicencia = validarNumeroLicencia(datos.licenseNumber);
  if (errorLicencia) {
    errores.licenseNumber = errorLicencia;
  }

  const esCategoriaValida = CATEGORIAS_LICENCIA_VALIDAS.includes(
    datos.licenseCategory as (typeof CATEGORIAS_LICENCIA_VALIDAS)[number]
  );

  if (!datos.licenseCategory || !esCategoriaValida) {
    errores.licenseCategory = "Selecciona una categoría válida para moto (A1 o A2).";
  }

  if (!datos.licenseFront) {
    errores.licenseFront = "Debes subir la fotografía frontal de tu licencia.";
  }

  if (!datos.licenseBack) {
    errores.licenseBack = "Debes subir la fotografía posterior de tu licencia.";
  }

  return errores;
}

/**
 * Valida el paso final (Comprobante de domicilio) usado en Renter y Owner.
 */
export function validarPasoDomicilio(datos: DatosDomicilio): ErroresFormulario {
  const errores: ErroresFormulario = {};

  if (!datos.bill) {
    errores.bill = "Debes adjuntar un comprobante de domicilio (imagen o PDF).";
  }

  return errores;
}

// ============================================================================
// 6. CONSTRUCCIÓN DE FORMDATA (Contrato alineado con schema.prisma)
// ============================================================================

/**
 * Empaqueta los datos y archivos del Arrendatario en un objeto FormData
 * usando los mismos nombres de campo definidos en el modelo Renter de Prisma.
 */
export function construirFormDataRenter(
  identidad: DatosIdentidad,
  licencia: DatosLicencia,
  domicilio: DatosDomicilio
): FormData {
  const formData = new FormData();

  formData.append("cedulaNumero", identidad.cedulaNumero.trim());
  if (identidad.cedulaFront) formData.append("cedulaFront", identidad.cedulaFront.file);
  if (identidad.cedulaBack) formData.append("cedulaBack", identidad.cedulaBack.file);
  if (identidad.photo) formData.append("photo", identidad.photo.file);

  formData.append("licenseNumber", licencia.licenseNumber.trim());
  formData.append("licenseCategory", licencia.licenseCategory);
  if (licencia.licenseFront) formData.append("licenseFront", licencia.licenseFront.file);
  if (licencia.licenseBack) formData.append("licenseBack", licencia.licenseBack.file);

  if (domicilio.bill) formData.append("bill", domicilio.bill.file);

  return formData;
}

/**
 * Empaqueta los datos y archivos del Propietario en un objeto FormData
 * usando los mismos nombres de campo definidos en el modelo Owner de Prisma.
 */
export function construirFormDataOwner(
  identidad: DatosIdentidad,
  domicilio: DatosDomicilio
): FormData {
  const formData = new FormData();

  formData.append("cedulaNumero", identidad.cedulaNumero.trim());
  if (identidad.cedulaFront) formData.append("cedulaFront", identidad.cedulaFront.file);
  if (identidad.cedulaBack) formData.append("cedulaBack", identidad.cedulaBack.file);
  if (identidad.photo) formData.append("photo", identidad.photo.file);

  if (domicilio.bill) formData.append("bill", domicilio.bill.file);

  return formData;
}
