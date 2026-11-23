import { prisma } from "../config/prisma.js";

/**
 * Obtiene el usuario autenticado junto con sus perfiles de Arrendatario (renter)
 * y Propietario (owner), alineado con el esquema actualizado de Prisma.
 */
export const obtenerUsuarioConPerfiles = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      renter: true,
      owner: true,
    },
  });
};

export const obtenerRentasArrendatario = async (renterId: string) => {
  return await prisma.rental.count({
    where: { renterId },
  });
};

export const obtenerRentaActivaArrendatario = async (renterId: string) => {
  return await prisma.rental.findFirst({
    where: { renterId, status: "ACTIVE" },
    include: { moto: true },
    orderBy: { endDate: "asc" },
  });
};

export const obtenerMotosPublicadasPropietario = async (ownerId: string) => {
  return await prisma.moto.count({
    where: { ownerId },
  });
};

export const obtenerRentasDelMesPropietario = async (
  ownerId: string,
  inicioDeMes: Date
) => {
  return await prisma.rental.findMany({
    where: {
      moto: { ownerId },
      startDate: { gte: inicioDeMes },
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    select: { ownerEarnings: true },
  });
};
