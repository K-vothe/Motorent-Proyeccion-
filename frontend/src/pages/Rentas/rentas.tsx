import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconAlert,
  IconCheckCircle,
  IconDocument,
  IconShieldCheck,
  IconStar,
} from "../../components/Icons";
import { EmptyState, SkeletonRentasList, useToast } from "../../components/UiFeedback";
import {
  cancelarRentaApi,
  firmarContratoApi,
  obtenerClausulas,
  obtenerMisRentas,
  pagarRentaApi,
  registrarDevolucionApi,
  registrarEntregaApi,
  reportarIncidenteApi,
  type ClausulaApi,
  type RentaApi,
} from "../../services/rentas.service";
import { enviarResena } from "../../services/resenas.service";
import {
  etiquetaCalificacion,
  validarFormularioResena,
} from "../../utils/resenas.utils";
import {
  calcularPasoCicloRenta,
  ETIQUETAS_ESTADO_RENTA,
  ETIQUETAS_INCIDENTE,
  METODOS_PAGO,
  PASOS_CICLO_RENTA,
  validarFormularioActa,
  validarFormularioIncidente,
  type MetodoPago,
  type TipoIncidente,
} from "../../utils/rentas.utils";
import "./rentas.css";

type FiltroTab = "TODAS" | "EN_CURSO" | "COMPLETADAS" | "CERRADAS";
type TipoPanel = "contrato" | "pago" | "pickup" | "return" | "incidente" | "cancelar" | "evaluar";

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function leerArchivoComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada"));
    reader.readAsDataURL(archivo);
  });
}

function SelectorEstrellas({
  valor,
  onChange,
  etiqueta,
}: {
  valor: number;
  onChange: (n: number) => void;
  etiqueta: string;
}) {
  return (
    <div className="rentas-stars-row">
      <div className="rentas-stars-btns" role="radiogroup" aria-label={etiqueta}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`rentas-star-btn ${n <= valor ? "active" : ""}`}
            aria-label={`${n} estrellas`}
            onClick={() => onChange(n)}
          >
            <IconStar size={20} rellena={n <= valor} />
          </button>
        ))}
      </div>
      <span className="rentas-star-label">{etiquetaCalificacion(valor)}</span>
    </div>
  );
}

function Rentas() {
  const { mostrarToast } = useToast();
  const [rentas, setRentas] = useState<RentaApi[]>([]);
  const [clausulas, setClausulas] = useState<ClausulaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [filtro, setFiltro] = useState<FiltroTab>("TODAS");
  const [avisoGlobal, setAvisoGlobal] = useState("");

  // Panel de acción inline activo
  const [panel, setPanel] = useState<{ rentaId: string; tipo: TipoPanel } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  // Estados de formularios del ciclo de vida
  const [aceptoClausulas, setAceptoClausulas] = useState(false);
  const [obsContrato, setObsContrato] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("PSE");
  const [actaKm, setActaKm] = useState("");
  const [actaFuel, setActaFuel] = useState("100");
  const [actaObs, setActaObs] = useState("");
  const [actaFoto, setActaFoto] = useState<string | null>(null);
  const [incidenteTipo, setIncidenteTipo] = useState<TipoIncidente>("ACCIDENT");
  const [incidenteNotas, setIncidenteNotas] = useState("");

  // Estado de reseñas (Fase 6)
  const [ratingMoto, setRatingMoto] = useState(5);
  const [ratingContraparte, setRatingContraparte] = useState(5);
  const [comentarioEval, setComentarioEval] = useState("");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    const [resRentas, resClausulas] = await Promise.all([
      obtenerMisRentas(),
      obtenerClausulas(),
    ]);
    if (!resRentas.ok) {
      setErrorCarga(resRentas.mensaje);
    } else {
      setRentas(resRentas.data ?? []);
    }
    if (resClausulas.ok && resClausulas.data) {
      setClausulas(resClausulas.data);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void cargarDatos();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargarDatos]);

  function abrirPanel(renta: RentaApi, tipo: TipoPanel) {
    setErrorAccion("");
    setAvisoGlobal("");
    setPanel({ rentaId: renta.id, tipo });
    setAceptoClausulas(false);
    setObsContrato("");
    setMetodoPago("PSE");
    const pickup = renta.handovers.find((h) => h.type === "PICKUP");
    const kmSugerido = pickup ? Math.max(pickup.mileage, renta.moto.KM) : renta.moto.KM;
    setActaKm(String(kmSugerido));
    setActaFuel("100");
    setActaObs("");
    setActaFoto(null);
    setIncidenteTipo("ACCIDENT");
    setIncidenteNotas("");
    setRatingMoto(5);
    setRatingContraparte(5);
    setComentarioEval("");
  }

  function cerrarPanel() {
    setPanel(null);
    setErrorAccion("");
  }

  async function ejecutarFirmar(rentaId: string) {
    if (!aceptoClausulas) {
      setErrorAccion("Marca la casilla de aceptación para firmar el contrato digital.");
      return;
    }
    setEnviando(true);
    setErrorAccion("");
    const res = await firmarContratoApi(rentaId, true, obsContrato.trim() || undefined);
    setEnviando(false);
    if (!res.ok) {
      setErrorAccion(res.mensaje);
      return;
    }
    cerrarPanel();
    const msg = "Contrato firmado con hash SHA-256. Ya puedes registrar el pago.";
    setAvisoGlobal(msg);
    mostrarToast(msg);
    await cargarDatos();
  }

  async function ejecutarPago(rentaId: string) {
    setEnviando(true);
    setErrorAccion("");
    const res = await pagarRentaApi(rentaId, metodoPago);
    setEnviando(false);
    if (!res.ok) {
      setErrorAccion(res.mensaje);
      return;
    }
    cerrarPanel();
    const msg = "Pago confirmado. La moto quedó reservada y lista para entrega (PICKUP).";
    setAvisoGlobal(msg);
    mostrarToast(msg);
    await cargarDatos();
  }

  async function ejecutarActa(renta: RentaApi, tipo: "pickup" | "return") {
    const pickup = renta.handovers.find((h) => h.type === "PICKUP");
    const kmMinimo = tipo === "return" && pickup ? Math.max(pickup.mileage, renta.moto.KM) : renta.moto.KM;
    const err = validarFormularioActa(actaKm, kmMinimo, actaFuel);
    if (err) {
      setErrorAccion(err);
      return;
    }

    setEnviando(true);
    setErrorAccion("");
    const payload = {
      mileage: Number(actaKm),
      fuelLevel: Number(actaFuel),
      observations: actaObs.trim() || undefined,
      photos: actaFoto ? [actaFoto] : undefined,
    };
    const res =
      tipo === "pickup"
        ? await registrarEntregaApi(renta.id, payload)
        : await registrarDevolucionApi(renta.id, payload);
    setEnviando(false);

    if (!res.ok) {
      setErrorAccion(res.mensaje);
      return;
    }
    cerrarPanel();
    setAvisoGlobal(
      tipo === "pickup"
        ? "Acta de entrega (PICKUP) registrada. La renta está ahora EN CURSO."
        : "Acta de devolución (RETURN) registrada. Renta completada y galería actualizada."
    );
    await cargarDatos();
  }

  async function ejecutarCancelar(rentaId: string) {
    setEnviando(true);
    setErrorAccion("");
    const res = await cancelarRentaApi(rentaId);
    setEnviando(false);
    if (!res.ok) {
      setErrorAccion(res.mensaje);
      return;
    }
    cerrarPanel();
    setAvisoGlobal("La solicitud de renta fue cancelada correctamente.");
    await cargarDatos();
  }

  async function ejecutarIncidente(rentaId: string) {
    const err = validarFormularioIncidente(incidenteTipo, incidenteNotas);
    if (err) {
      setErrorAccion(err);
      return;
    }
    setEnviando(true);
    setErrorAccion("");
    const res = await reportarIncidenteApi(rentaId, incidenteTipo, incidenteNotas.trim());
    setEnviando(false);
    if (!res.ok) {
      setErrorAccion(res.mensaje);
      return;
    }
    cerrarPanel();
    setAvisoGlobal("Incidente reportado. La motocicleta fue marcada en estado de seguridad.");
    await cargarDatos();
  }

  async function ejecutarEvaluacion(renta: RentaApi) {
    setErrorAccion("");
    const err1 = validarFormularioResena(ratingContraparte, comentarioEval);
    const err2 =
      renta.rolEnRenta === "RENTER"
        ? validarFormularioResena(ratingMoto, comentarioEval)
        : null;
    if (err1 || err2) {
      setErrorAccion(err1 || err2 || "Verifica tu calificación.");
      return;
    }

    setEnviando(true);
    if (renta.rolEnRenta === "RENTER") {
      const [resMoto, resOwner] = await Promise.all([
        enviarResena({
          rentalId: renta.id,
          targetType: "MOTO",
          rating: ratingMoto,
          comment: comentarioEval.trim() || undefined,
        }),
        enviarResena({
          rentalId: renta.id,
          targetType: "OWNER",
          rating: ratingContraparte,
          comment: comentarioEval.trim() || undefined,
        }),
      ]);
      setEnviando(false);
      if (!resMoto.ok || !resOwner.ok) {
        setErrorAccion(resMoto.mensaje || resOwner.mensaje);
        return;
      }
    } else {
      const resRenter = await enviarResena({
        rentalId: renta.id,
        targetType: "RENTER",
        rating: ratingContraparte,
        comment: comentarioEval.trim() || undefined,
      });
      setEnviando(false);
      if (!resRenter.ok) {
        setErrorAccion(resRenter.mensaje);
        return;
      }
    }

    cerrarPanel();
    setAvisoGlobal(
      "Calificación enviada bajo regla doble ciego (visible cuando ambos califiquen o en 30 min)."
    );
    await cargarDatos();
  }

  const pendientesEvaluacion = rentas.filter((r) => r.requiereEvaluacion);

  const rentasFiltradas = rentas.filter((r) => {
    if (filtro === "EN_CURSO") {
      return r.status === "PENDING" || r.status === "PAID" || r.status === "ACTIVE";
    }
    if (filtro === "COMPLETADAS") return r.status === "COMPLETED";
    if (filtro === "CERRADAS") return r.status === "CANCELLED" || r.status === "INCIDENT";
    return true;
  });

  return (
    <div className="rentas-page">
      <main className="rentas-content">
        <div className="rentas-header">
          <div>
            <span className="rentas-tag">GESTIÓN EN VIVO · CICLO DE RENTA</span>
            <h1>Mis rentas</h1>
            <p className="rentas-lead">
              Administra tus solicitudes, firma contratos con cláusulas, registra actas de entrega
              (PICKUP) y devolución (RETURN), y califica tus viajes completados.
            </p>
          </div>
          <Link to="/motos" className="rentas-cta-link">
            Explorar catálogo →
          </Link>
        </div>

        {avisoGlobal && (
          <div className="rentas-banner-ok" role="status">
            <IconCheckCircle size={18} />
            <span>{avisoGlobal}</span>
          </div>
        )}

        {pendientesEvaluacion.length > 0 && (
          <div className="rentas-pending-eval" role="status">
            <IconAlert size={18} />
            <div>
              <strong>
                Tienes {pendientesEvaluacion.length}{" "}
                {pendientesEvaluacion.length === 1
                  ? "calificación obligatoria pendiente"
                  : "calificaciones obligatorias pendientes"}
              </strong>
              <p>
                Completa la evaluación de tus rentas finalizadas antes de solicitar una nueva
                motocicleta. Doble ciego activo: se revela cuando ambos califican o en 30 minutos.
              </p>
            </div>
          </div>
        )}

        {/* FILTROS POR ESTADO */}
        <div className="rentas-tabs" role="tablist" aria-label="Filtrar rentas">
          {(
            [
              ["TODAS", `Todas (${rentas.length})`],
              [
                "EN_CURSO",
                `En curso (${rentas.filter((r) => ["PENDING", "PAID", "ACTIVE"].includes(r.status)).length})`,
              ],
              [
                "COMPLETADAS",
                `Completadas (${rentas.filter((r) => r.status === "COMPLETED").length})`,
              ],
              [
                "CERRADAS",
                `Incidentes / Canceladas (${rentas.filter((r) => ["CANCELLED", "INCIDENT"].includes(r.status)).length})`,
              ],
            ] as [FiltroTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filtro === id}
              className={`rentas-tab-btn ${filtro === id ? "active" : ""}`}
              onClick={() => setFiltro(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {cargando ? (
          <SkeletonRentasList cantidad={3} />
        ) : errorCarga ? (
          <div className="rentas-state-card rentas-state-error" role="alert">
            <IconAlert size={20} />
            <span>{errorCarga}</span>
          </div>
        ) : rentasFiltradas.length === 0 ? (
          <EmptyState
            titulo="Aún no tienes rentas en esta vista"
            descripcion="Cuando solicites una motocicleta o recibas una reserva en tus motos publicadas, podrás gestionar aquí el contrato, pago y actas de entrega."
            accionTexto="Explorar catálogo"
            accionTo="/motos"
          />
        ) : (
          <div className="rentas-list-live">
            {rentasFiltradas.map((renta) => {
              const badge = ETIQUETAS_ESTADO_RENTA[renta.status];
              const pasoActual = calcularPasoCicloRenta(renta);
              const contraparte =
                renta.rolEnRenta === "RENTER"
                  ? renta.propietario
                  : renta.arrendatario;
              const etiquetaContraparte =
                renta.rolEnRenta === "RENTER" ? "Propietario" : "Arrendatario";
              const puedeFirmar =
                (renta.rolEnRenta === "RENTER" || renta.rolEnRenta === "ADMIN") &&
                renta.status === "PENDING" &&
                !renta.contract;
              const puedePagar =
                (renta.rolEnRenta === "RENTER" || renta.rolEnRenta === "ADMIN") &&
                renta.status === "PENDING" &&
                Boolean(renta.contract?.accepted);
              const puedePickup =
                (renta.rolEnRenta === "OWNER" || renta.rolEnRenta === "ADMIN") &&
                renta.status === "PAID";
              const puedeReturn =
                (renta.rolEnRenta === "OWNER" || renta.rolEnRenta === "ADMIN") &&
                renta.status === "ACTIVE";
              const puedeCancelar = renta.status === "PENDING" || renta.status === "PAID";
              const puedeIncidente = renta.status === "PAID" || renta.status === "ACTIVE";
              const panelDeEsta = panel?.rentaId === renta.id ? panel.tipo : null;

              return (
                <article key={renta.id} className="renta-live-card">
                  <div className="renta-live-top">
                    <div>
                      <div className="renta-live-badges">
                        <span className={`status-badge ${badge.clase}`}>{badge.texto}</span>
                        <span className="renta-role-pill">
                          {renta.rolEnRenta === "RENTER"
                            ? "Como arrendatario"
                            : renta.rolEnRenta === "OWNER"
                            ? "Como propietario"
                            : "Vista ADMIN"}
                        </span>
                        <span className="renta-plate-pill">{renta.moto.licensePlate}</span>
                      </div>
                      <h2>
                        {renta.moto.brand} {renta.moto.model} ({renta.moto.year})
                      </h2>
                    </div>

                    <div className="renta-live-price">
                      <strong>${renta.total.toLocaleString("es-CO")} COP</strong>
                      <span>
                        {renta.rolEnRenta === "OWNER"
                          ? `Tu ganancia neta: $${renta.ownerEarnings.toLocaleString("es-CO")}`
                          : `Tarifa: $${renta.moto.dailyRate.toLocaleString("es-CO")}/día`}
                      </span>
                    </div>
                  </div>

                  {/* STEPPER VISUAL DE 5 PASOS */}
                  {pasoActual > 0 && (
                    <ol className="renta-stepper" aria-label="Progreso de la renta">
                      {PASOS_CICLO_RENTA.map((nombrePaso, idx) => {
                        const numero = idx + 1;
                        const completado = numero <= pasoActual;
                        return (
                          <li
                            key={nombrePaso}
                            className={`renta-step ${completado ? "done" : ""}`}
                          >
                            <span className="renta-step-dot">{numero}</span>
                            <span className="renta-step-label">{nombrePaso}</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {/* RESUMEN DE DATOS CLAVE */}
                  <div className="renta-live-meta">
                    <div>
                      <span className="renta-meta-label">Fechas</span>
                      <span className="renta-meta-val">
                        {formatearFecha(renta.startDate)} → {formatearFecha(renta.endDate)}
                      </span>
                    </div>
                    <div>
                      <span className="renta-meta-label">{etiquetaContraparte}</span>
                      {contraparte ? (
                        <Link to={`/usuario/${contraparte.id}`} className="renta-meta-link">
                          {contraparte.nombre}
                        </Link>
                      ) : (
                        <span className="renta-meta-val">Flota MotoRent</span>
                      )}
                    </div>
                    <div>
                      <span className="renta-meta-label">Contrato</span>
                      <span className="renta-meta-val">
                        {renta.contract ? renta.contract.contractNumber : "Sin firmar"}
                      </span>
                    </div>
                    <div>
                      <span className="renta-meta-label">Pago</span>
                      <span className="renta-meta-val">
                        {renta.payment
                          ? `${renta.payment.method} (${renta.payment.reference})`
                          : "Pendiente"}
                      </span>
                    </div>
                  </div>

                  {/* RESUMEN DE ACTAS PICKUP / RETURN */}
                  {renta.handovers.length > 0 && (
                    <div className="renta-handovers-box">
                      {renta.handovers.map((h) => (
                        <div key={h.id} className="renta-handover-item">
                          <IconShieldCheck size={15} />
                          <div>
                            <strong>
                              Acta {h.type === "PICKUP" ? "Entrega (PICKUP)" : "Devolución (RETURN)"}
                            </strong>{" "}
                            · {h.mileage.toLocaleString("es-CO")} km · Combustible {h.fuelLevel}%
                            {h.observations && <p>{h.observations}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ALERTA SI HUBO INCIDENTE */}
                  {renta.status === "INCIDENT" && (
                    <div className="renta-incident-banner" role="alert">
                      <IconAlert size={17} />
                      <div>
                        <strong>
                          Incidente:{" "}
                          {renta.incidentType
                            ? ETIQUETAS_INCIDENTE[renta.incidentType]
                            : "Registrado"}
                        </strong>
                        {renta.incidentNotes && <p>{renta.incidentNotes}</p>}
                      </div>
                    </div>
                  )}

                  {/* BARRA DE ACCIONES CONTEXTUALES */}
                  <div className="renta-actions-bar">
                    {puedeFirmar && (
                      <button
                        type="button"
                        className="renta-btn renta-btn-primary"
                        onClick={() => abrirPanel(renta, "contrato")}
                      >
                        <IconDocument size={15} />
                        Leer y firmar contrato
                      </button>
                    )}

                    {puedePagar && (
                      <button
                        type="button"
                        className="renta-btn renta-btn-primary"
                        onClick={() => abrirPanel(renta, "pago")}
                      >
                        <IconCheckCircle size={15} />
                        Confirmar pago
                      </button>
                    )}

                    {puedePickup && (
                      <button
                        type="button"
                        className="renta-btn renta-btn-primary"
                        onClick={() => abrirPanel(renta, "pickup")}
                      >
                        <IconShieldCheck size={15} />
                        Registrar entrega (PICKUP)
                      </button>
                    )}

                    {puedeReturn && (
                      <button
                        type="button"
                        className="renta-btn renta-btn-primary"
                        onClick={() => abrirPanel(renta, "return")}
                      >
                        <IconCheckCircle size={15} />
                        Registrar devolución (RETURN)
                      </button>
                    )}

                    {renta.requiereEvaluacion && (
                      <button
                        type="button"
                        className="renta-btn renta-btn-primary"
                        onClick={() => abrirPanel(renta, "evaluar")}
                      >
                        <IconStar size={15} rellena />
                        Calificar experiencia
                      </button>
                    )}

                    {renta.status === "COMPLETED" && renta.yaCalifico && (
                      <span className="renta-done-note">
                        <IconCheckCircle size={15} /> Ya calificaste esta renta
                      </span>
                    )}

                    {puedeIncidente && (
                      <button
                        type="button"
                        className="renta-btn renta-btn-danger"
                        onClick={() => abrirPanel(renta, "incidente")}
                      >
                        <IconAlert size={15} />
                        Reportar incidente
                      </button>
                    )}

                    {puedeCancelar && (
                      <button
                        type="button"
                        className="renta-btn renta-btn-ghost"
                        onClick={() => abrirPanel(renta, "cancelar")}
                      >
                        Cancelar renta
                      </button>
                    )}
                  </div>

                  {/* PANELES INLINE DE ACCIÓN */}
                  {panelDeEsta === "contrato" && (
                    <div className="renta-action-panel">
                      <h3>Cláusulas del contrato de alquiler</h3>
                      <div className="renta-clausulas-list">
                        {clausulas.map((c) => (
                          <div key={c.id} className="renta-clausula-item">
                            <strong>{c.title}</strong>
                            <p>{c.body}</p>
                          </div>
                        ))}
                      </div>
                      <label className="renta-check-row">
                        <input
                          type="checkbox"
                          checked={aceptoClausulas}
                          onChange={(e) => setAceptoClausulas(e.target.checked)}
                        />
                        <span>
                          He leído y acepto todas las cláusulas vigentes para firmar este contrato
                          digital con respaldo SHA-256.
                        </span>
                      </label>
                      <input
                        type="text"
                        className="renta-input"
                        placeholder="Observaciones opcionales del contrato..."
                        value={obsContrato}
                        onChange={(e) => setObsContrato(e.target.value)}
                      />
                      {errorAccion && <p className="renta-error-inline">{errorAccion}</p>}
                      <div className="renta-panel-btns">
                        <button
                          type="button"
                          className="renta-btn renta-btn-primary"
                          disabled={enviando}
                          onClick={() => ejecutarFirmar(renta.id)}
                        >
                          {enviando ? "Firmando..." : "Firmar contrato"}
                        </button>
                        <button
                          type="button"
                          className="renta-btn renta-btn-ghost"
                          onClick={cerrarPanel}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}

                  {panelDeEsta === "pago" && (
                    <div className="renta-action-panel">
                      <h3>Confirmar pago (${renta.total.toLocaleString("es-CO")} COP)</h3>
                      <p className="renta-panel-help">
                        Selecciona el método de pago para confirmar la reserva (pasarela simulada en
                        entorno MVP).
                      </p>
                      <select
                        className="renta-input"
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                      >
                        {METODOS_PAGO.map((m) => (
                          <option key={m.valor} value={m.valor}>
                            {m.etiqueta}
                          </option>
                        ))}
                      </select>
                      {errorAccion && <p className="renta-error-inline">{errorAccion}</p>}
                      <div className="renta-panel-btns">
                        <button
                          type="button"
                          className="renta-btn renta-btn-primary"
                          disabled={enviando}
                          onClick={() => ejecutarPago(renta.id)}
                        >
                          {enviando ? "Procesando..." : "Pagar y reservar moto"}
                        </button>
                        <button
                          type="button"
                          className="renta-btn renta-btn-ghost"
                          onClick={cerrarPanel}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {(panelDeEsta === "pickup" || panelDeEsta === "return") && (
                    <div className="renta-action-panel">
                      <h3>
                        {panelDeEsta === "pickup"
                          ? "Acta de entrega inicial (PICKUP)"
                          : "Acta de devolución final (RETURN)"}
                      </h3>
                      <div className="renta-form-grid">
                        <label>
                          <span>Kilometraje actual (km)</span>
                          <input
                            type="number"
                            className="renta-input"
                            value={actaKm}
                            onChange={(e) => setActaKm(e.target.value)}
                          />
                        </label>
                        <label>
                          <span>Nivel de combustible (%)</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="renta-input"
                            value={actaFuel}
                            onChange={(e) => setActaFuel(e.target.value)}
                          />
                        </label>
                      </div>
                      <textarea
                        className="renta-input"
                        rows={2}
                        placeholder="Observaciones de estado mecánico, accesorios entregados o novedades..."
                        value={actaObs}
                        onChange={(e) => setActaObs(e.target.value)}
                      />
                      <label className="renta-file-field">
                        <span>Foto de inspección opcional (alimenta la galería de la moto)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) {
                              setActaFoto(null);
                              return;
                            }
                            const dataUrl = await leerArchivoComoDataUrl(f);
                            setActaFoto(dataUrl);
                          }}
                        />
                      </label>
                      {errorAccion && <p className="renta-error-inline">{errorAccion}</p>}
                      <div className="renta-panel-btns">
                        <button
                          type="button"
                          className="renta-btn renta-btn-primary"
                          disabled={enviando}
                          onClick={() => ejecutarActa(renta, panelDeEsta)}
                        >
                          {enviando
                            ? "Guardando acta..."
                            : panelDeEsta === "pickup"
                            ? "Confirmar entrega (iniciar renta)"
                            : "Confirmar devolución (cerrar renta)"}
                        </button>
                        <button
                          type="button"
                          className="renta-btn renta-btn-ghost"
                          onClick={cerrarPanel}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}

                  {panelDeEsta === "incidente" && (
                    <div className="renta-action-panel renta-action-panel--danger">
                      <h3>Reportar incidente de seguridad</h3>
                      <p className="renta-panel-help">
                        Esta acción bloquea la disponibilidad de la motocicleta y deja registro para
                        soporte administrativo.
                      </p>
                      <select
                        className="renta-input"
                        value={incidenteTipo}
                        onChange={(e) => setIncidenteTipo(e.target.value as TipoIncidente)}
                      >
                        {(Object.keys(ETIQUETAS_INCIDENTE) as TipoIncidente[]).map((k) => (
                          <option key={k} value={k}>
                            {ETIQUETAS_INCIDENTE[k]}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className="renta-input"
                        rows={3}
                        placeholder="Describe lugar, hora y detalles del incidente (mínimo 10 caracteres)..."
                        value={incidenteNotas}
                        onChange={(e) => setIncidenteNotas(e.target.value)}
                      />
                      {errorAccion && <p className="renta-error-inline">{errorAccion}</p>}
                      <div className="renta-panel-btns">
                        <button
                          type="button"
                          className="renta-btn renta-btn-danger-solid"
                          disabled={enviando}
                          onClick={() => ejecutarIncidente(renta.id)}
                        >
                          {enviando ? "Registrando..." : "Confirmar reporte de incidente"}
                        </button>
                        <button
                          type="button"
                          className="renta-btn renta-btn-ghost"
                          onClick={cerrarPanel}
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  )}

                  {panelDeEsta === "cancelar" && (
                    <div className="renta-action-panel">
                      <h3>¿Confirmas cancelar esta solicitud?</h3>
                      <p className="renta-panel-help">
                        Si ya estaba reservada, la motocicleta volverá a quedar disponible en el
                        catálogo inmediatamente.
                      </p>
                      {errorAccion && <p className="renta-error-inline">{errorAccion}</p>}
                      <div className="renta-panel-btns">
                        <button
                          type="button"
                          className="renta-btn renta-btn-danger-solid"
                          disabled={enviando}
                          onClick={() => ejecutarCancelar(renta.id)}
                        >
                          {enviando ? "Cancelando..." : "Sí, cancelar renta"}
                        </button>
                        <button
                          type="button"
                          className="renta-btn renta-btn-ghost"
                          onClick={cerrarPanel}
                        >
                          Mantener renta
                        </button>
                      </div>
                    </div>
                  )}

                  {panelDeEsta === "evaluar" && (
                    <div className="renta-action-panel">
                      <h3>Evaluación obligatoria (Doble ciego 30 min)</h3>
                      {renta.rolEnRenta === "RENTER" && (
                        <div className="renta-eval-group">
                          <label>Estado y desempeño de la moto</label>
                          <SelectorEstrellas
                            valor={ratingMoto}
                            onChange={setRatingMoto}
                            etiqueta="Calificación de la moto"
                          />
                        </div>
                      )}
                      <div className="renta-eval-group">
                        <label>
                          Trato y puntualidad de{" "}
                          {renta.rolEnRenta === "RENTER"
                            ? renta.propietario?.nombre ?? "propietario"
                            : renta.arrendatario.nombre}
                        </label>
                        <SelectorEstrellas
                          valor={ratingContraparte}
                          onChange={setRatingContraparte}
                          etiqueta="Calificación de la contraparte"
                        />
                      </div>
                      <textarea
                        className="renta-input"
                        rows={3}
                        placeholder="Comparte detalles útiles (obligatorio mínimo 10 caracteres si calificas con 3 estrellas o menos)..."
                        value={comentarioEval}
                        onChange={(e) => setComentarioEval(e.target.value)}
                      />
                      {errorAccion && <p className="renta-error-inline">{errorAccion}</p>}
                      <div className="renta-panel-btns">
                        <button
                          type="button"
                          className="renta-btn renta-btn-primary"
                          disabled={enviando}
                          onClick={() => ejecutarEvaluacion(renta)}
                        >
                          {enviando ? "Enviando..." : "Enviar calificación"}
                        </button>
                        <button
                          type="button"
                          className="renta-btn renta-btn-ghost"
                          onClick={cerrarPanel}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Rentas;
