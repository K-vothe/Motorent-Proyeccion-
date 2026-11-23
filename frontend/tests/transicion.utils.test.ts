import test from "node:test";
import assert from "node:assert/strict";
import {
  construirContenidoTransicion,
  construirMensajeConfirmacionCambioPerfil,
  extraerPrimerNombre,
} from "../src/utils/transicion.utils.ts";

test("extraerPrimerNombre devuelve solo el primer nombre limpio", () => {
  assert.equal(extraerPrimerNombre("Diego Alejandro Mora"), "Diego");
  assert.equal(extraerPrimerNombre("  Valentina  "), "Valentina");
  assert.equal(extraerPrimerNombre(null), "");
});

test("construirMensajeConfirmacionCambioPerfil invierte correctamente origen y destino", () => {
  const haciaOwner = construirMensajeConfirmacionCambioPerfil("RENTER");
  assert.equal(haciaOwner.modoOrigen, "RENTER");
  assert.equal(haciaOwner.modoDestino, "OWNER");
  assert.match(haciaOwner.descripcion, /Arrendatario.*Propietario/);
  assert.equal(haciaOwner.textoConfirmar, "Cambiar a Propietario");

  const haciaRenter = construirMensajeConfirmacionCambioPerfil("OWNER");
  assert.equal(haciaRenter.modoOrigen, "OWNER");
  assert.equal(haciaRenter.modoDestino, "RENTER");
  assert.match(haciaRenter.descripcion, /Propietario.*Arrendatario/);
  assert.equal(haciaRenter.textoConfirmar, "Cambiar a Arrendatario");
});

test("construirContenidoTransicion aplica tiempos MD3 y reduce duración con prefers-reduced-motion", () => {
  const loginNormal = construirContenidoTransicion("login", "Mateo Restrepo", false);
  assert.equal(loginNormal.titulo, "Bienvenido de nuevo, Mateo");
  assert.ok(loginNormal.duracionTotalMs >= 700 && loginNormal.duracionTotalMs <= 900);

  const switchNormal = construirContenidoTransicion("switch-to-owner", "Diego", false);
  assert.equal(switchNormal.etiquetaOrigen, "Arrendatario");
  assert.equal(switchNormal.etiquetaDestino, "Propietario");

  const logoutReducido = construirContenidoTransicion("logout", "Mateo", true);
  assert.ok(logoutReducido.duracionTotalMs <= 250);
});
