import * as resenaRepo from "../repositories/resena.repository.js";
import type { TipoObjetivoResena } from "../repositories/resena.repository.js";
import { AppError } from "../utils/handler.util.js";

/**
 * MÓDULO DE RESEÑAS BIDIRECCIONALES Y PERFIL PÚBLICO (FASE 6)
 *
 * Reglas de confianza diseñadas para evitar fraudes y represalias:
 * 1. Solo se puede calificar una renta en estado COMPLETED en la que el autor participó.
 * 2. Doble ciego con ventana de 30 minutos:
 *    - Ninguna parte ve lo que escribió la otra antes de votar.
 *    - Si ambos califican, las reseñas quedan visibles.
 *    - Si solo uno califica, su reseña se hace pública automáticamente a los 30 minutos
 *      para que nunca quede bloqueada indefinidamente.
 * 3. Evaluación obligatoria antes de la siguiente operación (patrón Uber):
 *    `obtenerPendientesDeCalificar` indica si el usuario tiene rentas cerradas sin evaluar.
 * 4. Privacidad: los perfiles públicos nunca exponen correo, teléfono, cédula ni licencia.
 */

export const MINUTOS_DOBLE_CIEGO = 30;
export const MIN_CARACTERES_COMENTARIO_BAJO = 10;
export const MAX_CARACTERES_COMENTARIO = 600;

export interface PayloadCrearResena {
  rentalId?: unknown;
  targetType?: unknown;
  rating?: unknown;
  comment?: unknown;
}

export interface DependenciasResena {
  repo: typeof resenaRepo;
  ahora: () => Date;
}

const dependenciasPorDefecto: DependenciasResena = {
  repo: resenaRepo,
  ahora: () => new Date(),
};

// ============================================================================
// FUNCIONES PURAS (FÁCILES DE ESTUDIAR Y PROBAR SIN BASE DE DATOS)
// ============================================================================

/**
 * Formatea un nombre completo como "Primer nombre + inicial del apellido"
 * (ej. "Carlos Martínez" -> "Carlos M.") para proteger la privacidad pública.
 */
export function formatearNombrePublico(fullName: string): string {
  const partes = fullName.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Usuario MotoRent";
  if (partes.length === 1) return partes[0]!;
  return `${partes[0]} ${partes[1]!.charAt(0).toUpperCase()}.`;
}

/**
 * Determina si una reseña ya puede mostrarse públicamente bajo la regla
 * de doble ciego a 30 minutos:
 * - Visible si ya pasó `visibleAt` (createdAt + 30 min), O
 * - Visible si al menos 2 autores distintos (arrendatario y propietario)
 *   ya enviaron su calificación para esa misma renta.
 */
export function esResenaVisible(
  visibleAt: Date,
  autoresEnLaRenta: string[],
  ahora: Date
): boolean {
  if (ahora.getTime() >= visibleAt.getTime()) {
    return true;
  }
  const autoresUnicos = new Set(autoresEnLaRenta);
  return autoresUnicos.size >= 2;
}

/** Calcula promedio redondeado a 1 decimal y conteo total de una lista de calificaciones. */
export function calcularResumenReputacion(ratings: number[]): {
  promedio: number;
  total: number;
} {
  if (ratings.length === 0) {
    return { promedio: 0, total: 0 };
  }
  const suma = ratings.reduce((acc, val) => acc + val, 0);
  return {
    promedio: Math.round((suma / ratings.length) * 10) / 10,
    total: ratings.length,
  };
}

// ============================================================================
// CASOS DE USO PRINCIPALES
// ============================================================================

/**
 * Registra una reseña verificada (MOTO, OWNER o RENTER) aplicando todas las
 * reglas anti-fraude y configurando su `visibleAt` a +30 minutos.
 */
export async function registrarResena(
  authorId: string,
  payload: PayloadCrearResena,
  deps: DependenciasResena = dependenciasPorDefecto
) {
  const rentalId = typeof payload.rentalId === "string" ? payload.rentalId.trim() : "";
  if (!rentalId) {
    throw new AppError("Debes indicar la renta que deseas calificar", 400);
  }

  const targetType =
    typeof payload.targetType === "string"
      ? payload.targetType.trim().toUpperCase()
      : "";

  if (targetType !== "MOTO" && targetType !== "OWNER" && targetType !== "RENTER") {
    throw new AppError(
      "Tipo de reseña inválido. Usa 'MOTO', 'OWNER' o 'RENTER'",
      400
    );
  }

  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError("La calificación debe ser un número entero entre 1 y 5", 400);
  }

  const comentarioLimpio =
    typeof payload.comment === "string" ? payload.comment.trim() : "";

  if (comentarioLimpio.length > MAX_CARACTERES_COMENTARIO) {
    throw new AppError(
      `El comentario no puede superar los ${MAX_CARACTERES_COMENTARIO} caracteres`,
      400
    );
  }

  // Si la nota es 3 o menos, exigimos una breve explicación para que sea útil y justa
  if (rating <= 3 && comentarioLimpio.length < MIN_CARACTERES_COMENTARIO_BAJO) {
    throw new AppError(
      `Cuando calificas con ${rating} estrellas o menos, explica brevemente el motivo (mínimo ${MIN_CARACTERES_COMENTARIO_BAJO} caracteres)`,
      400
    );
  }

  const renta = await deps.repo.buscarRentaParaResena(rentalId);
  if (!renta) {
    throw new AppError("No se encontró la renta indicada", 404);
  }

  if (renta.status !== "COMPLETED") {
    throw new AppError(
      "Solo puedes calificar una renta cuando ya haya sido completada",
      400
    );
  }

  const renterUserId = renta.renter.idUser;
  const ownerUserId = renta.moto.owner?.idUser ?? null;

  let targetUserId = "";
  let motoId: string | null = null;

  if (targetType === "MOTO" || targetType === "OWNER") {
    if (authorId !== renterUserId) {
      throw new AppError(
        "Solo el arrendatario que completó esta renta puede calificar la moto y al propietario",
        403
      );
    }
    if (!ownerUserId) {
      throw new AppError(
        "Esta motocicleta pertenece a la flota directa y no tiene propietario privado asignado",
        400
      );
    }
    targetUserId = ownerUserId;
    motoId = targetType === "MOTO" ? renta.moto.id : null;
  } else {
    // targetType === "RENTER"
    if (!ownerUserId || authorId !== ownerUserId) {
      throw new AppError(
        "Solo el propietario de la motocicleta puede calificar al arrendatario",
        403
      );
    }
    targetUserId = renterUserId;
    motoId = null;
  }

  if (authorId === targetUserId) {
    throw new AppError("No puedes calificarte a ti mismo", 400);
  }

  const duplicada = await deps.repo.buscarResenaExistente(
    rentalId,
    authorId,
    targetType as TipoObjetivoResena
  );
  if (duplicada) {
    throw new AppError(
      "Ya registraste una calificación para este concepto en esta renta",
      409
    );
  }

  const ahora = deps.ahora();
  const visibleAt = new Date(ahora.getTime() + MINUTOS_DOBLE_CIEGO * 60 * 1000);

  const creada = await deps.repo.crearResena({
    rentalId,
    authorId,
    targetUserId,
    motoId,
    targetType: targetType as TipoObjetivoResena,
    rating,
    comment: comentarioLimpio || null,
    visibleAt,
  });

  return {
    ...creada,
    politicaVisibilidad: `Doble ciego activo: se publicará cuando ambas partes califiquen o automáticamente en ${MINUTOS_DOBLE_CIEGO} minutos.`,
  };
}

/**
 * Retorna las reseñas visibles de una motocicleta y su promedio de calificación.
 */
export async function obtenerResenasPublicasMoto(
  motoId: string,
  deps: DependenciasResena = dependenciasPorDefecto
) {
  const todas = await deps.repo.listarResenasDeMoto(motoId);
  const ahora = deps.ahora();

  const visibles = todas
    .filter((r) =>
      esResenaVisible(
        r.visibleAt,
        r.rental.reviews.map((x) => x.authorId),
        ahora
      )
    )
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      autor: {
        id: r.author.id,
        nombrePublico: formatearNombrePublico(r.author.fullName),
      },
    }));

  return {
    resumen: calcularResumenReputacion(visibles.map((r) => r.rating)),
    resenas: visibles,
  };
}

/**
 * Construye el perfil público de reputación de cualquier usuario (Propietario y/o Arrendatario),
 * exponiendo únicamente información segura y reseñas visibles.
 */
export async function obtenerPerfilPublico(
  userId: string,
  deps: DependenciasResena = dependenciasPorDefecto
) {
  const usuario = await deps.repo.obtenerPerfilPublicoPorId(userId);
  if (!usuario) {
    throw new AppError("No se encontró el perfil público solicitado", 404);
  }

  const ahora = deps.ahora();
  const resenasVisibles = usuario.reviewsReceived
    .filter((r) =>
      esResenaVisible(
        r.visibleAt,
        r.rental.reviews.map((x) => x.authorId),
        ahora
      )
    )
    .map((r) => ({
      id: r.id,
      targetType: r.targetType,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      autor: {
        id: r.author.id,
        nombrePublico: formatearNombrePublico(r.author.fullName),
      },
      moto: r.moto
        ? { id: r.moto.id, nombre: `${r.moto.brand} ${r.moto.model}` }
        : null,
    }));

  const comoPropietario = resenasVisibles.filter(
    (r) => r.targetType === "OWNER" || r.targetType === "MOTO"
  );
  const comoArrendatario = resenasVisibles.filter(
    (r) => r.targetType === "RENTER"
  );

  return {
    id: usuario.id,
    nombrePublico: formatearNombrePublico(usuario.fullName),
    miembroDesde: usuario.createdAt.toISOString(),
    verificaciones: {
      esPropietarioVerificado: usuario.owner?.estadoVerificacion === "APPROVED",
      esArrendatarioVerificado:
        usuario.renter?.estadoVerificacion === "APPROVED",
    },
    estadisticas: {
      rentasComoArrendatario: usuario.renter?._count.rentals ?? 0,
      motosActivas: usuario.owner?.motos.length ?? 0,
      reputacionGeneral: calcularResumenReputacion(
        resenasVisibles.map((r) => r.rating)
      ),
      reputacionPropietario: calcularResumenReputacion(
        comoPropietario.map((r) => r.rating)
      ),
      reputacionArrendatario: calcularResumenReputacion(
        comoArrendatario.map((r) => r.rating)
      ),
    },
    motos: usuario.owner?.motos ?? [],
    resenasComoPropietario: comoPropietario,
    resenasComoArrendatario: comoArrendatario,
  };
}

/**
 * Devuelve las rentas COMPLETED que el usuario aún debe calificar obligatoriamente
 * antes de solicitar una nueva renta o gestionar nuevas reservas.
 */
export async function obtenerCalificacionesPendientes(
  userId: string,
  deps: DependenciasResena = dependenciasPorDefecto
) {
  const rentas = await deps.repo.listarRentasCompletadasDeUsuario(userId);
  const pendientes: {
    rentalId: string;
    rolEnRenta: "RENTER" | "OWNER";
    motoNombre: string;
    contraparteNombre: string;
    objetivosPendientes: TipoObjetivoResena[];
  }[] = [];

  for (const renta of rentas) {
    const esRenter = renta.renter.idUser === userId;
    const esOwner = renta.moto.owner?.idUser === userId;
    const hechasPorMi = new Set(
      renta.reviews
        .filter((r) => r.authorId === userId)
        .map((r) => r.targetType)
    );

    if (esRenter) {
      const faltan: TipoObjetivoResena[] = [];
      if (!hechasPorMi.has("MOTO")) faltan.push("MOTO");
      if (renta.moto.owner && !hechasPorMi.has("OWNER")) faltan.push("OWNER");

      if (faltan.length > 0) {
        pendientes.push({
          rentalId: renta.id,
          rolEnRenta: "RENTER",
          motoNombre: `${renta.moto.brand} ${renta.moto.model}`,
          contraparteNombre: renta.moto.owner
            ? formatearNombrePublico(renta.moto.owner.user.fullName)
            : "Flota MotoRent",
          objetivosPendientes: faltan,
        });
      }
    } else if (esOwner && !hechasPorMi.has("RENTER")) {
      pendientes.push({
        rentalId: renta.id,
        rolEnRenta: "OWNER",
        motoNombre: `${renta.moto.brand} ${renta.moto.model}`,
        contraparteNombre: formatearNombrePublico(renta.renter.user.fullName),
        objetivosPendientes: ["RENTER"],
      });
    }
  }

  return {
    tienePendientes: pendientes.length > 0,
    cantidad: pendientes.length,
    pendientes,
  };
}
