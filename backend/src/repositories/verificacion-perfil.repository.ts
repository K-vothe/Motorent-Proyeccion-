import { prisma } from "../config/prisma.js";

export interface DatosGuardarRenter {
  idUser: string;
  cedulaNumero: string;
  cedulaFrontUrl: string;
  cedulaBackUrl: string;
  photo: string;
  licenseNumber: string;
  licenseFrontUrl: string;
  licenseBackUrl: string;
  licenseCategory: string;
  billUrl: string;
}

export interface DatosGuardarOwner {
  idUser: string;
  cedulaNumero: string;
  cedulaFrontUrl: string;
  cedulaBackUrl: string;
  photo: string;
  billUrl: string;
}

export type EstadoResolucion = "APPROVED" | "REJECTED";

// ============================================================================
// CONSULTAS Y PERSISTENCIA DE ARRENDATARIO (RENTER)
// ============================================================================

export const buscarRenterPorUserId = async (idUser: string) => {
  return await prisma.renter.findUnique({
    where: { idUser },
  });
};

export const buscarRenterPorCedula = async (cedulaNumero: string) => {
  return await prisma.renter.findUnique({
    where: { cedulaNumero },
  });
};

export const buscarRenterPorLicencia = async (licenseNumber: string) => {
  return await prisma.renter.findUnique({
    where: { licenseNumber },
  });
};

export const buscarRenterPorId = async (id: string) => {
  return await prisma.renter.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

export const guardarSolicitudRenter = async (datos: DatosGuardarRenter) => {
  return await prisma.renter.upsert({
    where: { idUser: datos.idUser },
    create: {
      idUser: datos.idUser,
      cedulaNumero: datos.cedulaNumero,
      cedulaFrontUrl: datos.cedulaFrontUrl,
      cedulaBackUrl: datos.cedulaBackUrl,
      photo: datos.photo,
      licenseNumber: datos.licenseNumber,
      licenseFrontUrl: datos.licenseFrontUrl,
      licenseBackUrl: datos.licenseBackUrl,
      licenseCategory: datos.licenseCategory,
      billUrl: datos.billUrl,
      estadoVerificacion: "PENDING",
      motivoRechazo: null,
      fechaVerificacion: null,
    },
    update: {
      cedulaNumero: datos.cedulaNumero,
      cedulaFrontUrl: datos.cedulaFrontUrl,
      cedulaBackUrl: datos.cedulaBackUrl,
      photo: datos.photo,
      licenseNumber: datos.licenseNumber,
      licenseFrontUrl: datos.licenseFrontUrl,
      licenseBackUrl: datos.licenseBackUrl,
      licenseCategory: datos.licenseCategory,
      billUrl: datos.billUrl,
      estadoVerificacion: "PENDING",
      motivoRechazo: null,
      fechaVerificacion: null,
    },
  });
};

// ============================================================================
// CONSULTAS Y PERSISTENCIA DE PROPIETARIO (OWNER)
// ============================================================================

export const buscarOwnerPorUserId = async (idUser: string) => {
  return await prisma.owner.findUnique({
    where: { idUser },
  });
};

export const buscarOwnerPorCedula = async (cedulaNumero: string) => {
  return await prisma.owner.findUnique({
    where: { cedulaNumero },
  });
};

export const buscarOwnerPorId = async (id: string) => {
  return await prisma.owner.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

export const guardarSolicitudOwner = async (datos: DatosGuardarOwner) => {
  return await prisma.owner.upsert({
    where: { idUser: datos.idUser },
    create: {
      idUser: datos.idUser,
      cedulaNumero: datos.cedulaNumero,
      cedulaFrontUrl: datos.cedulaFrontUrl,
      cedulaBackUrl: datos.cedulaBackUrl,
      photo: datos.photo,
      billUrl: datos.billUrl,
      estadoVerificacion: "PENDING",
      motivoRechazo: null,
      fechaVerificacion: null,
    },
    update: {
      cedulaNumero: datos.cedulaNumero,
      cedulaFrontUrl: datos.cedulaFrontUrl,
      cedulaBackUrl: datos.cedulaBackUrl,
      photo: datos.photo,
      billUrl: datos.billUrl,
      estadoVerificacion: "PENDING",
      motivoRechazo: null,
      fechaVerificacion: null,
    },
  });
};

// ============================================================================
// COLAS Y RESOLUCIÓN ADMINISTRATIVA (ADMIN)
// ============================================================================

export const listarVerificacionesPendientes = async () => {
  const [renters, owners, motosPendientes] = await Promise.all([
    prisma.renter.findMany({
      where: { estadoVerificacion: "PENDING" },
      orderBy: { updatedAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    }),
    prisma.owner.findMany({
      where: { estadoVerificacion: "PENDING" },
      orderBy: { updatedAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    }),
    prisma.moto.count({
      where: { status: "PENDING_APPROVAL" },
    }),
  ]);

  return {
    renters,
    owners,
    resumen: {
      rentersPendientes: renters.length,
      ownersPendientes: owners.length,
      motosPendientes,
    },
  };
};

/**
 * Actualiza el estado de un perfil de Arrendatario.
 * Si se aprueba y el usuario aún tiene el rol base USER, asciende su rol a RENTER.
 */
export const actualizarEstadoRenter = async (
  id: string,
  estado: EstadoResolucion,
  motivoRechazo: string | null
) => {
  const actualizado = await prisma.renter.update({
    where: { id },
    data: {
      estadoVerificacion: estado,
      motivoRechazo,
      fechaVerificacion: estado === "APPROVED" ? new Date() : null,
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (estado === "APPROVED" && actualizado.user.role === "USER") {
    await prisma.user.update({
      where: { id: actualizado.idUser },
      data: { role: "RENTER" },
    });
  }

  return actualizado;
};

/**
 * Actualiza el estado de un perfil de Propietario.
 * Si se aprueba y el usuario no es ADMIN, promueve su rol principal a OWNER
 * para habilitar rutas protegidas por RBAC (como POST /api/create/moto).
 * Si el usuario ya era RENTER aprobado, conserva ambos perfiles activos (Modo Dual).
 */
export const actualizarEstadoOwner = async (
  id: string,
  estado: EstadoResolucion,
  motivoRechazo: string | null
) => {
  const actualizado = await prisma.owner.update({
    where: { id },
    data: {
      estadoVerificacion: estado,
      motivoRechazo,
      fechaVerificacion: estado === "APPROVED" ? new Date() : null,
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (estado === "APPROVED" && actualizado.user.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: actualizado.idUser },
      data: { role: "OWNER" },
    });
  }

  return actualizado;
};
