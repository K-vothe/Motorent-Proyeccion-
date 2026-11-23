import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import {
  actualizarGaleriaMoto,
  obtenerGaleriaMoto,
  obtenerPortadaMoto,
  type DependenciasGaleria,
} from "../src/services/moto-galeria.service.js";
import { AppError } from "../src/utils/handler.util.js";

// Imágenes sintéticas: nunca se escribe en disco ni en PostgreSQL
const JPG = "data:image/jpeg;base64," + Buffer.from("fake-jpg").toString("base64");
const PDF = "data:application/pdf;base64," + Buffer.from("%PDF fake").toString("base64");

const FECHA_FIJA = new Date("2026-11-20T15:00:00.000Z");

function crearDeps(opciones: {
  moto?: any;
  fotosExistentes?: string[];
  evidencias?: any[];
  ficha?: any;
} = {}) {
  const fotos = [...(opciones.fotosExistentes ?? [])];

  const guardarFoto = mock.fn(async (_motoId: string, nombre: string) => {
    fotos.push(nombre);
  });
  const guardarFicha = mock.fn(async () => {});

  const deps: DependenciasGaleria = {
    repo: {
      buscarMotoPorId: mock.fn(async () =>
        opciones.moto === undefined
          ? { id: "moto-1", owner: { idUser: "dueno-1" } }
          : opciones.moto
      ) as any,
      obtenerEvidenciasDevolucion: mock.fn(async () => opciones.evidencias ?? []) as any,
    },
    almacenamiento: {
      listarFotos: async () => fotos.map((nombre) => ({ nombre })),
      guardarFoto,
      leerFicha: async () => opciones.ficha ?? null,
      guardarFicha,
    },
    ahora: () => FECHA_FIJA,
  };

  return { deps, guardarFoto, guardarFicha };
}

test("Galería: responde 404 si la moto no existe", async () => {
  const { deps } = crearDeps({ moto: null });

  await assert.rejects(obtenerGaleriaMoto("moto-x", deps), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.strictEqual(error.status, 404);
    return true;
  });
});

test("Galería: combina fotos del propietario e inspecciones de devolución (más reciente primero)", async () => {
  const { deps } = crearDeps({
    fotosExistentes: ["foto-1-01.jpg", "foto-1-02.webp"],
    ficha: { descripcion: "Moto revisada cada 5.000 km en taller oficial.", actualizadaEn: "2026-11-01T00:00:00.000Z" },
    evidencias: [
      {
        fileUrl: "/uploads/inspecciones/r2-lateral.jpg",
        description: "Lateral derecho",
        handover: { createdAt: new Date("2026-11-18T10:00:00.000Z"), mileage: 15200 },
      },
      {
        fileUrl: "/uploads/inspecciones/r1-frontal.jpg",
        description: null,
        handover: { createdAt: new Date("2026-10-02T10:00:00.000Z"), mileage: 14100 },
      },
    ],
  });

  const galeria = await obtenerGaleriaMoto("moto-1", deps);

  assert.strictEqual(galeria.fotosPropietario.length, 2);
  assert.strictEqual(galeria.fotosPropietario[0]?.url, "/uploads/motos/moto-1/foto-1-01.jpg");
  assert.strictEqual(galeria.fotosInspeccion.length, 2);
  assert.strictEqual(galeria.fotosInspeccion[0]?.origen, "INSPECCION");
  assert.strictEqual(galeria.ultimaInspeccion, "2026-11-18T10:00:00.000Z");
  assert.strictEqual(galeria.descripcionPropietario, "Moto revisada cada 5.000 km en taller oficial.");
});

test("Galería: rechaza con 403 si quien sube no es el dueño ni ADMIN", async () => {
  const { deps, guardarFoto } = crearDeps();

  await assert.rejects(
    actualizarGaleriaMoto({ id: "otro-usuario", role: "OWNER" }, "moto-1", { fotos: [JPG] }, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 403);
      return true;
    }
  );
  assert.strictEqual(guardarFoto.mock.calls.length, 0);
});

test("Galería: rechaza PDF como foto y no guarda ninguna imagen del lote", async () => {
  const { deps, guardarFoto } = crearDeps();

  await assert.rejects(
    actualizarGaleriaMoto({ id: "dueno-1", role: "OWNER" }, "moto-1", { fotos: [JPG, PDF] }, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      assert.match(error.message, /Foto 2/);
      return true;
    }
  );
  assert.strictEqual(guardarFoto.mock.calls.length, 0);
});

test("Galería: respeta el límite total de 12 fotos", async () => {
  const existentes = Array.from({ length: 10 }, (_, i) => `foto-0-${i}.jpg`);
  const { deps } = crearDeps({ fotosExistentes: existentes });

  await assert.rejects(
    actualizarGaleriaMoto({ id: "dueno-1", role: "OWNER" }, "moto-1", { fotos: [JPG, JPG, JPG] }, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      return true;
    }
  );
});

test("Galería: exige descripción de al menos 20 caracteres cuando se envía", async () => {
  const { deps } = crearDeps();

  await assert.rejects(
    actualizarGaleriaMoto({ id: "dueno-1", role: "OWNER" }, "moto-1", { descripcion: "Muy buena" }, deps),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.strictEqual(error.status, 400);
      return true;
    }
  );
});

test("Galería: el dueño guarda 2 fotos + descripción y recibe la galería actualizada", async () => {
  const { deps, guardarFoto, guardarFicha } = crearDeps();

  const galeria = await actualizarGaleriaMoto(
    { id: "dueno-1", role: "OWNER" },
    "moto-1",
    { fotos: [JPG, JPG], descripcion: "Moto con llantas nuevas y mantenimiento reciente." },
    deps
  );

  assert.strictEqual(guardarFoto.mock.calls.length, 2);
  assert.strictEqual(guardarFoto.mock.calls[0]?.arguments[1], `foto-${FECHA_FIJA.getTime()}-01.jpg`);
  assert.strictEqual(guardarFicha.mock.calls.length, 1);
  assert.strictEqual(galeria.fotosPropietario.length, 2);
});

test("Galería: un ADMIN puede actualizar la galería de cualquier moto", async () => {
  const { deps, guardarFoto } = crearDeps();

  await actualizarGaleriaMoto({ id: "admin-1", role: "ADMIN" }, "moto-1", { fotos: [JPG] }, deps);
  assert.strictEqual(guardarFoto.mock.calls.length, 1);
});

test("Portada: devuelve la primera foto o null si no hay fotos", async () => {
  const conFotos = await obtenerPortadaMoto("moto-1", {
    listarFotos: async () => [{ nombre: "foto-1-01.jpg" }],
    guardarFoto: async () => {},
    leerFicha: async () => null,
    guardarFicha: async () => {},
  });
  const sinFotos = await obtenerPortadaMoto("moto-2", {
    listarFotos: async () => [],
    guardarFoto: async () => {},
    leerFicha: async () => null,
    guardarFicha: async () => {},
  });

  assert.strictEqual(conFotos, "/uploads/motos/moto-1/foto-1-01.jpg");
  assert.strictEqual(sinFotos, null);
});
