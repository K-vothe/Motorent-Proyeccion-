import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  IconBell,
  IconCheckCircle,
  IconKey,
  IconLogout,
  IconMoon,
  IconRefresh,
  IconSettings,
  IconShieldCheck,
  IconSun,
} from "../../components/Icons";
import { leerUsuarioLocal } from "../../services/dashboard.service";
import {
  EVENTO_PREFERENCIAS,
  guardarPreferencias,
  leerPreferencias,
  restablecerPreferencias,
  type FormatoNombrePublico,
  type PreferenciasUsuario,
  type TamanoPaginaCatalogo,
  type TemaPreferido,
} from "../../utils/preferencias.storage";
import { limpiarEstadoRolTemporal } from "../../utils/rolActivo.storage";
import "./Configuracion.css";

type SeccionConfig = "apariencia" | "notificaciones" | "privacidad" | "seguridad";

/**
 * Pantalla centralizada de Configuración (/configuracion).
 *
 * Agrupa las preferencias reales del usuario en 4 secciones estándar
 * (Apariencia, Notificaciones, Privacidad y Seguridad), siguiendo las
 * recomendaciones de arquitectura de información de Nielsen Norman Group.
 */
function Configuracion() {
  const navigate = useNavigate();
  const usuario = leerUsuarioLocal();

  const [seccion, setSeccion] = useState<SeccionConfig>("apariencia");
  const [prefs, setPrefs] = useState<PreferenciasUsuario>(() =>
    leerPreferencias()
  );
  const [avisoGuardado, setAvisoGuardado] = useState("");

  // Mantiene sincronizada esta pantalla si el usuario cambia el tema desde la Navbar
  useEffect(() => {
    function sincronizar() {
      setPrefs(leerPreferencias());
    }
    window.addEventListener(EVENTO_PREFERENCIAS, sincronizar);
    return () => window.removeEventListener(EVENTO_PREFERENCIAS, sincronizar);
  }, []);

  function actualizar(
    cambios: Partial<PreferenciasUsuario>,
    mensaje = "Preferencia guardada automáticamente."
  ) {
    const nuevas = guardarPreferencias(cambios);
    setPrefs(nuevas);
    setAvisoGuardado(mensaje);
  }

  function manejarRestablecer() {
    const base = restablecerPreferencias();
    setPrefs(base);
    setAvisoGuardado("Se restauraron todas las preferencias por defecto.");
  }

  function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("motorent_verificacion_renter");
    localStorage.removeItem("motorent_verificacion_owner");
    limpiarEstadoRolTemporal();
    navigate("/login", { replace: true });
  }

  return (
    <div className="config-page">
      <main className="config-container">
        <header className="config-header">
          <div>
            <span className="config-tag">PREFERENCIAS DE CUENTA</span>
            <h1>Configuración</h1>
            <p className="config-subtitle">
              Personaliza la apariencia, notificaciones, privacidad y seguridad
              de tu experiencia en MotoRent.
            </p>
          </div>

          {avisoGuardado && (
            <div className="config-saved-pill" role="status">
              <IconCheckCircle size={15} />
              <span>{avisoGuardado}</span>
            </div>
          )}
        </header>

        <div className="config-layout">
          {/* NAVEGACIÓN LATERAL DE SECCIONES */}
          <aside className="config-sidebar" aria-label="Secciones de configuración">
            <button
              type="button"
              className={`config-nav-btn ${seccion === "apariencia" ? "active" : ""}`}
              onClick={() => setSeccion("apariencia")}
            >
              <IconSun size={16} />
              <span>Apariencia y catálogo</span>
            </button>

            <button
              type="button"
              className={`config-nav-btn ${seccion === "notificaciones" ? "active" : ""}`}
              onClick={() => setSeccion("notificaciones")}
            >
              <IconBell size={16} />
              <span>Notificaciones</span>
            </button>

            <button
              type="button"
              className={`config-nav-btn ${seccion === "privacidad" ? "active" : ""}`}
              onClick={() => setSeccion("privacidad")}
            >
              <IconShieldCheck size={16} />
              <span>Privacidad</span>
            </button>

            <button
              type="button"
              className={`config-nav-btn ${seccion === "seguridad" ? "active" : ""}`}
              onClick={() => setSeccion("seguridad")}
            >
              <IconKey size={16} />
              <span>Seguridad y cuenta</span>
            </button>
          </aside>

          {/* CONTENIDO DE LA SECCIÓN ACTIVA */}
          <section className="config-card">
            {seccion === "apariencia" && (
              <>
                <h2>Apariencia y catálogo</h2>
                <p className="config-card-desc">
                  Elige el tema visual de la plataforma y cuántas motocicletas
                  prefieres ver por página en el catálogo.
                </p>

                <div className="config-block">
                  <h3>Tema de la interfaz</h3>
                  <div className="config-theme-grid" role="radiogroup" aria-label="Tema visual">
                    {(
                      [
                        {
                          id: "claro",
                          titulo: "Modo claro",
                          desc: "Fondo claro y lectura diurna",
                          icono: <IconSun size={18} />,
                        },
                        {
                          id: "oscuro",
                          titulo: "Modo oscuro",
                          desc: "Superficies oscuras de descanso visual",
                          icono: <IconMoon size={18} />,
                        },
                        {
                          id: "sistema",
                          titulo: "Automático",
                          desc: "Se adapta a tu sistema operativo",
                          icono: <IconSettings size={18} />,
                        },
                      ] as {
                        id: TemaPreferido;
                        titulo: string;
                        desc: string;
                        icono: React.ReactNode;
                      }[]
                    ).map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        role="radio"
                        aria-checked={prefs.tema === opcion.id}
                        className={`config-theme-card ${
                          prefs.tema === opcion.id ? "active" : ""
                        }`}
                        onClick={() =>
                          actualizar(
                            { tema: opcion.id },
                            `Tema actualizado a "${opcion.titulo}".`
                          )
                        }
                      >
                        <span className="config-theme-icon">{opcion.icono}</span>
                        <strong>{opcion.titulo}</strong>
                        <span>{opcion.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="config-block">
                  <h3>Motocicletas por página en el catálogo</h3>
                  <p className="config-option-desc">
                    24 motos por página es el valor recomendado porque mantiene
                    filas equilibradas en pantallas de 2, 3 y 4 columnas.
                  </p>
                  <div className="config-size-row">
                    {([12, 24, 30] as TamanoPaginaCatalogo[]).map((cantidad) => (
                      <button
                        key={cantidad}
                        type="button"
                        className={`config-size-btn ${
                          prefs.motosPorPagina === cantidad ? "active" : ""
                        }`}
                        onClick={() =>
                          actualizar(
                            { motosPorPagina: cantidad },
                            `Catálogo ajustado a ${cantidad} motos por página.`
                          )
                        }
                      >
                        {cantidad} por página
                        {cantidad === 24 && " (Recomendado)"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {seccion === "notificaciones" && (
              <>
                <h2>Notificaciones</h2>
                <p className="config-card-desc">
                  Controla qué avisos deseas recibir sobre tus solicitudes,
                  alquileres activos y evaluaciones.
                </p>

                <div className="config-options-list">
                  <label className="config-option-row">
                    <div>
                      <strong>Estado de verificación de cuenta</strong>
                      <p className="config-option-desc">
                        Avisos cuando un administrador apruebe o solicite
                        correcciones en tus documentos.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="config-switch"
                      checked={prefs.notifVerificacion}
                      onChange={(e) =>
                        actualizar({ notifVerificacion: e.target.checked })
                      }
                    />
                  </label>

                  <label className="config-option-row">
                    <div>
                      <strong>Recordatorios de entrega y devolución</strong>
                      <p className="config-option-desc">
                        Alertas preventivas antes de la fecha límite de cada
                        renta activa.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="config-switch"
                      checked={prefs.notifDevolucion}
                      onChange={(e) =>
                        actualizar({ notifDevolucion: e.target.checked })
                      }
                    />
                  </label>

                  <label className="config-option-row">
                    <div>
                      <strong>Reservas y reseñas de usuarios</strong>
                      <p className="config-option-desc">
                        Notificaciones cuando recibas una solicitud o una nueva
                        calificación verificada.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="config-switch"
                      checked={prefs.notifResenas}
                      onChange={(e) =>
                        actualizar({ notifResenas: e.target.checked })
                      }
                    />
                  </label>
                </div>
              </>
            )}

            {seccion === "privacidad" && (
              <>
                <h2>Privacidad y perfil público</h2>
                <p className="config-card-desc">
                  Tus documentos de identidad, correo y teléfono son siempre
                  privados. Aquí eliges cómo te ven otros usuarios en reseñas y
                  en tu perfil público.
                </p>

                <div className="config-block">
                  <h3>Formato de nombre visible</h3>
                  <div className="config-size-row">
                    {(
                      [
                        {
                          id: "inicial",
                          texto: "Primer nombre + inicial (ej. Carlos M.)",
                        },
                        {
                          id: "completo",
                          texto: "Nombre completo registrado",
                        },
                      ] as { id: FormatoNombrePublico; texto: string }[]
                    ).map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        className={`config-size-btn ${
                          prefs.formatoNombrePublico === op.id ? "active" : ""
                        }`}
                        onClick={() =>
                          actualizar({ formatoNombrePublico: op.id })
                        }
                      >
                        {op.texto}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="config-option-row">
                  <div>
                    <strong>Mostrar contador de viajes completados</strong>
                    <p className="config-option-desc">
                      Permite que propietarios y arrendatarios vean cuántas
                      rentas exitosas has completado en MotoRent.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="config-switch"
                    checked={prefs.mostrarHistorialPublico}
                    onChange={(e) =>
                      actualizar({ mostrarHistorialPublico: e.target.checked })
                    }
                  />
                </label>
              </>
            )}

            {seccion === "seguridad" && (
              <>
                <h2>Seguridad y cuenta</h2>
                <p className="config-card-desc">
                  Administra el acceso a tu cuenta y restablece tus preferencias
                  locales cuando lo necesites.
                </p>

                <div className="config-options-list">
                  <div className="config-option-row">
                    <div>
                      <strong>Cuenta activa</strong>
                      <p className="config-option-desc">
                        {usuario?.fullName || "Usuario autenticado"} ·{" "}
                        {usuario?.email || "Sesión activa"}
                      </p>
                    </div>
                    <Link to="/perfil" className="config-link-btn">
                      Ver perfil
                    </Link>
                  </div>

                  <div className="config-option-row">
                    <div>
                      <strong>Contraseña de acceso</strong>
                      <p className="config-option-desc">
                        Solicita un enlace seguro por correo para cambiar tu
                        contraseña.
                      </p>
                    </div>
                    <Link to="/recuperar-password" className="config-link-btn">
                      Cambiar contraseña
                    </Link>
                  </div>

                  <div className="config-option-row">
                    <div>
                      <strong>Restablecer preferencias de interfaz</strong>
                      <p className="config-option-desc">
                        Vuelve al tema claro, 24 motos por página y
                        notificaciones por defecto.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="config-link-btn"
                      onClick={manejarRestablecer}
                    >
                      <IconRefresh size={14} />
                      <span>Restablecer</span>
                    </button>
                  </div>

                  <div className="config-option-row config-option-row--danger">
                    <div>
                      <strong>Cerrar sesión en este dispositivo</strong>
                      <p className="config-option-desc">
                        Elimina el token JWT y los datos temporales de tu
                        navegador.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="config-danger-btn"
                      onClick={cerrarSesion}
                    >
                      <IconLogout size={15} />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Configuracion;
