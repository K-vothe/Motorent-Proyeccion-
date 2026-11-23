import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import {
  procesarSolicitudOwner,
  procesarSolicitudRenter,
  resolverVerificacionPerfil,
  type DependenciasVerificacion,
} from "../src/services/verificacion-perfil.service.js";
import { AppError } from "../src/utils/handler.util.js";

// Data URLs sintéticos válidos (sin acceso real a disco ni base de datos)
const PNG_VALIDO =
  "data:image/png;base64," + Buffer.from("fake-png-content").toString("base64");
const PDF_VALIDO =
  "data:application/pdf;base64," +
  Buffer.from("%PDF-1.4 fake").toString("base64");

function crearDependenciasMock(
  overrides: Partial<DependenciasVerificacion["repo"]> = {}
) {
  const guardarArchivo = mock.fn(
    async (
      tipo: "renter" | "owner",
      userId: string,
      campo: string,
      mime: string
    ) => {
      const ext = mime === "application/pdf" ? "pdf" : "png";
      return `/uploads/verificaciones/${tipo}/${userId}/${campo}.${ext}`;
    }
  );

  const repo: any = {
    buscarRenterPorUserId: mock.fn(async () => null),
    buscarRenterPorCedula: mock.fn(async () => null),
    buscarRenterPorLicencia: mock.fn(async () => null),
    buscarRenterPorId: mock.fn(async () => null),
    guardarSolicitudRenter: mock.fn(async (datos: any) => ({
      id: "renter-1",
      ...datos,
      estadoVerificacion: "PENDING",
      motivoRechazo: null,
    })),
    buscarOwnerPorUserId: mock.fn(async () => null),
    buscarOwnerPorCedula: mock.fn(async () => null),
    buscarOwnerPorId: mock.fn(async () => null),
    guardarSolicitudOwner: mock.fn(async (datos: any) => ({
      id: "owner-1",
      ...datos,
      estadoVerificacion: "PENDING",
      motivoRechazo: null,
    })),
    listarVerificacionesPendientes: mock.fn(async () => ({
      renters: [],
      owners: [],
      resumen: { rentersPendientes: 0, ownersPendientes: 0, motosPendientes: 0 },
    })),
    actualizarEstadoRenter: mock.fn(
      async (id: string, estado: string, motivoRechazo: string | null) => ({
        id,
        estadoVerificacion: estado,
        motivoRechazo,
      })
    ),
    actualizarEstadoOwner: mock.fn(
      async (id: string, estado: string, motivoRechazo: string | null) => ({
        id,
        estadoVerificacion: estado,
        motivoRechazo,
      })
    ),
    ...overrides,
  };

  return {
    deps: { repo, guardarArchivo } as DependenciasVerificacion,
    repo,
    guardarArchivo,
  };
}

const payloadRenterValido = {
  cedulaNumero: "1023456789",
  cedulaFront: PNG_VALIDO,
  cedulaBack: PNG_VALIDO,
  photo: PNG_VALIDO,
  licenseNumber: "LIC-987654",
  licenseCategory: "A2",
  licenseFront: PNG_VALIDO,
  licenseBack: PNG_VALIDO,
  bill: PDF_VALIDO,
};

const payloadOwnerValido = {
  cedulaNumero: "1098765432",
  cedulaFront: PNG_VALIDO,
  cedulaBack: PNG_VALIDO,
  photo: PNG_VALIDO,
  bill: PDF_VALIDO,
};

test("Renter: rechaza una cédula con menos de 6 dígitos", async () => {
  const { deps } = crearDependenciasMock();

  await assert.rejects(
    procesarSolicitudRenter("user-1", { ...payloadRenterValido, cedulaNumero: "1234" }, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      return true;
    }
  );
});

test("Renter: rechaza categoría de licencia que no sea A1 o A2", async () => {
  const { deps } = crearDependenciasMock();

  await assert.rejects(
    procesarSolicitudRenter("user-1", { ...payloadRenterValido, licenseCategory: "B1" }, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      return true;
    }
  );
});

test("Renter: rechaza con 409 si el usuario ya está aprobado", async () => {
  const { deps, guardarArchivo } = crearDependenciasMock({
    buscarRenterPorUserId: mock.fn(async () => ({
      id: "renter-1",
      idUser: "user-1",
      estadoVerificacion: "APPROVED",
    })) as any,
  });

  await assert.rejects(
    procesarSolicitudRenter("user-1", payloadRenterValido, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 409);
      return true;
    }
  );

  assert.strictEqual(guardarArchivo.mock.calls.length, 0);
});

test("Renter: rechaza con 409 si la cédula pertenece a otro usuario", async () => {
  const { deps, guardarArchivo } = crearDependenciasMock({
    buscarRenterPorCedula: mock.fn(async () => ({
      id: "renter-otro",
      idUser: "otro-usuario",
      cedulaNumero: "1023456789",
    })) as any,
  });

  await assert.rejects(
    procesarSolicitudRenter("user-1", payloadRenterValido, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 409);
      return true;
    }
  );

  assert.strictEqual(guardarArchivo.mock.calls.length, 0);
});

test("Renter: rechaza PDF en campo de foto de cédula sin guardar ningún archivo", async () => {
  const { deps, guardarArchivo } = crearDependenciasMock();

  await assert.rejects(
    procesarSolicitudRenter(
      "user-1",
      { ...payloadRenterValido, cedulaFront: PDF_VALIDO },
      deps
    ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      assert.match(error.message, /cedulaFront/);
      return true;
    }
  );

  assert.strictEqual(
    guardarArchivo.mock.calls.length,
    0,
    "No debe escribir archivos en disco si falla la validación de un campo"
  );
});

test("Renter: procesa y guarda los 6 archivos y el registro PENDING cuando todo es válido", async () => {
  const { deps, repo, guardarArchivo } = crearDependenciasMock();

  const resultado = await procesarSolicitudRenter(
    "user-1",
    payloadRenterValido,
    deps
  );

  assert.strictEqual(guardarArchivo.mock.calls.length, 6);
  assert.strictEqual(repo.guardarSolicitudRenter.mock.calls.length, 1);
  assert.strictEqual(resultado.estadoVerificacion, "PENDING");
  assert.strictEqual(resultado.cedulaNumero, "1023456789");
  assert.strictEqual(resultado.licenseCategory, "A2");
  assert.strictEqual(resultado.billUrl, "/uploads/verificaciones/renter/user-1/bill.pdf");
});

test("Owner: rechaza con 409 si la cédula pertenece a otro propietario", async () => {
  const { deps, guardarArchivo } = crearDependenciasMock({
    buscarOwnerPorCedula: mock.fn(async () => ({
      id: "owner-otro",
      idUser: "otro-usuario",
      cedulaNumero: "1098765432",
    })) as any,
  });

  await assert.rejects(
    procesarSolicitudOwner("user-2", payloadOwnerValido, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 409);
      return true;
    }
  );

  assert.strictEqual(guardarArchivo.mock.calls.length, 0);
});

test("Owner: guarda los 4 documentos y registra el perfil Owner en estado PENDING", async () => {
  const { deps, repo, guardarArchivo } = crearDependenciasMock();

  const resultado = await procesarSolicitudOwner(
    "user-2",
    payloadOwnerValido,
    deps
  );

  assert.strictEqual(guardarArchivo.mock.calls.length, 4);
  assert.strictEqual(repo.guardarSolicitudOwner.mock.calls.length, 1);
  assert.strictEqual(resultado.estadoVerificacion, "PENDING");
  assert.strictEqual(resultado.billUrl, "/uploads/verificaciones/owner/user-2/bill.pdf");
});

test("Admin: exige motivo de rechazo (mínimo 5 caracteres) al marcar REJECTED", async () => {
  const { deps } = crearDependenciasMock({
    buscarRenterPorId: mock.fn(async () => ({ id: "renter-1" })) as any,
  });

  await assert.rejects(
    resolverVerificacionPerfil(
      "renter",
      "renter-1",
      { estado: "REJECTED", motivoRechazo: "No" },
      deps
    ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      return true;
    }
  );
});

test("Admin: responde 404 cuando la solicitud no existe", async () => {
  const { deps } = crearDependenciasMock();

  await assert.rejects(
    resolverVerificacionPerfil(
      "owner",
      "inexistente",
      { estado: "APPROVED" },
      deps
    ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 404);
      return true;
    }
  );
});

test("Admin: aprueba un Renter y rechaza un Owner con motivo válido", async () => {
  const { deps, repo } = crearDependenciasMock({
    buscarRenterPorId: mock.fn(async () => ({ id: "renter-1", idUser: "u-1" })) as any,
    buscarOwnerPorId: mock.fn(async () => ({ id: "owner-1", idUser: "u-2" })) as any,
  });

  const aprobado = await resolverVerificacionPerfil(
    "renter",
    "renter-1",
    { estado: "APPROVED" },
    deps
  );
  assert.strictEqual(aprobado.estadoVerificacion, "APPROVED");
  assert.strictEqual(repo.actualizarEstadoRenter.mock.calls.length, 1);

  const rechazado = await resolverVerificacionPerfil(
    "owner",
    "owner-1",
    {
      estado: "REJECTED",
      motivoRechazo: "El recibo público está vencido, sube uno reciente.",
    },
    deps
  );
  assert.strictEqual(rechazado.estadoVerificacion, "REJECTED");
  assert.strictEqual(
    rechazado.motivoRechazo,
    "El recibo público está vencido, sube uno reciente."
  );
  assert.strictEqual(repo.actualizarEstadoOwner.mock.calls.length, 1);
});
