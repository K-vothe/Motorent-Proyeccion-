import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularDesgloseRenta,
  validarRangoFechasRenta,
  crearRenta,
  firmarContrato,
  pagarRenta,
  registrarEntregaPickup,
  registrarDevolucionReturn,
  cancelarRenta,
  reportarIncidente,
  type DependenciasRenta,
} from "../services/renta.service.js";
import { AppError } from "../utils/handler.util.js";

const AHORA_FIJO = new Date("2026-11-23T12:00:00Z");

function crearDepsMock(
  overrides: Partial<Record<keyof DependenciasRenta["repo"], unknown>> = {},
  bloqueado = false
): DependenciasRenta {
  const repoBase: Record<string, unknown> = {
    buscarRenterPorUserId: async () => ({
      id: "renter-1",
      idUser: "u-renter",
      estadoVerificacion: "APPROVED",
      licenseExpirationDate: new Date("2028-01-01T00:00:00Z"),
    }),
    buscarMotoPorId: async () => ({
      id: "moto-1",
      ownerId: "owner-1",
      brand: "Yamaha",
      model: "MT-03",
      year: 2024,
      licensePlate: "MTR32A",
      displacement: "321cc",
      KM: 5000,
      color: "Azul",
      dailyRate: 100000,
      status: "AVAILABLE",
      createdAt: AHORA_FIJO,
      updatedAt: AHORA_FIJO,
      owner: { id: "owner-1", idUser: "u-owner" },
    }),
    hayRentasSolapadas: async () => false,
    crearRenta: async (data: Record<string, unknown>) => ({ id: "rental-new", ...data }),
    buscarRentaConRelaciones: async () => null,
    listarRentasPorUsuario: async () => [],
    listarClausulasActivas: async () => [
      {
        id: "c-1",
        title: "Uso",
        body: "Uso personal",
        version: 1,
        active: true,
        createdAt: AHORA_FIJO,
        updatedAt: AHORA_FIJO,
      },
    ],
    crearContratoFirmado: async (contract: {
      contractNumber: string;
      documentHash: string;
      signedAt: Date;
    }) => ({
      id: "ctr-1",
      contractNumber: contract.contractNumber,
      accepted: true,
      documentHash: contract.documentHash,
      signedAt: contract.signedAt,
    }),
    registrarPago: async (_rentalId: string, _motoId: string, data: Record<string, unknown>) => ({
      id: "pay-1",
      ...data,
    }),
    registrarActaEntrega: async (_rentalId: string, _motoId: string, data: Record<string, unknown>) => ({
      id: "h-pick",
      type: "PICKUP",
      ...data,
    }),
    registrarActaDevolucion: async (
      _rentalId: string,
      _motoId: string,
      _hasC: boolean,
      data: Record<string, unknown>
    ) => ({
      id: "h-ret",
      type: "RETURN",
      ...data,
    }),
    cancelarRenta: async (id: string) => ({ id, status: "CANCELLED" }),
    registrarIncidente: async (
      id: string,
      motoId: string,
      tipo: string,
      notas: string | null,
      motoStatus: string
    ) => ({
      renta: { id, status: "INCIDENT", incidentType: tipo, incidentNotes: notas, incidentAt: AHORA_FIJO },
      moto: { id: motoId, status: motoStatus },
    }),
    ...overrides,
  };

  return {
    ahora: () => AHORA_FIJO,
    obtenerPendientesResena: async () => ({ bloqueado, totalPendientes: bloqueado ? 1 : 0 }),
    guardarFotoInspeccion: async (motoId, tipo, idx) =>
      `/uploads/motos/${motoId}/inspeccion-${tipo.toLowerCase()}-${idx + 1}.png`,
    repo: repoBase as unknown as DependenciasRenta["repo"],
  };
}

test("calcularDesgloseRenta calcula correctamente 15% plataforma y 85% propietario", () => {
  const res = calcularDesgloseRenta(100000, 3);
  assert.equal(res.subtotal, 300000);
  assert.equal(res.platformFee, 45000);
  assert.equal(res.ownerEarnings, 255000);
  assert.equal(res.total, 300000);
});

test("validarRangoFechasRenta rechaza fechas en el pasado o invertidas", () => {
  assert.throws(
    () => validarRangoFechasRenta("2026-11-20", "2026-11-25", AHORA_FIJO),
    (err: unknown) => err instanceof AppError && err.status === 400
  );
  assert.throws(
    () => validarRangoFechasRenta("2026-11-26", "2026-11-24", AHORA_FIJO),
    (err: unknown) => err instanceof AppError && err.status === 400
  );
  const ok = validarRangoFechasRenta("2026-11-25", "2026-11-28", AHORA_FIJO);
  assert.equal(ok.dias, 3);
});

test("crearRenta bloquea si el arrendatario tiene reseñas obligatorias pendientes (Fase 6 + 9)", async () => {
  const deps = crearDepsMock({}, true);
  await assert.rejects(
    () =>
      crearRenta(
        { id: "u-renter", role: "RENTER" },
        { motoId: "moto-1", startDate: "2026-11-25", endDate: "2026-11-27" },
        deps
      ),
    (err: unknown) => err instanceof AppError && err.status === 409
  );
});

test("crearRenta rechaza auto-renta del propietario y fechas solapadas", async () => {
  const depsMismoDueno = crearDepsMock({
    buscarRenterPorUserId: async () => ({
      id: "renter-own",
      idUser: "u-owner",
      estadoVerificacion: "APPROVED",
      licenseExpirationDate: null,
    }),
  });
  await assert.rejects(
    () =>
      crearRenta(
        { id: "u-owner", role: "OWNER" },
        { motoId: "moto-1", startDate: "2026-11-25", endDate: "2026-11-27" },
        depsMismoDueno
      ),
    (err: unknown) => err instanceof AppError && err.status === 400
  );

  const depsSolapada = crearDepsMock({ hayRentasSolapadas: async () => true });
  await assert.rejects(
    () =>
      crearRenta(
        { id: "u-renter", role: "RENTER" },
        { motoId: "moto-1", startDate: "2026-11-25", endDate: "2026-11-27" },
        depsSolapada
      ),
    (err: unknown) => err instanceof AppError && err.status === 409
  );
});

test("firmarContrato genera numero MR-YYYY-... y hash SHA-256 al aceptar cláusulas", async () => {
  const deps = crearDepsMock({
    buscarRentaConRelaciones: async () => ({
      id: "r-1",
      renterId: "renter-1",
      motoId: "moto-1",
      status: "PENDING",
      startDate: new Date("2026-11-25T00:00:00Z"),
      endDate: new Date("2026-11-27T00:00:00Z"),
      total: 200000,
      contract: null,
      renter: { id: "renter-1", idUser: "u-renter", user: { id: "u-renter", fullName: "Mateo" } },
      moto: { id: "moto-1", KM: 5000, status: "AVAILABLE", owner: { id: "o-1", idUser: "u-owner" } },
      handovers: [],
      reviews: [],
    }),
  });

  const contrato = await firmarContrato(
    { id: "u-renter", role: "RENTER" },
    "r-1",
    { accepted: true },
    "127.0.0.1",
    deps
  );
  assert.match(contrato.contractNumber, /^MR-2026-[A-F0-9]{8}$/);
  assert.equal(contrato.documentHash?.length, 64);
});

test("pagarRenta exige contrato firmado y valida método permitido", async () => {
  const depsSinContrato = crearDepsMock({
    buscarRentaConRelaciones: async () => ({
      id: "r-1",
      status: "PENDING",
      total: 200000,
      contract: null,
      renter: { idUser: "u-renter" },
      moto: { id: "moto-1" },
    }),
  });

  await assert.rejects(
    () => pagarRenta({ id: "u-renter", role: "RENTER" }, "r-1", { method: "PSE" }, depsSinContrato),
    (err: unknown) => err instanceof AppError && err.status === 400
  );

  const depsConContrato = crearDepsMock({
    buscarRentaConRelaciones: async () => ({
      id: "r-1",
      status: "PENDING",
      total: 200000,
      contract: { id: "c-1", accepted: true },
      renter: { idUser: "u-renter" },
      moto: { id: "moto-1" },
    }),
  });

  const pago = await pagarRenta(
    { id: "u-renter", role: "RENTER" },
    "r-1",
    { method: "nequi" },
    depsConContrato
  );
  assert.equal(pago.method, "NEQUI");
  assert.equal(pago.status, "APPROVED");
});

test("registrarEntregaPickup y registrarDevolucionReturn validan propietario y kilometraje creciente", async () => {
  const depsPaid = crearDepsMock({
    buscarRentaConRelaciones: async () => ({
      id: "r-1",
      status: "PAID",
      moto: { id: "moto-1", KM: 5000, owner: { idUser: "u-owner" } },
      handovers: [],
    }),
  });

  await assert.rejects(
    () =>
      registrarEntregaPickup(
        { id: "u-renter", role: "RENTER" },
        "r-1",
        { mileage: 5000, fuelLevel: 100 },
        depsPaid
      ),
    (err: unknown) => err instanceof AppError && err.status === 403
  );

  const actaPickup = await registrarEntregaPickup(
    { id: "u-owner", role: "OWNER" },
    "r-1",
    { mileage: 5020, fuelLevel: 95, observations: "Tanque lleno" },
    depsPaid
  );
  assert.equal(actaPickup.type, "PICKUP");

  const depsActive = crearDepsMock({
    buscarRentaConRelaciones: async () => ({
      id: "r-1",
      status: "ACTIVE",
      contract: { id: "c-1" },
      moto: { id: "moto-1", KM: 5000, owner: { idUser: "u-owner" } },
      handovers: [{ type: "PICKUP", mileage: 5020 }],
    }),
  });

  await assert.rejects(
    () =>
      registrarDevolucionReturn(
        { id: "u-owner", role: "OWNER" },
        "r-1",
        { mileage: 5010, fuelLevel: 90 },
        depsActive
      ),
    (err: unknown) => err instanceof AppError && err.status === 400
  );

  const actaReturn = await registrarDevolucionReturn(
    { id: "u-owner", role: "OWNER" },
    "r-1",
    { mileage: 5250, fuelLevel: 85, observations: "Sin novedades" },
    depsActive
  );
  assert.equal(actaReturn.type, "RETURN");
});

test("cancelarRenta y reportarIncidente aplican permisos y estados de seguridad", async () => {
  const depsPending = crearDepsMock({
    buscarRentaConRelaciones: async () => ({
      id: "r-1",
      status: "PENDING",
      contract: null,
      renter: { idUser: "u-renter" },
      moto: { id: "moto-1", status: "AVAILABLE", owner: { idUser: "u-owner" } },
    }),
  });

  const cancelada = await cancelarRenta({ id: "u-renter", role: "RENTER" }, "r-1", depsPending);
  assert.equal(cancelada.status, "CANCELLED");

  const depsActive = crearDepsMock({
    buscarRentaConRelaciones: async () => ({
      id: "r-1",
      status: "ACTIVE",
      renter: { idUser: "u-renter" },
      moto: { id: "moto-1", status: "RENTED", owner: { idUser: "u-owner" } },
    }),
  });

  const incidente = await reportarIncidente(
    { id: "u-renter", role: "RENTER" },
    "r-1",
    { type: "ACCIDENT", notes: "Caída leve en avenida principal, sin heridos." },
    depsActive
  );
  assert.equal(incidente.renta.status, "INCIDENT");
  assert.equal(incidente.moto.status, "ACCIDENTED");
});
