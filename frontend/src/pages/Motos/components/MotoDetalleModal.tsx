import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconClose,
  IconDocument,
  IconGauge,
  IconMoto,
  IconPalette,
  IconShieldCheck,
  IconStar,
  IconUser,
} from "../../../components/Icons";
import {
  API_URL,
  obtenerGaleriaMoto,
  type GaleriaMotoApi,
} from "../../../services/motos.service";
import {
  obtenerResenasMoto,
  type ResenasMotoData,
} from "../../../services/resenas.service";
import { solicitarRentaApi } from "../../../services/rentas.service";
import {
  calcularDiasRenta,
  clasificarCilindraje,
  completarGaleriaCarrusel,
  construirGaleria,
  describirRecorrido,
  formatearFechaCorta,
  formatearKilometraje,
  formatearPrecioCOP,
  generarDescripcionMoto,
  inferirCategoria,
  type MotoCatalogo,
} from "../../../utils/moto.utils";
import MotoGaleria from "./MotoGaleria";
import "../MotoCatalogo.css";

interface MotoDetalleModalProps {
  moto: MotoCatalogo;
  fotoLocal: string | null;
  fotoRespaldo: string;
  haySesion: boolean;
  puedeSolicitarRenta: boolean;
  verificacionEnRevision: boolean;
  onCerrar: () => void;
}

function fechaHoy(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

/**
 * Ficha completa de la moto: galería, descripción, ficha técnica,
 * estado de la última inspección y calculadora de renta.
 */
function MotoDetalleModal({
  moto,
  fotoLocal,
  fotoRespaldo,
  haySesion,
  puedeSolicitarRenta,
  verificacionEnRevision,
  onCerrar,
}: MotoDetalleModalProps) {
  const [galeria, setGaleria] = useState<GaleriaMotoApi | null>(null);
  const [cargandoGaleria, setCargandoGaleria] = useState(true);
  const [resenasData, setResenasData] = useState<ResenasMotoData | null>(null);

  const hoy = fechaHoy();
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [reservaConfirmada, setReservaConfirmada] = useState<string | null>(null);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [enviandoReserva, setEnviandoReserva] = useState(false);

  async function manejarSolicitarRenta() {
    setErrorReserva(null);
    setEnviandoReserva(true);
    const res = await solicitarRentaApi(String(moto.id), fechaInicio, fechaFin);
    setEnviandoReserva(false);
    if (!res.ok) {
      setErrorReserva(res.mensaje);
      return;
    }
    setReservaConfirmada(
      `Solicitud creada para ${titulo} (${diasRenta} ${diasRenta === 1 ? "día" : "días"}). Continúa en Mis rentas para firmar el contrato y confirmar el pago.`
    );
  }

  // 1. Cargar galería y reseñas verificadas desde el backend
  useEffect(() => {
    let activo = true;

    async function cargar() {
      const [resultadoGaleria, resultadoResenas] = await Promise.all([
        obtenerGaleriaMoto(moto.id),
        obtenerResenasMoto(moto.id),
      ]);
      if (!activo) return;
      setGaleria(
        resultadoGaleria.ok && resultadoGaleria.data
          ? resultadoGaleria.data
          : null
      );
      setResenasData(resultadoResenas);
      setCargandoGaleria(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [moto.id]);

  // 2. Cerrar con Escape y bloquear el scroll del fondo mientras está abierta
  useEffect(() => {
    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", manejarEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", manejarEscape);
    };
  }, [onCerrar]);

  const fotosBase = construirGaleria({
    fotosPropietario: galeria?.fotosPropietario,
    fotosInspeccion: galeria?.fotosInspeccion,
    fotoPortada: moto.fotoPortada ?? null,
    fotoLocal,
    fotoPorDefecto: fotoRespaldo,
    apiBase: API_URL,
  });

  // Garantizamos al menos 8 fotos en el carrusel giratorio de la ficha
  const fotos = completarGaleriaCarrusel(fotosBase, fotoRespaldo, 8);

  const descripcion = generarDescripcionMoto(moto, galeria?.descripcionPropietario);
  const { segmento, licenciaRequerida } = clasificarCilindraje(moto.displacement);
  const categoria = inferirCategoria(moto);
  const titulo = `${moto.brand} ${moto.model}`;

  const diasRenta = calcularDiasRenta(fechaInicio, fechaFin);
  const tarifa = Number(moto.dailyRate) || 0;
  const total = tarifa * diasRenta;

  const ultimaInspeccion = formatearFechaCorta(galeria?.ultimaInspeccion);

  return (
    <div className="md-overlay" onClick={onCerrar}>
      <div
        className="md-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalles de ${titulo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="md-header">
          <div>
            <div className="md-header-tags">
              <span className="md-tag md-tag--accent">{categoria}</span>
              <span className="md-tag">{segmento}</span>
              {moto.licensePlate && <span className="md-tag">Placa {moto.licensePlate}</span>}
            </div>
            <h2>
              {titulo} <span className="md-year">{moto.year}</span>
            </h2>
            <p className="md-resumen">{descripcion.resumen}</p>
          </div>
          <button type="button" className="md-close" onClick={onCerrar} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        <div className="md-layout">
          {/* COLUMNA PRINCIPAL: galería + descripción + ficha técnica */}
          <div className="md-main">
            <MotoGaleria
              fotos={fotos}
              titulo={titulo}
              fotoRespaldo={fotoRespaldo}
              cargando={cargandoGaleria}
            />

            <div className={`md-inspection ${ultimaInspeccion ? "md-inspection--ok" : ""}`}>
              {ultimaInspeccion ? <IconCheckCircle size={17} /> : <IconClock size={17} />}
              <span>
                {ultimaInspeccion
                  ? `Fotos actualizadas tras la última devolución (${ultimaInspeccion}). La galería se renueva después de cada renta.`
                  : "Aún no hay rentas finalizadas: después de cada devolución se agregarán las fotos de inspección con el estado real de la moto."}
              </span>
            </div>

            <section className="md-section">
              <h3>Descripción</h3>
              {descripcion.parrafos.map((parrafo, i) => (
                <p key={i} className={i === 0 && galeria?.descripcionPropietario ? "md-owner-text" : ""}>
                  {parrafo}
                </p>
              ))}
              <ul className="md-highlights">
                {descripcion.destacados.map((item) => (
                  <li key={item}>
                    <IconCheckCircle size={15} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="md-section">
              <h3>Ficha técnica</h3>
              <dl className="md-specs">
                <div>
                  <dt><IconMoto size={15} /> Cilindraje</dt>
                  <dd>{moto.displacement} cc</dd>
                </div>
                <div>
                  <dt><IconGauge size={15} /> Kilometraje</dt>
                  <dd>{formatearKilometraje(moto.KM)}</dd>
                </div>
                <div>
                  <dt><IconCalendar size={15} /> Modelo</dt>
                  <dd>{moto.year}</dd>
                </div>
                <div>
                  <dt><IconPalette size={15} /> Color</dt>
                  <dd>{moto.color || "Sin especificar"}</dd>
                </div>
                <div>
                  <dt><IconShieldCheck size={15} /> Licencia</dt>
                  <dd>{licenciaRequerida}</dd>
                </div>
                <div>
                  <dt><IconDocument size={15} /> Estado</dt>
                  <dd>{describirRecorrido(moto.KM)}</dd>
                </div>
              </dl>
            </section>

            {/* PERFIL PÚBLICO DEL PROPIETARIO + RESEÑAS VERIFICADAS (FASE 6) */}
            {resenasData && (
              <section className="md-section">
                <div className="md-owner-banner">
                  <div className="md-owner-info">
                    <span className="md-owner-avatar">
                      <IconUser size={18} />
                    </span>
                    <div>
                      <strong>
                        Propietario: {resenasData.propietarioNombre || "Carlos M."}
                      </strong>
                      <span>
                        Identidad verificada · Reputación pública auditable
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/usuario/${resenasData.propietarioId || "demo-propietario"}`}
                    className="md-owner-link"
                    onClick={onCerrar}
                  >
                    Ver perfil público →
                  </Link>
                </div>

                <div className="md-reviews-header">
                  <h3>Opiniones verificadas</h3>
                  <span className="md-rating-pill">
                    <IconStar size={14} rellena />
                    <strong>
                      {resenasData.resumen.total > 0
                        ? resenasData.resumen.promedio.toFixed(1)
                        : "Nueva"}
                    </strong>
                    <span>({resenasData.resumen.total})</span>
                  </span>
                </div>

                {resenasData.resenas.length === 0 ? (
                  <p>
                    Esta motocicleta aún no tiene reseñas visibles. Las opiniones
                    se publican tras rentas completadas (doble ciego a 30 min).
                  </p>
                ) : (
                  <div className="md-reviews-list">
                    {resenasData.resenas.map((rev) => (
                      <article key={rev.id} className="resena-item-card">
                        <div className="md-review-top">
                          <Link
                            to={`/usuario/${rev.autor.id}`}
                            className="md-review-author"
                            onClick={onCerrar}
                          >
                            {rev.autor.nombrePublico}
                          </Link>
                          <span className="md-review-stars">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <IconStar key={n} size={13} rellena={n <= rev.rating} />
                            ))}
                          </span>
                        </div>
                        {rev.comment && <p className="md-review-text">{rev.comment}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* COLUMNA LATERAL: reserva */}
          <aside className="md-booking">
            <div className="md-booking-price">
              <span className="md-price">{formatearPrecioCOP(tarifa)}</span>
              <span className="md-price-unit">por día</span>
            </div>

            <label className="md-field">
              <span>Fecha de recogida</span>
              <input
                type="date"
                min={hoy}
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  if (e.target.value > fechaFin) setFechaFin(e.target.value);
                }}
              />
            </label>
            <label className="md-field">
              <span>Fecha de devolución</span>
              <input
                type="date"
                min={fechaInicio}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </label>

            <div className="md-summary">
              <div>
                <span>{formatearPrecioCOP(tarifa)} x {diasRenta} {diasRenta === 1 ? "día" : "días"}</span>
                <span>{formatearPrecioCOP(total)}</span>
              </div>
              <div className="md-summary-total">
                <span>Total estimado</span>
                <strong>{formatearPrecioCOP(total)} COP</strong>
              </div>
            </div>

            {!haySesion ? (
              <div className="md-booking-note">
                <p>Inicia sesión para reservar esta moto.</p>
                <Link to="/login" className="md-btn-primary">Iniciar sesión</Link>
              </div>
            ) : !puedeSolicitarRenta ? (
              <div className="md-booking-note">
                <p>
                  {verificacionEnRevision
                    ? "Tu verificación de arrendatario está en revisión. Podrás reservar cuando sea aprobada."
                    : "Necesitas tu perfil de arrendatario verificado para reservar."}
                </p>
                {!verificacionEnRevision && (
                  <Link to="/verificar-renter" className="md-btn-primary">
                    Verificarme como Arrendatario
                  </Link>
                )}
              </div>
            ) : reservaConfirmada ? (
              <div className="md-booking-success">
                <IconCheckCircle size={18} />
                <div>
                  <span>{reservaConfirmada}</span>
                  <div style={{ marginTop: 10 }}>
                    <Link to="/rentas" className="md-btn-primary" onClick={onCerrar}>
                      Ir a Mis rentas →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {errorReserva && (
                  <p className="md-booking-error" role="alert" style={{ color: "#dc2626", fontSize: 13, margin: "0 0 10px" }}>
                    {errorReserva}
                  </p>
                )}
                <button
                  type="button"
                  className="md-btn-primary"
                  disabled={enviandoReserva}
                  onClick={manejarSolicitarRenta}
                >
                  {enviandoReserva ? "Creando solicitud..." : "Solicitar renta"}
                </button>
              </>
            )}

            <p className="md-booking-foot">
              Se realiza inspección con fotos al entregar y al devolver la moto.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default MotoDetalleModal;
