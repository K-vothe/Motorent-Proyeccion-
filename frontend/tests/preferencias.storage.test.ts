import test from "node:test";
import assert from "node:assert/strict";
import {
  PREFERENCIAS_POR_DEFECTO,
  resolverTemaEfectivo,
  sanearPreferencias,
} from "../src/utils/preferencias.storage.ts";

test("resolverTemaEfectivo respeta claro, oscuro y automático según el sistema", () => {
  assert.strictEqual(resolverTemaEfectivo("claro", true), "claro");
  assert.strictEqual(resolverTemaEfectivo("oscuro", false), "oscuro");
  assert.strictEqual(resolverTemaEfectivo("sistema", true), "oscuro");
  assert.strictEqual(resolverTemaEfectivo("sistema", false), "claro");
});

test("sanearPreferencias devuelve valores por defecto ante datos nulos o corruptos", () => {
  assert.deepStrictEqual(sanearPreferencias(null), PREFERENCIAS_POR_DEFECTO);
  assert.deepStrictEqual(
    sanearPreferencias({ tema: "neon", motosPorPagina: 999, formatoNombrePublico: "x" }),
    PREFERENCIAS_POR_DEFECTO
  );
});

test("sanearPreferencias conserva configuraciones válidas personalizadas", () => {
  const resultado = sanearPreferencias({
    tema: "oscuro",
    motosPorPagina: 30,
    notifVerificacion: false,
    notifDevolucion: true,
    notifResenas: false,
    formatoNombrePublico: "completo",
    mostrarHistorialPublico: false,
  });

  assert.strictEqual(resultado.tema, "oscuro");
  assert.strictEqual(resultado.motosPorPagina, 30);
  assert.strictEqual(resultado.notifVerificacion, false);
  assert.strictEqual(resultado.formatoNombrePublico, "completo");
  assert.strictEqual(resultado.mostrarHistorialPublico, false);
});
