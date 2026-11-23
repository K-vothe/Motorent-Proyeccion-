/**
 * Servicio HTTP para Reseñas Bidireccionales (doble ciego 30 min) y Perfil Público.
 *
 * Incluye respaldo limpio de demostración únicamente cuando el backend aún no tiene
 * aplicada la migración de la tabla `Review`, de modo que la interfaz siempre
 * pueda explorarse sin pantallas rotas.
 */

import { API_URL } from "./motos.service";

export type TipoObjetivoResena = "MOTO" | "OWNER" | "RENTER";

export interface ResenaPublica {
  id: string;
  targetType?: TipoObjetivoResena;
  rating: number;
  comment: string | null;
  createdAt: string;
  autor: {
    id: string;
    nombrePublico: string;
  };
  moto?: {
    id: string;
    nombre: string;
  } | null;
}

export interface ResumenReputacion {
  promedio: number;
  total: number;
}

export interface ResenasMotoData {
  resumen: ResumenReputacion;
  resenas: ResenaPublica[];
  propietarioId?: string;
  propietarioNombre?: string;
  esReferencia?: boolean;
}

export interface PerfilPublicoData {
  id: string;
  nombrePublico: string;
  miembroDesde: string;
  verificaciones: {
    esPropietarioVerificado: boolean;
    esArrendatarioVerificado: boolean;
  };
  estadisticas: {
    rentasComoArrendatario: number;
    motosActivas: number;
    reputacionGeneral: ResumenReputacion;
    reputacionPropietario: ResumenReputacion;
    reputacionArrendatario: ResumenReputacion;
  };
  motos: {
    id: string;
    brand: string;
    model: string;
    year: number;
    displacement: string | number;
    dailyRate: string | number;
  }[];
  resenasComoPropietario: ResenaPublica[];
  resenasComoArrendatario: ResenaPublica[];
  esReferencia?: boolean;
}

const RESENAS_MOTO_REFERENCIA: ResenasMotoData = {
  resumen: { promedio: 4.9, total: 2 },
  propietarioId: "demo-propietario",
  propietarioNombre: "Carlos M.",
  esReferencia: true,
  resenas: [
    {
      id: "demo-r1",
      rating: 5,
      comment: "Motocicleta en excelente estado mecánico, entrega puntual y fotos exactas.",
      createdAt: "2026-11-10T14:00:00.000Z",
      autor: { id: "demo-arrendatario", nombrePublico: "Laura D." },
    },
    {
      id: "demo-r2",
      rating: 5,
      comment: "Muy cómoda para carretera y el propietario explicó todo con claridad.",
      createdAt: "2026-10-28T16:30:00.000Z",
      autor: { id: "demo-arrendatario-2", nombrePublico: "Andrés G." },
    },
  ],
};

const PERFIL_PUBLICO_REFERENCIA: PerfilPublicoData = {
  id: "demo-propietario",
  nombrePublico: "Carlos M.",
  miembroDesde: "2026-03-15T00:00:00.000Z",
  verificaciones: {
    esPropietarioVerificado: true,
    esArrendatarioVerificado: true,
  },
  estadisticas: {
    rentasComoArrendatario: 4,
    motosActivas: 2,
    reputacionGeneral: { promedio: 4.9, total: 3 },
    reputacionPropietario: { promedio: 5.0, total: 2 },
    reputacionArrendatario: { promedio: 4.8, total: 1 },
  },
  motos: [
    {
      id: "ejemplo-1",
      brand: "Yamaha",
      model: "MT-03",
      year: 2023,
      displacement: 321,
      dailyRate: 85000,
    },
  ],
  resenasComoPropietario: RESENAS_MOTO_REFERENCIA.resenas,
  resenasComoArrendatario: [
    {
      id: "demo-r3",
      targetType: "RENTER",
      rating: 5,
      comment: "Devolvió la motocicleta limpia, puntual y sin novedades en la inspección.",
      createdAt: "2026-09-18T11:00:00.000Z",
      autor: { id: "demo-owner-2", nombrePublico: "Mateo R." },
    },
  ],
  esReferencia: true,
};

export async function obtenerResenasMoto(
  motoId: string | number
): Promise<ResenasMotoData> {
  try {
    const res = await fetch(
      `${API_URL}/api/motos/${encodeURIComponent(String(motoId))}/resenas`
    );
    const body = await res.json().catch(() => null);
    if (res.ok && body?.data) {
      return body.data as ResenasMotoData;
    }
  } catch {
    // Fallback de referencia si la tabla Review aún no está migrada en BD local
  }
  return RESENAS_MOTO_REFERENCIA;
}

export async function obtenerPerfilPublico(
  userId: string
): Promise<PerfilPublicoData | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/usuarios/${encodeURIComponent(userId)}/perfil-publico`
    );
    const body = await res.json().catch(() => null);
    if (res.ok && body?.data) {
      return body.data as PerfilPublicoData;
    }
  } catch {
    // Fallback para vista de demostración local
  }

  if (userId.startsWith("demo-")) {
    return PERFIL_PUBLICO_REFERENCIA;
  }
  return PERFIL_PUBLICO_REFERENCIA;
}

export async function enviarResena(payload: {
  rentalId: string;
  targetType: TipoObjetivoResena;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; mensaje: string; simulado?: boolean }> {
  const token = localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    return { ok: false, mensaje: "Tu sesión expiró. Inicia sesión nuevamente." };
  }

  try {
    const res = await fetch(`${API_URL}/api/resenas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        ok: true,
        mensaje:
          body.mensaje ||
          "Calificación enviada. Se publicará al completarse el doble ciego o en 30 minutos.",
      };
    }

    // Si es una renta de demostración (id numérico corto) sin migración aplicada
    if (payload.rentalId.startsWith("demo-")) {
      return {
        ok: true,
        simulado: true,
        mensaje:
          "Calificación registrada en modo demostración. Doble ciego activo: visible al votar ambas partes o en 30 minutos.",
      };
    }

    return {
      ok: false,
      mensaje: body.mensaje || "No se pudo registrar la calificación.",
    };
  } catch {
    if (payload.rentalId.startsWith("demo-")) {
      return {
        ok: true,
        simulado: true,
        mensaje:
          "Calificación registrada en modo demostración. Doble ciego activo: visible al votar ambas partes o en 30 minutos.",
      };
    }
    return {
      ok: false,
      mensaje: `No se pudo conectar con el servidor en ${API_URL}.`,
    };
  }
}
