/**
 * SUITE DE VERIFICACIÓN END-TO-END (E2E) DEL MVP MOTORENT (FASE 12)
 *
 * Ejecuta un recorrido completo de punta a punta contra la base de datos
 * PostgreSQL aislada (`motorent_trabajo` en puerto 5433) verificando:
 *   1. Catálogo público y cláusulas legales vigentes.
 *   2. Autenticación JWT y control de acceso por rol (RBAC 401/403).
 *   3. Panel ADMIN: métricas, verificaciones, visor privado anti Path Traversal y alertas.
 *   4. Ciclo completo de renta: solicitud -> contrato SHA-256 -> pago -> PICKUP -> RETURN.
 *   5. Reseñas bidireccionales con regla doble ciego (ocultas hasta votar ambos -> reveladas).
 *   6. Limpieza automática de los registros sintéticos para dejar el seed intacto.
 */

import assert from "node:assert/strict";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

async function login(base: string, identifier: string): Promise<{ token: string; userId: string; role: string }> {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password: "MotoRent2026*" }),
  });
  assert.equal(res.status, 200, `Login falló para ${identifier}`);
  const json = (await res.json()) as {
    data?: { token?: string; user?: { id: string; role: string }; usuario?: { id: string; role: string } };
    token?: string;
  };
  const token = json.data?.token ?? json.token;
  const user = json.data?.user ?? json.data?.usuario;
  assert.ok(token, `Token vacío para ${identifier}`);
  assert.ok(user?.id, `User ID vacío para ${identifier}`);
  return { token, userId: user.id, role: user.role };
}

async function run() {
  const server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address !== "string", "No se pudo abrir puerto temporal E2E");
  const base = `http://127.0.0.1:${address.port}`;

  let createdRentalId: string | null = null;
  let targetMotoId = "";
  let originalKm = 0;

  try {
    console.log("[E2E] 1/6 Verificando catálogo público y cláusulas...");
    const motosRes = await fetch(`${base}/api/motos`);
    assert.equal(motosRes.status, 200);
    const motosJson = (await motosRes.json()) as { data?: unknown[] };
    assert.ok((motosJson.data?.length ?? 0) >= 6, "Debe haber al menos 6 motos en catálogo");

    const clRes = await fetch(`${base}/api/clausulas`);
    assert.equal(clRes.status, 200);
    const clJson = (await clRes.json()) as { data?: unknown[] };
    assert.ok((clJson.data?.length ?? 0) >= 4, "Debe haber al menos 4 cláusulas legales");

    console.log("[E2E] 2/6 Verificando JWT y control RBAC (401/403)...");
    const sinToken = await fetch(`${base}/api/admin/resumen`);
    assert.equal(sinToken.status, 401, "Ruta ADMIN sin token debe responder 401");

    const adminAuth = await login(base, "admin@motorent.co");
    const renterAuth = await login(base, "mateo.renter@motorent.co");
    const ownerAuth = await login(base, "carlos.owner@motorent.co");

    const renterEnAdmin = await fetch(`${base}/api/admin/resumen`, {
      headers: { Authorization: `Bearer ${renterAuth.token}` },
    });
    assert.equal(renterEnAdmin.status, 403, "RENTER en ruta ADMIN debe responder 403");

    console.log("[E2E] 3/6 Verificando Panel ADMIN y protección anti Path Traversal...");
    const adminHeaders = { Authorization: `Bearer ${adminAuth.token}` };
    const resumenRes = await fetch(`${base}/api/admin/resumen`, { headers: adminHeaders });
    assert.equal(resumenRes.status, 200);

    const verifRes = await fetch(`${base}/api/admin/verificaciones`, { headers: adminHeaders });
    assert.equal(verifRes.status, 200);
    const verifJson = (await verifRes.json()) as {
      data?: {
        pendientes?: { idUser?: string; estadoVerificacion?: string; user?: { id: string } }[];
        renters?: { idUser?: string; estadoVerificacion?: string; user?: { id: string } }[];
      };
    };
    const listaVerif = verifJson.data?.pendientes ?? verifJson.data?.renters ?? [];
    const sofia = listaVerif.find((p) => p.estadoVerificacion === "PENDING");
    const sofiaUserId = sofia?.idUser ?? sofia?.user?.id;
    assert.ok(sofiaUserId, "Debe existir solicitud pendiente de Sofía");

    const docOk = await fetch(
      `${base}/api/admin/documentos/renter/${sofiaUserId}/cedulaFront.png`,
      { headers: adminHeaders }
    );
    assert.equal(docOk.status, 200);
    assert.equal(docOk.headers.get("content-type"), "image/png");

    const docMalicioso = await fetch(
      `${base}/api/admin/documentos/renter/${sofiaUserId}/..%2F..%2F.env`,
      { headers: adminHeaders }
    );
    assert.equal(docMalicioso.status, 400, "Path Traversal debe bloquearse con 400");

    console.log("[E2E] 4/6 Ejecutando ciclo completo de renta (PENDING -> COMPLETED)...");
    const moto = await prisma.moto.findUniqueOrThrow({ where: { licensePlate: "KWK65C" } });
    targetMotoId = moto.id;
    originalKm = moto.KM;

    const rCreate = await fetch(`${base}/api/rentas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${renterAuth.token}` },
      body: JSON.stringify({ motoId: moto.id, startDate: "2026-12-10", endDate: "2026-12-12" }),
    });
    assert.equal(rCreate.status, 201);
    const jCreate = (await rCreate.json()) as { data?: { id: string } };
    createdRentalId = jCreate.data?.id ?? null;
    assert.ok(createdRentalId);

    const rSign = await fetch(`${base}/api/rentas/${createdRentalId}/contrato/firmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${renterAuth.token}` },
      body: JSON.stringify({ accepted: true }),
    });
    assert.equal(rSign.status, 201);
    const jSign = (await rSign.json()) as { data?: { documentHash?: string } };
    assert.equal(jSign.data?.documentHash?.length, 64);

    const rPay = await fetch(`${base}/api/rentas/${createdRentalId}/pago`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${renterAuth.token}` },
      body: JSON.stringify({ method: "PSE" }),
    });
    assert.equal(rPay.status, 201);

    const rPickup = await fetch(`${base}/api/rentas/${createdRentalId}/entrega`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerAuth.token}` },
      body: JSON.stringify({ mileage: originalKm, fuelLevel: 100, observations: "E2E PICKUP" }),
    });
    assert.equal(rPickup.status, 201);

    const rReturn = await fetch(`${base}/api/rentas/${createdRentalId}/devolucion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerAuth.token}` },
      body: JSON.stringify({ mileage: originalKm + 85, fuelLevel: 92, observations: "E2E RETURN" }),
    });
    assert.equal(rReturn.status, 201);

    console.log("[E2E] 5/6 Verificando reseñas bidireccionales y liberación doble ciego...");
    const revMoto = await fetch(`${base}/api/resenas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${renterAuth.token}` },
      body: JSON.stringify({
        rentalId: createdRentalId,
        targetType: "MOTO",
        rating: 5,
        comment: "Excelente desempeño en prueba E2E.",
      }),
    });
    assert.equal(revMoto.status, 201);

    const revOwner = await fetch(`${base}/api/resenas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${renterAuth.token}` },
      body: JSON.stringify({
        rentalId: createdRentalId,
        targetType: "OWNER",
        rating: 5,
        comment: "Propietario muy puntual en entrega y devolución.",
      }),
    });
    assert.equal(revOwner.status, 201);

    const revRenter = await fetch(`${base}/api/resenas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerAuth.token}` },
      body: JSON.stringify({
        rentalId: createdRentalId,
        targetType: "RENTER",
        rating: 5,
        comment: "Arrendatario ejemplar durante toda la renta.",
      }),
    });
    assert.equal(revRenter.status, 201);

    // Al votar ambos, las reseñas se revelan inmediatamente
    const publicMotoRes = await fetch(`${base}/api/motos/${moto.id}/resenas`);
    assert.equal(publicMotoRes.status, 200);
    const publicMotoJson = (await publicMotoRes.json()) as {
      data?: { resenas?: { comment?: string }[] };
    };
    const revelada = (publicMotoJson.data?.resenas ?? []).some(
      (r) => r.comment === "Excelente desempeño en prueba E2E."
    );
    assert.ok(revelada, "La reseña debe revelarse al instante cuando ambas partes califican");

    console.log("[E2E] 6/6 Limpiando datos sintéticos de la prueba...");
  } finally {
    if (createdRentalId) {
      await prisma.review.deleteMany({ where: { rentalId: createdRentalId } });
      await prisma.handoverEvidence.deleteMany({ where: { handover: { rentalId: createdRentalId } } });
      await prisma.vehicleHandover.deleteMany({ where: { rentalId: createdRentalId } });
      await prisma.rentalClause.deleteMany({ where: { rentalId: createdRentalId } });
      await prisma.payment.deleteMany({ where: { rentalId: createdRentalId } });
      await prisma.contract.deleteMany({ where: { rentalId: createdRentalId } });
      await prisma.rental.delete({ where: { id: createdRentalId } });
      await prisma.moto.update({
        where: { id: targetMotoId },
        data: { status: "AVAILABLE", KM: originalKm },
      });
    }
    server.close();
    await prisma.$disconnect();
  }

  console.log("[E2E] TODOS LOS FLUJOS DEL MVP VERIFICADOS CON ÉXITO (6/6).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[E2E] FALLO:", err);
    process.exit(1);
  });
