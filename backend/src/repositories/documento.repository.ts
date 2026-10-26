import { prisma } from "../config/prisma.js";

type TipoLegal = "TRANSIT_LICENSE" | "SOAT" | "TECHNICAL_REVIEW" | "INSURANCE";

// ===== CLIENTE ===== //
export const buscarClientePorUserId = async (userId: string) =>
  prisma.client.findUnique({ where: { userId } });

export const upsertCliente = async (userId: string, data: any) =>
  prisma.client.upsert({
    where: { userId },
    create: { userId, ...data },
    // al re-subir documentos, vuelve a quedar pendiente de verificación
    update: { ...data, verificationStatus: "PENDING", verifiedAt: null },
    select: { id: true, verificationStatus: true, licenseExpirationDate: true },
  });

// ===== MOTO ===== //
export const buscarMotoConDueno = async (motoId: string) =>
  prisma.moto.findUnique({
    where: { id: motoId },
    include: { owner: { select: { userId: true } } },
  });

export const upsertDocumentoLegal = async (motoId: string, type: TipoLegal, data: any) =>
  prisma.motoLegalDocument.upsert({
    where: { motoId_type: { motoId, type } },
    create: { motoId, type, ...data },
    update: { ...data, verificationStatus: "PENDING", verifiedAt: null },
    select: { id: true, type: true, expiresAt: true, verificationStatus: true },
  });

export const buscarDocumentoLegal = async (motoId: string, type: TipoLegal) =>
  prisma.motoLegalDocument.findUnique({ where: { motoId_type: { motoId, type } } });

export const listarDocumentosLegales = async (motoId: string) =>
  prisma.motoLegalDocument.findMany({
    where: { motoId },
    select: { type: true, expiresAt: true, verificationStatus: true },
  });

// ===== IMÁGENES ===== //
export const crearImagenMoto = async (motoId: string, data: { data: Buffer; mime: string; isPrimary: boolean }) =>
  prisma.motoImage.create({
    data: { motoId, ...data },
    select: { id: true, mime: true, isPrimary: true },
  });

export const listarImagenesMoto = async (motoId: string) =>
  prisma.motoImage.findMany({
    where: { motoId },
    select: { id: true, mime: true, isPrimary: true },
    orderBy: { createdAt: "asc" },
  });

export const buscarImagen = async (imageId: string) =>
  prisma.motoImage.findUnique({ where: { id: imageId } });