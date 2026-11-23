import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularPasoCicloRenta,
  validarFormularioActa,
  validarFormularioIncidente,
} from "../src/utils/rentas.utils.ts";

test("calcularPasoCicloRenta refleja cada etapa del flujo de renta", () => {
  assert.equal(calcularPasoCicloRenta({ status: "PENDING", contract: null }), 1);
  assert.equal(
    calcularPasoCicloRenta({ status: "PENDING", contract: { accepted: true } }),
    2
  );
  assert.equal(calcularPasoCicloRenta({ status: "PAID" }), 3);
  assert.equal(calcularPasoCicloRenta({ status: "ACTIVE", tienePickup: true }), 4);
  assert.equal(calcularPasoCicloRenta({ status: "COMPLETED", tieneReturn: true }), 5);
  assert.equal(calcularPasoCicloRenta({ status: "CANCELLED" }), 0);
  assert.equal(calcularPasoCicloRenta({ status: "INCIDENT" }), 0);
});

test("validarFormularioActa rechaza kilometraje menor al actual o combustible fuera de rango", () => {
  assert.ok(validarFormularioActa(4800, 5000, 90));
  assert.ok(validarFormularioActa(5100, 5000, 120));
  assert.ok(validarFormularioActa(5100.5, 5000, 80));
  assert.equal(validarFormularioActa(5120, 5000, 90), null);
});

test("validarFormularioIncidente exige tipo válido y descripción mínima de 10 caracteres", () => {
  assert.ok(validarFormularioIncidente("OTRO", "Descripción válida larga"));
  assert.ok(validarFormularioIncidente("ACCIDENT", "Muy corta"));
  assert.equal(
    validarFormularioIncidente("ACCIDENT", "Caída en semáforo sin lesiones graves"),
    null
  );
});
