import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconAlert,
  IconCheckCircle,
  IconDocument,
  IconEye,
  IconMoto,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconStar,
  IconUser,
} from "../../../components/Icons";
import {
  DATOS_DEMO_PANEL_ADMIN,
  actualizarEstadoMotoAdmin,
  cargarPanelAdminCompleto,
  descargarDocumentoPrivadoAdmin,
  type PanelAdminCompleto,
} from "../../../services/admin.service";
import {
  resolverVerificacionAdmin,
  type TipoVerificacion,
} from "../../../services/verificacion.service";
import {
  construirListaDocumentosAdmin,
  filtrarUsuariosAdmin,
  obtenerBadgeEstadoMoto,
  type DocumentoInspeccion,
} from "../../../utils/admin.utils";
import { formatearFechaCorta, formatearPrecioCOP } from "../../../utils/moto.utils";

type PestanaAdmin = "verificaciones" | "motos" | "usuarios" | "resenas";

/**
 * Panel Administrativo Completo (Fase 7) protegido por RBAC (rol ADMIN):
 * 1. Verificaciones (Renter & Owner) con visor privado de documentos + Aprobar/Rechazar.
 * 2. Motocicletas: aprobar (AVAILABLE), rechazar (REJECTED) o pausar (MAINTENANCE).
 * 3. Directorio de usuarios con buscador y enlace al Perfil Público (/usuario/:id).
 * 4. Supervisión de reseñas con foco en alertas de baja calificación (<= 3 estrellas).
 */
function DashboardAdminView() {
  const [panel, setPanel] = useState<PanelAdminCompleto | null>(null);
  const [modoDemoDev, setModoDemoDev] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [pestana, setPestana] = useState<PestanaAdmin>("verificaciones");
  const [subTabVerif, setSubTabVerif] = useState<TipoVerificacion>("renter");

  const [aviso, setAviso] = useState<{
    tipo: "info" | "error" | "success";
    texto: string;
    mostrarBotonDemo?: boolean;
  } | null>(null);

  // Control de rechazo inline
  const [rechazoActivoId, setRechazoActivoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Control del visor privado de documentos
  const [docsAbiertosId, setDocsAbiertosId] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{
    etiqueta: string;
    blobUrl: string;
    esPdf: boolean;
  } | null>(null);

  // Filtros del directorio de usuarios
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [rolUsuarioFiltro, setRolUsuarioFiltro] = useState("TODOS");

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    setModoDemoDev(false);
    const res = await cargarPanelAdminCompleto();
    setCargando(false);

    if (!res.ok || !res.data) {
      setPanel(null);
      setAviso({
        tipo: res.codigo === 403 ? "info" : "error",
        texto: res.mensaje,
        mostrarBotonDemo: import.meta.env.DEV,
      });
      return;
    }

    setPanel(res.data);
    setAviso(null);
  }, []);

  useEffect(() => {
    let activo = true;

    async function inicializar() {
      const res = await cargarPanelAdminCompleto();
      if (!activo) return;
      setCargando(false);

      if (!res.ok || !res.data) {
        setPanel(null);
        setAviso({
          tipo: res.codigo === 403 ? "info" : "error",
          texto: res.mensaje,
          mostrarBotonDemo: import.meta.env.DEV,
        });
        return;
      }

      setPanel(res.data);
      setAviso(null);
    }

    inicializar();
    return () => {
      activo = false;
    };
  }, []);

  // Liberar memoria del Blob URL al cerrar el visor
  useEffect(() => {
    return () => {
      if (docPreview?.blobUrl) {
        URL.revokeObjectURL(docPreview.blobUrl);
      }
    };
  }, [docPreview]);

  function activarVistaDemoDev() {
    setModoDemoDev(true);
    setPanel(structuredClone(DATOS_DEMO_PANEL_ADMIN));
    setAviso({
      tipo: "info",
      texto:
        "Modo demostración de desarrollo activo: puedes probar las 4 pestañas (verificaciones, motos, usuarios y reseñas) sin alterar PostgreSQL.",
    });
  }

  async function abrirDocumentoPrivado(doc: DocumentoInspeccion) {
    if (modoDemoDev || !doc.rutaApi) {
      setAviso({
        tipo: "info",
        texto: `Vista previa protegida: en producción se descarga "${doc.etiqueta}" desde ${doc.rutaApi || "/api/admin/documentos/..."} con cabecera Authorization Bearer.`,
      });
      return;
    }

    const res = await descargarDocumentoPrivadoAdmin(doc.rutaApi);
    if (!res.ok || !res.blobUrl) {
      setAviso({
        tipo: "error",
        texto: res.mensaje || "No se pudo abrir el documento privado.",
      });
      return;
    }

    if (docPreview?.blobUrl) {
      URL.revokeObjectURL(docPreview.blobUrl);
    }
    setDocPreview({
      etiqueta: doc.etiqueta,
      blobUrl: res.blobUrl,
      esPdf: doc.esPdf,
    });
  }

  function removerVerificacionLocal(tipo: TipoVerificacion, id: string) {
    setPanel((prev) => {
      if (!prev) return prev;
      if (tipo === "renter") {
        const restantes = prev.cola.renters.filter((r) => r.id !== id);
        return {
          ...prev,
          cola: {
            ...prev.cola,
            renters: restantes,
            resumen: { ...prev.cola.resumen, rentersPendientes: restantes.length },
          },
          resumen: { ...prev.resumen, rentersPendientes: restantes.length },
        };
      }
      const restantes = prev.cola.owners.filter((o) => o.id !== id);
      return {
        ...prev,
        cola: {
          ...prev.cola,
          owners: restantes,
          resumen: { ...prev.cola.resumen, ownersPendientes: restantes.length },
        },
        resumen: { ...prev.resumen, ownersPendientes: restantes.length },
      };
    });
  }

  async function resolverVerificacion(
    tipo: TipoVerificacion,
    id: string,
    estado: "APPROVED" | "REJECTED"
  ) {
    if (estado === "REJECTED" && motivoRechazo.trim().length < 5) {
      setAviso({
        tipo: "error",
        texto: "Escribe un motivo de rechazo claro (mínimo 5 caracteres).",
      });
      return;
    }

    if (modoDemoDev) {
      removerVerificacionLocal(tipo, id);
      setRechazoActivoId(null);
      setMotivoRechazo("");
      setAviso({
        tipo: "success",
        texto:
          estado === "APPROVED"
            ? "Perfil aprobado (simulación de desarrollo)."
            : "Perfil rechazado con motivo registrado (simulación de desarrollo).",
      });
      return;
    }

    setProcesandoId(id);
    const res = await resolverVerificacionAdmin(
      tipo,
      id,
      estado,
      estado === "REJECTED" ? motivoRechazo : undefined
    );
    setProcesandoId(null);

    if (!res.ok) {
      setAviso({ tipo: "error", texto: res.mensaje });
      return;
    }

    removerVerificacionLocal(tipo, id);
    setRechazoActivoId(null);
    setMotivoRechazo("");
    setAviso({ tipo: "success", texto: res.mensaje });
  }

  async function cambiarEstadoMoto(
    motoId: string,
    nuevoEstado: "AVAILABLE" | "REJECTED" | "MAINTENANCE"
  ) {
    if (!modoDemoDev) {
      setProcesandoId(motoId);
      const res = await actualizarEstadoMotoAdmin(motoId, nuevoEstado);
      setProcesandoId(null);

      if (!res.ok) {
        setAviso({ tipo: "error", texto: res.mensaje });
        return;
      }
      setAviso({ tipo: "success", texto: res.mensaje });
    } else {
      setAviso({
        tipo: "success",
        texto: `Estado de la motocicleta actualizado a ${nuevoEstado} (simulación DEV).`,
      });
    }

    setPanel((prev) => {
      if (!prev) return prev;
      const motosActualizadas = prev.motos.map((m) =>
        m.id === motoId ? { ...m, status: nuevoEstado } : m
      );
      return {
        ...prev,
        motos: motosActualizadas,
        resumen: {
          ...prev.resumen,
          motosPendientes: motosActualizadas.filter(
            (m) => m.status === "PENDING_APPROVAL"
          ).length,
          motosDisponibles: motosActualizadas.filter(
            (m) => m.status === "AVAILABLE"
          ).length,
        },
      };
    });
  }

  const totalVerifPendientes = panel
    ? panel.resumen.rentersPendientes + panel.resumen.ownersPendientes
    : "--";

  const usuariosFiltrados = panel
    ? filtrarUsuariosAdmin(panel.usuarios, busquedaUsuario, rolUsuarioFiltro)
    : [];

  return (
    <>
      <section className="admin-notice-banner admin-notice-banner--flex">
        <div>
          <strong>Centro de Control Administrativo</strong>
          <p>
            Supervisa verificaciones de identidad con visor privado, aprueba
            motocicletas, consulta el directorio de usuarios y atiende alertas
            de reseñas.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-btn"
          onClick={cargarTodo}
          disabled={cargando}
        >
          <IconRefresh size={15} />
          <span>{cargando ? "Actualizando..." : "Actualizar"}</span>
        </button>
      </section>

      {aviso && (
        <div
          className={`admin-feedback-banner admin-feedback-banner--${aviso.tipo}`}
          role="status"
        >
          {aviso.tipo === "success" ? (
            <IconCheckCircle size={17} />
          ) : (
            <IconAlert size={17} />
          )}
          <span style={{ flex: 1 }}>{aviso.texto}</span>
          {aviso.mostrarBotonDemo && !modoDemoDev && (
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={activarVistaDemoDev}
            >
              Cargar vista de ejemplo (DEV)
            </button>
          )}
        </div>
      )}

      {/* 4 KPIS OPERATIVOS */}
      <section className="stats-row">
        <div className="stat-card">
          <div className="icon-chip icon-chip--primary">
            <IconShieldCheck size={19} />
          </div>
          <p className="stat-number">{totalVerifPendientes}</p>
          <p className="stat-label">Verificaciones pendientes</p>
        </div>

        <div className="stat-card">
          <div className="icon-chip icon-chip--accent">
            <IconMoto size={19} />
          </div>
          <p className="stat-number">
            {panel ? panel.resumen.motosPendientes : "--"}
          </p>
          <p className="stat-label">Motos por aprobar</p>
        </div>

        <div className="stat-card">
          <div className="icon-chip icon-chip--neutral">
            <IconUser size={19} />
          </div>
          <p className="stat-number">
            {panel ? panel.resumen.usuariosTotales : "--"}
          </p>
          <p className="stat-label">Usuarios registrados</p>
        </div>

        <div className="stat-card">
          <div className="icon-chip icon-chip--primary">
            <IconStar size={19} />
          </div>
          <p className="stat-number">
            {panel ? panel.resumen.resenasAlerta : "--"}
          </p>
          <p className="stat-label">Reseñas en alerta (≤ 3★)</p>
        </div>
      </section>

      {/* NAVEGACIÓN DE LOS 4 MÓDULOS ADMINISTRATIVOS */}
      {panel && (
        <section className="admin-queue-section">
          <div className="admin-main-tabs" role="tablist">
            {(
              [
                [
                  "verificaciones",
                  `Verificaciones (${panel.cola.renters.length + panel.cola.owners.length})`,
                ],
                ["motos", `Motocicletas (${panel.motos.length})`],
                ["usuarios", `Usuarios (${panel.usuarios.length})`],
                ["resenas", `Reseñas y alertas (${panel.resenas.length})`],
              ] as [PestanaAdmin, string][]
            ).map(([idTab, label]) => (
              <button
                key={idTab}
                type="button"
                role="tab"
                aria-selected={pestana === idTab}
                className={`admin-tab-btn ${pestana === idTab ? "active" : ""}`}
                onClick={() => setPestana(idTab)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 1. MÓDULO VERIFICACIONES + VISOR PRIVADO */}
          {pestana === "verificaciones" && (
            <>
              <div className="admin-queue-header">
                <div className="section-title-box admin-queue-title">
                  <h2>Solicitudes de identidad pendientes</h2>
                  <p>Inspecciona los documentos antes de aprobar o rechazar.</p>
                </div>
                <div className="admin-tabs">
                  <button
                    type="button"
                    className={`admin-tab-btn ${subTabVerif === "renter" ? "active" : ""}`}
                    onClick={() => setSubTabVerif("renter")}
                  >
                    Arrendatarios ({panel.cola.renters.length})
                  </button>
                  <button
                    type="button"
                    className={`admin-tab-btn ${subTabVerif === "owner" ? "active" : ""}`}
                    onClick={() => setSubTabVerif("owner")}
                  >
                    Propietarios ({panel.cola.owners.length})
                  </button>
                </div>
              </div>

              {docPreview && (
                <div className="admin-doc-preview">
                  <div className="admin-doc-preview-top">
                    <strong>Visor privado: {docPreview.etiqueta}</strong>
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={() => {
                        URL.revokeObjectURL(docPreview.blobUrl);
                        setDocPreview(null);
                      }}
                    >
                      Cerrar visor
                    </button>
                  </div>
                  {docPreview.esPdf ? (
                    <iframe
                      title={docPreview.etiqueta}
                      src={docPreview.blobUrl}
                      className="admin-doc-iframe"
                    />
                  ) : (
                    <img
                      src={docPreview.blobUrl}
                      alt={docPreview.etiqueta}
                      className="admin-doc-img"
                    />
                  )}
                </div>
              )}

              <div className="admin-queue-list">
                {(subTabVerif === "renter"
                  ? panel.cola.renters
                  : panel.cola.owners
                ).length === 0 ? (
                  <div className="admin-empty-queue">
                    <IconCheckCircle size={22} />
                    <div>
                      <strong>Cola al día</strong>
                      <p>No hay solicitudes pendientes en esta categoría.</p>
                    </div>
                  </div>
                ) : (
                  (subTabVerif === "renter"
                    ? panel.cola.renters
                    : panel.cola.owners
                  ).map((item) => {
                    const docs = construirListaDocumentosAdmin(subTabVerif, item);
                    const docsAbiertos = docsAbiertosId === item.id;
                    const mostrandoRechazo = rechazoActivoId === item.id;
                    const enProceso = procesandoId === item.id;

                    return (
                      <article key={item.id} className="admin-request-card">
                        <div className="admin-request-top">
                          <div>
                            <h3>{item.user.fullName}</h3>
                            <p className="admin-request-meta">
                              {item.user.email} · Tel: {item.user.phone} ·{" "}
                              {formatearFechaCorta(item.updatedAt)}
                            </p>
                          </div>
                          <span className="role-status-pill role-status-pill--pending">
                            Pendiente · {subTabVerif === "renter" ? "Renter" : "Owner"}
                          </span>
                        </div>

                        <div className="admin-request-grid">
                          <div>
                            <span>Cédula</span>
                            <strong>{item.cedulaNumero}</strong>
                          </div>
                          {"licenseNumber" in item &&
                            "licenseCategory" in item &&
                            typeof item.licenseNumber === "string" &&
                            typeof item.licenseCategory === "string" && (
                              <div>
                                <span>Licencia</span>
                                <strong>
                                  {item.licenseNumber} (Cat. {item.licenseCategory})
                                </strong>
                              </div>
                            )}
                          <div>
                            <span>Soportes privados</span>
                            <strong>{docs.length} archivos</strong>
                          </div>
                        </div>

                        {/* Visor desplegable de documentos privados */}
                        <div>
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            onClick={() =>
                              setDocsAbiertosId(docsAbiertos ? null : item.id)
                            }
                          >
                            <IconEye size={14} />{" "}
                            {docsAbiertos ? "Ocultar documentos" : "Inspeccionar documentos"}
                          </button>

                          {docsAbiertos && (
                            <div className="admin-docs-grid">
                              {docs.map((doc) => (
                                <button
                                  key={doc.etiqueta}
                                  type="button"
                                  className="admin-doc-chip"
                                  onClick={() => abrirDocumentoPrivado(doc)}
                                >
                                  <IconDocument size={14} />
                                  <span>{doc.etiqueta}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {mostrandoRechazo ? (
                          <div className="admin-reject-box">
                            <label htmlFor={`motivo-${item.id}`}>
                              Motivo de rechazo (visible para el usuario)
                            </label>
                            <textarea
                              id={`motivo-${item.id}`}
                              rows={2}
                              value={motivoRechazo}
                              placeholder="Ej: La fotografía de la cédula posterior no es legible."
                              onChange={(e) => setMotivoRechazo(e.target.value)}
                            />
                            <div className="admin-request-actions">
                              <button
                                type="button"
                                className="admin-btn-danger"
                                disabled={enProceso}
                                onClick={() =>
                                  resolverVerificacion(subTabVerif, item.id, "REJECTED")
                                }
                              >
                                Confirmar rechazo
                              </button>
                              <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => {
                                  setRechazoActivoId(null);
                                  setMotivoRechazo("");
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="admin-request-actions">
                            <button
                              type="button"
                              className="admin-btn-approve"
                              disabled={enProceso}
                              onClick={() =>
                                resolverVerificacion(subTabVerif, item.id, "APPROVED")
                              }
                            >
                              Aprobar perfil
                            </button>
                            <button
                              type="button"
                              className="admin-btn-reject"
                              disabled={enProceso}
                              onClick={() => {
                                setRechazoActivoId(item.id);
                                setMotivoRechazo("");
                              }}
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* 2. MÓDULO MOTOCICLETAS */}
          {pestana === "motos" && (
            <div className="admin-queue-list">
              {panel.motos.length === 0 ? (
                <div className="admin-empty-queue">
                  <IconCheckCircle size={22} />
                  <div>
                    <strong>Sin motocicletas registradas</strong>
                    <p>Las motos publicadas aparecerán aquí para aprobación.</p>
                  </div>
                </div>
              ) : (
                panel.motos.map((moto) => {
                  const badge = obtenerBadgeEstadoMoto(moto.status);
                  const enProceso = procesandoId === moto.id;
                  return (
                    <article key={moto.id} className="admin-request-card">
                      <div className="admin-request-top">
                        <div>
                          <h3>
                            {moto.brand} {moto.model} ({moto.year})
                          </h3>
                          <p className="admin-request-meta">
                            Placa: {moto.licensePlate} · {moto.displacement} cc ·{" "}
                            {formatearPrecioCOP(moto.dailyRate)}/día
                            {moto.propietario
                              ? ` · Propietario: ${moto.propietario.fullName}`
                              : " · Flota MotoRent"}
                          </p>
                        </div>
                        <span
                          className={`role-status-pill role-status-pill--${badge.variante}`}
                        >
                          {badge.texto}
                        </span>
                      </div>

                      <div className="admin-request-actions">
                        {moto.status !== "AVAILABLE" && (
                          <button
                            type="button"
                            className="admin-btn-approve"
                            disabled={enProceso}
                            onClick={() => cambiarEstadoMoto(moto.id, "AVAILABLE")}
                          >
                            Aprobar (Disponible)
                          </button>
                        )}
                        {moto.status !== "MAINTENANCE" && (
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            disabled={enProceso}
                            onClick={() => cambiarEstadoMoto(moto.id, "MAINTENANCE")}
                          >
                            Pausar (Mantenimiento)
                          </button>
                        )}
                        {moto.status !== "REJECTED" && (
                          <button
                            type="button"
                            className="admin-btn-reject"
                            disabled={enProceso}
                            onClick={() => cambiarEstadoMoto(moto.id, "REJECTED")}
                          >
                            Rechazar
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {/* 3. MÓDULO DIRECTORIO DE USUARIOS */}
          {pestana === "usuarios" && (
            <>
              <div className="admin-users-filters">
                <label className="motos-search-field" style={{ flex: 1 }}>
                  <IconSearch size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo o usuario..."
                    value={busquedaUsuario}
                    onChange={(e) => setBusquedaUsuario(e.target.value)}
                  />
                </label>
                <select
                  value={rolUsuarioFiltro}
                  onChange={(e) => setRolUsuarioFiltro(e.target.value)}
                  className="admin-role-select"
                >
                  <option value="TODOS">Todos los roles</option>
                  <option value="USER">USER</option>
                  <option value="RENTER">RENTER</option>
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="admin-queue-list">
                {usuariosFiltrados.map((u) => (
                  <article key={u.id} className="admin-request-card">
                    <div className="admin-request-top">
                      <div>
                        <h3>
                          {u.fullName} <span className="admin-request-meta">(@{u.username})</span>
                        </h3>
                        <p className="admin-request-meta">
                          {u.email} · Tel: {u.phone} · Renter: {u.estadoRenter} · Owner:{" "}
                          {u.estadoOwner}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="role-status-pill role-status-pill--neutral">
                          {u.role}
                        </span>
                        <Link
                          to={`/usuario/${u.id}`}
                          className="secondary-role-link"
                        >
                          Perfil público →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* 4. MÓDULO RESEÑAS Y ALERTAS */}
          {pestana === "resenas" && (
            <div className="admin-queue-list">
              {panel.resenas.length === 0 ? (
                <div className="admin-empty-queue">
                  <IconCheckCircle size={22} />
                  <div>
                    <strong>Sin alertas de reseñas</strong>
                    <p>No hay calificaciones registradas todavía.</p>
                  </div>
                </div>
              ) : (
                panel.resenas.map((r) => (
                  <article key={r.id} className="admin-request-card">
                    <div className="admin-request-top">
                      <div>
                        <h3>
                          {r.autor.fullName} → {r.destinatario.fullName}{" "}
                          {r.moto ? `· ${r.moto}` : ""}
                        </h3>
                        <p className="admin-request-meta">
                          Tipo: {r.targetType} · {formatearFechaCorta(r.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`role-status-pill ${
                          r.esAlerta
                            ? "role-status-pill--rejected"
                            : "role-status-pill--approved"
                        }`}
                      >
                        {r.rating} / 5 {r.esAlerta ? "· Alerta" : ""}
                      </span>
                    </div>
                    {r.comment && (
                      <p style={{ margin: 0, fontSize: "13.8px" }}>{r.comment}</p>
                    )}
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default DashboardAdminView;
