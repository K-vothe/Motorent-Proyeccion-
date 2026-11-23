import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularDiasRenta,
  clasificarCilindraje,
  completarGaleriaCarrusel,
  construirGaleria,
  describirRecorrido,
  filtrarYOrdenarMotos,
  formatearFechaCorta,
  formatearKilometraje,
  formatearPrecioCOP,
  generarDescripcionMoto,
  moverIndiceCircular,
  paginarLista,
  resolverUrlFoto,
  type MotoCatalogo,
} from "../src/utils/moto.utils.ts";

test("formatearPrecioCOP y formatearKilometraje formatean con puntos colombianos", () => {
  assert.strictEqual(formatearPrecioCOP(85000), "$85.000");
  assert.strictEqual(formatearPrecioCOP("1250000"), "$1.250.000");
  assert.strictEqual(formatearKilometraje(14500), "14.500 km");
  assert.strictEqual(formatearKilometraje(null), "Sin registro");
});

test("clasificarCilindraje aplica regla colombiana A1 (<=125 cc) y A2 (>125 cc)", () => {
  assert.deepStrictEqual(clasificarCilindraje(125), {
    segmento: "Urbana",
    licenciaRequerida: "A1 o A2",
  });
  assert.deepStrictEqual(clasificarCilindraje(160), {
    segmento: "Urbana",
    licenciaRequerida: "A2",
  });
  assert.deepStrictEqual(clasificarCilindraje(321), {
    segmento: "Media cilindrada",
    licenciaRequerida: "A2",
  });
  assert.deepStrictEqual(clasificarCilindraje(650), {
    segmento: "Alta cilindrada",
    licenciaRequerida: "A2",
  });
});

test("describirRecorrido clasifica el desgaste según el kilometraje", () => {
  assert.strictEqual(describirRecorrido(2500), "Prácticamente nueva");
  assert.strictEqual(describirRecorrido(12000), "Bajo recorrido");
  assert.strictEqual(describirRecorrido(35000), "Recorrido moderado");
  assert.strictEqual(describirRecorrido(65000), "Recorrido alto");
  assert.strictEqual(describirRecorrido(undefined), "Recorrido sin registrar");
});

test("calcularDiasRenta calcula días exactos y garantiza mínimo 1 día", () => {
  assert.strictEqual(calcularDiasRenta("2026-11-22", "2026-11-22"), 1);
  assert.strictEqual(calcularDiasRenta("2026-11-22", "2026-11-25"), 3);
  assert.strictEqual(calcularDiasRenta("2026-11-25", "2026-11-22"), 1);
});

test("formatearFechaCorta formatea fechas ISO en español sin depender de zona horaria", () => {
  assert.strictEqual(formatearFechaCorta("2026-11-18T10:00:00.000Z"), "18 nov 2026");
  assert.strictEqual(formatearFechaCorta(null), "");
});

test("generarDescripcionMoto incluye la descripción del propietario primero si existe", () => {
  const desc = generarDescripcionMoto(
    {
      id: "m-1",
      brand: "Yamaha",
      model: "MT-03",
      year: 2023,
      displacement: 321,
      KM: 8400,
      color: "Negro Mate",
      dailyRate: 85000,
    },
    "Mantenimiento recién hecho en concesionario oficial Yamaha."
  );

  assert.match(desc.resumen, /Yamaha MT-03 2023/);
  assert.strictEqual(
    desc.parrafos[0],
    "Mantenimiento recién hecho en concesionario oficial Yamaha."
  );
  assert.ok(desc.destacados.some((d) => d.includes("Licencia A2")));
});

test("construirGaleria combina fotos de propietario e inspección sin duplicados", () => {
  const galeria = construirGaleria({
    fotosPropietario: [
      { url: "/uploads/motos/m1/foto-1.jpg", origen: "PROPIETARIO", descripcion: null, fecha: null },
    ],
    fotosInspeccion: [
      {
        url: "/uploads/inspecciones/dev-1.jpg",
        origen: "INSPECCION",
        descripcion: "Lateral derecho",
        fecha: "2026-11-18T10:00:00.000Z",
      },
    ],
    fotoPorDefecto: "/default.jpg",
    apiBase: "http://localhost:3000",
  });

  assert.strictEqual(galeria.length, 2);
  assert.strictEqual(galeria[0]?.src, "http://localhost:3000/uploads/motos/m1/foto-1.jpg");
  assert.strictEqual(galeria[0]?.origen, "PROPIETARIO");
  assert.strictEqual(galeria[1]?.origen, "INSPECCION");
  assert.match(galeria[1]?.etiqueta ?? "", /18 nov 2026/);
});

test("construirGaleria recurre a foto de referencia cuando no hay fotos cargadas", () => {
  const galeria = construirGaleria({
    fotoPorDefecto: "/default.jpg",
    apiBase: "http://localhost:3000",
  });

  assert.strictEqual(galeria.length, 1);
  assert.strictEqual(galeria[0]?.origen, "REFERENCIA");
  assert.strictEqual(galeria[0]?.src, "/default.jpg");
});

test("resolverUrlFoto y moverIndiceCircular manejan bordes correctamente", () => {
  assert.strictEqual(
    resolverUrlFoto("/uploads/motos/1/a.jpg", "http://localhost:3000/"),
    "http://localhost:3000/uploads/motos/1/a.jpg"
  );
  assert.strictEqual(
    resolverUrlFoto("data:image/jpeg;base64,abc", "http://localhost:3000"),
    "data:image/jpeg;base64,abc"
  );
  assert.strictEqual(moverIndiceCircular(0, -1, 4), 3);
  assert.strictEqual(moverIndiceCircular(3, 1, 4), 0);
});

const catalogoMuestra: MotoCatalogo[] = [
  { id: 1, brand: "TVS", model: "Raider", year: 2025, displacement: 125, KM: 1500, dailyRate: 38000 },
  { id: 2, brand: "Honda", model: "CB160F", year: 2024, displacement: 160, KM: 6000, dailyRate: 48000 },
  { id: 3, brand: "Yamaha", model: "FZ25", year: 2023, displacement: 250, KM: 12000, dailyRate: 70000 },
  { id: 4, brand: "Yamaha", model: "MT-03", year: 2024, displacement: 321, KM: 4000, dailyRate: 85000 },
];

test("filtrarYOrdenarMotos devuelve coincidencia exacta cuando existe el cilindraje buscado", () => {
  const res = filtrarYOrdenarMotos(catalogoMuestra, {
    busqueda: "",
    categoria: "Todas",
    rangoCc: "TODOS",
    ccObjetivo: 160,
    orden: "RELEVANCIA",
  });

  assert.strictEqual(res.coincidenciaCc, "EXACTA");
  assert.strictEqual(res.motos.length, 1);
  assert.strictEqual(res.motos[0]?.model, "CB160F");
});

test("filtrarYOrdenarMotos devuelve las más cercanas si no existe el cilindraje exacto", () => {
  const res = filtrarYOrdenarMotos(catalogoMuestra, {
    busqueda: "",
    categoria: "Todas",
    rangoCc: "TODOS",
    ccObjetivo: 200,
    orden: "RELEVANCIA",
  });

  assert.strictEqual(res.coincidenciaCc, "CERCANA");
  assert.strictEqual(res.ccMasCercano, 160);
  // 160 cc (diff 40), 250 cc (diff 50), 125 cc (diff 75), 321 cc (diff 121)
  assert.deepStrictEqual(
    res.motos.map((m) => m.displacement),
    [160, 250, 125, 321]
  );
});

test("filtrarYOrdenarMotos filtra por rango de cc y ordena por menor kilometraje", () => {
  const res = filtrarYOrdenarMotos(catalogoMuestra, {
    busqueda: "",
    categoria: "Todas",
    rangoCc: "150_250",
    ccObjetivo: null,
    orden: "KM_ASC",
  });

  assert.strictEqual(res.coincidenciaCc, "SIN_FILTRO");
  assert.deepStrictEqual(
    res.motos.map((m) => m.model),
    ["CB160F", "FZ25"]
  );
});

test("paginarLista divide correctamente en páginas de 24 y ajusta páginas fuera de rango", () => {
  const lista = Array.from({ length: 55 }, (_, i) => i + 1);

  const p1 = paginarLista(lista, 1, 24);
  assert.strictEqual(p1.totalPaginas, 3);
  assert.strictEqual(p1.itemsPagina.length, 24);
  assert.strictEqual(p1.desde, 1);
  assert.strictEqual(p1.hasta, 24);

  const p3 = paginarLista(lista, 99, 24);
  assert.strictEqual(p3.paginaSegura, 3);
  assert.strictEqual(p3.itemsPagina.length, 7);
  assert.strictEqual(p3.desde, 49);
  assert.strictEqual(p3.hasta, 55);
});

test("completarGaleriaCarrusel garantiza al menos 8 fotos para el carrusel giratorio", () => {
  const inicial = construirGaleria({
    fotoPorDefecto: "/default.jpg",
    apiBase: "http://localhost:3000",
  });
  const completa = completarGaleriaCarrusel(inicial, "/default.jpg", 8);

  assert.strictEqual(completa.length, 8);
  assert.ok(completa.some((f) => f.origen === "INSPECCION"));
});
