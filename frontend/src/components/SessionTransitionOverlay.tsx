import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconKey, IconLogout, IconMoto, IconShieldCheck } from "./Icons";
import {
  construirContenidoTransicion,
  extraerPrimerNombre,
  type ContenidoTransicion,
  type TipoTransicionApp,
} from "../utils/transicion.utils";
import "./SessionTransitionOverlay.css";

/**
 * SISTEMA GLOBAL DE TRANSICIONES DE SESIÓN Y CAMBIO DE PERFIL (FASE 13)
 *
 * Basado en Material Design 3 Motion y el patrón "Switch to Hosting" de Airbnb:
 * - Solo anima propiedades compuestas en GPU (`transform` y `opacity`) a 60 fps.
 * - Ejecuta la mutación real de estado/ruta exactamente en el punto medio de la
 *   transición, evitando parpadeos visuales al cambiar de contexto.
 * - Respeta automáticamente `prefers-reduced-motion: reduce` (WCAG 2.2 SC 2.3.3).
 */

interface OpcionesTransicion {
  tipo: TipoTransicionApp;
  nombreUsuario?: string | null;
}

interface TransitionContextValue {
  ejecutarTransicion: (
    opciones: OpcionesTransicion,
    alCambiarPuntoMedio: () => void
  ) => void;
  enTransicion: boolean;
}

const TransitionContext = createContext<TransitionContextValue>({
  ejecutarTransicion: (_opciones, alCambiar) => alCambiar(),
  enTransicion: false,
});

interface EstadoOverlay {
  contenido: ContenidoTransicion;
  inicialUsuario: string;
  fase: "entering" | "exiting";
}

function prefiereMovimientoReducido(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<EstadoOverlay | null>(null);
  const timersRef = useRef<number[]>([]);

  const limpiarTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const ejecutarTransicion = useCallback(
    (opciones: OpcionesTransicion, alCambiarPuntoMedio: () => void) => {
      limpiarTimers();
      const reducido = prefiereMovimientoReducido();
      const contenido = construirContenidoTransicion(
        opciones.tipo,
        opciones.nombreUsuario,
        reducido
      );
      const primerNombre = extraerPrimerNombre(opciones.nombreUsuario);
      const inicialUsuario = primerNombre ? primerNombre.charAt(0).toUpperCase() : "M";

      setOverlay({ contenido, inicialUsuario, fase: "entering" });

      const tMedio = window.setTimeout(() => {
        alCambiarPuntoMedio();
      }, contenido.puntoMedioMs);

      const tSalida = window.setTimeout(() => {
        setOverlay((prev) => (prev ? { ...prev, fase: "exiting" } : null));
      }, Math.max(contenido.puntoMedioMs + 60, contenido.duracionTotalMs - contenido.salidaMs));

      const tFin = window.setTimeout(() => {
        setOverlay(null);
      }, contenido.duracionTotalMs);

      timersRef.current = [tMedio, tSalida, tFin];
    },
    []
  );

  return (
    <TransitionContext.Provider
      value={{ ejecutarTransicion, enTransicion: overlay !== null }}
    >
      {children}

      {overlay && (
        <div
          className={`mr-transition-veil mr-transition-veil--${overlay.contenido.tipo} mr-transition-veil--${overlay.fase}`}
          role="status"
          aria-live="polite"
          aria-label={overlay.contenido.titulo}
        >
          <div className="mr-transition-card">
            <div className="mr-transition-brand">
              <span>MOTO</span>RENT
            </div>

            {/* EMBLEMA ANIMADO ADAPTADO AL TIPO DE TRANSICIÓN */}
            {overlay.contenido.tipo === "login" && (
              <div className="mr-transition-emblem mr-transition-emblem--login">
                <span className="mr-transition-ring" aria-hidden="true" />
                <span className="mr-transition-avatar">{overlay.inicialUsuario}</span>
              </div>
            )}

            {overlay.contenido.tipo === "logout" && (
              <div className="mr-transition-emblem mr-transition-emblem--logout">
                <IconShieldCheck size={28} />
                <span className="mr-transition-subicon" aria-hidden="true">
                  <IconLogout size={13} />
                </span>
              </div>
            )}

            {(overlay.contenido.tipo === "switch-to-owner" ||
              overlay.contenido.tipo === "switch-to-renter") && (
              <div className="mr-transition-morph" aria-hidden="true">
                <div className="mr-morph-node mr-morph-node--from">
                  {overlay.contenido.tipo === "switch-to-owner" ? (
                    <IconMoto size={22} />
                  ) : (
                    <IconKey size={22} />
                  )}
                  <span>{overlay.contenido.etiquetaOrigen}</span>
                </div>

                <div className="mr-morph-arrow">
                  <span className="mr-morph-dot" />
                  <span className="mr-morph-dot" />
                  <span className="mr-morph-dot" />
                </div>

                <div className="mr-morph-node mr-morph-node--to">
                  {overlay.contenido.tipo === "switch-to-owner" ? (
                    <IconKey size={22} />
                  ) : (
                    <IconMoto size={22} />
                  )}
                  <span>{overlay.contenido.etiquetaDestino}</span>
                </div>
              </div>
            )}

            <h2 className="mr-transition-title">{overlay.contenido.titulo}</h2>
            <p className="mr-transition-subtitle">{overlay.contenido.subtitulo}</p>

            {/* BARRA DE PROGRESO ACELERADA POR GPU (scaleX) */}
            <div className="mr-transition-track" aria-hidden="true">
              <div
                className="mr-transition-bar"
                style={{
                  animationDuration: `${overlay.contenido.duracionTotalMs}ms`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </TransitionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppTransition() {
  return useContext(TransitionContext);
}
