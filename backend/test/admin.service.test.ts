import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import path from "node:path";
import {
  cambiarEstadoMotoAdmin,
  obtenerMotosParaAdmin,
  obtenerResenasParaAdmin,
  obtenerUsuariosParaAdmin,
  resolverRutaDocumentoPrivado,
  type DependenciasAdmin,
} from "../src/services/admin.service.js";
import { AppError } from "../src/utils/handler.util.js";

function crearDeps(overrides: Partial<DependenciasAdmin["repo"]> = {}) {
  const repo: any = {
    obtenerMetricasAdmin: mock.fn(async () => ({
      usuariosTotales: 12,
      rentersPendientes: 2,
      ownersPendientes: 1,
      motosPendientes: 1,
      motosDisponibles: 5,
      resenasAlerta: 1,
    })),
    listarMotosAdmin: mock.fn(async () => [
      {
        id: "m-1",
        brand: "Honda",
        model: "CB160F",
        year: 2024,
        licensePlate: "ABC12D",
        displacement: "160",
        KM: 3000,
        color: "Rojo",
        dailyRate: 45000,
        status: "AVAILABLE",
        createdAt: new Date("2026-11-01T00:00:00.000Z"),
        owner: { id: "o-1", idUser: "u-1", user: { id: "u-1", fullName: "Carlos M.", email: "c@m.co" } },
      },
      {
        id: "m-2",
        brand: "Yamaha",
        model: "MT-03",
        year: 2025,
        licensePlate: "XYZ98K",
        displacement: "321",
        KM: 1200,
        color: "Negro",
        dailyRate: 85000,
        status: "PENDING_APPROVAL",
        createdAt: new Date("2026-11-10T00:00:00.000Z"),
        owner: null,
      },
    ]),
    buscarMotoAdminPorId: mock.fn(async () => ({ id: "m-2", status: "PENDING_APPROVAL" })),
    actualizarEstadoMotoAdmin: mock.fn(async (id: string, status: string) => ({ id, status })),
    listarUsuariosAdmin: mock.fn(async () => [
      {
        id: "u-1",
        username: "carlosm",
        fullName: "Carlos Méndez",
        email: "carlos@motorent.co",
        phone: "3001112233",
        role: "OWNER",
        isEmailVerified: true,
        createdAt: new Date("2026-10-01T00:00:00.000Z"),
        renter: null,
        owner: { estadoVerificacion: "APPROVED", _count: { motos: 2 } },
      },
      {
        id: "u-2",
        username: "laurad",
        fullName: "Laura Díaz",
        email: "laura@motorent.co",
        phone: "3004445566",
        role: "RENTER",
        isEmailVerified: true,
        createdAt: new Date("2026-10-15T00:00:00.000Z"),
        renter: { estadoVerificacion: "APPROVED", _count: { rentals: 3 } },
        owner: null,
      },
    ]),
    listarResenasAdmin: mock.fn(async () => [
      {
        id: "r-1",
        targetType: "MOTO",
        rating: 2,
        comment: "Freno trasero necesitaba ajuste.",
        createdAt: new Date("2026-11-20T00:00:00.000Z"),
        author: { id: "u-2", fullName: "Laura Díaz" },
        targetUser: { id: "u-1", fullName: "Carlos Méndez" },
        moto: { id: "m-1", brand: "Honda", model: "CB160F", licensePlate: "ABC12D" },
      },
    ]),
    ...overrides,
  };

  return {
    deps: {
      repo,
      obtenerPortada: async () => "/uploads/motos/m-1/foto-1.jpg",
    } as DependenciasAdmin,
    repo,
  };
}

test("resolverRutaDocumentoPrivado bloquea intentos de Path Traversal y extensiones peligrosas", () => {
  const base = path.resolve("C:/tmp/verificaciones");

  assert.throws(
    () => resolverRutaDocumentoPrivado("renter", "../admin", "cedula.jpg", base),
    (e: unknown) => e instanceof AppError && e.status === 400
  );
  assert.throws(
    () => resolverRutaDocumentoPrivado("renter", "user1", "../../.env", base),
    (e: unknown) => e instanceof AppError && e.status === 400
  );
  assert.throws(
    () => resolverRutaDocumentoPrivado("otro", "user1", "cedula.jpg", base),
    (e: unknown) => e instanceof AppError && e.status === 400
  );

  const ok = resolverRutaDocumentoPrivado("owner", "user-123", "bill.pdf", base);
  assert.strictEqual(ok.contentType, "application/pdf");
  assert.ok(ok.rutaAbsoluta.endsWith(path.join("owner", "user-123", "bill.pdf")));
});

test("obtenerMotosParaAdmin prioriza motocicletas en estado PENDING_APPROVAL", async () => {
  const { deps } = crearDeps();
  const motos = await obtenerMotosParaAdmin(deps);

  assert.strictEqual(motos.length, 2);
  assert.strictEqual(motos[0]?.id, "m-2");
  assert.strictEqual(motos[0]?.status, "PENDING_APPROVAL");
});

test("cambiarEstadoMotoAdmin rechaza estados inválidos (400) y motos inexistentes (404)", async () => {
  const { deps } = crearDeps();

  await assert.rejects(
    cambiarEstadoMotoAdmin("m-2", "HACKED", deps),
    (e: unknown) => e instanceof AppError && e.status === 400
  );

  const { deps: deps404 } = crearDeps({
    buscarMotoAdminPorId: mock.fn(async () => null) as any,
  });
  await assert.rejects(
    cambiarEstadoMotoAdmin("no-existe", "AVAILABLE", deps404),
    (e: unknown) => e instanceof AppError && e.status === 404
  );

  const aprobada = await cambiarEstadoMotoAdmin("m-2", "AVAILABLE", deps);
  assert.strictEqual(aprobada.status, "AVAILABLE");
});

test("obtenerUsuariosParaAdmin filtra por nombre, correo o rol", async () => {
  const { deps } = crearDeps();

  const todos = await obtenerUsuariosParaAdmin(undefined, deps);
  assert.strictEqual(todos.length, 2);

  const soloLaura = await obtenerUsuariosParaAdmin("laura", deps);
  assert.strictEqual(soloLaura.length, 1);
  assert.strictEqual(soloLaura[0]?.username, "laurad");
});

test("obtenerResenasParaAdmin marca alertas automáticamente cuando rating <= 3", async () => {
  const { deps } = crearDeps();
  const resenas = await obtenerResenasParaAdmin(deps);

  assert.strictEqual(resenas.length, 1);
  assert.strictEqual(resenas[0]?.esAlerta, true);
  assert.strictEqual(resenas[0]?.moto, "Honda CB160F (ABC12D)");
});
