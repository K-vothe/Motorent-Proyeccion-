import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { IconClock, IconShieldCheck } from "./Icons";
import { leerUsuarioLocal } from "../services/dashboard.service";
import { obtenerEstadoVerificacionLocal } from "../services/verificacion.service";
import {
  EVENTO_CAMBIO_ROL,
  leerPreviewDev,
  type SimuladorRolDev,
} from "../utils/rolActivo.storage";
import {
  obtenerResumenRoles,
  tienePermisoParaRuta,
  type ResumenRolesUsuario,
  type RolRutaProtegida,
} from "../utils/roles.utils";
import "./RoleRoute.css";

interface RoleRouteProps {
  rolesPermitidos: RolRutaProtegida[];
  tipoRequerido: "owner" | "renter";
}

function construirResumenActual(): ResumenRolesUsuario {
  const preview: SimuladorRolDev = import.meta.env.DEV
    ? leerPreviewDev()
    : "REAL";

  if (preview === "ADMIN") {
    return obtenerResumenRoles({ role: "ADMIN" });
  }
  if (preview === "DUAL") {
    return obtenerResumenRoles({
      role: "USER",
      renter: { estadoVerificacion: "APPROVED" },
      owner: { estadoVerificacion: "APPROVED" },
    });
  }
  if (preview === "OWNER") {
    return obtenerResumenRoles({
      role: "OWNER",
      owner: { estadoVerificacion: "APPROVED" },
    });
  }
  if (preview === "RENTER") {
    return obtenerResumenRoles({
      role: "RENTER",
      renter: { estadoVerificacion: "APPROVED" },
    });
  }
  if (preview === "USER") {
    return obtenerResumenRoles(
      { role: "USER" },
      obtenerEstadoVerificacionLocal("renter"),
      obtenerEstadoVerificacionLocal("owner")
    );
  }

  return obtenerResumenRoles(
    leerUsuarioLocal(),
    obtenerEstadoVerificacionLocal("renter"),
    obtenerEstadoVerificacionLocal("owner")
  );
}

/**
 * Guardia de rutas por rol en el frontend.
 * Complementa la seguridad RBAC del backend mostrando una pantalla sobria
 * que orienta al usuario hacia el flujo de verificación correspondiente.
 */
function RoleRoute({ rolesPermitidos, tipoRequerido }: RoleRouteProps) {
  const [resumen, setResumen] = useState<ResumenRolesUsuario>(() =>
    construirResumenActual()
  );

  useEffect(() => {
    function actualizarRol() {
      setResumen(construirResumenActual());
    }

    window.addEventListener(EVENTO_CAMBIO_ROL, actualizarRol);
    window.addEventListener("storage", actualizarRol);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO_ROL, actualizarRol);
      window.removeEventListener("storage", actualizarRol);
    };
  }, []);

  if (tienePermisoParaRuta(resumen, rolesPermitidos)) {
    return <Outlet />;
  }

  const esOwner = tipoRequerido === "owner";
  const estadoPerfil = esOwner ? resumen.estadoOwner : resumen.estadoRenter;
  const motivoRechazo = esOwner
    ? resumen.motivoRechazoOwner
    : resumen.motivoRechazoRenter;
  const rutaVerificacion = esOwner ? "/verificar-owner" : "/verificar-renter";
  const tituloRol = esOwner ? "Propietario verificado" : "Arrendatario verificado";
  const descripcionAccion = esOwner
    ? "publicar y administrar motocicletas en el catálogo"
    : "consultar y gestionar tus alquileres activos";

  return (
    <main className="role-gate-page">
      <section className="role-gate-card">
        <div className="role-gate-icon">
          <IconShieldCheck size={28} />
        </div>

        <span className="role-gate-tag">ACCESO POR VERIFICACIÓN</span>

        <h1>Se requiere perfil de {tituloRol}</h1>

        <p className="role-gate-desc">
          Por seguridad de la comunidad MotoRent, necesitas contar con una
          verificación aprobada de <strong>{tituloRol}</strong> para{" "}
          {descripcionAccion}.
        </p>

        {estadoPerfil === "PENDING" && (
          <div className="role-gate-status role-gate-status--pending">
            <IconClock size={18} />
            <span>
              Tu solicitud ya fue enviada y está en revisión por el equipo
              administrador. Te habilitaremos esta sección apenas sea aprobada.
            </span>
          </div>
        )}

        {estadoPerfil === "REJECTED" && (
          <div className="role-gate-status role-gate-status--rejected">
            <strong>Solicitud rechazada:</strong>{" "}
            {motivoRechazo ||
              "Revisa tus documentos y vuelve a enviar tu verificación."}
          </div>
        )}

        <div className="role-gate-actions">
          {estadoPerfil !== "PENDING" && (
            <Link to={rutaVerificacion} className="role-gate-btn-primary">
              {estadoPerfil === "REJECTED"
                ? "Corregir y reenviar verificación"
                : `Verificarme como ${esOwner ? "Propietario" : "Arrendatario"}`}
            </Link>
          )}
          <Link to="/dashboard" className="role-gate-btn-secondary">
            Volver a mi panel
          </Link>
        </div>
      </section>
    </main>
  );
}

export default RoleRoute;
