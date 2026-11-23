import test from "node:test";
import assert from "node:assert/strict";
import {
  construirListaDocumentosAdmin,
  convertirARutaDocumentoAdmin,
  filtrarUsuariosAdmin,
  obtenerBadgeEstadoMoto,
} from "../src/utils/admin.utils.ts";

test("convertirARutaDocumentoAdmin transforma rutas internas en endpoints protegidos ADMIN", () => {
  assert.strictEqual(
    convertirARutaDocumentoAdmin("/uploads/verificaciones/renter/u-1/bill.pdf"),
    "/api/admin/documentos/renter/u-1/bill.pdf"
  );
  assert.strictEqual(
    convertirARutaDocumentoAdmin("/uploads/motos/m-1/foto.jpg"),
    null
  );
});

test("construirListaDocumentosAdmin arma 6 soportes para Renter y 4 para Owner", () => {
  const docsRenter = construirListaDocumentosAdmin("renter", {
    cedulaFrontUrl: "/uploads/verificaciones/renter/u1/cedulaFront.jpg",
    cedulaBackUrl: "/uploads/verificaciones/renter/u1/cedulaBack.jpg",
    photo: "/uploads/verificaciones/renter/u1/photo.jpg",
    licenseFrontUrl: "/uploads/verificaciones/renter/u1/licenseFront.jpg",
    licenseBackUrl: "/uploads/verificaciones/renter/u1/licenseBack.jpg",
    billUrl: "/uploads/verificaciones/renter/u1/bill.pdf",
  });
  assert.strictEqual(docsRenter.length, 6);
  assert.strictEqual(docsRenter[5]?.esPdf, true);

  const docsOwner = construirListaDocumentosAdmin("owner", {
    cedulaFrontUrl: "/uploads/verificaciones/owner/u2/cedulaFront.jpg",
    cedulaBackUrl: "/uploads/verificaciones/owner/u2/cedulaBack.jpg",
    photo: "/uploads/verificaciones/owner/u2/photo.jpg",
    billUrl: "/uploads/verificaciones/owner/u2/bill.pdf",
  });
  assert.strictEqual(docsOwner.length, 4);
});

test("obtenerBadgeEstadoMoto devuelve etiquetas sobrias para cada estado", () => {
  assert.deepStrictEqual(obtenerBadgeEstadoMoto("PENDING_APPROVAL"), {
    texto: "En revisión",
    variante: "pending",
  });
  assert.deepStrictEqual(obtenerBadgeEstadoMoto("AVAILABLE"), {
    texto: "Disponible",
    variante: "approved",
  });
  assert.deepStrictEqual(obtenerBadgeEstadoMoto("REJECTED"), {
    texto: "Rechazada",
    variante: "rejected",
  });
});

test("filtrarUsuariosAdmin filtra por texto y por rol", () => {
  const lista = [
    {
      id: "1",
      username: "carlosm",
      fullName: "Carlos Méndez",
      email: "carlos@m.co",
      phone: "300111",
      role: "OWNER",
      isEmailVerified: true,
      createdAt: "",
      estadoRenter: "APPROVED",
      estadoOwner: "APPROVED",
      totalRentas: 2,
      totalMotos: 1,
    },
    {
      id: "2",
      username: "laurad",
      fullName: "Laura Díaz",
      email: "laura@m.co",
      phone: "300222",
      role: "RENTER",
      isEmailVerified: true,
      createdAt: "",
      estadoRenter: "PENDING",
      estadoOwner: "NOT_STARTED",
      totalRentas: 0,
      totalMotos: 0,
    },
  ];

  assert.strictEqual(filtrarUsuariosAdmin(lista, "", "OWNER").length, 1);
  assert.strictEqual(filtrarUsuariosAdmin(lista, "laura", "TODOS").length, 1);
  assert.strictEqual(filtrarUsuariosAdmin(lista, "laura", "OWNER").length, 0);
});
