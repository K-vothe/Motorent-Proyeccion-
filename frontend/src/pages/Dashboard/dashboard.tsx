import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconAlert, IconKey, IconMoto } from "../../components/Icons";
import {
  cargarDatosDashboard,
  ESTADISTICAS_INICIALES,
  leerUsuarioLocal,
  type EstadisticasDashboard,
  type RentaActiva,
} from "../../services/dashboard.service";
import { obtenerEstadoVerificacionLocal } from "../../services/verificacion.service";
import {
  EVENTO_CAMBIO_ROL,
  guardarModoActivo,
  guardarPreviewDev,
  leerModoActivo,
  leerPreviewDev,
  limpiarEstadoRolTemporal,
  notificarCambioRol,
  type SimuladorRolDev,
} from "../../utils/rolActivo.storage";
import {
  obtenerResumenRoles,
  type ModoDashboard,
  type ResumenRolesUsuario,
  type UsuarioSesion,
} from "../../utils/roles.utils";
import DashboardAdminView from "./components/DashboardAdminView";
import DashboardOwnerView from "./components/DashboardOwnerView";
import DashboardRenterView from "./components/DashboardRenterView";
import DashboardUserView from "./components/DashboardUserView";
import "./dashboard.css";

/**
 * Construye un perfil simulado únicamente para la barra de pruebas en desarrollo
 * (import.meta.env.DEV). No existe ni se renderiza en compilaciones de producción.
 */
function construirResumenSimulado(
  simulacion: Exclude<SimuladorRolDev, "REAL">
): ResumenRolesUsuario {
  if (simulacion === "ADMIN") {
    return obtenerResumenRoles({ role: "ADMIN" });
  }
  if (simulacion === "DUAL") {
    return obtenerResumenRoles({
      role: "USER",
      renter: { estadoVerificacion: "APPROVED" },
      owner: { estadoVerificacion: "APPROVED" },
    });
  }
  if (simulacion === "OWNER") {
    return obtenerResumenRoles({
      role: "OWNER",
      owner: { estadoVerificacion: "APPROVED" },
    });
  }
  if (simulacion === "RENTER") {
    return obtenerResumenRoles({
      role: "RENTER",
      renter: { estadoVerificacion: "APPROVED" },
    });
  }
  return obtenerResumenRoles(
    { role: "USER" },
    obtenerEstadoVerificacionLocal("renter"),
    obtenerEstadoVerificacionLocal("owner")
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() =>
    leerUsuarioLocal()
  );
  const [estadisticas, setEstadisticas] = useState<EstadisticasDashboard>(
    ESTADISTICAS_INICIALES
  );
  const [rentaActiva, setRentaActiva] = useState<RentaActiva | null>(null);
  const [cargando, setCargando] = useState(true);
  const [advertenciaApi, setAdvertenciaApi] = useState<string | null>(null);

  // Modo seleccionado cuando el usuario tiene perfil dual (sincronizado con Navbar)
  const [modoManual, setModoManual] = useState<ModoDashboard | null>(() =>
    leerModoActivo()
  );

  // Selector temporal exclusivo de desarrollo (npm run dev) sincronizado con Navbar
  const [rolPreviewDev, setRolPreviewDev] = useState<SimuladorRolDev>(() =>
    leerPreviewDev()
  );

  useEffect(() => {
    let componenteActivo = true;

    async function inicializar() {
      const resultado = await cargarDatosDashboard();

      if (!componenteActivo) return;

      if (resultado.sesionExpirada) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        limpiarEstadoRolTemporal();
        navigate("/login", { replace: true });
        return;
      }

      setUsuario(resultado.usuario);
      setEstadisticas(resultado.estadisticas);
      setRentaActiva(resultado.rentaActiva);
      setAdvertenciaApi(resultado.advertenciaApi);
      setCargando(false);
      // Notificamos a la Navbar para que adopte el rol actualizado desde /auth/me
      notificarCambioRol();
    }

    inicializar();

    return () => {
      componenteActivo = false;
    };
  }, [navigate]);

  // Si el usuario alterna el modo dual desde la Navbar, reflejamos el cambio aquí
  useEffect(() => {
    function sincronizarDesdeNavbar() {
      setModoManual(leerModoActivo());
      setRolPreviewDev(leerPreviewDev());
    }

    window.addEventListener(EVENTO_CAMBIO_ROL, sincronizarDesdeNavbar);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO_ROL, sincronizarDesdeNavbar);
    };
  }, []);

  // Calculamos el resumen real de roles combinando backend + estados locales de Fase 1
  const resumenReal = obtenerResumenRoles(
    usuario,
    obtenerEstadoVerificacionLocal("renter"),
    obtenerEstadoVerificacionLocal("owner")
  );

  const resumenActivo =
    import.meta.env.DEV && rolPreviewDev !== "REAL"
      ? construirResumenSimulado(rolPreviewDev)
      : resumenReal;

  const modoActual: ModoDashboard =
    resumenActivo.esUsuarioDual &&
    (modoManual === "RENTER" || modoManual === "OWNER")
      ? modoManual
      : resumenActivo.modoInicial;

  const nombre = usuario?.fullName ? usuario.fullName.split(" ")[0] : "";

  function seleccionarModoDual(nuevoModo: "RENTER" | "OWNER") {
    setModoManual(nuevoModo);
    guardarModoActivo(nuevoModo);
  }

  function seleccionarPreviewDev(opcion: SimuladorRolDev) {
    setRolPreviewDev(opcion);
    setModoManual(null);
    guardarModoActivo(null);
    guardarPreviewDev(opcion);
  }

  if (cargando) {
    return (
      <div className="dashboard">
        <main className="dashboard-content dashboard-loading">
          <p className="dashboard-loading-text">Cargando tu panel de control...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <main className="dashboard-content">
        {/* BARRA DE PRUEBA DE ROLES (VISIBLE SOLO EN MODO DESARROLLO) */}
        {import.meta.env.DEV && (
          <div
            className="dev-role-bar"
            aria-label="Vista previa de roles en desarrollo"
          >
            <span className="dev-role-label">
              Vista previa de roles (solo desarrollo — actualiza panel y barra superior):
            </span>
            <div className="dev-role-buttons">
              {(
                ["REAL", "USER", "RENTER", "OWNER", "DUAL", "ADMIN"] as SimuladorRolDev[]
              ).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  className={`dev-role-btn ${
                    rolPreviewDev === opcion ? "active" : ""
                  }`}
                  onClick={() => seleccionarPreviewDev(opcion)}
                >
                  {opcion === "REAL" ? "Mi rol real" : opcion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BANNER DE BIENVENIDA + INSIGNIA DE ROL + SWITCH DUAL */}
        <section className="welcome-banner welcome-banner--flex">
          <div>
            <div className="welcome-badges">
              <span className="welcome-tag">PANEL DE CONTROL</span>
              <span className="role-header-badge">
                {resumenActivo.etiquetaRol}
              </span>
            </div>

            <h1>Bienvenido{nombre ? `, ${nombre}` : ""}</h1>

            <p className="welcome-description">
              {modoActual === "USER" &&
                "Completa tu verificación para comenzar a alquilar o publicar motocicletas."}
              {modoActual === "RENTER" &&
                "Consulta tu renta activa, tu historial de viajes y el catálogo disponible."}
              {modoActual === "OWNER" &&
                "Supervisa tus motocicletas publicadas y tus ingresos netos del mes."}
              {modoActual === "ADMIN" &&
                "Supervisión de cuentas, documentos de verificación y catálogo general."}
            </p>
          </div>

          {/* SELECTOR DE MODO PARA USUARIOS CON AMBOS PERFILES */}
          {resumenActivo.esUsuarioDual && (
            <div
              className="dual-role-switch"
              role="tablist"
              aria-label="Cambiar modo del panel"
            >
              <button
                type="button"
                role="tab"
                aria-selected={modoActual === "RENTER"}
                className={`dual-switch-btn ${
                  modoActual === "RENTER" ? "active" : ""
                }`}
                onClick={() => seleccionarModoDual("RENTER")}
              >
                <IconMoto size={16} />
                <span>Modo Arrendatario</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modoActual === "OWNER"}
                className={`dual-switch-btn ${
                  modoActual === "OWNER" ? "active" : ""
                }`}
                onClick={() => seleccionarModoDual("OWNER")}
              >
                <IconKey size={16} />
                <span>Modo Propietario</span>
              </button>
            </div>
          )}
        </section>

        {/* ADVERTENCIA SUAVE SI FALLÓ LA CONEXIÓN PARCIAL CON EL BACKEND */}
        {advertenciaApi && (
          <div className="dashboard-warning-banner" role="status">
            <IconAlert size={17} />
            <span>{advertenciaApi}</span>
          </div>
        )}

        {/* CONTENIDO ADAPTADO SEGÚN EL ROL ACTIVO */}
        {modoActual === "USER" && <DashboardUserView resumen={resumenActivo} />}

        {modoActual === "RENTER" && (
          <DashboardRenterView
            estadisticas={estadisticas}
            rentaActiva={rentaActiva}
            resumen={resumenActivo}
          />
        )}

        {modoActual === "OWNER" && (
          <DashboardOwnerView
            estadisticas={estadisticas}
            resumen={resumenActivo}
          />
        )}

        {modoActual === "ADMIN" && <DashboardAdminView />}
      </main>
    </div>
  );
}

export default Dashboard;
