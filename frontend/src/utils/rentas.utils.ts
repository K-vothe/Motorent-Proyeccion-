/**
 * UTILIDADES PURAS DEL CICLO DE VIDA DE RENTAS (FASE 9)
 *
 * Centraliza etiquetas, cálculo de avance del stepper (1 a 5) y validaciones
 * de formularios de actas e incidentes para mantener los componentes limpios
 * y fáciles de probar.
 */

export type EstadoRenta =
  | "PENDING"
  | "PAID"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "INCIDENT";

export type TipoIncidente = "ACCIDENT" | "THEFT" | "DISAPPEARANCE";

export type MetodoPago = "PSE" | "NEQUI" | "DAVIPLATA" | "TARJETA" | "EFECTIVO";

export const METODOS_PAGO: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "PSE", etiqueta: "PSE (Transferencia bancaria)" },
  { valor: "NEQUI", etiqueta: "Nequi" },
  { valor: "DAVIPLATA", etiqueta: "Daviplata" },
  { valor: "TARJETA", etiqueta: "Tarjeta débito / crédito" },
  { valor: "EFECTIVO", etiqueta: "Efectivo contra entrega" },
];

export const ETIQUETAS_ESTADO_RENTA: Record<
  EstadoRenta,
  { texto: string; clase: string }
> = {
  PENDING: { texto: "Pendiente", clase: "status-pending" },
  PAID: { texto: "Pagada · Por entregar", clase: "status-paid" },
  ACTIVE: { texto: "En curso", clase: "status-active" },
  COMPLETED: { texto: "Completada", clase: "status-completed" },
  CANCELLED: { texto: "Cancelada", clase: "status-cancelled" },
  INCIDENT: { texto: "Incidente reportado", clase: "status-incident" },
};

export const ETIQUETAS_INCIDENTE: Record<TipoIncidente, string> = {
  ACCIDENT: "Accidente de tránsito o caída",
  THEFT: "Hurto de la motocicleta",
  DISAPPEARANCE: "Desaparición / no devolución",
};

export const PASOS_CICLO_RENTA = [
  "Solicitud",
  "Contrato",
  "Pago",
  "Entrega (PICKUP)",
  "Devolución (RETURN)",
] as const;

/**
 * Devuelve el número de paso completado (1 a 5) dentro del flujo normal de renta.
 * Retorna 0 si la renta fue cancelada o presenta incidente.
 */
export function calcularPasoCicloRenta(renta: {
  status: EstadoRenta;
  contract?: { accepted?: boolean } | null;
  tienePickup?: boolean;
  tieneReturn?: boolean;
}): number {
  if (renta.status === "CANCELLED" || renta.status === "INCIDENT") return 0;
  if (renta.status === "COMPLETED" || renta.tieneReturn) return 5;
  if (renta.status === "ACTIVE" || renta.tienePickup) return 4;
  if (renta.status === "PAID") return 3;
  if (renta.contract?.accepted) return 2;
  return 1;
}

/** Valida los datos del formulario de acta de entrega (PICKUP) o devolución (RETURN). */
export function validarFormularioActa(
  mileageRaw: string | number,
  kmMinimo: number,
  fuelLevelRaw: string | number
): string | null {
  const mileage = Number(mileageRaw);
  const fuelLevel = Number(fuelLevelRaw);

  if (!Number.isFinite(mileage) || !Number.isInteger(mileage) || mileage < 0) {
    return "Ingresa un kilometraje válido (número entero positivo).";
  }
  if (mileage < kmMinimo) {
    return `El kilometraje (${mileage} km) no puede ser menor al anterior (${kmMinimo} km).`;
  }
  if (!Number.isFinite(fuelLevel) || fuelLevel < 0 || fuelLevel > 100) {
    return "El nivel de combustible debe estar entre 0% y 100%.";
  }
  return null;
}

/** Valida el reporte de un incidente de seguridad. */
export function validarFormularioIncidente(
  tipo: string,
  notas: string
): string | null {
  if (tipo !== "ACCIDENT" && tipo !== "THEFT" && tipo !== "DISAPPEARANCE") {
    return "Selecciona el tipo de incidente ocurrido.";
  }
  if (notas.trim().length < 10) {
    return "Describe lo ocurrido con al menos 10 caracteres para el registro de soporte.";
  }
  return null;
}
