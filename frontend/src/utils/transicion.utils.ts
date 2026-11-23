/**
 * UTILIDADES PURAS DE TRANSICIONES Y CAMBIO DE PERFIL DUAL (FASE 13)
 *
 * Centraliza los textos de confirmación previa al cambio de perfil y las
 * duraciones calibradas según Material Design 3 Motion y WCAG 2.2 AA
 * (`prefers-reduced-motion`).
 */

export type TipoTransicionApp =
  | "login"
  | "logout"
  | "switch-to-owner"
  | "switch-to-renter";

export interface ConfirmacionCambioPerfil {
  modoOrigen: "RENTER" | "OWNER";
  modoDestino: "RENTER" | "OWNER";
  etiquetaOrigen: string;
  etiquetaDestino: string;
  titulo: string;
  descripcion: string;
  textoConfirmar: string;
}

export interface ContenidoTransicion {
  tipo: TipoTransicionApp;
  titulo: string;
  subtitulo: string;
  etiquetaOrigen?: string;
  etiquetaDestino?: string;
  duracionTotalMs: number;
  puntoMedioMs: number;
  salidaMs: number;
}

/** Extrae el primer nombre limpio para mensajes de bienvenida personalizados. */
export function extraerPrimerNombre(nombreCompleto?: string | null): string {
  if (!nombreCompleto) return "";
  return nombreCompleto.trim().split(/\s+/)[0] ?? "";
}

/**
 * Construye el mensaje claro de confirmación antes de cambiar entre los dos
 * perfiles de una cuenta dual (solo desde el menú desplegable del avatar).
 */
export function construirMensajeConfirmacionCambioPerfil(
  modoActual: "RENTER" | "OWNER"
): ConfirmacionCambioPerfil {
  const haciaOwner = modoActual === "RENTER";
  const modoDestino: "RENTER" | "OWNER" = haciaOwner ? "OWNER" : "RENTER";
  const etiquetaOrigen = haciaOwner ? "Arrendatario" : "Propietario";
  const etiquetaDestino = haciaOwner ? "Propietario" : "Arrendatario";

  return {
    modoOrigen: modoActual,
    modoDestino,
    etiquetaOrigen,
    etiquetaDestino,
    titulo: `¿Cambiar a perfil de ${etiquetaDestino}?`,
    descripcion: `Vas a cambiar de tu cuenta de ${etiquetaOrigen} a tu perfil de ${etiquetaDestino}. Tu panel de control y las opciones de la barra superior se actualizarán a este modo.`,
    textoConfirmar: `Cambiar a ${etiquetaDestino}`,
  };
}

/**
 * Devuelve los textos y tiempos óptimos (Material Design 3) para cada transición.
 * Si el usuario tiene `prefers-reduced-motion: reduce`, acorta a un fundido suave.
 */
export function construirContenidoTransicion(
  tipo: TipoTransicionApp,
  nombreCompleto?: string | null,
  movimientoReducido = false
): ContenidoTransicion {
  const primerNombre = extraerPrimerNombre(nombreCompleto);

  if (movimientoReducido) {
    const baseReducida = { duracionTotalMs: 220, puntoMedioMs: 100, salidaMs: 100 };
    if (tipo === "login") {
      return {
        tipo,
        titulo: primerNombre ? `Bienvenido, ${primerNombre}` : "Bienvenido a MotoRent",
        subtitulo: "Preparando tu panel de control...",
        ...baseReducida,
      };
    }
    if (tipo === "logout") {
      return {
        tipo,
        titulo: "Cerrando sesión",
        subtitulo: "Finalizando sesión de forma segura...",
        ...baseReducida,
      };
    }
    const destino = tipo === "switch-to-owner" ? "Propietario" : "Arrendatario";
    const origen = tipo === "switch-to-owner" ? "Arrendatario" : "Propietario";
    return {
      tipo,
      titulo: `Cambiando a ${destino}`,
      subtitulo: `Actualizando tu espacio de ${destino.toLowerCase()}...`,
      etiquetaOrigen: origen,
      etiquetaDestino: destino,
      ...baseReducida,
    };
  }

  if (tipo === "login") {
    return {
      tipo,
      titulo: primerNombre ? `Bienvenido de nuevo, ${primerNombre}` : "Bienvenido a MotoRent",
      subtitulo: "Verificando credenciales y cargando tu panel...",
      duracionTotalMs: 820,
      puntoMedioMs: 420,
      salidaMs: 240,
    };
  }

  if (tipo === "logout") {
    return {
      tipo,
      titulo: "Cerrando sesión",
      subtitulo: "Protegiendo tus datos y limpiando sesión local...",
      duracionTotalMs: 620,
      puntoMedioMs: 320,
      salidaMs: 220,
    };
  }

  const esOwner = tipo === "switch-to-owner";
  return {
    tipo,
    titulo: esOwner ? "Cambiando a modo Propietario" : "Cambiando a modo Arrendatario",
    subtitulo: esOwner
      ? "Preparando gestión de motocicletas, entregas y ganancias..."
      : "Preparando catálogo verificado y tus rentas activas...",
    etiquetaOrigen: esOwner ? "Arrendatario" : "Propietario",
    etiquetaDestino: esOwner ? "Propietario" : "Arrendatario",
    duracionTotalMs: 740,
    puntoMedioMs: 380,
    salidaMs: 230,
  };
}
