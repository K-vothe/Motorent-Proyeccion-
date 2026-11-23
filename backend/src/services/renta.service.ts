import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as repo from "../repositories/renta.repository.js";
import { obtenerCalificacionesPendientes } from "./resena.service.js";
import { idSeguro } from "./moto-galeria.service.js";
import { encryptFile, sha256 } from "../utils/crypto.util.js";
import { parseDataUrl } from "../utils/file.util.js";
import { AppError } from "../utils/handler.util.js";

/**
 * SERVICIO DEL CICLO COMPLETO DE RENTA (FASE 9)
 *
 * Máquina de estados clara y auditable:
 *   PENDING (creada) -> Contrato firmado -> PAID (pagada) ->
 *   PICKUP (entrega con acta) -> ACTIVE -> RETURN (devolución con fotos) -> COMPLETED
 *
 * Transiciones excepcionales:
 * - CANCELLED: permitida mientras está en PENDING (o PAID antes de entrega).
 * - INCIDENT: reportada desde PAID o ACTIVE (bloquea la moto en STOLEN/ACCIDENTED/MISSING).
 */

export interface RequesterRenta {
  id: string;
  role: string;
}

export const COMISION_PLATAFORMA = 0.15; // 15% MotoRent / 85% propietario
const DIA_MS = 24 * 60 * 60 * 1000;
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAPA_INCIDENTE = {
  THEFT: "STOLEN",
  ACCIDENT: "ACCIDENTED",
  DISAPPEARANCE: "MISSING",
} as const;

export interface DependenciasRenta {
  repo: typeof repo;
  obtenerPendientesResena: (userId: string) => Promise<{ bloqueado: boolean; totalPendientes: number }>;
  guardarFotoInspeccion: (
    motoId: string,
    tipo: "PICKUP" | "RETURN",
    indice: number,
    mime: string,
    buffer: Buffer
  ) => Promise<string>;
  ahora: () => Date;
}

async function guardarFotoInspeccionEnDisco(
  motoId: string,
  tipo: "PICKUP" | "RETURN",
  indice: number,
  mime: string,
  buffer: Buffer
): Promise<string> {
  const seguro = idSeguro(motoId);
  const ext = EXTENSIONES[mime] ?? "jpg";
  const nombre = `inspeccion-${tipo.toLowerCase()}-${Date.now()}-${indice + 1}.${ext}`;
  const carpeta = path.resolve(process.cwd(), "uploads", "motos", seguro);
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, nombre), buffer);
  return `/uploads/motos/${seguro}/${nombre}`;
}

const dependenciasPorDefecto: DependenciasRenta = {
  repo,
  obtenerPendientesResena: async (userId) => {
    const res = await obtenerCalificacionesPendientes(userId);
    return { bloqueado: res.tienePendientes, totalPendientes: res.cantidad };
  },
  guardarFotoInspeccion: guardarFotoInspeccionEnDisco,
  ahora: () => new Date(),
};

// ============================================================================
// FUNCIONES PURAS (TESTEABLES SIN BASE DE DATOS)
// ============================================================================

/** Valida un rango de fechas de renta y devuelve inicio, fin y días facturables. */
export function validarRangoFechasRenta(
  startDateRaw: unknown,
  endDateRaw: unknown,
  ahora: Date = new Date()
): { inicio: Date; fin: Date; dias: number } {
  const inicio = new Date(String(startDateRaw ?? ""));
  const fin = new Date(String(endDateRaw ?? ""));

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    throw new AppError("Las fechas de inicio y devolución son inválidas", 400);
  }

  const hoyInicio = new Date(ahora);
  hoyInicio.setHours(0, 0, 0, 0);

  if (inicio < hoyInicio) {
    throw new AppError("La fecha de inicio no puede ser anterior a hoy", 400);
  }
  if (fin < inicio) {
    throw new AppError("La fecha de devolución debe ser igual o posterior a la de inicio", 400);
  }

  // Si recoge y devuelve el mismo día se cobra 1 día mínimo; si hay diferencia se redondea hacia arriba.
  const diffMs = fin.getTime() - inicio.getTime();
  const dias = Math.max(1, Math.ceil(diffMs / DIA_MS));
  const finNormalizado = diffMs === 0 ? new Date(inicio.getTime() + DIA_MS) : fin;

  return { inicio, fin: finNormalizado, dias };
}

/** Calcula subtotal, comisión de MotoRent (15%) y ganancia neta del propietario (85%). */
export function calcularDesgloseRenta(tarifaDiaria: number, dias: number) {
  const diasSeguros = Math.max(1, Math.floor(dias));
  const subtotal = Math.round(diasSeguros * tarifaDiaria);
  const platformFee = Math.round(subtotal * COMISION_PLATAFORMA);
  const ownerEarnings = subtotal - platformFee;
  return { dias: diasSeguros, subtotal, platformFee, ownerEarnings, total: subtotal };
}

function validarActaPayload(body: Record<string, unknown>, kmMinimo: number) {
  const mileage = Number(body?.mileage);
  const fuelLevel = Number(body?.fuelLevel ?? 100);
  const observations =
    typeof body?.observations === "string" ? body.observations.trim().slice(0, 800) || null : null;

  if (!Number.isFinite(mileage) || mileage < 0 || !Number.isInteger(mileage)) {
    throw new AppError("El kilometraje debe ser un número entero mayor o igual a 0", 400);
  }
  if (mileage < kmMinimo) {
    throw new AppError(
      `El kilometraje registrado (${mileage} km) no puede ser menor al último registrado (${kmMinimo} km)`,
      400
    );
  }
  if (!Number.isFinite(fuelLevel) || fuelLevel < 0 || fuelLevel > 100) {
    throw new AppError("El nivel de combustible debe estar entre 0 y 100%", 400);
  }

  const fotosRaw = Array.isArray(body?.photos) ? body.photos : [];
  if (fotosRaw.length > 4) {
    throw new AppError("Puedes adjuntar máximo 4 fotos por acta de inspección", 400);
  }

  const fotosValidadas = fotosRaw.map((item, idx) => {
    try {
      return parseDataUrl(item, { allowed: TIPOS_IMAGEN, maxBytes: 5 * 1024 * 1024 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Imagen inválida";
      throw new AppError(`Foto ${idx + 1}: ${msg}`, 400);
    }
  });

  return { mileage, fuelLevel, observations, fotosValidadas };
}

// ============================================================================
// CASOS DE USO
// ============================================================================

export async function listarClausulas(deps: DependenciasRenta = dependenciasPorDefecto) {
  return deps.repo.listarClausulasActivas();
}

export async function listarMisRentas(
  requester: RequesterRenta,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const rentas = await deps.repo.listarRentasPorUsuario(requester.id, requester.role);

  return rentas.map((r) => {
    const esRenter = r.renter.idUser === requester.id;
    const esOwner = r.moto.owner?.idUser === requester.id;
    const calificoComoAutor = r.reviews.some((rev) => rev.authorId === requester.id);
    const tienePickup = r.handovers.some((h) => h.type === "PICKUP");
    const tieneReturn = r.handovers.some((h) => h.type === "RETURN");

    return {
      id: r.id,
      status: r.status,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      subtotal: Number(r.subtotal),
      platformFee: Number(r.platformFee),
      ownerEarnings: Number(r.ownerEarnings),
      total: Number(r.total),
      rolEnRenta: esRenter ? "RENTER" : esOwner ? "OWNER" : "ADMIN",
      yaCalifico: calificoComoAutor,
      requiereEvaluacion: r.status === "COMPLETED" && !calificoComoAutor && (esRenter || esOwner),
      tienePickup,
      tieneReturn,
      incidentType: r.incidentType,
      incidentNotes: r.incidentNotes,
      incidentAt: r.incidentAt ? r.incidentAt.toISOString() : null,
      moto: {
        id: r.moto.id,
        brand: r.moto.brand,
        model: r.moto.model,
        year: r.moto.year,
        licensePlate: r.moto.licensePlate,
        KM: r.moto.KM,
        dailyRate: Number(r.moto.dailyRate),
        status: r.moto.status,
      },
      propietario: r.moto.owner
        ? {
            id: r.moto.owner.user.id,
            nombre: r.moto.owner.user.fullName,
          }
        : null,
      arrendatario: {
        id: r.renter.user.id,
        nombre: r.renter.user.fullName,
      },
      contract: r.contract,
      payment: r.payment
        ? {
            ...r.payment,
            amount: Number(r.payment.amount),
          }
        : null,
      handovers: r.handovers.map((h) => ({
        id: h.id,
        type: h.type,
        mileage: h.mileage,
        fuelLevel: Number(h.fuelLevel),
        observations: h.observations,
        createdAt: h.createdAt.toISOString(),
        evidences: h.evidences,
      })),
    };
  });
}

export async function crearRenta(
  requester: RequesterRenta,
  body: Record<string, unknown>,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const motoId = typeof body?.motoId === "string" ? body.motoId.trim() : "";
  if (!motoId) {
    throw new AppError("Debes seleccionar una motocicleta válida", 400);
  }

  const { inicio, fin, dias } = validarRangoFechasRenta(
    body?.startDate,
    body?.endDate,
    deps.ahora()
  );

  // Regla de Fase 6: bloqueo por evaluaciones obligatorias pendientes
  const pendientes = await deps.obtenerPendientesResena(requester.id);
  if (pendientes.bloqueado) {
    throw new AppError(
      `Tienes ${pendientes.totalPendientes} calificación(es) obligatoria(s) pendiente(s). Complétalas en Mis rentas antes de solicitar una nueva motocicleta.`,
      409
    );
  }

  const renter = await deps.repo.buscarRenterPorUserId(requester.id);
  if (!renter || renter.estadoVerificacion !== "APPROVED") {
    throw new AppError(
      "Necesitas un perfil de arrendatario verificado y aprobado para solicitar una renta",
      403
    );
  }

  if (renter.licenseExpirationDate && renter.licenseExpirationDate <= fin) {
    throw new AppError("Tu licencia de conducción vence antes de finalizar el alquiler", 400);
  }

  const moto = await deps.repo.buscarMotoPorId(motoId);
  if (!moto) {
    throw new AppError("No se encontró la motocicleta indicada", 404);
  }
  if (moto.owner?.idUser === requester.id) {
    throw new AppError("No puedes rentar tu propia motocicleta", 400);
  }
  if (moto.status !== "AVAILABLE") {
    throw new AppError("Esta motocicleta no está disponible para alquilar en este momento", 409);
  }

  if (await deps.repo.hayRentasSolapadas(moto.id, inicio, fin)) {
    throw new AppError("La motocicleta ya tiene una reserva activa o pendiente en esas fechas", 409);
  }

  const desglose = calcularDesgloseRenta(Number(moto.dailyRate), dias);

  return deps.repo.crearRenta({
    renterId: renter.id,
    motoId: moto.id,
    startDate: inicio,
    endDate: fin,
    subtotal: desglose.subtotal,
    platformFee: desglose.platformFee,
    ownerEarnings: desglose.ownerEarnings,
    total: desglose.total,
  });
}

export async function firmarContrato(
  requester: RequesterRenta,
  rentalId: string,
  body: Record<string, unknown>,
  ip?: string,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const renta = await deps.repo.buscarRentaConRelaciones(rentalId);
  if (!renta) throw new AppError("Renta no encontrada", 404);
  if (renta.renter.idUser !== requester.id && requester.role !== "ADMIN") {
    throw new AppError("Solo el arrendatario puede firmar este contrato", 403);
  }
  if (renta.status !== "PENDING") {
    throw new AppError("Solo se puede firmar el contrato de una renta pendiente", 409);
  }
  if (renta.contract) {
    throw new AppError("Esta renta ya tiene un contrato firmado", 409);
  }
  if (body?.accepted !== true) {
    throw new AppError("Debes leer y aceptar expresamente las cláusulas del contrato", 400);
  }

  let firmaEnc: Uint8Array<ArrayBuffer> | null = null;
  let firmaHash = "ACEPTACION-DIGITAL-EXPLICITA";
  if (typeof body?.signature === "string" && body.signature.trim().length > 0) {
    const firma = parseDataUrl(body.signature, {
      allowed: ["image/png", "image/jpeg", "image/webp"],
      maxBytes: 500 * 1024,
    });
    firmaEnc = new Uint8Array(encryptFile(firma));
    firmaHash = sha256(firma.buffer);
  }

  const clausulas = await deps.repo.listarClausulasActivas();
  if (clausulas.length === 0) {
    throw new AppError("No hay cláusulas legales activas configuradas en el sistema", 500);
  }

  const firmadoEn = deps.ahora();
  const documentHash = sha256(
    JSON.stringify({
      rentalId,
      renterId: renta.renterId,
      motoId: renta.motoId,
      startDate: renta.startDate.toISOString(),
      endDate: renta.endDate.toISOString(),
      total: String(renta.total),
      clausulas: clausulas.map((c) => ({ id: c.id, version: c.version, body: c.body })),
      firmaHash,
      firmadoEn: firmadoEn.toISOString(),
    })
  );

  const contractNumber = `MR-${firmadoEn.getFullYear()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;

  return deps.repo.crearContratoFirmado(
    {
      rentalId,
      contractNumber,
      accepted: true,
      acceptedAt: firmadoEn,
      observations:
        typeof body?.observations === "string" ? body.observations.trim().slice(0, 400) || null : null,
      signatureEnc: firmaEnc,
      signedAt: firmadoEn,
      signedIp: ip ?? null,
      documentHash,
    },
    clausulas.map((c) => ({
      rentalId,
      clauseId: c.id,
      clauseVersion: c.version,
      bodySnapshot: c.body,
    }))
  );
}

export async function pagarRenta(
  requester: RequesterRenta,
  rentalId: string,
  body: Record<string, unknown>,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const renta = await deps.repo.buscarRentaConRelaciones(rentalId);
  if (!renta) throw new AppError("Renta no encontrada", 404);
  if (renta.renter.idUser !== requester.id && requester.role !== "ADMIN") {
    throw new AppError("Solo el arrendatario puede registrar el pago de esta renta", 403);
  }
  if (renta.status !== "PENDING") {
    throw new AppError("Esta renta no está pendiente de pago", 409);
  }
  if (!renta.contract || !renta.contract.accepted) {
    throw new AppError("Debes firmar el contrato antes de realizar el pago", 400);
  }

  const metodo = typeof body?.method === "string" ? body.method.trim().toUpperCase() : "";
  const metodosValidos = ["PSE", "TARJETA", "NEQUI", "DAVIPLATA", "EFECTIVO"];
  if (!metodosValidos.includes(metodo)) {
    throw new AppError(`Método de pago inválido. Usa: ${metodosValidos.join(", ")}`, 400);
  }

  return deps.repo.registrarPago(rentalId, renta.moto.id, {
    amount: Number(renta.total),
    method: metodo,
    reference: `SIM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    status: "APPROVED",
    paidAt: deps.ahora(),
  });
}

export async function registrarEntregaPickup(
  requester: RequesterRenta,
  rentalId: string,
  body: Record<string, unknown>,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const renta = await deps.repo.buscarRentaConRelaciones(rentalId);
  if (!renta) throw new AppError("Renta no encontrada", 404);

  const esDueno = renta.moto.owner?.idUser === requester.id;
  if (!esDueno && requester.role !== "ADMIN") {
    throw new AppError("Solo el propietario de la motocicleta (o un ADMIN) puede registrar la entrega", 403);
  }
  if (renta.status !== "PAID") {
    throw new AppError("Solo puedes registrar el acta de entrega (PICKUP) de una renta pagada", 409);
  }

  const validado = validarActaPayload(body, renta.moto.KM);
  const evidencias = await Promise.all(
    validado.fotosValidadas.map(async (foto, idx) => ({
      fileUrl: await deps.guardarFotoInspeccion(renta.moto.id, "PICKUP", idx, foto.mime, foto.buffer),
      description: `Entrega PICKUP #${idx + 1}`,
    }))
  );

  return deps.repo.registrarActaEntrega(rentalId, renta.moto.id, {
    mileage: validado.mileage,
    fuelLevel: validado.fuelLevel,
    observations: validado.observations,
    evidencias,
  });
}

export async function registrarDevolucionReturn(
  requester: RequesterRenta,
  rentalId: string,
  body: Record<string, unknown>,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const renta = await deps.repo.buscarRentaConRelaciones(rentalId);
  if (!renta) throw new AppError("Renta no encontrada", 404);

  const esDueno = renta.moto.owner?.idUser === requester.id;
  if (!esDueno && requester.role !== "ADMIN") {
    throw new AppError("Solo el propietario de la motocicleta (o un ADMIN) puede registrar la devolución", 403);
  }
  if (renta.status !== "ACTIVE") {
    throw new AppError("Solo puedes registrar la devolución (RETURN) de una renta activa", 409);
  }

  const pickup = renta.handovers.find((h) => h.type === "PICKUP");
  const kmBase = pickup ? Math.max(pickup.mileage, renta.moto.KM) : renta.moto.KM;
  const validado = validarActaPayload(body, kmBase);

  const evidencias = await Promise.all(
    validado.fotosValidadas.map(async (foto, idx) => ({
      fileUrl: await deps.guardarFotoInspeccion(renta.moto.id, "RETURN", idx, foto.mime, foto.buffer),
      description: `Inspección de devolución RETURN #${idx + 1}`,
    }))
  );

  return deps.repo.registrarActaDevolucion(rentalId, renta.moto.id, Boolean(renta.contract), {
    mileage: validado.mileage,
    fuelLevel: validado.fuelLevel,
    observations: validado.observations,
    evidencias,
  });
}

export async function cancelarRenta(
  requester: RequesterRenta,
  rentalId: string,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const renta = await deps.repo.buscarRentaConRelaciones(rentalId);
  if (!renta) throw new AppError("Renta no encontrada", 404);

  const esRenter = renta.renter.idUser === requester.id;
  const esDueno = renta.moto.owner?.idUser === requester.id;
  if (!esRenter && !esDueno && requester.role !== "ADMIN") {
    throw new AppError("No tienes permiso para cancelar esta renta", 403);
  }

  if (renta.status !== "PENDING" && renta.status !== "PAID") {
    throw new AppError("Solo se pueden cancelar rentas antes de la entrega física (PENDING o PAID)", 409);
  }

  const liberarMoto = renta.moto.status === "RESERVED";
  return deps.repo.cancelarRenta(rentalId, renta.moto.id, Boolean(renta.contract), liberarMoto);
}

export async function reportarIncidente(
  requester: RequesterRenta,
  rentalId: string,
  body: Record<string, unknown>,
  deps: DependenciasRenta = dependenciasPorDefecto
) {
  const renta = await deps.repo.buscarRentaConRelaciones(rentalId);
  if (!renta) throw new AppError("Renta no encontrada", 404);

  const esCliente = renta.renter.idUser === requester.id;
  const esDueno = renta.moto.owner?.idUser === requester.id;
  if (!esCliente && !esDueno && requester.role !== "ADMIN") {
    throw new AppError("No tienes permiso sobre esta renta", 403);
  }

  if (renta.status !== "PAID" && renta.status !== "ACTIVE") {
    throw new AppError("Solo se puede reportar un incidente en una renta pagada o activa", 409);
  }

  const tipoRaw = String(body?.type ?? "").trim().toUpperCase();
  if (!(tipoRaw in MAPA_INCIDENTE)) {
    throw new AppError(`Tipo inválido. Usa: ${Object.keys(MAPA_INCIDENTE).join(", ")}`, 400);
  }
  const tipo = tipoRaw as keyof typeof MAPA_INCIDENTE;
  const notas = typeof body?.notes === "string" ? body.notes.trim().slice(0, 800) || null : null;

  if (!notas || notas.length < 10) {
    throw new AppError("Describe brevemente el incidente (mínimo 10 caracteres)", 400);
  }

  return deps.repo.registrarIncidente(rentalId, renta.moto.id, tipo, notas, MAPA_INCIDENTE[tipo]);
}
