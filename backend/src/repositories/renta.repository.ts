import type { IncidentType, MotoStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";

/**
 * REPOSITORIO DEL CICLO DE VIDA DE RENTAS (FASE 9)
 *
 * Agrupa exclusivamente consultas y transacciones Prisma para:
 * - Solicitud de renta y validación de solapamientos.
 * - Cláusulas y contratos con hash SHA-256.
 * - Registro de pagos.
 * - Actas de entrega (PICKUP) y devolución (RETURN) con evidencias fotográficas.
 * - Cancelación y reporte de incidentes.
 */

export const buscarRenterPorUserId = async (userId: string) =>
  prisma.renter.findUnique({
    where: { idUser: userId },
    select: {
      id: true,
      idUser: true,
      estadoVerificacion: true,
      licenseExpirationDate: true,
    },
  });

export const buscarMotoPorId = async (motoId: string) =>
  prisma.moto.findUnique({
    where: { id: motoId },
    include: {
      owner: {
        select: { id: true, idUser: true },
      },
    },
  });

export const hayRentasSolapadas = async (motoId: string, inicio: Date, fin: Date) => {
  const n = await prisma.rental.count({
    where: {
      motoId,
      status: { in: ["PENDING", "PAID", "ACTIVE"] },
      startDate: { lt: fin },
      endDate: { gt: inicio },
    },
  });
  return n > 0;
};

export const crearRenta = async (data: {
  renterId: string;
  motoId: string;
  startDate: Date;
  endDate: Date;
  subtotal: number;
  platformFee: number;
  ownerEarnings: number;
  total: number;
}) =>
  prisma.rental.create({
    data,
    include: {
      moto: {
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          licensePlate: true,
          dailyRate: true,
        },
      },
    },
  });

export const buscarRentaConRelaciones = async (rentalId: string) =>
  prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      renter: {
        select: {
          id: true,
          idUser: true,
          user: { select: { id: true, fullName: true } },
        },
      },
      moto: {
        select: {
          id: true,
          brand: true,
          model: true,
          KM: true,
          status: true,
          owner: {
            select: {
              id: true,
              idUser: true,
              user: { select: { id: true, fullName: true } },
            },
          },
        },
      },
      contract: true,
      payment: true,
      handovers: {
        include: { evidences: true },
        orderBy: { createdAt: "asc" },
      },
      reviews: {
        select: { id: true, authorId: true, targetType: true, rating: true },
      },
    },
  });

export const listarRentasPorUsuario = async (userId: string, rol: string) => {
  const where =
    rol.toUpperCase() === "ADMIN"
      ? {}
      : {
          OR: [
            { renter: { idUser: userId } },
            { moto: { owner: { idUser: userId } } },
          ],
        };

  return prisma.rental.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      renter: {
        select: {
          id: true,
          idUser: true,
          user: { select: { id: true, fullName: true } },
        },
      },
      moto: {
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          licensePlate: true,
          KM: true,
          dailyRate: true,
          status: true,
          owner: {
            select: {
              id: true,
              idUser: true,
              user: { select: { id: true, fullName: true } },
            },
          },
        },
      },
      contract: {
        select: {
          id: true,
          contractNumber: true,
          status: true,
          accepted: true,
          acceptedAt: true,
          signedAt: true,
          documentHash: true,
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          method: true,
          reference: true,
          status: true,
          paidAt: true,
        },
      },
      handovers: {
        include: { evidences: true },
        orderBy: { createdAt: "asc" },
      },
      reviews: {
        select: { id: true, authorId: true, targetType: true },
      },
    },
  });
};

export const listarClausulasActivas = async () =>
  prisma.clause.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

export const crearContratoFirmado = async (
  contract: {
    rentalId: string;
    contractNumber: string;
    accepted: boolean;
    acceptedAt: Date;
    observations?: string | null;
    signatureEnc?: Uint8Array<ArrayBuffer> | null;
    signedAt: Date;
    signedIp: string | null;
    documentHash: string;
  },
  clauses: {
    rentalId: string;
    clauseId: string;
    clauseVersion: number;
    bodySnapshot: string;
  }[]
) =>
  prisma.$transaction(async (tx) => {
    const creado = await tx.contract.create({
      data: contract,
      select: {
        id: true,
        contractNumber: true,
        accepted: true,
        documentHash: true,
        signedAt: true,
      },
    });
    if (clauses.length > 0) {
      await tx.rentalClause.createMany({ data: clauses });
    }
    return creado;
  });

export const registrarPago = async (
  rentalId: string,
  motoId: string,
  data: {
    amount: number;
    method: string;
    reference: string;
    status: string;
    paidAt: Date;
  }
) =>
  prisma.$transaction(async (tx) => {
    const pago = await tx.payment.create({
      data: { rentalId, ...data },
      select: {
        id: true,
        amount: true,
        method: true,
        reference: true,
        status: true,
        paidAt: true,
      },
    });
    await tx.rental.update({ where: { id: rentalId }, data: { status: "PAID" } });
    await tx.moto.update({ where: { id: motoId }, data: { status: "RESERVED" } });
    return pago;
  });

export const registrarActaEntrega = async (
  rentalId: string,
  motoId: string,
  datos: {
    mileage: number;
    fuelLevel: number;
    observations: string | null;
    evidencias: { fileUrl: string; description: string | null }[];
  }
) =>
  prisma.$transaction(async (tx) => {
    const acta = await tx.vehicleHandover.create({
      data: {
        rentalId,
        type: "PICKUP",
        mileage: datos.mileage,
        fuelLevel: datos.fuelLevel,
        observations: datos.observations,
        ...(datos.evidencias.length > 0 ? { evidences: { create: datos.evidencias } } : {}),
      },
      include: { evidences: true },
    });
    await tx.rental.update({ where: { id: rentalId }, data: { status: "ACTIVE" } });
    await tx.moto.update({ where: { id: motoId }, data: { status: "RENTED" } });
    return acta;
  });

export const registrarActaDevolucion = async (
  rentalId: string,
  motoId: string,
  tieneContrato: boolean,
  datos: {
    mileage: number;
    fuelLevel: number;
    observations: string | null;
    evidencias: { fileUrl: string; description: string | null }[];
  }
) =>
  prisma.$transaction(async (tx) => {
    const acta = await tx.vehicleHandover.create({
      data: {
        rentalId,
        type: "RETURN",
        mileage: datos.mileage,
        fuelLevel: datos.fuelLevel,
        observations: datos.observations,
        ...(datos.evidencias.length > 0 ? { evidences: { create: datos.evidencias } } : {}),
      },
      include: { evidences: true },
    });
    await tx.rental.update({ where: { id: rentalId }, data: { status: "COMPLETED" } });
    if (tieneContrato) {
      await tx.contract.update({
        where: { rentalId },
        data: { status: "COMPLETED" },
      });
    }
    await tx.moto.update({
      where: { id: motoId },
      data: { status: "AVAILABLE", KM: datos.mileage },
    });
    return acta;
  });

export const cancelarRenta = async (
  rentalId: string,
  motoId: string,
  tieneContrato: boolean,
  liberarMoto: boolean
) =>
  prisma.$transaction(async (tx) => {
    const renta = await tx.rental.update({
      where: { id: rentalId },
      data: { status: "CANCELLED" },
      select: { id: true, status: true },
    });
    if (tieneContrato) {
      await tx.contract.update({
        where: { rentalId },
        data: { status: "CANCELLED" },
      });
    }
    if (liberarMoto) {
      await tx.moto.update({ where: { id: motoId }, data: { status: "AVAILABLE" } });
    }
    return renta;
  });

export const registrarIncidente = async (
  rentalId: string,
  motoId: string,
  tipo: IncidentType,
  notas: string | null,
  motoStatus: MotoStatus
) => {
  const [renta, moto] = await prisma.$transaction([
    prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: "INCIDENT",
        incidentType: tipo,
        incidentNotes: notas,
        incidentAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        incidentType: true,
        incidentNotes: true,
        incidentAt: true,
      },
    }),
    prisma.moto.update({
      where: { id: motoId },
      data: { status: motoStatus },
      select: { id: true, status: true },
    }),
  ]);
  return { renta, moto };
};
