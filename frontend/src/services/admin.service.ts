/**
 * Servicio HTTP del Panel Administrativo completo (Fase 7).
 * Todas las rutas requieren token JWT válido y rol ADMIN (RBAC).
 */

import { API_URL } from "./motos.service";
import type { ColaVerificacionesAdmin } from "./verificacion.service";
import type { UsuarioAdminItem } from "../utils/admin.utils";

export interface ResumenAdminData {
  usuariosTotales: number;
  rentersPendientes: number;
  ownersPendientes: number;
  motosPendientes: number;
  motosDisponibles: number;
  resenasAlerta: number;
}

export interface MotoAdminItem {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  displacement: string | number;
  KM: number;
  color: string;
  dailyRate: number;
  status: string;
  fotoPortada: string | null;
  createdAt: string;
  propietario: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface ResenaAdminItem {
  id: string;
  targetType: string;
  rating: number;
  esAlerta: boolean;
  comment: string | null;
  createdAt: string;
  autor: { id: string; fullName: string };
  destinatario: { id: string; fullName: string };
  moto: string | null;
}

export interface PanelAdminCompleto {
  resumen: ResumenAdminData;
  cola: ColaVerificacionesAdmin;
  motos: MotoAdminItem[];
  usuarios: UsuarioAdminItem[];
  resenas: ResenaAdminItem[];
}

function obtenerHeadersAdmin(): Record<string, string> | null {
  const token = localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") return null;
  return { Authorization: `Bearer ${token}` };
}

/** Carga en paralelo todos los módulos del Panel Administrativo. */
export async function cargarPanelAdminCompleto(): Promise<{
  ok: boolean;
  codigo?: number;
  mensaje: string;
  data?: PanelAdminCompleto;
}> {
  const headers = obtenerHeadersAdmin();
  if (!headers) {
    return { ok: false, codigo: 401, mensaje: "Sesión expirada. Inicia sesión nuevamente." };
  }

  try {
    const [resVerif, resResumen, resMotos, resUsuarios, resResenas] = await Promise.all([
      fetch(`${API_URL}/api/admin/verificaciones`, { headers }),
      fetch(`${API_URL}/api/admin/resumen`, { headers }),
      fetch(`${API_URL}/api/admin/motos`, { headers }),
      fetch(`${API_URL}/api/admin/usuarios`, { headers }),
      fetch(`${API_URL}/api/admin/resenas`, { headers }),
    ]);

    if (resVerif.status === 403 || resResumen.status === 403) {
      return {
        ok: false,
        codigo: 403,
        mensaje:
          "Tu sesión actual no tiene rol ADMIN en el servidor (HTTP 403 — control RBAC activo).",
      };
    }

    if (!resVerif.ok) {
      const body = await resVerif.json().catch(() => ({}));
      return {
        ok: false,
        codigo: resVerif.status,
        mensaje: body.mensaje || "No se pudo consultar el panel administrativo.",
      };
    }

    const [bVerif, bResumen, bMotos, bUsuarios, bResenas] = await Promise.all([
      resVerif.json().catch(() => ({})),
      resResumen.ok ? resResumen.json().catch(() => ({})) : Promise.resolve({}),
      resMotos.ok ? resMotos.json().catch(() => ({})) : Promise.resolve({}),
      resUsuarios.ok ? resUsuarios.json().catch(() => ({})) : Promise.resolve({}),
      resResenas.ok ? resResenas.json().catch(() => ({})) : Promise.resolve({}),
    ]);

    const cola = (bVerif.data || {
      renters: [],
      owners: [],
      resumen: { rentersPendientes: 0, ownersPendientes: 0, motosPendientes: 0 },
    }) as ColaVerificacionesAdmin;

    const resumen = (bResumen.data || {
      usuariosTotales: Array.isArray(bUsuarios.data) ? bUsuarios.data.length : 0,
      rentersPendientes: cola.renters.length,
      ownersPendientes: cola.owners.length,
      motosPendientes: cola.resumen.motosPendientes,
      motosDisponibles: 0,
      resenasAlerta: 0,
    }) as ResumenAdminData;

    return {
      ok: true,
      codigo: 200,
      mensaje: "Panel cargado correctamente",
      data: {
        resumen,
        cola,
        motos: Array.isArray(bMotos.data) ? (bMotos.data as MotoAdminItem[]) : [],
        usuarios: Array.isArray(bUsuarios.data) ? (bUsuarios.data as UsuarioAdminItem[]) : [],
        resenas: Array.isArray(bResenas.data) ? (bResenas.data as ResenaAdminItem[]) : [],
      },
    };
  } catch {
    return {
      ok: false,
      mensaje: `No se pudo conectar con el servidor en ${API_URL}.`,
    };
  }
}

/** Cambia el estado de una motocicleta desde el Panel ADMIN. */
export async function actualizarEstadoMotoAdmin(
  motoId: string,
  status: "AVAILABLE" | "REJECTED" | "MAINTENANCE" | "INACTIVE"
): Promise<{ ok: boolean; mensaje: string }> {
  const headers = obtenerHeadersAdmin();
  if (!headers) {
    return { ok: false, mensaje: "Sesión expirada." };
  }

  try {
    const res = await fetch(`${API_URL}/api/admin/motos/${encodeURIComponent(motoId)}/estado`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, mensaje: body.mensaje || "No se pudo actualizar la moto." };
    }
    return { ok: true, mensaje: body.mensaje || "Estado actualizado correctamente." };
  } catch {
    return { ok: false, mensaje: `Error de conexión con ${API_URL}.` };
  }
}

/**
 * Descarga un documento privado usando el header Authorization (nunca en la URL)
 * y devuelve un Blob URL temporal para previsualizarlo de forma segura.
 */
export async function descargarDocumentoPrivadoAdmin(
  rutaApi: string
): Promise<{ ok: boolean; blobUrl?: string; mensaje?: string }> {
  const headers = obtenerHeadersAdmin();
  if (!headers) {
    return { ok: false, mensaje: "Sesión expirada." };
  }

  try {
    const res = await fetch(`${API_URL}${rutaApi}`, { headers });
    if (!res.ok) {
      return { ok: false, mensaje: "No fue posible cargar este documento." };
    }
    const blob = await res.blob();
    return { ok: true, blobUrl: URL.createObjectURL(blob) };
  } catch {
    return { ok: false, mensaje: "Error de red al descargar el documento." };
  }
}

/**
 * Datos de ejemplo exclusivos para la vista previa de desarrollo (import.meta.env.DEV)
 * cuando se previsualiza el rol ADMIN desde una cuenta sin privilegios reales.
 */
export const DATOS_DEMO_PANEL_ADMIN: PanelAdminCompleto = {
  resumen: {
    usuariosTotales: 18,
    rentersPendientes: 1,
    ownersPendientes: 1,
    motosPendientes: 1,
    motosDisponibles: 4,
    resenasAlerta: 1,
  },
  cola: {
    resumen: { rentersPendientes: 1, ownersPendientes: 1, motosPendientes: 1 },
    renters: [
      {
        id: "demo-renter-1",
        idUser: "demo-u1",
        cedulaNumero: "1023456789",
        cedulaFrontUrl: "/uploads/verificaciones/renter/demo-u1/cedulaFront.jpg",
        cedulaBackUrl: "/uploads/verificaciones/renter/demo-u1/cedulaBack.jpg",
        photo: "/uploads/verificaciones/renter/demo-u1/photo.jpg",
        licenseNumber: "1023456789",
        licenseFrontUrl: "/uploads/verificaciones/renter/demo-u1/licenseFront.jpg",
        licenseBackUrl: "/uploads/verificaciones/renter/demo-u1/licenseBack.jpg",
        licenseCategory: "A2",
        billUrl: "/uploads/verificaciones/renter/demo-u1/bill.pdf",
        estadoVerificacion: "PENDING",
        createdAt: "2026-11-21T15:00:00.000Z",
        updatedAt: "2026-11-21T15:00:00.000Z",
        user: {
          id: "demo-u1",
          username: "laurad",
          fullName: "Laura Díaz",
          email: "laura@ejemplo.co",
          phone: "3004445566",
          role: "USER",
        },
      },
    ],
    owners: [
      {
        id: "demo-owner-1",
        idUser: "demo-u2",
        cedulaNumero: "1098765432",
        cedulaFrontUrl: "/uploads/verificaciones/owner/demo-u2/cedulaFront.jpg",
        cedulaBackUrl: "/uploads/verificaciones/owner/demo-u2/cedulaBack.jpg",
        photo: "/uploads/verificaciones/owner/demo-u2/photo.jpg",
        billUrl: "/uploads/verificaciones/owner/demo-u2/bill.pdf",
        estadoVerificacion: "PENDING",
        createdAt: "2026-11-20T11:30:00.000Z",
        updatedAt: "2026-11-20T11:30:00.000Z",
        user: {
          id: "demo-u2",
          username: "carlosm",
          fullName: "Carlos Méndez",
          email: "carlos@ejemplo.co",
          phone: "3109998877",
          role: "USER",
        },
      },
    ],
  },
  motos: [
    {
      id: "demo-moto-1",
      brand: "Yamaha",
      model: "MT-03",
      year: 2024,
      licensePlate: "KTM45G",
      displacement: 321,
      KM: 6400,
      color: "Negro Mate",
      dailyRate: 85000,
      status: "PENDING_APPROVAL",
      fotoPortada: null,
      createdAt: "2026-11-21T18:00:00.000Z",
      propietario: { id: "demo-propietario", fullName: "Carlos Méndez", email: "carlos@ejemplo.co" },
    },
    {
      id: "demo-moto-2",
      brand: "Honda",
      model: "CB160F",
      year: 2024,
      licensePlate: "HND16B",
      displacement: 160,
      KM: 3200,
      color: "Rojo Perlado",
      dailyRate: 45000,
      status: "AVAILABLE",
      fotoPortada: null,
      createdAt: "2026-11-15T10:00:00.000Z",
      propietario: { id: "demo-propietario", fullName: "Carlos Méndez", email: "carlos@ejemplo.co" },
    },
  ],
  usuarios: [
    {
      id: "demo-propietario",
      username: "carlosm",
      fullName: "Carlos Méndez",
      email: "carlos@ejemplo.co",
      phone: "3109998877",
      role: "OWNER",
      isEmailVerified: true,
      createdAt: "2026-03-15T00:00:00.000Z",
      estadoRenter: "APPROVED",
      estadoOwner: "APPROVED",
      totalRentas: 4,
      totalMotos: 2,
    },
    {
      id: "demo-arrendatario",
      username: "laurad",
      fullName: "Laura Díaz",
      email: "laura@ejemplo.co",
      phone: "3004445566",
      role: "RENTER",
      isEmailVerified: true,
      createdAt: "2026-08-10T00:00:00.000Z",
      estadoRenter: "PENDING",
      estadoOwner: "NOT_STARTED",
      totalRentas: 1,
      totalMotos: 0,
    },
  ],
  resenas: [
    {
      id: "demo-rev-alerta",
      targetType: "MOTO",
      rating: 2,
      esAlerta: true,
      comment: "La cadena sonaba un poco floja durante el trayecto en carretera.",
      createdAt: "2026-11-19T14:20:00.000Z",
      autor: { id: "demo-arrendatario", fullName: "Laura Díaz" },
      destinatario: { id: "demo-propietario", fullName: "Carlos Méndez" },
      moto: "Yamaha MT-03 (KTM45G)",
    },
  ],
};
