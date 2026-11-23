/**
 * Servicio encargado de gestionar las solicitudes de verificación de
 * Arrendatario (Renter), Propietario (Owner) y las colas administrativas (ADMIN).
 *
 * CONTRATO FASE 3 (INTEGRACIÓN REAL CON BACKEND):
 * - POST  /api/renter/verificar                  -> Solicitud de Arrendatario (JSON + Base64 Data URLs)
 * - POST  /api/owner/verificar                   -> Solicitud de Propietario (JSON + Base64 Data URLs)
 * - GET   /api/admin/verificaciones              -> Colas pendientes (solo rol ADMIN)
 * - PATCH /api/admin/verificaciones/:tipo/:id    -> Aprobar o rechazar solicitud (solo rol ADMIN)
 *
 * MODO SIMULACIÓN OPCIONAL:
 * Por defecto la integración real está activa (USAR_SIMULACION_LOCAL = false).
 * Si un desarrollador desea probar los formularios sin aplicar migraciones en BD,
 * puede definir VITE_SIMULAR_VERIFICACION=true en `frontend/.env`.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Opt-in por variable de entorno; en operación normal apunta al backend real. */
export const USAR_SIMULACION_LOCAL =
  import.meta.env.VITE_SIMULAR_VERIFICACION === "true";

export type TipoVerificacion = "renter" | "owner";
export type EstadoVerificacion = "PENDING" | "APPROVED" | "REJECTED";

export interface RespuestaVerificacion {
  ok: boolean;
  mensaje: string;
  simulado?: boolean;
}

export interface UsuarioResumenSolicitud {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export interface SolicitudRenterPendiente {
  id: string;
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
  estadoVerificacion: EstadoVerificacion;
  createdAt: string;
  updatedAt: string;
  user: UsuarioResumenSolicitud;
}

export interface SolicitudOwnerPendiente {
  id: string;
  idUser: string;
  cedulaNumero: string;
  cedulaFrontUrl: string;
  cedulaBackUrl: string;
  photo: string;
  billUrl: string;
  estadoVerificacion: EstadoVerificacion;
  createdAt: string;
  updatedAt: string;
  user: UsuarioResumenSolicitud;
}

export interface ColaVerificacionesAdmin {
  renters: SolicitudRenterPendiente[];
  owners: SolicitudOwnerPendiente[];
  resumen: {
    rentersPendientes: number;
    ownersPendientes: number;
    motosPendientes: number;
  };
}

export interface RespuestaColaAdmin {
  ok: boolean;
  mensaje: string;
  codigo?: number;
  data?: ColaVerificacionesAdmin;
}

const CLAVE_STORAGE_PREFIX = "motorent_verificacion_";

function leerTokenSesion(): string | null {
  const token = localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }
  return token;
}

/**
 * Guarda temporalmente el estado de verificación en localStorage para reflejar
 * "En revisión" de inmediato en el Dashboard antes de recargar /auth/me.
 */
function guardarEstadoLocal(tipo: TipoVerificacion, estado: EstadoVerificacion) {
  localStorage.setItem(`${CLAVE_STORAGE_PREFIX}${tipo}`, estado);
}

/**
 * Consulta si existe un estado de verificación guardado localmente.
 */
export function obtenerEstadoVerificacionLocal(
  tipo: TipoVerificacion
): EstadoVerificacion | null {
  const valor = localStorage.getItem(`${CLAVE_STORAGE_PREFIX}${tipo}`);
  if (valor === "PENDING" || valor === "APPROVED" || valor === "REJECTED") {
    return valor;
  }
  return null;
}

/**
 * Convierte un archivo seleccionado en el navegador (File) a Data URL Base64
 * compatible con `parseDataUrl()` del backend (`backend/src/utils/file.util.ts`).
 */
function leerArchivoComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === "string") {
        resolve(lector.result);
      } else {
        reject(new Error(`No se pudo codificar el archivo ${file.name}`));
      }
    };
    lector.onerror = () => {
      reject(new Error(`Error leyendo el archivo ${file.name}`));
    };
    lector.readAsDataURL(file);
  });
}

/**
 * Transforma un FormData (textos + File) en un objeto JSON plano con archivos
 * en formato Base64 Data URL para enviarlo al backend sin dependencias extra.
 */
async function convertirFormDataAJsonBase64(
  formData: FormData
): Promise<Record<string, string>> {
  const payload: Record<string, string> = {};
  const entradas = Array.from(formData.entries());

  for (const [clave, valor] of entradas) {
    if (valor instanceof File) {
      payload[clave] = await leerArchivoComoDataUrl(valor);
    } else {
      payload[clave] = String(valor).trim();
    }
  }

  return payload;
}

/**
 * Envía la solicitud de verificación (renter u owner) al backend real.
 */
export async function enviarSolicitudVerificacion(
  tipo: TipoVerificacion,
  formData: FormData
): Promise<RespuestaVerificacion> {
  const token = leerTokenSesion();

  if (!token) {
    return {
      ok: false,
      mensaje: "Tu sesión no es válida o expiró. Inicia sesión nuevamente.",
    };
  }

  // Modo simulación opt-in para pruebas locales sin base de datos migrada
  if (USAR_SIMULACION_LOCAL) {
    const camposPreparados: Record<string, string> = {};
    formData.forEach((valor, clave) => {
      camposPreparados[clave] =
        valor instanceof File ? `[Archivo: ${valor.name}]` : String(valor);
    });
    console.info(
      `[MotoRent - Simulación Local] Payload listo para /api/${tipo}/verificar:`,
      camposPreparados
    );

    await new Promise((resolve) => setTimeout(resolve, 600));
    guardarEstadoLocal(tipo, "PENDING");

    return {
      ok: true,
      simulado: true,
      mensaje:
        "Solicitud validada y guardada en modo simulación local (VITE_SIMULAR_VERIFICACION=true).",
    };
  }

  try {
    const cuerpoJson = await convertirFormDataAJsonBase64(formData);

    const response = await fetch(`${API_URL}/api/${tipo}/verificar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cuerpoJson),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        mensaje:
          data.mensaje ||
          data.message ||
          "No se pudo enviar la solicitud de verificación. Intenta nuevamente.",
      };
    }

    guardarEstadoLocal(tipo, "PENDING");

    return {
      ok: true,
      mensaje:
        data.mensaje ||
        data.message ||
        "Solicitud enviada correctamente. Tus documentos quedaron en revisión.",
    };
  } catch (error) {
    console.error(`Error al enviar verificación de ${tipo}:`, error);
    return {
      ok: false,
      mensaje: `No se pudo conectar con el servidor en ${API_URL}. Verifica que el backend esté activo.`,
    };
  }
}

/**
 * Consulta la cola de verificaciones pendientes para el panel de Administrador.
 */
export async function obtenerVerificacionesPendientesAdmin(): Promise<RespuestaColaAdmin> {
  const token = leerTokenSesion();

  if (!token) {
    return {
      ok: false,
      codigo: 401,
      mensaje: "Sesión expirada. Inicia sesión nuevamente.",
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/verificaciones`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        codigo: response.status,
        mensaje:
          body.mensaje ||
          body.message ||
          "No se pudieron consultar las solicitudes pendientes.",
      };
    }

    const payload = (body.data || body) as ColaVerificacionesAdmin;

    return {
      ok: true,
      codigo: response.status,
      mensaje: body.mensaje || "Colas obtenidas correctamente",
      data: payload,
    };
  } catch (error) {
    console.error("Error consultando cola administrativa:", error);
    return {
      ok: false,
      mensaje: `No se pudo conectar con el servidor en ${API_URL}.`,
    };
  }
}

/**
 * Aprueba o rechaza una solicitud de verificación de Renter u Owner desde el panel ADMIN.
 */
export async function resolverVerificacionAdmin(
  tipo: TipoVerificacion,
  solicitudId: string,
  estado: "APPROVED" | "REJECTED",
  motivoRechazo?: string
): Promise<RespuestaVerificacion> {
  const token = leerTokenSesion();

  if (!token) {
    return {
      ok: false,
      mensaje: "Tu sesión expiró. Inicia sesión nuevamente.",
    };
  }

  try {
    const response = await fetch(
      `${API_URL}/api/admin/verificaciones/${tipo}/${solicitudId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estado,
          motivoRechazo: estado === "REJECTED" ? motivoRechazo?.trim() : undefined,
        }),
      }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        mensaje:
          body.mensaje ||
          body.message ||
          "No se pudo actualizar el estado de la solicitud.",
      };
    }

    return {
      ok: true,
      mensaje:
        body.mensaje ||
        (estado === "APPROVED"
          ? "Solicitud aprobada correctamente."
          : "Solicitud rechazada y registrada."),
    };
  } catch (error) {
    console.error("Error resolviendo verificación:", error);
    return {
      ok: false,
      mensaje: `Error de conexión al comunicarse con ${API_URL}.`,
    };
  }
}
