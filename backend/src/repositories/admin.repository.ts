import { prisma } from "../config/prisma.js";

export type EstadoMotoAdmin =
  | "PENDING_APPROVAL"
  | "AVAILABLE"
  | "MAINTENANCE"
  | "INACTIVE"
  | "REJECTED";

/**
 * Métricas globales para los KPIs del Panel Administrativo.
 * Ejecuta los conteos en paralelo con Promise.all para máxima velocidad.
 */
export const obtenerMetricasAdmin = async () => {
  const [
    usuariosTotales,
    rentersPendientes,
    ownersPendientes,
    motosPendientes,
    motosDisponibles,
    resenasAlerta,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.renter.count({ where: { estadoVerificacion: "PENDING" } }),
    prisma.owner.count({ where: { estadoVerificacion: "PENDING" } }),
    prisma.moto.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.moto.count({ where: { status: "AVAILABLE" } }),
    prisma.review.count({ where: { rating: { lte: 3 } } }),
  ]);

  return {
    usuariosTotales,
    rentersPendientes,
    ownersPendientes,
    motosPendientes,
    motosDisponibles,
    resenasAlerta,
  };
};

/** Lista motocicletas con su propietario para revisión y control administrativo. */
export const listarMotosAdmin = async () => {
  return await prisma.moto.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      owner: {
        select: {
          id: true,
          idUser: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    take: 60,
  });
};

export const buscarMotoAdminPorId = async (id: string) => {
  return await prisma.moto.findUnique({ where: { id } });
};

export const actualizarEstadoMotoAdmin = async (
  id: string,
  status: EstadoMotoAdmin
) => {
  return await prisma.moto.update({
    where: { id },
    data: { status },
  });
};

/**
 * Directorio administrativo de usuarios (sin exponer contraseñas ni tokens).
 */
export const listarUsuariosAdmin = async () => {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      renter: {
        select: {
          estadoVerificacion: true,
          _count: { select: { rentals: true } },
        },
      },
      owner: {
        select: {
          estadoVerificacion: true,
          _count: { select: { motos: true } },
        },
      },
    },
  });
};

/**
 * Lista las reseñas recientes priorizando calificaciones bajas (alertas de calidad).
 */
export const listarResenasAdmin = async () => {
  return await prisma.review.findMany({
    orderBy: [{ rating: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      author: { select: { id: true, fullName: true } },
      targetUser: { select: { id: true, fullName: true } },
      moto: { select: { id: true, brand: true, model: true, licensePlate: true } },
    },
  });
};
