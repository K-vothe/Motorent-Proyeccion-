/**
 * Gestión centralizada de preferencias del usuario (tema, catálogo,
 * notificaciones y privacidad) guardadas en localStorage.
 *
 * ¿Por qué separar esto en un módulo dedicado?
 * 1. La Navbar, la página de Configuración y el Catálogo comparten las mismas
 *    preferencias sin pasarse props por toda la aplicación.
 * 2. Al guardar un cambio se emite el evento personalizado `motorent:preferencias`
 *    para que cualquier componente abierto se actualice al instante.
 * 3. Las funciones puras (`resolverTemaEfectivo`, `sanearPreferencias`) pueden
 *    probarse con tests unitarios sin necesidad de navegador.
 */

export type TemaPreferido = "claro" | "oscuro" | "sistema";
export type TemaEfectivo = "claro" | "oscuro";
export type TamanoPaginaCatalogo = 12 | 24 | 30;
export type FormatoNombrePublico = "inicial" | "completo";

export interface PreferenciasUsuario {
  tema: TemaPreferido;
  motosPorPagina: TamanoPaginaCatalogo;
  notifVerificacion: boolean;
  notifDevolucion: boolean;
  notifResenas: boolean;
  formatoNombrePublico: FormatoNombrePublico;
  mostrarHistorialPublico: boolean;
}

export const CLAVE_PREFERENCIAS = "motorent_preferencias_v1";
export const EVENTO_PREFERENCIAS = "motorent:preferencias";

export const PREFERENCIAS_POR_DEFECTO: PreferenciasUsuario = {
  tema: "claro",
  motosPorPagina: 24,
  notifVerificacion: true,
  notifDevolucion: true,
  notifResenas: true,
  formatoNombrePublico: "inicial",
  mostrarHistorialPublico: true,
};

/**
 * Convierte la preferencia elegida por el usuario ("claro", "oscuro" o "sistema")
 * en el tema visual real que debe aplicarse en pantalla.
 */
export function resolverTemaEfectivo(
  tema: TemaPreferido,
  sistemaPrefiereOscuro: boolean
): TemaEfectivo {
  if (tema === "sistema") {
    return sistemaPrefiereOscuro ? "oscuro" : "claro";
  }
  return tema;
}

/**
 * Valida un objeto leído de localStorage para evitar que datos corruptos o
 * versiones antiguas rompan la aplicación.
 */
export function sanearPreferencias(entrada: unknown): PreferenciasUsuario {
  if (!entrada || typeof entrada !== "object") {
    return { ...PREFERENCIAS_POR_DEFECTO };
  }

  const raw = entrada as Record<string, unknown>;

  const tema: TemaPreferido =
    raw.tema === "claro" || raw.tema === "oscuro" || raw.tema === "sistema"
      ? raw.tema
      : PREFERENCIAS_POR_DEFECTO.tema;

  const motosPorPagina: TamanoPaginaCatalogo =
    raw.motosPorPagina === 12 ||
    raw.motosPorPagina === 24 ||
    raw.motosPorPagina === 30
      ? raw.motosPorPagina
      : PREFERENCIAS_POR_DEFECTO.motosPorPagina;

  const formatoNombrePublico: FormatoNombrePublico =
    raw.formatoNombrePublico === "completo" ||
    raw.formatoNombrePublico === "inicial"
      ? raw.formatoNombrePublico
      : PREFERENCIAS_POR_DEFECTO.formatoNombrePublico;

  return {
    tema,
    motosPorPagina,
    notifVerificacion:
      typeof raw.notifVerificacion === "boolean"
        ? raw.notifVerificacion
        : PREFERENCIAS_POR_DEFECTO.notifVerificacion,
    notifDevolucion:
      typeof raw.notifDevolucion === "boolean"
        ? raw.notifDevolucion
        : PREFERENCIAS_POR_DEFECTO.notifDevolucion,
    notifResenas:
      typeof raw.notifResenas === "boolean"
        ? raw.notifResenas
        : PREFERENCIAS_POR_DEFECTO.notifResenas,
    formatoNombrePublico,
    mostrarHistorialPublico:
      typeof raw.mostrarHistorialPublico === "boolean"
        ? raw.mostrarHistorialPublico
        : PREFERENCIAS_POR_DEFECTO.mostrarHistorialPublico,
  };
}

/** Lee las preferencias actuales desde localStorage con respaldo seguro. */
export function leerPreferencias(): PreferenciasUsuario {
  if (typeof window === "undefined") {
    return { ...PREFERENCIAS_POR_DEFECTO };
  }
  try {
    const texto = window.localStorage.getItem(CLAVE_PREFERENCIAS);
    if (!texto) return { ...PREFERENCIAS_POR_DEFECTO };
    return sanearPreferencias(JSON.parse(texto));
  } catch {
    return { ...PREFERENCIAS_POR_DEFECTO };
  }
}

/** Detecta si el sistema operativo del usuario está configurado en modo oscuro. */
export function detectarTemaOscuroSistema(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Aplica el atributo `data-theme="dark" | "light"` en la etiqueta <html>.
 * Todas las reglas de dark-mode.css reaccionan automáticamente a este atributo.
 */
export function aplicarTemaEnDocumento(tema: TemaPreferido): TemaEfectivo {
  const efectivo = resolverTemaEfectivo(tema, detectarTemaOscuroSistema());

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme =
      efectivo === "oscuro" ? "dark" : "light";
    document.documentElement.style.colorScheme =
      efectivo === "oscuro" ? "dark" : "light";
  }

  return efectivo;
}

/**
 * Guarda cambios parciales en preferencias, aplica el tema si cambió
 * y notifica a los demás componentes escuchando `motorent:preferencias`.
 */
export function guardarPreferencias(
  cambios: Partial<PreferenciasUsuario>
): PreferenciasUsuario {
  const actual = leerPreferencias();
  const actualizado = sanearPreferencias({ ...actual, ...cambios });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(actualizado));
    aplicarTemaEnDocumento(actualizado.tema);
    window.dispatchEvent(new CustomEvent(EVENTO_PREFERENCIAS));
  }

  return actualizado;
}

/** Restaura todas las preferencias a sus valores de fábrica. */
export function restablecerPreferencias(): PreferenciasUsuario {
  return guardarPreferencias({ ...PREFERENCIAS_POR_DEFECTO });
}

/**
 * Inicializa el tema antes de renderizar React para evitar el parpadeo blanco
 * cuando el usuario tiene activado el modo oscuro. También escucha cambios
 * del sistema operativo si eligió la opción "sistema".
 */
export function inicializarTemaGlobal(): void {
  const prefs = leerPreferencias();
  aplicarTemaEnDocumento(prefs.tema);

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () => {
      const actuales = leerPreferencias();
      if (actuales.tema === "sistema") {
        aplicarTemaEnDocumento("sistema");
        window.dispatchEvent(new CustomEvent(EVENTO_PREFERENCIAS));
      }
    });
  }
}
