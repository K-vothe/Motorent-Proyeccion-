import { API_URL } from "./motos.service";
import type { EstadoRenta, MetodoPago, TipoIncidente } from "../utils/rentas.utils";

export interface ClausulaApi {
  id: string;
  title: string;
  body: string;
  version: number;
}

export interface ActaHandoverApi {
  id: string;
  type: "PICKUP" | "RETURN";
  mileage: number;
  fuelLevel: number;
  observations: string | null;
  createdAt: string;
  evidences: { id: string; fileUrl: string; description: string | null }[];
}

export interface RentaApi {
  id: string;
  status: EstadoRenta;
  startDate: string;
  endDate: string;
  subtotal: number;
  platformFee: number;
  ownerEarnings: number;
  total: number;
  rolEnRenta: "RENTER" | "OWNER" | "ADMIN";
  yaCalifico: boolean;
  requiereEvaluacion: boolean;
  tienePickup: boolean;
  tieneReturn: boolean;
  incidentType: TipoIncidente | null;
  incidentNotes: string | null;
  incidentAt: string | null;
  moto: {
    id: string;
    brand: string;
    model: string;
    year: number;
    licensePlate: string;
    KM: number;
    dailyRate: number;
    status: string;
  };
  propietario: { id: string; nombre: string } | null;
  arrendatario: { id: string; nombre: string };
  contract: {
    id: string;
    contractNumber: string;
    status: string;
    accepted: boolean;
    acceptedAt: string | null;
    signedAt: string | null;
    documentHash: string | null;
  } | null;
  payment: {
    id: string;
    amount: number;
    method: string;
    reference: string;
    status: string;
    paidAt: string;
  } | null;
  handovers: ActaHandoverApi[];
}

interface RespuestaApi<T = unknown> {
  ok: boolean;
  mensaje: string;
  data?: T;
}

function headersAuth(): Record<string, string> {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function solicitarJson<T>(
  ruta: string,
  opciones: RequestInit = {}
): Promise<RespuestaApi<T>> {
  try {
    const res = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: { ...headersAuth(), ...(opciones.headers as Record<string, string> | undefined) },
    });
    const json = (await res.json()) as {
      status?: string;
      mensaje?: string;
      message?: string;
      data?: T;
    };

    if (!res.ok) {
      return {
        ok: false,
        mensaje: json.mensaje || json.message || "No se pudo completar la operación.",
      };
    }

    return {
      ok: true,
      mensaje: json.mensaje || "Operación completada correctamente.",
      data: json.data,
    };
  } catch {
    return {
      ok: false,
      mensaje: "No fue posible conectar con el servidor. Verifica que el backend esté activo.",
    };
  }
}

export async function obtenerClausulas(): Promise<RespuestaApi<ClausulaApi[]>> {
  return solicitarJson<ClausulaApi[]>("/api/clausulas");
}

export async function obtenerMisRentas(): Promise<RespuestaApi<RentaApi[]>> {
  return solicitarJson<RentaApi[]>("/api/rentas/mias");
}

export async function solicitarRentaApi(
  motoId: string,
  startDate: string,
  endDate: string
): Promise<RespuestaApi<{ id: string }>> {
  return solicitarJson<{ id: string }>("/api/rentas", {
    method: "POST",
    body: JSON.stringify({ motoId, startDate, endDate }),
  });
}

export async function firmarContratoApi(
  rentalId: string,
  accepted: boolean,
  observations?: string
): Promise<RespuestaApi<{ contractNumber: string; documentHash: string }>> {
  return solicitarJson(`/api/rentas/${rentalId}/contrato/firmar`, {
    method: "POST",
    body: JSON.stringify({ accepted, observations }),
  });
}

export async function pagarRentaApi(
  rentalId: string,
  method: MetodoPago
): Promise<RespuestaApi<{ reference: string; status: string }>> {
  return solicitarJson(`/api/rentas/${rentalId}/pago`, {
    method: "POST",
    body: JSON.stringify({ method }),
  });
}

export async function registrarEntregaApi(
  rentalId: string,
  payload: { mileage: number; fuelLevel: number; observations?: string; photos?: string[] }
): Promise<RespuestaApi<ActaHandoverApi>> {
  return solicitarJson(`/api/rentas/${rentalId}/entrega`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registrarDevolucionApi(
  rentalId: string,
  payload: { mileage: number; fuelLevel: number; observations?: string; photos?: string[] }
): Promise<RespuestaApi<ActaHandoverApi>> {
  return solicitarJson(`/api/rentas/${rentalId}/devolucion`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelarRentaApi(rentalId: string): Promise<RespuestaApi<{ id: string }>> {
  return solicitarJson(`/api/rentas/${rentalId}/cancelar`, {
    method: "POST",
  });
}

export async function reportarIncidenteApi(
  rentalId: string,
  type: TipoIncidente,
  notes: string
): Promise<RespuestaApi<unknown>> {
  return solicitarJson(`/api/rentas/${rentalId}/incidente`, {
    method: "POST",
    body: JSON.stringify({ type, notes }),
  });
}
