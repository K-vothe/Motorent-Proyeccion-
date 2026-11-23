/**
 * Servicio HTTP del catálogo de motos y sus galerías de fotos.
 *
 * Endpoints:
 * - GET  /api/motos                 -> catálogo (incluye fotoPortada)
 * - GET  /api/motos/:id/galeria     -> fotos del propietario + inspecciones + descripción
 * - POST /api/motos/:id/galeria     -> agregar fotos / descripción (propietario o ADMIN)
 */

import type { FotoApi, MotoCatalogo } from "../utils/moto.utils";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface GaleriaMotoApi {
  motoId: string;
  fotosPropietario: FotoApi[];
  fotosInspeccion: FotoApi[];
  ultimaInspeccion: string | null;
  descripcionPropietario: string | null;
  descripcionActualizadaEn: string | null;
}

export interface ResultadoServicio<T> {
  ok: boolean;
  mensaje: string;
  data?: T;
}

export async function obtenerCatalogoMotos(): Promise<ResultadoServicio<MotoCatalogo[]>> {
  try {
    const response = await fetch(`${API_URL}/api/motos`);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, mensaje: body.mensaje || "No se pudo cargar el catálogo." };
    }

    const lista = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    return { ok: true, mensaje: "Catálogo cargado", data: lista as MotoCatalogo[] };
  } catch {
    return { ok: false, mensaje: `No se pudo conectar con el servidor en ${API_URL}.` };
  }
}

export async function obtenerGaleriaMoto(
  motoId: string | number
): Promise<ResultadoServicio<GaleriaMotoApi>> {
  try {
    const response = await fetch(`${API_URL}/api/motos/${encodeURIComponent(String(motoId))}/galeria`);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, mensaje: body.mensaje || "No se pudo cargar la galería." };
    }

    return { ok: true, mensaje: "Galería cargada", data: (body.data || body) as GaleriaMotoApi };
  } catch {
    return { ok: false, mensaje: "Sin conexión con el servidor para cargar la galería." };
  }
}

export async function actualizarGaleriaMoto(
  motoId: string | number,
  fotos: string[],
  descripcion?: string
): Promise<ResultadoServicio<GaleriaMotoApi>> {
  const token = localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    return { ok: false, mensaje: "Tu sesión expiró. Inicia sesión nuevamente." };
  }

  try {
    const response = await fetch(
      `${API_URL}/api/motos/${encodeURIComponent(String(motoId))}/galeria`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fotos,
          descripcion: descripcion?.trim() ? descripcion.trim() : undefined,
        }),
      }
    );
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, mensaje: body.mensaje || "No se pudieron guardar las fotos." };
    }

    return { ok: true, mensaje: body.mensaje || "Galería actualizada", data: body.data as GaleriaMotoApi };
  } catch {
    return { ok: false, mensaje: `No se pudo conectar con el servidor en ${API_URL}.` };
  }
}
