import { prisma } from "../config/prisma.js";

export const buscarMoto = async (motoId: string) =>
  prisma.moto.findUnique({ where: { id: motoId } });

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

export const crearRenta = async (data: any) => prisma.rental.create({ data });

export const buscarRentaConRelaciones = async (rentalId: string) =>
  prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      client: { select: { userId: true } },
      moto: { select: { id: true, owner: { select: { userId: true } } } },
      contract: { select: { id: true } },
    },
  });

export const listarClausulasActivas = async () =>
  prisma.clause.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });

export const crearContratoFirmado = async (
  contract: any,
  clauses: { rentalId: string; clauseId: string; clauseVersion: number; bodySnapshot: string }[]
) =>
  prisma.$transaction(async (tx) => {
    const creado = await tx.contract.create({
      data: contract,
      select: { id: true, contractNumber: true, documentHash: true, signedAt: true },
    });
    await tx.rentalClause.createMany({ data: clauses });
    return creado;
  });

export const registrarPago = async (rentalId: string, data: any) =>
  prisma.$transaction(async (tx) => {
    const pago = await tx.payment.create({
      data: { rentalId, ...data },
      select: { id: true, amount: true, method: true, reference: true, status: true, paidAt: true },
    });
    await tx.rental.update({ where: { id: rentalId }, data: { status: "PAID" } });
    return pago;
  });

export const registrarIncidente = async (
  rentalId: string,
  motoId: string,
  tipo: "THEFT" | "ACCIDENT" | "DISAPPEARANCE",
  notas: string | null,
  motoStatus: "STOLEN" | "ACCIDENTED" | "MISSING"
) => {
  const [renta, moto] = await prisma.$transaction([
    prisma.rental.update({
      where: { id: rentalId },
      data: { status: "INCIDENT", incidentType: tipo, incidentNotes: notas, incidentAt: new Date() },
      select: { id: true, status: true, incidentType: true, incidentAt: true },
    }),
    prisma.moto.update({
      where: { id: motoId },
      data: { status: motoStatus },
      select: { id: true, status: true },
    }),
  ]);
  return { renta, moto };
};