import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import {
  MINUTOS_DOBLE_CIEGO,
  calcularResumenReputacion,
  esResenaVisible,
  formatearNombrePublico,
  obtenerCalificacionesPendientes,
  obtenerPerfilPublico,
  registrarResena,
  type DependenciasResena,
} from "../src/services/resena.service.js";
import { AppError } from "../src/utils/handler.util.js";

const AHORA = new Date("2026-11-22T15:00:00.000Z");

function crearDeps(overrides: Partial<DependenciasResena["repo"]> = {}) {
  const crearResena = mock.fn(async (datos: any) => ({
    id: "rev-1",
    ...datos,
    createdAt: AHORA,
  }));

  const repo: any = {
    buscarRentaParaResena: mock.fn(async () => ({
      id: "renta-1",
      status: "COMPLETED",
      renter: { idUser: "user-renter" },
      moto: {
        id: "moto-1",
        brand: "Yamaha",
        model: "MT-03",
        owner: { idUser: "user-owner" },
      },
      reviews: [],
    })),
    buscarResenaExistente: mock.fn(async () => null),
    crearResena,
    listarResenasDeMoto: mock.fn(async () => []),
    listarRentasCompletadasDeUsuario: mock.fn(async () => []),
    obtenerPerfilPublicoPorId: mock.fn(async () => null),
    ...overrides,
  };

  return {
    deps: { repo, ahora: () => AHORA } as DependenciasResena,
    repo,
    crearResena,
  };
}

test("formatearNombrePublico protege el apellido dejando solo la inicial", () => {
  assert.strictEqual(formatearNombrePublico("Carlos Martínez Gómez"), "Carlos M.");
  assert.strictEqual(formatearNombrePublico("Sofía"), "Sofía");
  assert.strictEqual(formatearNombrePublico("   "), "Usuario MotoRent");
});

test("esResenaVisible aplica doble ciego y libera a los 30 minutos o cuando ambos califican", () => {
  const visibleAt = new Date(AHORA.getTime() + MINUTOS_DOBLE_CIEGO * 60 * 1000);

  // 10 minutos después, solo 1 autor -> todavía oculta
  const diezMin = new Date(AHORA.getTime() + 10 * 60 * 1000);
  assert.strictEqual(esResenaVisible(visibleAt, ["user-renter"], diezMin), false);

  // 10 minutos después, ambos autores ya calificaron -> visible inmediatamente
  assert.strictEqual(
    esResenaVisible(visibleAt, ["user-renter", "user-owner"], diezMin),
    true
  );

  // 30 minutos después, aunque solo 1 calificó -> se publica automáticamente
  const treintaMin = new Date(AHORA.getTime() + 30 * 60 * 1000);
  assert.strictEqual(esResenaVisible(visibleAt, ["user-renter"], treintaMin), true);
});

test("calcularResumenReputacion calcula promedio a 1 decimal", () => {
  assert.deepStrictEqual(calcularResumenReputacion([]), { promedio: 0, total: 0 });
  assert.deepStrictEqual(calcularResumenReputacion([5, 4, 5]), {
    promedio: 4.7,
    total: 3,
  });
});

test("registrarResena rechaza calificar una renta que todavía no está COMPLETED", async () => {
  const { deps } = crearDeps({
    buscarRentaParaResena: mock.fn(async () => ({
      id: "renta-activa",
      status: "ACTIVE",
      renter: { idUser: "user-renter" },
      moto: { id: "m1", brand: "Honda", model: "CB", owner: { idUser: "user-owner" } },
      reviews: [],
    })) as any,
  });

  await assert.rejects(
    registrarResena("user-renter", { rentalId: "renta-activa", targetType: "MOTO", rating: 5 }, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      return true;
    }
  );
});

test("registrarResena exige comentario explicativo cuando la nota es 3 o menos", async () => {
  const { deps } = crearDeps();

  await assert.rejects(
    registrarResena(
      "user-renter",
      { rentalId: "renta-1", targetType: "MOTO", rating: 2, comment: "Mala" },
      deps
    ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      return true;
    }
  );
});

test("registrarResena rechaza con 403 si un ajeno intenta calificar la renta", async () => {
  const { deps } = crearDeps();

  await assert.rejects(
    registrarResena(
      "usuario-intruso",
      { rentalId: "renta-1", targetType: "MOTO", rating: 5 },
      deps
    ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 403);
      return true;
    }
  );
});

test("registrarResena rechaza duplicados con 409", async () => {
  const { deps } = crearDeps({
    buscarResenaExistente: mock.fn(async () => ({ id: "ya-existe" })) as any,
  });

  await assert.rejects(
    registrarResena(
      "user-renter",
      { rentalId: "renta-1", targetType: "OWNER", rating: 5 },
      deps
    ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 409);
      return true;
    }
  );
});

test("registrarResena crea calificación válida con visibleAt a +30 minutos", async () => {
  const { deps, crearResena } = crearDeps();

  const resultado = await registrarResena(
    "user-owner",
    {
      rentalId: "renta-1",
      targetType: "RENTER",
      rating: 5,
      comment: "Entregó la motocicleta puntual y en perfecto estado.",
    },
    deps
  );

  assert.strictEqual(crearResena.mock.calls.length, 1);
  assert.strictEqual(resultado.targetUserId, "user-renter");
  assert.strictEqual(
    resultado.visibleAt.getTime(),
    AHORA.getTime() + 30 * 60 * 1000
  );
});

test("obtenerCalificacionesPendientes detecta evaluaciones obligatorias faltantes", async () => {
  const { deps } = crearDeps({
    listarRentasCompletadasDeUsuario: mock.fn(async () => [
      {
        id: "renta-1",
        renter: { idUser: "user-renter", user: { id: "user-renter", fullName: "Laura Díaz" } },
        moto: {
          id: "moto-1",
          brand: "Yamaha",
          model: "MT-03",
          owner: { idUser: "user-owner", user: { id: "user-owner", fullName: "Carlos Méndez" } },
        },
        reviews: [{ authorId: "user-renter", targetType: "MOTO" }],
      },
    ]) as any,
  });

  const pendientes = await obtenerCalificacionesPendientes("user-renter", deps);
  assert.strictEqual(pendientes.tienePendientes, true);
  assert.deepStrictEqual(pendientes.pendientes[0]?.objetivosPendientes, ["OWNER"]);
});

test("obtenerPerfilPublico filtra reseñas en doble ciego y oculta datos sensibles", async () => {
  const { deps } = crearDeps({
    obtenerPerfilPublicoPorId: mock.fn(async () => ({
      id: "user-owner",
      fullName: "Carlos Méndez",
      createdAt: new Date("2026-01-10T00:00:00.000Z"),
      renter: null,
      owner: { estadoVerificacion: "APPROVED", motos: [] },
      reviewsReceived: [
        {
          id: "rev-oculta",
          targetType: "OWNER",
          rating: 5,
          comment: "Oculta todavía",
          createdAt: AHORA,
          visibleAt: new Date(AHORA.getTime() + 20 * 60 * 1000),
          author: { id: "u2", fullName: "Ana Ruiz" },
          moto: null,
          rental: { id: "r1", reviews: [{ authorId: "u2" }] },
        },
        {
          id: "rev-visible",
          targetType: "OWNER",
          rating: 5,
          comment: "Excelente trato",
          createdAt: new Date(AHORA.getTime() - 60 * 60 * 1000),
          visibleAt: new Date(AHORA.getTime() - 30 * 60 * 1000),
          author: { id: "u3", fullName: "Luis Gómez" },
          moto: null,
          rental: { id: "r2", reviews: [{ authorId: "u3" }] },
        },
      ],
    })) as any,
  });

  const perfil = await obtenerPerfilPublico("user-owner", deps);
  assert.strictEqual(perfil.nombrePublico, "Carlos M.");
  assert.strictEqual(perfil.resenasComoPropietario.length, 1);
  assert.strictEqual(perfil.resenasComoPropietario[0]?.id, "rev-visible");
  assert.strictEqual((perfil as any).email, undefined);
  assert.strictEqual((perfil as any).phone, undefined);
});
