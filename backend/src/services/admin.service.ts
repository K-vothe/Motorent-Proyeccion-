import { access } from "node:fs/promises";
import path from "node:path";
import * as adminRepo from "../repositories/admin.repository.js";
import type { EstadoMotoAdmin } from "../repositories/admin.repository.js";
import { obtenerPortadaMoto } from "./moto-galeria.service.js";
import { AppError } from "../utils/handler.util.js";

/**
 * SERVICIO DEL PANEL ADMINISTRATIVO (FASE 7)
 *
 * Concentra las operaciones exclusivas del rol ADMIN:
 * 1. Métricas globales del sistema.
 * 2. Revisión y aprobación/rechazo de motocicletas.
 * 3. Directorio de usuarios con estado de verificaciones.
 * 4. Supervisión de reseñas (con alertas de baja calificación).
 * 5. Resolución segura de rutas de documentos privados (anti Path Traversal).
 */

const ESTADOS_MOTO_PERMITIDOS: EstadoMotoAdmin[] = [
  "PENDING_APPROVAL",
  "AVAILABLE",
  "MAINTENANCE",
  "INACTIVE",
  "REJECTED",
];

const MIME_POR_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export interface DependenciasAdmin {
  repo: typeof adminRepo;
  obtenerPortada: (motoId: string) => Promise<string | null>;
}

const dependenciasPorDefecto: DependenciasAdmin = {
  repo: adminRepo,
  obtenerPortada: (motoId) => obtenerPortadaMoto(motoId),
};

/**
 * Valida y resuelve la ruta física de un documento privado de verificación
 * garantizando que nunca se pueda salir de `backend/uploads/verificaciones/`.
 */
export function resolverRutaDocumentoPrivado(
  tipo: string,
  userId: string,
  archivo: string,
  baseUploads = path.resolve(process.cwd(), "uploads", "verificaciones")
): { rutaAbsoluta: string; contentType: string } {
  const tipoLimpio = tipo.trim().toLowerCase();
  if (tipoLimpio !== "renter" && tipoLimpio !== "owner") {
    throw new AppError("Tipo de documento inválido (usa 'renter' u 'owner')", 400);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new AppError("Identificador de usuario inválido", 400);
  }

  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|pdf)$/i.test(archivo)) {
    throw new AppError("Nombre o extensión de archivo no permitido", 400);
  }

  const rutaAbsoluta = path.resolve(baseUploads, tipoLimpio, userId, archivo);
  const raizNormalizada = path.resolve(baseUploads) + path.sep;

  if (!rutaAbsoluta.startsWith(raizNormalizada)) {
    throw new AppError("Ruta de documento fuera del directorio permitido", 400);
  }

  const ext = path.extname(archivo).toLowerCase();
  const contentType = MIME_POR_EXTENSION[ext] ?? "application/octet-stream";

  return { rutaAbsoluta, contentType };
}

/** Verifica que el documento privado exista físicamente en disco. */
export async function validarExistenciaDocumentoPrivado(
  tipo: string,
  userId: string,
  archivo: string
): Promise<{ rutaAbsoluta: string; contentType: string }> {
  const info = resolverRutaDocumentoPrivado(tipo, userId, archivo);
  try {
    await access(info.rutaAbsoluta);
    return info;
  } catch {
    throw new AppError("El documento solicitado no existe en el servidor", 404);
  }
}

export async function obtenerResumenAdmin(
  deps: DependenciasAdmin = dependenciasPorDefecto
) {
  return await deps.repo.obtenerMetricasAdmin();
}

/** Lista motos ordenando primero las que están pendientes de aprobación. */
export async function obtenerMotosParaAdmin(
  deps: DependenciasAdmin = dependenciasPorDefecto
) {
  const motos = await deps.repo.listarMotosAdmin();

  const conPortada = await Promise.all(
    motos.map(async (moto) => ({
      id: moto.id,
      brand: moto.brand,
      model: moto.model,
      year: moto.year,
      licensePlate: moto.licensePlate,
      displacement: moto.displacement,
      KM: moto.KM,
      color: moto.color,
      dailyRate: Number(moto.dailyRate),
      status: moto.status,
      fotoPortada: await deps.obtenerPortada(moto.id),
      createdAt: moto.createdAt.toISOString(),
      propietario: moto.owner
        ? {
            id: moto.owner.user.id,
            fullName: moto.owner.user.fullName,
            email: moto.owner.user.email,
          }
        : null,
    }))
  );

  // Priorizar PENDING_APPROVAL arriba para facilitar el trabajo del administrador
  return conPortada.sort((a, b) => {
    if (a.status === "PENDING_APPROVAL" && b.status !== "PENDING_APPROVAL") {
      return -1;
    }
    if (b.status === "PENDING_APPROVAL" && a.status !== "PENDING_APPROVAL") {
      return 1;
    }
    return 0;
  });
}

export async function cambiarEstadoMotoAdmin(
  motoId: string,
  nuevoEstado: unknown,
  deps: DependenciasAdmin = dependenciasPorDefecto
) {
  const estado =
    typeof nuevoEstado === "string" ? nuevoEstado.trim().toUpperCase() : "";

  if (!ESTADOS_MOTO_PERMITIDOS.includes(estado as EstadoMotoAdmin)) {
    throw new AppError(
      `Estado inválido. Usa uno de: ${ESTADOS_MOTO_PERMITIDOS.join(", ")}`,
      400
    );
  }

  const moto = await deps.repo.buscarMotoAdminPorId(motoId);
  if (!moto) {
    throw new AppError("No se encontró la motocicleta indicada", 404);
  }

  return await deps.repo.actualizarEstadoMotoAdmin(
    motoId,
    estado as EstadoMotoAdmin
  );
}

export async function obtenerUsuariosParaAdmin(
  busqueda?: string,
  deps: DependenciasAdmin = dependenciasPorDefecto
) {
  const usuarios = await deps.repo.listarUsuariosAdmin();
  const termino = (busqueda ?? "").trim().toLowerCase();

  const filtrados = termino
    ? usuarios.filter((u) =>
        `${u.fullName} ${u.email} ${u.username} ${u.role}`
          .toLowerCase()
          .includes(termino)
      )
    : usuarios;

  return filtrados.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isEmailVerified: u.isEmailVerified,
    createdAt: u.createdAt.toISOString(),
    estadoRenter: u.renter?.estadoVerificacion ?? "NOT_STARTED",
    estadoOwner: u.owner?.estadoVerificacion ?? "NOT_STARTED",
    totalRentas: u.renter?._count.rentals ?? 0,
    totalMotos: u.owner?._count.motos ?? 0,
  }));
}

export async function obtenerResenasParaAdmin(
  deps: DependenciasAdmin = dependenciasPorDefecto
) {
  const resenas = await deps.repo.listarResenasAdmin();

  return resenas.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    rating: r.rating,
    esAlerta: r.rating <= 3,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    autor: { id: r.author.id, fullName: r.author.fullName },
    destinatario: { id: r.targetUser.id, fullName: r.targetUser.fullName },
    moto: r.moto
      ? `${r.moto.brand} ${r.moto.model} (${r.moto.licensePlate})`
      : null,
  }));
}
