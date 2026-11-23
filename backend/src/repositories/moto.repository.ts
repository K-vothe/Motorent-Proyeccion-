import { prisma } from "../config/prisma.js";

// ====== MÉTODOS PARA MOTOS ====== //

export const obtenerTodasLasMotos = async () => {
  return await prisma.moto.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
  });
};

export const buscarMotoPorPlaca = async (placa: string) => {
  return await prisma.moto.findFirst({
    where: { licensePlate: placa },
  });
};

export const crearMoto = async (datosMoto: any) => {
  return await prisma.moto.create({
    data: datosMoto,
  });
};

/** Busca una moto por id incluyendo el usuario dueño (para validar permisos). */
export const buscarMotoPorId = async (id: string) => {
  return await prisma.moto.findUnique({
    where: { id },
    include: {
      owner: { select: { idUser: true } },
    },
  });
};

/**
 * Obtiene las fotos tomadas en las inspecciones de DEVOLUCIÓN (HandoverType.RETURN)
 * de todas las rentas de una moto, de la más reciente a la más antigua.
 * Así la galería refleja el estado real del vehículo después de cada renta.
 */
export const obtenerEvidenciasDevolucion = async (motoId: string, limite = 12) => {
  return await prisma.handoverEvidence.findMany({
    where: {
      handover: {
        type: "RETURN",
        rental: { motoId },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limite,
    include: {
      handover: {
        select: { createdAt: true, mileage: true },
      },
    },
  });
};

// ====== MÉTODOS PARA OWNER (Propietario) ====== //
// Consulta el perfil de propietario alineado con el esquema actual (idUser).
export const buscarOwnerPorUserId = async (userId: string) => {
  return await prisma.owner.findUnique({
    where: { idUser: userId },
  });
};
