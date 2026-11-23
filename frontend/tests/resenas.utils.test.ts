import test from "node:test";
import assert from "node:assert/strict";
import {
  etiquetaCalificacion,
  formatearNombreSegunPreferencia,
  validarFormularioResena,
} from "../src/utils/resenas.utils.ts";

test("validarFormularioResena exige comentario cuando la calificación es 3 o menos", () => {
  assert.ok(validarFormularioResena(0, ""));
  assert.ok(validarFormularioResena(3, "Regular"));
  assert.strictEqual(
    validarFormularioResena(3, "La motocicleta tenía un espejo flojo al entregarla."),
    null
  );
  assert.strictEqual(validarFormularioResena(5, ""), null);
});

test("etiquetaCalificacion devuelve etiquetas sobrias del 1 al 5", () => {
  assert.strictEqual(etiquetaCalificacion(5), "Excelente");
  assert.strictEqual(etiquetaCalificacion(4), "Muy buena");
  assert.strictEqual(etiquetaCalificacion(3), "Aceptable");
  assert.strictEqual(etiquetaCalificacion(2), "Mejorable");
  assert.strictEqual(etiquetaCalificacion(1), "Deficiente");
});

test("formatearNombreSegunPreferencia respeta privacidad inicial vs nombre completo", () => {
  assert.strictEqual(
    formatearNombreSegunPreferencia("Carlos Martínez Gómez", "inicial"),
    "Carlos M."
  );
  assert.strictEqual(
    formatearNombreSegunPreferencia("Carlos Martínez Gómez", "completo"),
    "Carlos Martínez Gómez"
  );
});
