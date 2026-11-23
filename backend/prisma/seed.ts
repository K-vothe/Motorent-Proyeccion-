/**
 * SEED IDEMPOTENTE DE DATOS DEMO PARA MOTORENT (FASE 8)
 *
 * Carga un conjunto completo y realista de usuarios, perfiles verificados/pendientes,
 * motocicletas (aprobadas y pendientes), contratos, actas de entrega/devolución,
 * reseñas bidireccionales y archivos de muestra en disco para demostrar y probar
 * las Fases 1 a 8 sin llenar formularios manualmente.
 *
 * Es 100% idempotente: puede ejecutarse varias veces sin duplicar registros.
 * Contraseña común de todas las cuentas demo: MotoRent2026*
 */

import bcrypt from "bcryptjs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/config/prisma.js";

const PASSWORD_DEMO = "MotoRent2026*";

// PNG mínimo válido (1x1 px azul acero) para documentos privados de demostración
const PNG_DEMO_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function crearArchivoDemo(rutaRelativaDesdeBackend: string, buffer: Buffer) {
  const destino = path.resolve(process.cwd(), rutaRelativaDesdeBackend);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, buffer);
}

async function prepararGaleriaMoto(motoId: string, descripcion: string) {
  const carpetaMoto = path.resolve(process.cwd(), "uploads", "motos", motoId);
  await mkdir(carpetaMoto, { recursive: true });

  // Intentamos reutilizar la imagen de muestra del frontend; si no existe, guardamos PNG válido
  const fotoOrigen = path.resolve(process.cwd(), "..", "frontend", "src", "assets", "moto1.jpeg");
  const fotoDestino = path.join(carpetaMoto, "foto-seed-01.jpg");
  try {
    await copyFile(fotoOrigen, fotoDestino);
  } catch {
    await writeFile(fotoDestino, Buffer.from(PNG_DEMO_BASE64, "base64"));
  }

  await writeFile(
    path.join(carpetaMoto, "ficha.json"),
    JSON.stringify(
      {
        descripcion,
        actualizadaEn: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
}

async function main() {
  console.log("[seed] Iniciando carga idempotente en base motorent_trabajo...");
  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
  const pngBuffer = Buffer.from(PNG_DEMO_BASE64, "base64");

  // --------------------------------------------------------------------------
  // 1. USUARIOS DEMO (ADMIN, 2 OWNERS, 1 RENTER, 1 USUARIO PENDIENTE)
  // --------------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@motorent.co" },
    update: { role: "ADMIN", isEmailVerified: true },
    create: {
      username: "admin_motorent",
      email: "admin@motorent.co",
      password: passwordHash,
      fullName: "Valentina Ríos (Admin)",
      phone: "3001112233",
      role: "ADMIN",
      isEmailVerified: true,
    },
  });

  const ownerCarlos = await prisma.user.upsert({
    where: { email: "carlos.owner@motorent.co" },
    update: { role: "OWNER", isEmailVerified: true },
    create: {
      username: "carlos_owner",
      email: "carlos.owner@motorent.co",
      password: passwordHash,
      fullName: "Carlos Andrés Mejía",
      phone: "3104455667",
      role: "OWNER",
      isEmailVerified: true,
    },
  });

  const ownerLaura = await prisma.user.upsert({
    where: { email: "laura.owner@motorent.co" },
    update: { role: "OWNER", isEmailVerified: true },
    create: {
      username: "laura_owner",
      email: "laura.owner@motorent.co",
      password: passwordHash,
      fullName: "Laura Marcela Gómez",
      phone: "3157788990",
      role: "OWNER",
      isEmailVerified: true,
    },
  });

  const renterMateo = await prisma.user.upsert({
    where: { email: "mateo.renter@motorent.co" },
    update: { role: "RENTER", isEmailVerified: true },
    create: {
      username: "mateo_renter",
      email: "mateo.renter@motorent.co",
      password: passwordHash,
      fullName: "Mateo Restrepo Silva",
      phone: "3209988776",
      role: "RENTER",
      isEmailVerified: true,
    },
  });

  const sofiaPendiente = await prisma.user.upsert({
    where: { email: "sofia.pendiente@motorent.co" },
    update: { isEmailVerified: true },
    create: {
      username: "sofia_pendiente",
      email: "sofia.pendiente@motorent.co",
      password: passwordHash,
      fullName: "Sofía Herrera Castro",
      phone: "3125544332",
      role: "USER",
      isEmailVerified: true,
    },
  });

  // --------------------------------------------------------------------------
  // 2. PERFILES OWNER Y RENTER + DOCUMENTOS DE MUESTRA PARA VISOR ADMIN
  // --------------------------------------------------------------------------
  const docsOwnerCarlos = {
    cedulaFrontUrl: `/uploads/verificaciones/owner/${ownerCarlos.id}/cedulaFront.png`,
    cedulaBackUrl: `/uploads/verificaciones/owner/${ownerCarlos.id}/cedulaBack.png`,
    photo: `/uploads/verificaciones/owner/${ownerCarlos.id}/photo.png`,
    billUrl: `/uploads/verificaciones/owner/${ownerCarlos.id}/bill.png`,
  };
  for (const url of Object.values(docsOwnerCarlos)) {
    await crearArchivoDemo(url.replace(/^\//, ""), pngBuffer);
  }

  const perfilOwnerCarlos = await prisma.owner.upsert({
    where: { idUser: ownerCarlos.id },
    update: { estadoVerificacion: "APPROVED" },
    create: {
      idUser: ownerCarlos.id,
      cedulaNumero: "1020304050",
      ...docsOwnerCarlos,
      estadoVerificacion: "APPROVED",
      fechaVerificacion: new Date("2026-10-01T10:00:00Z"),
    },
  });

  const docsOwnerLaura = {
    cedulaFrontUrl: `/uploads/verificaciones/owner/${ownerLaura.id}/cedulaFront.png`,
    cedulaBackUrl: `/uploads/verificaciones/owner/${ownerLaura.id}/cedulaBack.png`,
    photo: `/uploads/verificaciones/owner/${ownerLaura.id}/photo.png`,
    billUrl: `/uploads/verificaciones/owner/${ownerLaura.id}/bill.png`,
  };
  for (const url of Object.values(docsOwnerLaura)) {
    await crearArchivoDemo(url.replace(/^\//, ""), pngBuffer);
  }

  const perfilOwnerLaura = await prisma.owner.upsert({
    where: { idUser: ownerLaura.id },
    update: { estadoVerificacion: "APPROVED" },
    create: {
      idUser: ownerLaura.id,
      cedulaNumero: "1040506070",
      ...docsOwnerLaura,
      estadoVerificacion: "APPROVED",
      fechaVerificacion: new Date("2026-10-05T14:30:00Z"),
    },
  });

  const docsRenterMateo = {
    cedulaFrontUrl: `/uploads/verificaciones/renter/${renterMateo.id}/cedulaFront.png`,
    cedulaBackUrl: `/uploads/verificaciones/renter/${renterMateo.id}/cedulaBack.png`,
    photo: `/uploads/verificaciones/renter/${renterMateo.id}/photo.png`,
    licenseFrontUrl: `/uploads/verificaciones/renter/${renterMateo.id}/licenseFront.png`,
    licenseBackUrl: `/uploads/verificaciones/renter/${renterMateo.id}/licenseBack.png`,
    billUrl: `/uploads/verificaciones/renter/${renterMateo.id}/bill.png`,
  };
  for (const url of Object.values(docsRenterMateo)) {
    await crearArchivoDemo(url.replace(/^\//, ""), pngBuffer);
  }

  const perfilRenterMateo = await prisma.renter.upsert({
    where: { idUser: renterMateo.id },
    update: { estadoVerificacion: "APPROVED" },
    create: {
      idUser: renterMateo.id,
      cedulaNumero: "1088990011",
      licenseNumber: "1088990011",
      licenseCategory: "A2",
      ...docsRenterMateo,
      estadoVerificacion: "APPROVED",
      fechaVerificacion: new Date("2026-10-10T09:15:00Z"),
    },
  });

  // Solicitud PENDING real para probar aprobación/rechazo y visor privado en Admin
  const docsSofia = {
    cedulaFrontUrl: `/uploads/verificaciones/renter/${sofiaPendiente.id}/cedulaFront.png`,
    cedulaBackUrl: `/uploads/verificaciones/renter/${sofiaPendiente.id}/cedulaBack.png`,
    photo: `/uploads/verificaciones/renter/${sofiaPendiente.id}/photo.png`,
    licenseFrontUrl: `/uploads/verificaciones/renter/${sofiaPendiente.id}/licenseFront.png`,
    licenseBackUrl: `/uploads/verificaciones/renter/${sofiaPendiente.id}/licenseBack.png`,
    billUrl: `/uploads/verificaciones/renter/${sofiaPendiente.id}/bill.png`,
  };
  for (const url of Object.values(docsSofia)) {
    await crearArchivoDemo(url.replace(/^\//, ""), pngBuffer);
  }

  await prisma.renter.upsert({
    where: { idUser: sofiaPendiente.id },
    update: {},
    create: {
      idUser: sofiaPendiente.id,
      cedulaNumero: "1095443322",
      licenseNumber: "1095443322",
      licenseCategory: "A2",
      ...docsSofia,
      estadoVerificacion: "PENDING",
    },
  });

  // --------------------------------------------------------------------------
  // 3. MOTOCICLETAS VARIADAS (125cc A 900cc — APROBADAS Y 1 PENDIENTE ADMIN)
  // --------------------------------------------------------------------------
  const catalogoSeed = [
    {
      ownerId: perfilOwnerCarlos.id,
      brand: "Yamaha",
      model: "MT-03",
      year: 2024,
      licensePlate: "MTR32A",
      displacement: "321cc",
      KM: 6400,
      color: "Azul Profundo",
      dailyRate: 135000,
      status: "AVAILABLE" as const,
      transitLicenseNumber: "LT-MTR32A-2024",
      descripcion:
        "Yamaha MT-03 en excelente estado mecánico, mantenimiento al día en concesionario oficial, llantas Michelin nuevas y ABS doble canal.",
    },
    {
      ownerId: perfilOwnerCarlos.id,
      brand: "Honda",
      model: "CB190R",
      year: 2023,
      licensePlate: "HND19B",
      displacement: "184cc",
      KM: 12300,
      color: "Rojo Deportivo",
      dailyRate: 85000,
      status: "AVAILABLE" as const,
      transitLicenseNumber: "LT-HND19B-2023",
      descripcion:
        "Ideal para desplazamientos urbanos ágiles y económicos. Consumo eficiente de combustible, frenos de disco y baúl desmontable opcional.",
    },
    {
      ownerId: perfilOwnerCarlos.id,
      brand: "Kawasaki",
      model: "Z650",
      year: 2025,
      licensePlate: "KWK65C",
      displacement: "649cc",
      KM: 3100,
      color: "Negro Mate",
      dailyRate: 210000,
      status: "AVAILABLE" as const,
      transitLicenseNumber: "LT-KWK65C-2025",
      descripcion:
        "Naked bicilíndrica de alto rendimiento, perfecta para viajes en carretera y escapadas de fin de semana. Incluye sliders y soporte para celular.",
    },
    {
      ownerId: perfilOwnerCarlos.id,
      brand: "Suzuki",
      model: "V-Strom 250 SX",
      year: 2025,
      licensePlate: "SZK25D",
      displacement: "249cc",
      KM: 1850,
      color: "Amarillo Aventura",
      dailyRate: 125000,
      status: "PENDING_APPROVAL" as const,
      transitLicenseNumber: "LT-SZK25D-2025",
      descripcion:
        "Motocicleta touring liviana con protector de cárter y parrilla trasera. Pendiente de verificación por parte del equipo administrador.",
    },
    {
      ownerId: perfilOwnerLaura.id,
      brand: "Bajaj",
      model: "Pulsar NS200 FI",
      year: 2024,
      licensePlate: "BJJ20E",
      displacement: "199cc",
      KM: 9100,
      color: "Gris Grafito",
      dailyRate: 92000,
      status: "AVAILABLE" as const,
      transitLicenseNumber: "LT-BJJ20E-2024",
      descripcion:
        "Pulsar NS200 inyección electrónica con ABS delantero. Excelente respuesta en ciudad y carretera, SOAT y técnico-mecánica vigentes.",
    },
    {
      ownerId: perfilOwnerLaura.id,
      brand: "BMW",
      model: "F 900 R",
      year: 2024,
      licensePlate: "BMW90F",
      displacement: "895cc",
      KM: 4900,
      color: "Plata Hockenheim",
      dailyRate: 290000,
      status: "AVAILABLE" as const,
      transitLicenseNumber: "LT-BMW90F-2024",
      descripcion:
        "Roadster premium equipada con modos de manejo, control de tracción, quickshifter y puños calefactables para rutas largas.",
    },
    {
      ownerId: perfilOwnerLaura.id,
      brand: "Yamaha",
      model: "NMAX 155 Connected",
      year: 2025,
      licensePlate: "NMX15G",
      displacement: "155cc",
      KM: 2700,
      color: "Blanco Perla",
      dailyRate: 78000,
      status: "AVAILABLE" as const,
      transitLicenseNumber: "LT-NMX15G-2025",
      descripcion:
        "Scooter automática muy cómoda para ciudad, amplio espacio bajo el asiento para casco integral y frenos ABS en ambas ruedas.",
    },
  ];

  const motosCreadas = [];
  for (const item of catalogoSeed) {
    const moto = await prisma.moto.upsert({
      where: { licensePlate: item.licensePlate },
      update: {
        dailyRate: item.dailyRate,
        KM: item.KM,
      },
      create: {
        ownerId: item.ownerId,
        brand: item.brand,
        model: item.model,
        year: item.year,
        licensePlate: item.licensePlate,
        displacement: item.displacement,
        KM: item.KM,
        color: item.color,
        dailyRate: item.dailyRate,
        status: item.status,
      },
    });

    await prisma.motoDocument.upsert({
      where: { motoId: moto.id },
      update: {},
      create: {
        motoId: moto.id,
        transitLicenseNumber: item.transitLicenseNumber,
        transitLicenseImage: `/uploads/motos/${moto.id}/foto-seed-01.jpg`,
        verificationStatus: item.status === "PENDING_APPROVAL" ? "PENDING" : "VERIFIED",
        verifiedAt: item.status === "PENDING_APPROVAL" ? null : new Date("2026-10-12T12:00:00Z"),
      },
    });

    await prepararGaleriaMoto(moto.id, item.descripcion);
    motosCreadas.push(moto);
  }

  const motoMt03 = motosCreadas[0];
  const motoCb190 = motosCreadas[1];
  const motoNmax = motosCreadas[6];

  // --------------------------------------------------------------------------
  // 4. RENTAS DEMO (2 COMPLETADAS CON RESEÑAS + 1 ACTIVA)
  // --------------------------------------------------------------------------
  const contrato1Num = "CTR-SEED-2026-0001";
  let rentaCompletada1 = await prisma.rental.findFirst({
    where: { contract: { contractNumber: contrato1Num } },
  });

  if (!rentaCompletada1) {
    rentaCompletada1 = await prisma.rental.create({
      data: {
        renterId: perfilRenterMateo.id,
        motoId: motoMt03.id,
        startDate: new Date("2026-10-15T09:00:00Z"),
        endDate: new Date("2026-10-18T09:00:00Z"),
        subtotal: 405000,
        platformFee: 40500,
        ownerEarnings: 364500,
        total: 405000,
        status: "COMPLETED",
        contract: {
          create: {
            contractNumber: contrato1Num,
            status: "COMPLETED",
            accepted: true,
            acceptedAt: new Date("2026-10-15T08:45:00Z"),
            observations: "Contrato aceptado digitalmente por ambas partes.",
          },
        },
        handovers: {
          create: [
            {
              type: "PICKUP",
              mileage: 6120,
              fuelLevel: 100,
              observations: "Moto entregada con tanque lleno, sin rayones y 2 cascos.",
              evidences: {
                create: [
                  {
                    fileUrl: `/uploads/motos/${motoMt03.id}/foto-seed-01.jpg`,
                    description: "Estado inicial en entrega (PICKUP)",
                  },
                ],
              },
            },
            {
              type: "RETURN",
              mileage: 6400,
              fuelLevel: 95,
              observations: "Devolución puntual y en óptimas condiciones.",
              evidences: {
                create: [
                  {
                    fileUrl: `/uploads/motos/${motoMt03.id}/foto-seed-01.jpg`,
                    description: "Inspección final de devolución (RETURN)",
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Segunda renta completada con alerta de calificación baja (para probar Panel Admin)
  const contrato2Num = "CTR-SEED-2026-0002";
  let rentaCompletada2 = await prisma.rental.findFirst({
    where: { contract: { contractNumber: contrato2Num } },
  });

  if (!rentaCompletada2) {
    rentaCompletada2 = await prisma.rental.create({
      data: {
        renterId: perfilRenterMateo.id,
        motoId: motoCb190.id,
        startDate: new Date("2026-11-01T10:00:00Z"),
        endDate: new Date("2026-11-03T10:00:00Z"),
        subtotal: 170000,
        platformFee: 17000,
        ownerEarnings: 153000,
        total: 170000,
        status: "COMPLETED",
        contract: {
          create: {
            contractNumber: contrato2Num,
            status: "COMPLETED",
            accepted: true,
            acceptedAt: new Date("2026-11-01T09:50:00Z"),
            observations: "Renta urbana de 2 días.",
          },
        },
      },
    });
  }

  // Tercera renta ACTIVA para pruebas en vivo de entrega/devolución e incidentes
  const contrato3Num = "CTR-SEED-2026-0003";
  const rentaActiva = await prisma.rental.findFirst({
    where: { contract: { contractNumber: contrato3Num } },
  });

  if (!rentaActiva) {
    await prisma.rental.create({
      data: {
        renterId: perfilRenterMateo.id,
        motoId: motoNmax.id,
        startDate: new Date("2026-11-22T09:00:00Z"),
        endDate: new Date("2026-11-25T09:00:00Z"),
        subtotal: 234000,
        platformFee: 23400,
        ownerEarnings: 210600,
        total: 234000,
        status: "ACTIVE",
        contract: {
          create: {
            contractNumber: contrato3Num,
            status: "ACTIVE",
            accepted: true,
            acceptedAt: new Date("2026-11-22T08:50:00Z"),
            observations: "Renta activa lista para pruebas de devolución.",
          },
        },
        handovers: {
          create: [
            {
              type: "PICKUP",
              mileage: 2700,
              fuelLevel: 100,
              observations: "Entrega inicial completada con checklist completo.",
            },
          ],
        },
      },
    });
  }

  // --------------------------------------------------------------------------
  // 5. RESEÑAS BIDIRECCIONALES (FASE 6) + 1 ALERTA BAJA PARA ADMIN (FASE 7)
  // --------------------------------------------------------------------------
  const fechaVisiblePasada = new Date("2026-11-05T12:00:00Z");

  await prisma.review.upsert({
    where: {
      rentalId_authorId_targetType: {
        rentalId: rentaCompletada1.id,
        authorId: renterMateo.id,
        targetType: "MOTO",
      },
    },
    update: {},
    create: {
      rentalId: rentaCompletada1.id,
      authorId: renterMateo.id,
      targetUserId: ownerCarlos.id,
      motoId: motoMt03.id,
      targetType: "MOTO",
      rating: 5,
      comment: "Excelente moto, muy suave en carretera y frenos impecables.",
      visibleAt: fechaVisiblePasada,
    },
  });

  await prisma.review.upsert({
    where: {
      rentalId_authorId_targetType: {
        rentalId: rentaCompletada1.id,
        authorId: renterMateo.id,
        targetType: "OWNER",
      },
    },
    update: {},
    create: {
      rentalId: rentaCompletada1.id,
      authorId: renterMateo.id,
      targetUserId: ownerCarlos.id,
      motoId: null,
      targetType: "OWNER",
      rating: 5,
      comment: "Carlos fue puntual, claro con el contrato y entregó todo impecable.",
      visibleAt: fechaVisiblePasada,
    },
  });

  await prisma.review.upsert({
    where: {
      rentalId_authorId_targetType: {
        rentalId: rentaCompletada1.id,
        authorId: ownerCarlos.id,
        targetType: "RENTER",
      },
    },
    update: {},
    create: {
      rentalId: rentaCompletada1.id,
      authorId: ownerCarlos.id,
      targetUserId: renterMateo.id,
      motoId: null,
      targetType: "RENTER",
      rating: 5,
      comment: "Mateo cuidó muy bien la moto y la devolvió a tiempo.",
      visibleAt: fechaVisiblePasada,
    },
  });

  // Reseña de baja calificación (2 estrellas) para que el módulo de alertas Admin tenga casos reales
  await prisma.review.upsert({
    where: {
      rentalId_authorId_targetType: {
        rentalId: rentaCompletada2.id,
        authorId: renterMateo.id,
        targetType: "MOTO",
      },
    },
    update: {},
    create: {
      rentalId: rentaCompletada2.id,
      authorId: renterMateo.id,
      targetUserId: ownerCarlos.id,
      motoId: motoCb190.id,
      targetType: "MOTO",
      rating: 2,
      comment: "El espejo izquierdo estaba flojo al recibirla y tardó en ajustarse.",
      visibleAt: fechaVisiblePasada,
    },
  });

  await prisma.review.upsert({
    where: {
      rentalId_authorId_targetType: {
        rentalId: rentaCompletada2.id,
        authorId: renterMateo.id,
        targetType: "OWNER",
      },
    },
    update: {},
    create: {
      rentalId: rentaCompletada2.id,
      authorId: renterMateo.id,
      targetUserId: ownerCarlos.id,
      motoId: null,
      targetType: "OWNER",
      rating: 3,
      comment: "Hubo un retraso de 20 minutos en el punto de entrega.",
      visibleAt: fechaVisiblePasada,
    },
  });

  await prisma.review.upsert({
    where: {
      rentalId_authorId_targetType: {
        rentalId: rentaCompletada2.id,
        authorId: ownerCarlos.id,
        targetType: "RENTER",
      },
    },
    update: {},
    create: {
      rentalId: rentaCompletada2.id,
      authorId: ownerCarlos.id,
      targetUserId: renterMateo.id,
      motoId: null,
      targetType: "RENTER",
      rating: 5,
      comment: "Buen arrendatario, devolvió el vehículo sin novedades.",
      visibleAt: fechaVisiblePasada,
    },
  });

  console.log("[seed] Carga completada con éxito:");
  console.log(`  - Admin:      ${admin.email} / ${PASSWORD_DEMO}`);
  console.log(`  - Owner 1:    ${ownerCarlos.email} / ${PASSWORD_DEMO}`);
  console.log(`  - Owner 2:    ${ownerLaura.email} / ${PASSWORD_DEMO}`);
  console.log(`  - Renter:     ${renterMateo.email} / ${PASSWORD_DEMO}`);
  console.log(`  - Pendiente:  ${sofiaPendiente.email} / ${PASSWORD_DEMO}`);
  console.log(`  - Motos:      ${motosCreadas.length} (6 disponibles, 1 pendiente de aprobación)`);
}

main()
  .catch((error) => {
    console.error("[seed] Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
