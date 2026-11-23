import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconCheckCircle, IconClose, IconMoto } from "./Icons";
import "./UiFeedback.css";

/**
 * COMPONENTES REUTILIZABLES DE RETROALIMENTACIÓN UX/UI (FASE 11)
 *
 * Basados en las heurísticas de Nielsen Norman Group y WCAG 2.2 AA:
 * 1. ToastProvider: confirmaciones transitorias de baja prioridad (`aria-live="polite"`).
 *    Nunca se usa para errores de validación de formularios (esos permanecen inline).
 * 2. SkeletonMotoGrid / SkeletonRentasList: esqueletos estructurales con shimmer
 *    suave para eliminar saltos de layout (CLS) en cargas breves.
 * 3. EmptyState: estados vacíos con causa clara y llamada a la acción directa.
 */

interface ToastItem {
  id: number;
  mensaje: string;
}

interface ToastContextValue {
  mostrarToast: (mensaje: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  mostrarToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const cerrarToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const mostrarToast = useCallback(
    (mensaje: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, mensaje }]);
      window.setTimeout(() => cerrarToast(id), 4500);
    },
    [cerrarToast]
  );

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="mr-toast-stack" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className="mr-toast">
            <IconCheckCircle size={17} />
            <span>{toast.mensaje}</span>
            <button
              type="button"
              className="mr-toast-close"
              onClick={() => cerrarToast(toast.id)}
              aria-label="Cerrar notificación"
            >
              <IconClose size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}

export function SkeletonMotoGrid({ cantidad = 6 }: { cantidad?: number }) {
  return (
    <div
      className="motos-grid"
      aria-busy="true"
      aria-label="Cargando motocicletas disponibles"
    >
      {Array.from({ length: cantidad }).map((_, idx) => (
        <div key={idx} className="mr-skeleton-card" aria-hidden="true">
          <div className="mr-skel mr-skel-media" />
          <div className="mr-skel-body">
            <div className="mr-skel mr-skel-title" />
            <div className="mr-skel mr-skel-sub" />
            <div className="mr-skel-row">
              <div className="mr-skel mr-skel-pill" />
              <div className="mr-skel mr-skel-pill" />
              <div className="mr-skel mr-skel-pill" />
            </div>
            <div className="mr-skel-footer">
              <div className="mr-skel mr-skel-price" />
              <div className="mr-skel mr-skel-btn" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRentasList({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div
      className="rentas-list-live"
      aria-busy="true"
      aria-label="Cargando historial de rentas"
    >
      {Array.from({ length: cantidad }).map((_, idx) => (
        <div key={idx} className="mr-skeleton-renta" aria-hidden="true">
          <div className="mr-skel-row">
            <div className="mr-skel mr-skel-pill" />
            <div className="mr-skel mr-skel-pill" />
          </div>
          <div className="mr-skel mr-skel-title" />
          <div className="mr-skel mr-skel-bar" />
          <div className="mr-skel-row">
            <div className="mr-skel mr-skel-meta" />
            <div className="mr-skel mr-skel-meta" />
            <div className="mr-skel mr-skel-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  titulo: string;
  descripcion: string;
  accionTexto?: string;
  accionTo?: string;
  onAccion?: () => void;
}

export function EmptyState({
  titulo,
  descripcion,
  accionTexto,
  accionTo,
  onAccion,
}: EmptyStateProps) {
  return (
    <div className="mr-empty-state" role="status">
      <div className="mr-empty-icon" aria-hidden="true">
        <IconMoto size={26} />
      </div>
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
      {accionTexto && accionTo && (
        <Link to={accionTo} className="mr-empty-cta">
          {accionTexto}
        </Link>
      )}
      {accionTexto && onAccion && !accionTo && (
        <button type="button" className="mr-empty-cta" onClick={onAccion}>
          {accionTexto}
        </button>
      )}
    </div>
  );
}
