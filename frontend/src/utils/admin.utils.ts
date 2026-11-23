/**
 * Utilidades puras del Panel Administrativo (Fase 7).
 *
 * Centraliza la transformación de rutas privadas hacia el endpoint protegido
 * `/api/admin/documentos/...`, el formateo de estados de motocicletas y el
 * filtrado del directorio de usuarios para facilitar pruebas unitarias.
 */

export interface DocumentoInspeccion {
  etiqueta: string;
  rutaApi: string | null;
  esPdf: boolean;
}

export interface UsuarioAdminItem {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  estadoRenter: string;
  estadoOwner: string;
  totalRentas: number;
  totalMotos: number;
}

/**
 * Convierte una ruta interna almacenada en Prisma (`/uploads/verificaciones/renter/u1/bill.pdf`)
 * en la ruta protegida del backend (`/api/admin/documentos/renter/u1/bill.pdf`).
 */
export function convertirARutaDocumentoAdmin(rutaInterna?: string | null): string | null {
  if (!rutaInterna) return null;
  const match = /^\/uploads\/verificaciones\/(renter|owner)\/([^/]+)\/([^/]+)$/i.exec(
    rutaInterna.trim()
  );
  if (!match) return null;
  return `/api/admin/documentos/${match[1]}/${match[2]}/${match[3]}`;
}

/** Construye la lista de soportes documentales de una solicitud Renter u Owner. */
export function construirListaDocumentosAdmin(
  tipo: "renter" | "owner",
  campos: {
    cedulaFrontUrl?: string;
    cedulaBackUrl?: string;
    photo?: string;
    licenseFrontUrl?: string;
    licenseBackUrl?: string;
    billUrl?: string;
  }
): DocumentoInspeccion[] {
  const base: { etiqueta: string; url?: string }[] = [
    { etiqueta: "Cédula frontal", url: campos.cedulaFrontUrl },
    { etiqueta: "Cédula posterior", url: campos.cedulaBackUrl },
    { etiqueta: "Foto de rostro", url: campos.photo },
  ];

  if (tipo === "renter") {
    base.push(
      { etiqueta: "Licencia frontal", url: campos.licenseFrontUrl },
      { etiqueta: "Licencia posterior", url: campos.licenseBackUrl }
    );
  }

  base.push({ etiqueta: "Comprobante de domicilio", url: campos.billUrl });

  return base.map((item) => ({
    etiqueta: item.etiqueta,
    rutaApi: convertirARutaDocumentoAdmin(item.url),
    esPdf: Boolean(item.url && item.url.toLowerCase().endsWith(".pdf")),
  }));
}

/** Etiqueta y variante visual sobria para cada estado de motocicleta. */
export function obtenerBadgeEstadoMoto(status: string): {
  texto: string;
  variante: "pending" | "approved" | "rejected" | "neutral";
} {
  if (status === "PENDING_APPROVAL") {
    return { texto: "En revisión", variante: "pending" };
  }
  if (status === "AVAILABLE") {
    return { texto: "Disponible", variante: "approved" };
  }
  if (status === "REJECTED") {
    return { texto: "Rechazada", variante: "rejected" };
  }
  if (status === "MAINTENANCE") {
    return { texto: "Mantenimiento", variante: "neutral" };
  }
  return { texto: status || "Inactiva", variante: "neutral" };
}

/** Filtra el directorio de usuarios por texto libre y rol seleccionado. */
export function filtrarUsuariosAdmin(
  usuarios: UsuarioAdminItem[],
  busqueda: string,
  rolFiltro: string
): UsuarioAdminItem[] {
  const texto = busqueda.trim().toLowerCase();

  return usuarios.filter((u) => {
    const coincideRol = rolFiltro === "TODOS" || u.role.toUpperCase() === rolFiltro;
    const coincideTexto =
      !texto ||
      `${u.fullName} ${u.email} ${u.username} ${u.phone}`
        .toLowerCase()
        .includes(texto);
    return coincideRol && coincideTexto;
  });
}
