import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizarEstadoVerificacion,
  normalizarRolBase,
  obtenerInfoBadgeEstado,
  obtenerNavegacionPorRol,
  obtenerResumenRoles,
  tienePermisoParaRuta,
} from "../src/utils/roles.utils.ts";

// ============================================================================
// 1. NORMALIZACIÓN DE ROLES Y ESTADOS
// ============================================================================

test("normalizarRolBase mapea correctamente USER, RENTER, CLIENT, OWNER y ADMIN", () => {
  assert.strictEqual(normalizarRolBase("ADMIN"), "ADMIN");
  assert.strictEqual(normalizarRolBase("owner"), "OWNER");
  assert.strictEqual(normalizarRolBase("RENTER"), "RENTER");
  assert.strictEqual(
    normalizarRolBase("CLIENT"),
    "RENTER",
    "CLIENT (esquema anterior) debe mapearse a RENTER"
  );
  assert.strictEqual(normalizarRolBase(undefined), "USER");
  assert.strictEqual(normalizarRolBase("OTRO"), "USER");
});

test("normalizarEstadoVerificacion unifica APPROVED/VERIFIED, PENDING, REJECTED y vacío", () => {
  assert.strictEqual(normalizarEstadoVerificacion("APPROVED"), "APPROVED");
  assert.strictEqual(normalizarEstadoVerificacion("VERIFIED"), "APPROVED");
  assert.strictEqual(normalizarEstadoVerificacion("PENDING"), "PENDING");
  assert.strictEqual(normalizarEstadoVerificacion("REJECTED"), "REJECTED");
  assert.strictEqual(normalizarEstadoVerificacion(null), "NOT_STARTED");
  assert.strictEqual(normalizarEstadoVerificacion(undefined), "NOT_STARTED");
});

// ============================================================================
// 2. RESOLUCIÓN DE VISTAS DEL DASHBOARD POR ROL
// ============================================================================

test("Usuario base sin perfiles abre en modo USER (onboarding)", () => {
  const resumen = obtenerResumenRoles({ role: "USER" });

  assert.strictEqual(resumen.rolPrincipal, "USER");
  assert.strictEqual(resumen.modoInicial, "USER");
  assert.strictEqual(resumen.estadoRenter, "NOT_STARTED");
  assert.strictEqual(resumen.estadoOwner, "NOT_STARTED");
  assert.strictEqual(resumen.puedeVerModoRenter, false);
  assert.strictEqual(resumen.puedeVerModoOwner, false);
  assert.strictEqual(resumen.esUsuarioDual, false);
});

test("Usuario USER con solicitud local PENDING mantiene modo USER pero muestra estado en revisión", () => {
  const resumen = obtenerResumenRoles({ role: "USER" }, "PENDING", null);

  assert.strictEqual(resumen.modoInicial, "USER");
  assert.strictEqual(resumen.estadoRenter, "PENDING");
  assert.strictEqual(resumen.estadoOwner, "NOT_STARTED");
  assert.strictEqual(resumen.puedeVerModoRenter, false);
});

test("Usuario con perfil Renter aprobado abre directamente en modo RENTER", () => {
  const resumen = obtenerResumenRoles({
    role: "USER",
    renter: { estadoVerificacion: "APPROVED" },
  });

  assert.strictEqual(resumen.modoInicial, "RENTER");
  assert.strictEqual(resumen.puedeVerModoRenter, true);
  assert.strictEqual(resumen.puedeVerModoOwner, false);
  assert.strictEqual(resumen.esUsuarioDual, false);
  assert.strictEqual(resumen.etiquetaRol, "Arrendatario verificado");
});

test("Compatibilidad retroactiva: reconoce perfil client con verificationStatus VERIFIED", () => {
  const resumen = obtenerResumenRoles({
    role: "USER",
    client: { verificationStatus: "VERIFIED" },
  });

  assert.strictEqual(resumen.estadoRenter, "APPROVED");
  assert.strictEqual(resumen.modoInicial, "RENTER");
});

test("Usuario con perfil Owner aprobado abre directamente en modo OWNER", () => {
  const resumen = obtenerResumenRoles({
    role: "OWNER",
    owner: { estadoVerificacion: "APPROVED" },
  });

  assert.strictEqual(resumen.modoInicial, "OWNER");
  assert.strictEqual(resumen.puedeVerModoOwner, true);
  assert.strictEqual(resumen.puedeVerModoRenter, false);
  assert.strictEqual(resumen.etiquetaRol, "Propietario verificado");
});

test("Usuario con ambos perfiles aprobados activa modo dual (selector RENTER / OWNER)", () => {
  const resumen = obtenerResumenRoles({
    role: "USER",
    renter: { estadoVerificacion: "APPROVED" },
    owner: { estadoVerificacion: "APPROVED" },
  });

  assert.strictEqual(resumen.esUsuarioDual, true);
  assert.strictEqual(resumen.puedeVerModoRenter, true);
  assert.strictEqual(resumen.puedeVerModoOwner, true);
  assert.strictEqual(resumen.modoInicial, "RENTER");
  assert.strictEqual(resumen.etiquetaRol, "Arrendatario y Propietario");
});

test("Usuario ADMIN siempre abre en modo ADMIN sin activar switch dual", () => {
  const resumen = obtenerResumenRoles({
    role: "ADMIN",
    renter: { estadoVerificacion: "APPROVED" },
    owner: { estadoVerificacion: "APPROVED" },
  });

  assert.strictEqual(resumen.esAdmin, true);
  assert.strictEqual(resumen.modoInicial, "ADMIN");
  assert.strictEqual(resumen.esUsuarioDual, false);
  assert.strictEqual(resumen.etiquetaRol, "Administrador");
});

test("Perfil rechazado expone el motivo de rechazo y mantiene modo USER", () => {
  const resumen = obtenerResumenRoles({
    role: "USER",
    renter: {
      estadoVerificacion: "REJECTED",
      motivoRechazo: "La foto de la licencia está borrosa",
    },
  });

  assert.strictEqual(resumen.modoInicial, "USER");
  assert.strictEqual(resumen.estadoRenter, "REJECTED");
  assert.strictEqual(
    resumen.motivoRechazoRenter,
    "La foto de la licencia está borrosa"
  );
});

test("obtenerInfoBadgeEstado devuelve etiquetas y variantes coherentes para los 4 estados", () => {
  assert.deepStrictEqual(obtenerInfoBadgeEstado("APPROVED"), {
    texto: "Verificado",
    variante: "approved",
  });
  assert.deepStrictEqual(obtenerInfoBadgeEstado("PENDING"), {
    texto: "En revisión",
    variante: "pending",
  });
  assert.deepStrictEqual(obtenerInfoBadgeEstado("REJECTED"), {
    texto: "Requiere corrección",
    variante: "rejected",
  });
  assert.deepStrictEqual(obtenerInfoBadgeEstado("NOT_STARTED"), {
    texto: "Sin verificar",
    variante: "neutral",
  });
});

// ============================================================================
// 3. PRUEBAS DE NAVBAR DINÁMICA POR ROL (FASE 2.5)
// ============================================================================

test("obtenerNavegacionPorRol muestra solo Inicio y Catálogo cuando no hay sesión", () => {
  const nav = obtenerNavegacionPorRol(false, null);

  assert.strictEqual(nav.etiquetaRolNav, null);
  assert.deepStrictEqual(
    nav.enlacesPrincipales.map((e) => e.to),
    ["/", "/motos"]
  );
  assert.strictEqual(nav.enlacesMenuPerfil.length, 0);
});

test("obtenerNavegacionPorRol para USER muestra Cuenta base y accesos de verificación en el menú", () => {
  const resumen = obtenerResumenRoles({ role: "USER" });
  const nav = obtenerNavegacionPorRol(true, resumen);

  assert.strictEqual(nav.etiquetaRolNav, "Cuenta base");
  assert.strictEqual(nav.varianteRolNav, "user");
  assert.deepStrictEqual(
    nav.enlacesPrincipales.map((e) => e.to),
    ["/dashboard", "/motos"]
  );
  assert.ok(nav.enlacesMenuPerfil.some((e) => e.to === "/verificar-renter"));
  assert.ok(nav.enlacesMenuPerfil.some((e) => e.to === "/verificar-owner"));
});

test("obtenerNavegacionPorRol para RENTER muestra Mis Rentas y oculta Publicar moto", () => {
  const resumen = obtenerResumenRoles({
    role: "RENTER",
    renter: { estadoVerificacion: "APPROVED" },
  });
  const nav = obtenerNavegacionPorRol(true, resumen, "RENTER");

  assert.strictEqual(nav.etiquetaRolNav, "Arrendatario");
  assert.strictEqual(nav.varianteRolNav, "renter");
  assert.deepStrictEqual(
    nav.enlacesPrincipales.map((e) => e.to),
    ["/dashboard", "/motos", "/rentas"]
  );
});

test("obtenerNavegacionPorRol para OWNER destaca Publicar moto en la barra principal", () => {
  const resumen = obtenerResumenRoles({
    role: "OWNER",
    owner: { estadoVerificacion: "APPROVED" },
  });
  const nav = obtenerNavegacionPorRol(true, resumen, "OWNER");

  assert.strictEqual(nav.etiquetaRolNav, "Propietario");
  assert.strictEqual(nav.varianteRolNav, "owner");
  const botonPublicar = nav.enlacesPrincipales.find((e) => e.to === "/publicarmoto");
  assert.ok(botonPublicar, "Debe mostrar enlace Publicar moto");
  assert.strictEqual(botonPublicar.destacado, true);
});

test("obtenerNavegacionPorRol para ADMIN muestra Panel Administrativo e insignia admin", () => {
  const resumen = obtenerResumenRoles({ role: "ADMIN" });
  const nav = obtenerNavegacionPorRol(true, resumen, "ADMIN");

  assert.strictEqual(nav.etiquetaRolNav, "Administrador");
  assert.strictEqual(nav.varianteRolNav, "admin");
  assert.deepStrictEqual(
    nav.enlacesPrincipales.map((e) => e.label),
    ["Panel Administrativo", "Catálogo"]
  );
});

// ============================================================================
// 4. CONTROL DE ACCESO POR ROL EN RUTAS DEL FRONTEND (FASE 4)
// ============================================================================

test("tienePermisoParaRuta bloquea a USER en rutas de OWNER y RENTER", () => {
  const resumen = obtenerResumenRoles({ role: "USER" });

  assert.strictEqual(tienePermisoParaRuta(resumen, ["OWNER", "ADMIN"]), false);
  assert.strictEqual(tienePermisoParaRuta(resumen, ["RENTER", "ADMIN"]), false);
});

test("tienePermisoParaRuta bloquea a RENTER en /publicarmoto pero le permite /rentas", () => {
  const resumen = obtenerResumenRoles({
    role: "RENTER",
    renter: { estadoVerificacion: "APPROVED" },
  });

  assert.strictEqual(tienePermisoParaRuta(resumen, ["OWNER", "ADMIN"]), false);
  assert.strictEqual(tienePermisoParaRuta(resumen, ["RENTER", "ADMIN"]), true);
});

test("tienePermisoParaRuta bloquea a OWNER en /rentas pero le permite /publicarmoto", () => {
  const resumen = obtenerResumenRoles({
    role: "OWNER",
    owner: { estadoVerificacion: "APPROVED" },
  });

  assert.strictEqual(tienePermisoParaRuta(resumen, ["OWNER", "ADMIN"]), true);
  assert.strictEqual(tienePermisoParaRuta(resumen, ["RENTER", "ADMIN"]), false);
});

test("tienePermisoParaRuta habilita ambas rutas a un usuario Dual (Renter + Owner aprobados)", () => {
  const resumen = obtenerResumenRoles({
    role: "USER",
    renter: { estadoVerificacion: "APPROVED" },
    owner: { estadoVerificacion: "APPROVED" },
  });

  assert.strictEqual(tienePermisoParaRuta(resumen, ["OWNER", "ADMIN"]), true);
  assert.strictEqual(tienePermisoParaRuta(resumen, ["RENTER", "ADMIN"]), true);
});

test("tienePermisoParaRuta permite el acceso total al rol ADMIN", () => {
  const resumen = obtenerResumenRoles({ role: "ADMIN" });

  assert.strictEqual(tienePermisoParaRuta(resumen, ["OWNER", "ADMIN"]), true);
  assert.strictEqual(tienePermisoParaRuta(resumen, ["RENTER", "ADMIN"]), true);
  assert.strictEqual(tienePermisoParaRuta(resumen, ["ADMIN"]), true);
});

test("enlacesMenuPerfil no repite Mi Panel ni Mis Rentas y siempre incluye Configuración", () => {
  const roles = [
    obtenerResumenRoles({ role: "USER" }),
    obtenerResumenRoles({ role: "RENTER", renter: { estadoVerificacion: "APPROVED" } }),
    obtenerResumenRoles({ role: "OWNER", owner: { estadoVerificacion: "APPROVED" } }),
    obtenerResumenRoles({ role: "ADMIN" }),
  ];

  for (const resumen of roles) {
    const nav = obtenerNavegacionPorRol(true, resumen);
    const rutasPerfil = nav.enlacesMenuPerfil.map((e) => e.to);
    assert.ok(rutasPerfil.includes("/perfil"), "Debe incluir /perfil");
    assert.ok(rutasPerfil.includes("/configuracion"), "Debe incluir /configuracion");
    assert.ok(!rutasPerfil.includes("/dashboard"), "No debe repetir /dashboard");
    assert.ok(!rutasPerfil.includes("/rentas"), "No debe repetir /rentas");
  }
});
