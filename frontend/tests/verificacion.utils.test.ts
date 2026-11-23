import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TAMANO_ARCHIVO_BYTES,
  formatearTamanoArchivo,
  validarArchivo,
  validarNumeroCedula,
  validarNumeroLicencia,
  validarPasoDomicilio,
  validarPasoIdentidad,
  validarPasoLicencia,
  type ArchivoCargado,
} from "../src/utils/verificacion.utils.ts";

/** Helper simple para crear un objeto ArchivoCargado simulado en pruebas unitarias. */
function crearArchivoPrueba(nombre = "foto.jpg", tipo = "image/jpeg"): ArchivoCargado {
  const fileSimulado = new File(["contenido-de-prueba"], nombre, { type: tipo });
  return {
    file: fileSimulado,
    previewUrl: "blob:http://localhost/prueba",
    esPdf: tipo === "application/pdf",
  };
}

// ============================================================================
// 1. PRUEBAS DE VALIDACIÓN DE CÉDULA
// ============================================================================

test("validarNumeroCedula rechaza campos vacíos, letras o longitudes inválidas", () => {
  assert.ok(validarNumeroCedula(""), "Debe rechazar cédula vacía");
  assert.ok(validarNumeroCedula("   "), "Debe rechazar solo espacios");
  assert.ok(validarNumeroCedula("10234ABC"), "Debe rechazar letras");
  assert.ok(validarNumeroCedula("10.234.567"), "Debe rechazar puntos");
  assert.ok(validarNumeroCedula("12345"), "Debe rechazar menos de 6 dígitos");
  assert.ok(validarNumeroCedula("1234567890123"), "Debe rechazar más de 12 dígitos");
});

test("validarNumeroCedula acepta cédulas colombianas válidas de 6 a 12 dígitos", () => {
  assert.strictEqual(validarNumeroCedula("1023456789"), null);
  assert.strictEqual(validarNumeroCedula("  79456123  "), null);
});

// ============================================================================
// 2. PRUEBAS DE VALIDACIÓN DE LICENCIA
// ============================================================================

test("validarNumeroLicencia rechaza valores vacíos, cortos o con símbolos inválidos", () => {
  assert.ok(validarNumeroLicencia(""));
  assert.ok(validarNumeroLicencia("12345"));
  assert.ok(validarNumeroLicencia("LIC@12345"));
});

test("validarNumeroLicencia acepta números y códigos alfanuméricos válidos", () => {
  assert.strictEqual(validarNumeroLicencia("1023456789"), null);
  assert.strictEqual(validarNumeroLicencia("LIC-2026-01"), null);
});

// ============================================================================
// 3. PRUEBAS DE VALIDACIÓN Y FORMATO DE ARCHIVOS
// ============================================================================

test("validarArchivo acepta imágenes PNG, JPG y WEBP dentro del límite de 5 MB", () => {
  assert.strictEqual(
    validarArchivo({ name: "cedula.png", type: "image/png", size: 500_000 }),
    null
  );
  assert.strictEqual(
    validarArchivo({ name: "foto.jpg", type: "image/jpeg", size: 1_200_000 }),
    null
  );
  assert.strictEqual(
    validarArchivo({ name: "selfie.webp", type: "image/webp", size: 300_000 }),
    null
  );
});

test("validarArchivo rechaza PDF cuando solo se permiten imágenes, y lo acepta cuando permitirPdf=true", () => {
  const reciboPdf = {
    name: "recibo_agua.pdf",
    type: "application/pdf",
    size: 800_000,
  };

  assert.ok(
    validarArchivo(reciboPdf, false),
    "Debe rechazar PDF para fotos de cédula o licencia"
  );
  assert.strictEqual(
    validarArchivo(reciboPdf, true),
    null,
    "Debe aceptar PDF para comprobante de domicilio"
  );
});

test("validarArchivo rechaza archivos vacíos, tipos peligrosos o mayores a 5 MB", () => {
  assert.ok(validarArchivo({ name: "vacio.jpg", type: "image/jpeg", size: 0 }));
  assert.ok(
    validarArchivo({ name: "script.exe", type: "application/octet-stream", size: 1024 }, true)
  );
  assert.ok(
    validarArchivo({
      name: "muy_pesada.jpg",
      type: "image/jpeg",
      size: MAX_TAMANO_ARCHIVO_BYTES + 1,
    })
  );
});

test("formatearTamanoArchivo convierte bytes a B, KB y MB legibles", () => {
  assert.strictEqual(formatearTamanoArchivo(512), "512 B");
  assert.strictEqual(formatearTamanoArchivo(2048), "2 KB");
  assert.strictEqual(formatearTamanoArchivo(1.5 * 1024 * 1024), "1.5 MB");
});

// ============================================================================
// 4. PRUEBAS DE VALIDACIÓN POR PASOS DEL WIZARD
// ============================================================================

test("validarPasoIdentidad reporta los 4 errores cuando el paso 1 está vacío", () => {
  const errores = validarPasoIdentidad({
    cedulaNumero: "",
    cedulaFront: null,
    cedulaBack: null,
    photo: null,
  });

  assert.ok(errores.cedulaNumero);
  assert.ok(errores.cedulaFront);
  assert.ok(errores.cedulaBack);
  assert.ok(errores.photo);
  assert.strictEqual(Object.keys(errores).length, 4);
});

test("validarPasoIdentidad aprueba el paso 1 cuando todos los datos y fotos son válidos", () => {
  const errores = validarPasoIdentidad({
    cedulaNumero: "1023456789",
    cedulaFront: crearArchivoPrueba("frente.jpg"),
    cedulaBack: crearArchivoPrueba("reverso.jpg"),
    photo: crearArchivoPrueba("rostro.jpg"),
  });

  assert.deepStrictEqual(errores, {});
});

test("validarPasoLicencia rechaza categoría inválida y aprueba A1/A2 completas", () => {
  const erroresInvalidos = validarPasoLicencia({
    licenseNumber: "1023456789",
    licenseCategory: "B1", // Categoría de carro, no de moto
    licenseFront: null,
    licenseBack: null,
  });

  assert.ok(erroresInvalidos.licenseCategory);
  assert.ok(erroresInvalidos.licenseFront);
  assert.ok(erroresInvalidos.licenseBack);

  const sinErrores = validarPasoLicencia({
    licenseNumber: "1023456789",
    licenseCategory: "A2",
    licenseFront: crearArchivoPrueba("lic_frente.png", "image/png"),
    licenseBack: crearArchivoPrueba("lic_reverso.png", "image/png"),
  });

  assert.deepStrictEqual(sinErrores, {});
});

test("validarPasoDomicilio exige el comprobante y aprueba imagen o PDF válido", () => {
  const erroresVacio = validarPasoDomicilio({ bill: null });
  assert.ok(erroresVacio.bill);

  const sinErrores = validarPasoDomicilio({
    bill: crearArchivoPrueba("recibo.pdf", "application/pdf"),
  });
  assert.deepStrictEqual(sinErrores, {});
});
