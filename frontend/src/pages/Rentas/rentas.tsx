import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IconAlert,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconStar,
} from "../../components/Icons";
import { enviarResena } from "../../services/resenas.service";
import {
  etiquetaCalificacion,
  validarFormularioResena,
} from "../../utils/resenas.utils";
import "./rentas.css";

interface RentaItem {
  id: string;
  moto: string;
  propietarioId: string;
  propietarioNombre: string;
  startDate: string;
  endDate: string;
  total: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}

// Datos de referencia mientras el equipo conecta el historial real de Rental
const rentasEjemplo: RentaItem[] = [
  {
    id: "demo-renta-1",
    moto: "Yamaha MT-03",
    propietarioId: "demo-propietario",
    propietarioNombre: "Carlos M.",
    startDate: "2026-09-16",
    endDate: "2026-09-22",
    total: 510000,
    status: "ACTIVE",
  },
  {
    id: "demo-renta-2",
    moto: "Bajaj Pulsar NS160",
    propietarioId: "demo-propietario",
    propietarioNombre: "Carlos M.",
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    total: 200000,
    status: "COMPLETED",
  },
  {
    id: "demo-renta-3",
    moto: "TVS Raider 125",
    propietarioId: "demo-propietario",
    propietarioNombre: "Carlos M.",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    total: 76000,
    status: "CANCELLED",
  },
];

const etiquetasEstado: Record<string, { texto: string; clase: string }> = {
  PENDING: { texto: "Pendiente", clase: "status-pending" },
  ACTIVE: { texto: "Activa", clase: "status-active" },
  COMPLETED: { texto: "Completada", clase: "status-completed" },
  CANCELLED: { texto: "Cancelada", clase: "status-cancelled" },
};

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
  const rentaActiva = rentasEjemplo.find((r) => r.status === "ACTIVE");
  const historial = rentasEjemplo.filter((r) => r.status !== "ACTIVE");

  // Estado de calificación obligatoria (doble ciego a 30 min)
  const [evaluandoId, setEvaluandoId] = useState<string | null>(null);
  const [ratingMoto, setRatingMoto] = useState(5);
  const [ratingOwner, setRatingOwner] = useState(5);
  const [comentario, setComentario] = useState("");
  const [errorEval, setErrorEval] = useState("");
  const [enviandoEval, setEnviandoEval] = useState(false);
  const [rentasCalificadas, setRentasCalificadas] = useState<Record<string, string>>({});

  const pendientesObligatorias = historial.filter(
    (r) => r.status === "COMPLETED" && !rentasCalificadas[r.id]
  );

  async function enviarEvaluacion(renta: RentaItem) {
    setErrorEval("");
    const errMoto = validarFormularioResena(ratingMoto, comentario);
    const errOwner = validarFormularioResena(ratingOwner, comentario);
    if (errMoto || errOwner) {
      setErrorEval(errMoto || errOwner || "Verifica tu calificación.");
      return;
    }

    setEnviandoEval(true);
    const [resMoto, resOwner] = await Promise.all([
      enviarResena({
        rentalId: renta.id,
        targetType: "MOTO",
        rating: ratingMoto,
        comment: comentario.trim() || undefined,
      }),
      enviarResena({
        rentalId: renta.id,
        targetType: "OWNER",
        rating: ratingOwner,
        comment: comentario.trim() || undefined,
      }),
    ]);
    setEnviandoEval(false);

    if (!resMoto.ok || !resOwner.ok) {
      setErrorEval(resMoto.mensaje || resOwner.mensaje);
      return;
    }

    setRentasCalificadas((prev) => ({
      ...prev,
      [renta.id]: resMoto.mensaje,
    }));
    setEvaluandoId(null);
    setComentario("");
  }

  return (
    <div className="rentas-page">
      <main className="rentas-content">
        <div className="rentas-header">
          <div>
            <span className="rentas-tag">HISTORIAL DE ARRENDATARIO</span>
            <h1>Mis rentas</h1>
            <p className="rentas-lead">
              Consulta tu alquiler en curso, califica rentas completadas y revisa
              tu historial.
            </p>
          </div>
          <Link to="/motos" className="rentas-cta-link">
            Explorar catálogo →
          </Link>
        </div>

        {/* AVISO DE EVALUACIÓN OBLIGATORIA ANTES DE LA SIGUIENTE RENTA */}
        {pendientesObligatorias.length > 0 && (
          <div className="rentas-pending-eval" role="status">
            <IconAlert size={18} />
            <div>
              <strong>
                Tienes {pendientesObligatorias.length}{" "}
                {pendientesObligatorias.length === 1
                  ? "calificación obligatoria pendiente"
                  : "calificaciones obligatorias pendientes"}
              </strong>
              <p>
                Completa la evaluación de tus rentas finalizadas antes de
                solicitar una nueva motocicleta. Doble ciego activo: las reseñas
                se revelan cuando ambos califican o a los 30 minutos.
              </p>
            </div>
          </div>
        )}

        <div className="rentas-demo-notice">
          <IconCalendar size={16} />
          <span>
            Vista de referencia: el historial en vivo se sincronizará con la
            tabla <code>Rental</code> y <code>Review</code> al aplicar las
            migraciones en PostgreSQL.
          </span>
        </div>

        {rentaActiva && (
          <section className="rentas-card active-card">
            <span
              className={`status-badge ${etiquetasEstado[rentaActiva.status].clase}`}
            >
              {etiquetasEstado[rentaActiva.status].texto}
            </span>

            <h2>{rentaActiva.moto}</h2>

            <div className="rentas-dates">
              <div>
                <span className="rentas-date-label">Inicio</span>
                <span className="rentas-date-value">
                  {formatearFecha(rentaActiva.startDate)}
                </span>
              </div>
              <div>
                <span className="rentas-date-label">Devolución</span>
                <span className="rentas-date-value">
                  {formatearFecha(rentaActiva.endDate)}
                </span>
              </div>
              <div>
                <span className="rentas-date-label">Propietario</span>
                <Link
                  to={`/usuario/${rentaActiva.propietarioId}`}
                  className="rentas-owner-link"
                >
                  {rentaActiva.propietarioNombre}
                </Link>
              </div>
              <div>
                <span className="rentas-date-label">Total</span>
                <span className="rentas-date-value">
                  ${rentaActiva.total.toLocaleString("es-CO")} COP
                </span>
              </div>
            </div>
          </section>
        )}

        <h3 className="rentas-subtitle">Historial de viajes</h3>

        {historial.length === 0 ? (
          <p className="rentas-empty">Todavía no tienes rentas anteriores.</p>
        ) : (
          <div className="rentas-list">
            {historial.map((renta) => {
              const yaCalificada = Boolean(rentasCalificadas[renta.id]);
              const abierta = evaluandoId === renta.id;

              return (
                <div key={renta.id} className="rentas-item-wrap">
                  <div className="rentas-row">
                    <div className="rentas-row-main">
                      <p className="rentas-row-moto">{renta.moto}</p>
                      <p className="rentas-row-fechas">
                        {formatearFecha(renta.startDate)} →{" "}
                        {formatearFecha(renta.endDate)} · Propietario:{" "}
                        <Link
                          to={`/usuario/${renta.propietarioId}`}
                          className="rentas-inline-link"
                        >
                          {renta.propietarioNombre}
                        </Link>
                      </p>
                    </div>

                    <span
                      className={`status-badge ${etiquetasEstado[renta.status].clase}`}
                    >
                      {etiquetasEstado[renta.status].texto}
                    </span>

                    <p className="rentas-row-total">
                      ${renta.total.toLocaleString("es-CO")} COP
                    </p>

                    {renta.status === "COMPLETED" && !yaCalificada && (
                      <button
                        type="button"
                        className="rentas-eval-btn"
                        onClick={() => {
                          setEvaluandoId(abierta ? null : renta.id);
                          setErrorEval("");
                        }}
                      >
                        {abierta ? "Cerrar" : "Calificar renta"}
                      </button>
                    )}

                    {yaCalificada && (
                      <span className="rentas-rated-pill">
                        <IconCheckCircle size={14} /> Calificada
                      </span>
                    )}
                  </div>

                  {yaCalificada && (
                    <div className="rentas-rated-notice">
                      <IconClock size={14} />
                      <span>{rentasCalificadas[renta.id]}</span>
                    </div>
                  )}

                  {abierta && (
                    <div className="rentas-eval-card">
                      <h4>Evaluación de la experiencia (obligatoria)</h4>
                      <p className="rentas-eval-hint">
                        Tu opinión es confidencial hasta que el propietario
                        también califique o pasen 30 minutos (doble ciego).
                      </p>

                      <div className="rentas-eval-grid">
                        <div>
                          <span className="rentas-eval-label">
                            Calificación de la moto ({renta.moto})
                          </span>
                          <SelectorEstrellas
                            valor={ratingMoto}
                            onChange={setRatingMoto}
                            etiqueta="Calificación de la motocicleta"
                          />
                        </div>

                        <div>
                          <span className="rentas-eval-label">
                            Calificación del propietario ({renta.propietarioNombre})
                          </span>
                          <SelectorEstrellas
                            valor={ratingOwner}
                            onChange={setRatingOwner}
                            etiqueta="Calificación del propietario"
                          />
                        </div>
                      </div>

                      <label className="rentas-eval-comment-label">
                        <span>
                          Comentario{" "}
                          {ratingMoto <= 3 || ratingOwner <= 3
                            ? "(obligatorio, mínimo 10 caracteres)"
                            : "(opcional)"}
                        </span>
                        <textarea
                          rows={2}
                          maxLength={600}
                          placeholder="Cuenta cómo encontraste la moto y la puntualidad en la entrega."
                          value={comentario}
                          onChange={(e) => setComentario(e.target.value)}
                        />
                      </label>

                      {errorEval && (
                        <p className="rentas-eval-error" role="alert">
                          {errorEval}
                        </p>
                      )}

                      <div className="rentas-eval-actions">
                        <button
                          type="button"
                          className="rentas-eval-submit"
                          disabled={enviandoEval}
                          onClick={() => enviarEvaluacion(renta)}
                        >
                          {enviandoEval
                            ? "Enviando evaluación..."
                            : "Enviar calificación"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Rentas;
