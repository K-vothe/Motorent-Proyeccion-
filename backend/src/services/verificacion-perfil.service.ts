import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as verificacionRepo from "../repositories/verificacion-perfil.repository.js";
import type { EstadoResolucion } from "../repositories/verificacion-perfil.repository.js";
import { parseDataUrl } from "../utils/file.util.js";
import { AppError } from "../utils/handler.util.js";

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_DOCUMENTO = [...TIPOS_IMAGEN, "application/pdf"];
const MAX_BYTES_ARCHIVO = 5 * 1024 * 1024;
const CATEGORIAS_VALIDAS = ["A1", "A2"] as const;

const EXTENSIONES_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface PayloadVerificacionRenter {
  cedulaNumero?: unknown;
  cedulaFront?: unknown;
  cedulaBack?: unknown;
  photo?: unknown;
  licenseNumber?: unknown;
  licenseCategory?: unknown;
  licenseFront?: unknown;
  licenseBack?: unknown;
  bill?: unknown;
}

export interface PayloadVerificacionOwner {
  cedulaNumero?: unknown;
  cedulaFront?: unknown;
  cedulaBack?: unknown;
  photo?: unknown;
  bill?: unknown;
}

export interface PayloadResolverVerificacion {
  estado?: unknown;
  motivoRechazo?: unknown;
}

export interface DependenciasVerificacion {
  repo: typeof verificacionRepo;
  guardarArchivo: (
    tipo: "renter" | "owner",
    userId: string,
    campo: string,
    mime: string,
    buffer: Buffer
  ) => Promise<string>;
}

// ============================================================================
// VALIDACIONES DE DOMINIO Y ALMACENAMIENTO SEGURO DE ARCHIVOS
// ============================================================================

function validarCedula(valor: unknown): string {
  const limpia = typeof valor === "string" ? valor.trim() : "";
  if (!/^\d{6,12}$/.test(limpia)) {
    throw new AppError(
      "El número de cédula es obligatorio y debe tener entre 6 y 12 dígitos numéricos",
      400
    );
  }
  return limpia;
}

function validarLicencia(valor: unknown): string {
  const limpia = typeof valor === "string" ? valor.trim() : "";
  if (!/^[A-Za-z0-9-]{6,15}$/.test(limpia)) {
    throw new AppError(
      "El número de licencia es obligatorio y debe tener entre 6 y 15 caracteres alfanuméricos",
      400
    );
  }
  return limpia;
}

function validarCategoriaLicencia(valor: unknown): "A1" | "A2" {
  const limpia = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  if (!CATEGORIAS_VALIDAS.includes(limpia as "A1" | "A2")) {
    throw new AppError(
      "La categoría de licencia para motocicleta debe ser A1 o A2",
      400
    );
  }
  return limpia as "A1" | "A2";
}

function parsearArchivoCampo(
  nombreCampo: string,
  dataUrl: unknown,
  permitirPdf: boolean
): { mime: string; buffer: Buffer } {
  try {
    return parseDataUrl(dataUrl, {
      allowed: permitirPdf ? TIPOS_DOCUMENTO : TIPOS_IMAGEN,
      maxBytes: MAX_BYTES_ARCHIVO,
    });
  } catch (error) {
    const detalle =
      error instanceof Error ? error.message : "Archivo inválido";
    throw new AppError(`Error en el documento '${nombreCampo}': ${detalle}`, 400);
  }
}

/**
 * Guarda un archivo previamente validado dentro de `backend/uploads/verificaciones/`
 * y retorna la ruta relativa limpia que se almacena en PostgreSQL.
 */
export async function guardarArchivoVerificacionEnDisco(
  tipo: "renter" | "owner",
  userId: string,
  campo: string,
  mime: string,
  buffer: Buffer
): Promise<string> {
  const userIdSeguro = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const campoSeguro = campo.replace(/[^a-zA-Z0-9_-]/g, "");
  const extension = EXTENSIONES_POR_MIME[mime] ?? "bin";

  const carpetaDestino = path.resolve(
    process.cwd(),
    "uploads",
    "verificaciones",
    tipo,
    userIdSeguro
  );
  const nombreArchivo = `${campoSeguro}.${extension}`;
  const rutaCompleta = path.join(carpetaDestino, nombreArchivo);

  await mkdir(carpetaDestino, { recursive: true });
  await writeFile(rutaCompleta, buffer);

  return `/uploads/verificaciones/${tipo}/${userIdSeguro}/${nombreArchivo}`;
}

const dependenciasPorDefecto: DependenciasVerificacion = {
  repo: verificacionRepo,
  guardarArchivo: guardarArchivoVerificacionEnDisco,
};

// ============================================================================
// CASOS DE USO PRINCIPALES
// ============================================================================

/**
 * Registra o actualiza la solicitud de verificación de Arrendatario (Renter).
 * Valida todos los datos y los 6 archivos antes de escribir en disco o base de datos.
 */
export async function procesarSolicitudRenter(
  userId: string,
  payload: PayloadVerificacionRenter,
  deps: DependenciasVerificacion = dependenciasPorDefecto
) {
  const cedulaNumero = validarCedula(payload.cedulaNumero);
  const licenseNumber = validarLicencia(payload.licenseNumber);
  const licenseCategory = validarCategoriaLicencia(payload.licenseCategory);

  const perfilActual = await deps.repo.buscarRenterPorUserId(userId);
  if (perfilActual?.estadoVerificacion === "APPROVED") {
    throw new AppError(
      "Tu perfil de arrendatario ya se encuentra verificado y aprobado",
      409
    );
  }

  const cedulaDuplicada = await deps.repo.buscarRenterPorCedula(cedulaNumero);
  if (cedulaDuplicada && cedulaDuplicada.idUser !== userId) {
    throw new AppError(
      "Este número de cédula ya se encuentra registrado en otra cuenta de arrendatario",
      409
    );
  }

  const licenciaDuplicada = await deps.repo.buscarRenterPorLicencia(licenseNumber);
  if (licenciaDuplicada && licenciaDuplicada.idUser !== userId) {
    throw new AppError(
      "Este número de licencia ya se encuentra registrado en otra cuenta",
      409
    );
  }

  // Validación completa antes de persistir archivos (evita archivos huérfanos en disco)
  const cedulaFront = parsearArchivoCampo("cedulaFront", payload.cedulaFront, false);
  const cedulaBack = parsearArchivoCampo("cedulaBack", payload.cedulaBack, false);
  const photo = parsearArchivoCampo("photo", payload.photo, false);
  const licenseFront = parsearArchivoCampo("licenseFront", payload.licenseFront, false);
  const licenseBack = parsearArchivoCampo("licenseBack", payload.licenseBack, false);
  const bill = parsearArchivoCampo("bill", payload.bill, true);

  const [
    cedulaFrontUrl,
    cedulaBackUrl,
    photoUrl,
    licenseFrontUrl,
    licenseBackUrl,
    billUrl,
  ] = await Promise.all([
    deps.guardarArchivo("renter", userId, "cedulaFront", cedulaFront.mime, cedulaFront.buffer),
    deps.guardarArchivo("renter", userId, "cedulaBack", cedulaBack.mime, cedulaBack.buffer),
    deps.guardarArchivo("renter", userId, "photo", photo.mime, photo.buffer),
    deps.guardarArchivo("renter", userId, "licenseFront", licenseFront.mime, licenseFront.buffer),
    deps.guardarArchivo("renter", userId, "licenseBack", licenseBack.mime, licenseBack.buffer),
    deps.guardarArchivo("renter", userId, "bill", bill.mime, bill.buffer),
  ]);

  return await deps.repo.guardarSolicitudRenter({
    idUser: userId,
    cedulaNumero,
    cedulaFrontUrl,
    cedulaBackUrl,
    photo: photoUrl,
    licenseNumber,
    licenseFrontUrl,
    licenseBackUrl,
    licenseCategory,
    billUrl,
  });
}

/**
 * Registra o actualiza la solicitud de verificación de Propietario (Owner).
 * Valida la cédula y los 4 documentos requeridos antes de escribir en disco o BD.
 */
export async function procesarSolicitudOwner(
  userId: string,
  payload: PayloadVerificacionOwner,
  deps: DependenciasVerificacion = dependenciasPorDefecto
) {
  const cedulaNumero = validarCedula(payload.cedulaNumero);

  const perfilActual = await deps.repo.buscarOwnerPorUserId(userId);
  if (perfilActual?.estadoVerificacion === "APPROVED") {
    throw new AppError(
      "Tu perfil de propietario ya se encuentra verificado y aprobado",
      409
    );
  }

  const cedulaDuplicada = await deps.repo.buscarOwnerPorCedula(cedulaNumero);
  if (cedulaDuplicada && cedulaDuplicada.idUser !== userId) {
    throw new AppError(
      "Este número de cédula ya se encuentra registrado en otra cuenta de propietario",
      409
    );
  }

  const cedulaFront = parsearArchivoCampo("cedulaFront", payload.cedulaFront, false);
  const cedulaBack = parsearArchivoCampo("cedulaBack", payload.cedulaBack, false);
  const photo = parsearArchivoCampo("photo", payload.photo, false);
  const bill = parsearArchivoCampo("bill", payload.bill, true);

  const [cedulaFrontUrl, cedulaBackUrl, photoUrl, billUrl] = await Promise.all([
    deps.guardarArchivo("owner", userId, "cedulaFront", cedulaFront.mime, cedulaFront.buffer),
    deps.guardarArchivo("owner", userId, "cedulaBack", cedulaBack.mime, cedulaBack.buffer),
    deps.guardarArchivo("owner", userId, "photo", photo.mime, photo.buffer),
    deps.guardarArchivo("owner", userId, "bill", bill.mime, bill.buffer),
  ]);

  return await deps.repo.guardarSolicitudOwner({
    idUser: userId,
    cedulaNumero,
    cedulaFrontUrl,
    cedulaBackUrl,
    photo: photoUrl,
    billUrl,
  });
}

/**
 * Obtiene las colas de solicitudes pendientes y los contadores para el panel ADMIN.
 */
export async function obtenerVerificacionesPendientes(
  deps: DependenciasVerificacion = dependenciasPorDefecto
) {
  return await deps.repo.listarVerificacionesPendientes();
}

/**
 * Permite a un administrador aprobar o rechazar una solicitud de Renter u Owner.
 */
export async function resolverVerificacionPerfil(
  tipo: string,
  solicitudId: string,
  payload: PayloadResolverVerificacion,
  deps: DependenciasVerificacion = dependenciasPorDefecto
) {
  const tipoNormalizado = tipo.trim().toLowerCase();
  if (tipoNormalizado !== "renter" && tipoNormalizado !== "owner") {
    throw new AppError(
      "Tipo de verificación inválido. Debe ser 'renter' o 'owner'",
      400
    );
  }

  const estado =
    typeof payload.estado === "string"
      ? payload.estado.trim().toUpperCase()
      : "";

  if (estado !== "APPROVED" && estado !== "REJECTED") {
    throw new AppError(
      "Estado de resolución inválido. Usa 'APPROVED' o 'REJECTED'",
      400
    );
  }

  let motivoLimpio: string | null = null;
  if (estado === "REJECTED") {
    const texto =
      typeof payload.motivoRechazo === "string"
        ? payload.motivoRechazo.trim()
        : "";
    if (texto.length < 5) {
      throw new AppError(
        "Cuando rechazas una solicitud debes indicar un motivo claro (mínimo 5 caracteres)",
        400
      );
    }
    motivoLimpio = texto;
  }

  if (!solicitudId || !solicitudId.trim()) {
    throw new AppError("Debes indicar el identificador de la solicitud", 400);
  }

  const estadoFinal = estado as EstadoResolucion;

  if (tipoNormalizado === "renter") {
    const existente = await deps.repo.buscarRenterPorId(solicitudId);
    if (!existente) {
      throw new AppError(
        "No se encontró la solicitud de arrendatario indicada",
        404
      );
    }
    return await deps.repo.actualizarEstadoRenter(
      solicitudId,
      estadoFinal,
      motivoLimpio
    );
  }

  const existente = await deps.repo.buscarOwnerPorId(solicitudId);
  if (!existente) {
    throw new AppError(
      "No se encontró la solicitud de propietario indicada",
      404
    );
  }
  return await deps.repo.actualizarEstadoOwner(
    solicitudId,
    estadoFinal,
    motivoLimpio
  );
}
