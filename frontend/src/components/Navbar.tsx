import "./Navbar.css";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { leerUsuarioLocal } from "../services/dashboard.service";
import { obtenerEstadoVerificacionLocal } from "../services/verificacion.service";
import {
  EVENTO_CAMBIO_ROL,
  guardarModoActivo,
  leerModoActivo,
  leerPreviewDev,
  limpiarEstadoRolTemporal,
  type SimuladorRolDev,
} from "../utils/rolActivo.storage";
import {
  obtenerNavegacionPorRol,
  obtenerResumenRoles,
  type ModoDashboard,
  type ResumenRolesUsuario,
} from "../utils/roles.utils";
import {
  EVENTO_PREFERENCIAS,
  detectarTemaOscuroSistema,
  guardarPreferencias,
  leerPreferencias,
  resolverTemaEfectivo,
  type TemaEfectivo,
} from "../utils/preferencias.storage";
import {
  IconBell,
  IconClose,
  IconLogout,
  IconMenu,
  IconMoon,
  IconPlus,
  IconSettings,
  IconShieldCheck,
  IconSun,
  IconSwitch,
  IconUser,
} from "./Icons";

/** Construye el mismo resumen de vista previa que usa el Dashboard en modo DEV. */
function resolverResumenConPreview(
  resumenReal: ResumenRolesUsuario,
  preview: SimuladorRolDev
): ResumenRolesUsuario {
  if (!import.meta.env.DEV || preview === "REAL") {
    return resumenReal;
  }
  if (preview === "ADMIN") return obtenerResumenRoles({ role: "ADMIN" });
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
  return obtenerResumenRoles(
    { role: "USER" },
    obtenerEstadoVerificacionLocal("renter"),
    obtenerEstadoVerificacionLocal("owner")
  );
}

/** Asocia un ícono vectorial limpio a cada ruta del menú de perfil. */
function renderIconoMenu(ruta: string) {
  if (ruta === "/configuracion") return <IconSettings size={16} />;
  if (ruta === "/verificar-renter" || ruta === "/verificar-owner") {
    return <IconShieldCheck size={16} />;
  }
  return <IconUser size={16} />;
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Contador ligero para refrescar la Navbar al cambiar de sesión o rol
  const [, setVersionRol] = useState(0);

  const [menuNotificaciones, setMenuNotificaciones] = useState(false);
  const [menuPerfil, setMenuPerfil] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [temaEfectivo, setTemaEfectivo] = useState<TemaEfectivo>(() =>
    resolverTemaEfectivo(leerPreferencias().tema, detectarTemaOscuroSistema())
  );

  const notifRef = useRef<HTMLDivElement>(null);
  const perfilRef = useRef<HTMLDivElement>(null);

  // Notificaciones de ejemplo (se conectarán al backend en Fase 3)
  const [notificaciones, setNotificaciones] = useState([
    {
      id: 1,
      titulo: "Estado de verificación",
      mensaje: "Revisa el progreso de tus documentos desde tu panel de control.",
      tiempo: "Reciente",
      leida: false,
    },
    {
      id: 2,
      titulo: "Recordatorio de plataforma",
      mensaje: "Mantén tus datos de contacto actualizados en Mi Perfil.",
      tiempo: "Hoy",
      leida: true,
    },
  ]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  // Escuchamos cambios de rol/sesión y preferencias (tema claro/oscuro)
  useEffect(() => {
    function sincronizarNavbar() {
      setVersionRol((v) => v + 1);
    }
    function sincronizarTema() {
      setTemaEfectivo(
        resolverTemaEfectivo(leerPreferencias().tema, detectarTemaOscuroSistema())
      );
    }

    window.addEventListener(EVENTO_CAMBIO_ROL, sincronizarNavbar);
    window.addEventListener("storage", sincronizarNavbar);
    window.addEventListener(EVENTO_PREFERENCIAS, sincronizarTema);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO_ROL, sincronizarNavbar);
      window.removeEventListener("storage", sincronizarNavbar);
      window.removeEventListener(EVENTO_PREFERENCIAS, sincronizarTema);
    };
  }, []);

  // Cerrar menús desplegables al hacer clic fuera o presionar Escape (accesibilidad NN/g)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setMenuNotificaciones(false);
      }
      if (perfilRef.current && !perfilRef.current.contains(event.target as Node)) {
        setMenuPerfil(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuNotificaciones(false);
        setMenuPerfil(false);
        setMenuMovil(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Ocultar la barra en pantallas de autenticación
  if (
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/recuperar-password" ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/verificar-correo")
  ) {
    return null;
  }

  // Leer sesión y calcular navegación dinámica según rol activo
  const token = localStorage.getItem("token");
  const haySesion = Boolean(
    token && token !== "undefined" && token !== "null"
  );
  const usuarioActual = haySesion ? leerUsuarioLocal() : null;
  const inicial = usuarioActual?.fullName
    ? usuarioActual.fullName.charAt(0).toUpperCase()
    : "U";

  const resumenReal = haySesion
    ? obtenerResumenRoles(
        usuarioActual,
        obtenerEstadoVerificacionLocal("renter"),
        obtenerEstadoVerificacionLocal("owner")
      )
    : null;

  const resumenActivo = resumenReal
    ? resolverResumenConPreview(resumenReal, leerPreviewDev())
    : null;

  const modoGuardado = leerModoActivo();
  const modoActual: ModoDashboard | null =
    resumenActivo &&
    resumenActivo.esUsuarioDual &&
    (modoGuardado === "RENTER" || modoGuardado === "OWNER")
      ? modoGuardado
      : resumenActivo?.modoInicial ?? null;

  const navConfig = obtenerNavegacionPorRol(
    haySesion,
    resumenActivo,
    modoActual
  );

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("motorent_verificacion_renter");
    localStorage.removeItem("motorent_verificacion_owner");
    limpiarEstadoRolTemporal();
    setMenuPerfil(false);
    navigate("/login", { replace: true });
  }

  function alternarModoDual() {
    const nuevoModo: ModoDashboard =
      modoActual === "OWNER" ? "RENTER" : "OWNER";
    guardarModoActivo(nuevoModo);
    setMenuPerfil(false);
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
  }

  function marcarLeidas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  function alternarTemaRapido() {
    const siguiente = temaEfectivo === "oscuro" ? "claro" : "oscuro";
    guardarPreferencias({ tema: siguiente });
  }

  return (
    <header className="global-navbar">
      {/* IZQUIERDA: LOGO */}
      <Link to={haySesion ? "/dashboard" : "/"} className="navbar-logo">
        <span>MOTO</span>RENT
      </Link>

      {/* CENTRO: ENLACES ADAPTADOS AL ROL ACTIVO */}
      <nav className="navbar-links" aria-label="Navegación principal">
        {navConfig.enlacesPrincipales.map((enlace) => (
          <Link
            key={enlace.to}
            to={enlace.to}
            className={[
              enlace.destacado ? "nav-btn-publish" : "",
              location.pathname === enlace.to ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {enlace.destacado && <IconPlus size={15} />}
            <span>{enlace.label}</span>
          </Link>
        ))}
      </nav>

      {/* DERECHA: ROL ACTIVO, NOTIFICACIONES Y PERFIL (O ACCESO INVITADO) */}
      <div className="navbar-right">
        {haySesion ? (
          <>
            {/* Insignia sutil del rol con el que está operando el usuario */}
            {navConfig.etiquetaRolNav && navConfig.varianteRolNav && (
              <span
                className={`navbar-role-pill navbar-role-pill--${navConfig.varianteRolNav}`}
              >
                {navConfig.etiquetaRolNav}
              </span>
            )}

            {/* Notificaciones */}
            <div className="dropdown-container" ref={notifRef}>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setMenuNotificaciones(!menuNotificaciones);
                  setMenuPerfil(false);
                }}
                aria-label="Notificaciones"
                title="Notificaciones"
              >
                <IconBell size={18} />
                {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
              </button>

              {menuNotificaciones && (
                <div className="dropdown-menu notif-dropdown">
                  <div className="dropdown-header">
                    <h4>Notificaciones</h4>
                    {noLeidas > 0 && (
                      <button
                        type="button"
                        className="btn-mark-read"
                        onClick={marcarLeidas}
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notificaciones.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.leida ? "unread" : ""}`}
                      >
                        <p className="notif-title">{n.titulo}</p>
                        <p className="notif-desc">{n.mensaje}</p>
                        <span className="notif-time">{n.tiempo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Menú de Perfil */}
            <div className="dropdown-container" ref={perfilRef}>
              <button
                type="button"
                className="avatar-button"
                onClick={() => {
                  setMenuPerfil(!menuPerfil);
                  setMenuNotificaciones(false);
                }}
                aria-label="Menú de cuenta"
              >
                {inicial}
              </button>

              {menuPerfil && (
                <div className="dropdown-menu profile-dropdown">
                  <div className="profile-dropdown-user">
                    <div className="avatar-small">{inicial}</div>
                    <div className="profile-dropdown-meta">
                      <p className="profile-name">
                        {usuarioActual?.fullName || "Mi cuenta"}
                      </p>
                      <p className="profile-role">
                        {usuarioActual?.email || "Usuario activo"}
                      </p>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {navConfig.enlacesMenuPerfil.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="dropdown-link"
                      onClick={() => setMenuPerfil(false)}
                    >
                      {renderIconoMenu(item.to)}
                      <span>{item.label}</span>
                    </Link>
                  ))}

                  {/* Acción instantánea inline: cambiar tema sin salir de la pantalla */}
                  <button
                    type="button"
                    className="dropdown-link"
                    onClick={alternarTemaRapido}
                  >
                    {temaEfectivo === "oscuro" ? (
                      <IconSun size={16} />
                    ) : (
                      <IconMoon size={16} />
                    )}
                    <span>
                      {temaEfectivo === "oscuro"
                        ? "Cambiar a modo claro"
                        : "Cambiar a modo oscuro"}
                    </span>
                  </button>

                  {/* Cambio rápido de modo para usuarios duales */}
                  {resumenActivo?.esUsuarioDual && (
                    <>
                      <div className="dropdown-divider" />
                      <button
                        type="button"
                        className="dropdown-link dropdown-link--switch"
                        onClick={alternarModoDual}
                      >
                        <IconSwitch size={16} />
                        <span>
                          {modoActual === "OWNER"
                            ? "Cambiar a Arrendatario"
                            : "Cambiar a Propietario"}
                        </span>
                      </button>
                    </>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    type="button"
                    className="dropdown-link logout-link"
                    onClick={handleLogout}
                  >
                    <IconLogout size={16} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="guest-buttons">
            <Link to="/login" className="btn-nav-login">
              Iniciar sesión
            </Link>
            <Link to="/register" className="btn-nav-register">
              Registrarse
            </Link>
          </div>
        )}

        {/* BOTÓN HAMBURGUESA ACCESIBLE PARA MÓVILES (FASE 11 · H1) */}
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={menuMovil ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          aria-expanded={menuMovil}
          aria-controls="nav-mobile-drawer"
          onClick={() => {
            setMenuMovil((prev) => !prev);
            setMenuPerfil(false);
            setMenuNotificaciones(false);
          }}
        >
          {menuMovil ? <IconClose size={20} /> : <IconMenu size={20} />}
        </button>
      </div>

      {/* CAJÓN MÓVIL RESPONSIVE (<= 768px) */}
      {menuMovil && (
        <nav
          id="nav-mobile-drawer"
          className="mobile-nav-drawer"
          aria-label="Navegación móvil"
        >
          {navConfig.enlacesPrincipales.map((enlace) => (
            <Link
              key={enlace.to}
              to={enlace.to}
              className={[
                "mobile-nav-link",
                enlace.destacado ? "mobile-nav-link--accent" : "",
                location.pathname === enlace.to ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setMenuMovil(false)}
            >
              {enlace.destacado && <IconPlus size={15} />}
              <span>{enlace.label}</span>
            </Link>
          ))}
          {!haySesion && (
            <div className="mobile-guest-actions">
              <Link
                to="/login"
                className="mobile-nav-link"
                onClick={() => setMenuMovil(false)}
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="mobile-nav-link mobile-nav-link--accent"
                onClick={() => setMenuMovil(false)}
              >
                Registrarse
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

export default Navbar;
