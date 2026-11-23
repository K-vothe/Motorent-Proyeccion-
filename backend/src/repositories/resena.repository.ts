import { prisma } from "../config/prisma.js";

export type TipoObjetivoResena = "MOTO" | "OWNER" | "RENTER";

export interface DatosCrearResena {
  rentalId: string;
  authorId: string;
  targetUserId: string;
  motoId: string | null;
  targetType: TipoObjetivoResena;
  rating: number;
  comment: string | null;
  visibleAt: Date;
}

/**
 * Obtiene una renta con los identificadores de usuario del arrendatario y del propietario
 * para validar quién puede calificar a quién.
 */
export const buscarRentaParaResena = async (rentalId: string) => {
  return await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      renter: { select: { idUser: true } },
      moto: {
        select: {
          id: true,
          brand: true,
          model: true,
          owner: { select: { idUser: true } },
        },
      },
      reviews: {
        select: {
          id: true,
          authorId: true,
          targetType: true,
          visibleAt: true,
        },
      },
    },
  });
};

/** Verifica si el autor ya calificó ese mismo objetivo en esa misma renta. */
export const buscarResenaExistente = async (
  rentalId: string,
  authorId: string,
  targetType: TipoObjetivoResena
) => {
  return await prisma.review.findUnique({
    where: {
      rentalId_authorId_targetType: {
        rentalId,
        authorId,
        targetType,
      },
    },
  });
};

/** Crea una nueva reseña en base de datos. */
export const crearResena = async (datos: DatosCrearResena) => {
  return await prisma.review.create({
    data: {
      rentalId: datos.rentalId,
      authorId: datos.authorId,
      targetUserId: datos.targetUserId,
      motoId: datos.motoId,
      targetType: datos.targetType,
      rating: datos.rating,
      comment: datos.comment,
      visibleAt: datos.visibleAt,
    },
  });
};

/**
 * Lista todas las reseñas asociadas a una motocicleta (junto con el conteo de
 * autores distintos en la misma renta para evaluar el doble ciego).
 */
export const listarResenasDeMoto = async (motoId: string) => {
  return await prisma.review.findMany({
    where: { motoId, targetType: "MOTO" },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, fullName: true } },
      rental: {
        select: {
          id: true,
          reviews: { select: { authorId: true } },
        },
      },
    },
  });
};

/**
 * Busca rentas COMPLETED donde participa el usuario (como arrendatario o propietario)
 * para saber cuáles le falta calificar (regla obligatoria antes de la siguiente operación).
 */
export const listarRentasCompletadasDeUsuario = async (userId: string) => {
  return await prisma.rental.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { renter: { idUser: userId } },
        { moto: { owner: { idUser: userId } } },
      ],
    },
    orderBy: { endDate: "desc" },
    take: 20,
    include: {
      renter: {
        select: {
          idUser: true,
          user: { select: { id: true, fullName: true } },
        },
      },
      moto: {
        select: {
          id: true,
          brand: true,
          model: true,
          owner: {
            select: {
              idUser: true,
              user: { select: { id: true, fullName: true } },
            },
          },
        },
      },
      reviews: {
        select: {
          authorId: true,
          targetType: true,
        },
      },
    },
  });
};

/**
 * Obtiene el PERFIL PÚBLICO seguro de un usuario.
 *
 * REGLA DE PRIVACIDAD ESTRICTA:
 * Solo selecciona campos públicos (id, fullName, createdAt, estado de verificación,
 * motos disponibles y reseñas). NUNCA selecciona email, phone, password, cédula ni licencia.
 */
export const obtenerPerfilPublicoPorId = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      createdAt: true,
      renter: {
        select: {
          estadoVerificacion: true,
          _count: { select: { rentals: true } },
        },
      },
      owner: {
        select: {
          estadoVerificacion: true,
          motos: {
            where: { status: "AVAILABLE" },
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              displacement: true,
              dailyRate: true,
            },
            take: 12,
          },
        },
      },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, fullName: true } },
          moto: { select: { id: true, brand: true, model: true } },
          rental: {
            select: {
              id: true,
              reviews: { select: { authorId: true } },
            },
          },
        },
      },
    },
  });
};
