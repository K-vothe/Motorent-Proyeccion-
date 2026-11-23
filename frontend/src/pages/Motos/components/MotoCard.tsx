import { IconGauge, IconMoto, IconShieldCheck } from "../../../components/Icons";
import {
  clasificarCilindraje,
  formatearKilometraje,
  formatearPrecioCOP,
  inferirCategoria,
  type MotoCatalogo,
} from "../../../utils/moto.utils";
import "../MotoCatalogo.css";

interface MotoCardProps {
  moto: MotoCatalogo;
  fotoPortada: string;
  fotoRespaldo: string;
  onVerDetalle: (moto: MotoCatalogo) => void;
}

/**
 * Tarjeta compacta del catálogo: solo lo esencial para comparar rápido
 * (foto, cilindraje, kilometraje, licencia y precio). La información
 * completa y la galería se abren en la ficha de detalle.
 */
function MotoCard({ moto, fotoPortada, fotoRespaldo, onVerDetalle }: MotoCardProps) {
  const { licenciaRequerida } = clasificarCilindraje(moto.displacement);
  const categoria = inferirCategoria(moto);
  const titulo = `${moto.brand} ${moto.model}`;

  return (
    <article className="mc-card">
      <button
        type="button"
        className="mc-media"
        onClick={() => onVerDetalle(moto)}
        aria-label={`Ver detalles de ${titulo}`}
      >
        <img
          src={fotoPortada}
          alt={titulo}
          loading="lazy"
          onError={(evento) => {
            if (evento.currentTarget.src !== fotoRespaldo) {
              evento.currentTarget.src = fotoRespaldo;
            }
          }}
        />
        <span className="mc-category">{categoria}</span>
      </button>

      <div className="mc-body">
        <div className="mc-title-row">
          <h3>{titulo}</h3>
          <span className="mc-year">{moto.year}</span>
        </div>
        {moto.color && <p className="mc-subtitle">{moto.color}</p>}

        <ul className="mc-specs" aria-label="Especificaciones principales">
          <li>
            <IconMoto size={15} />
            <span>{moto.displacement} cc</span>
          </li>
          <li>
            <IconGauge size={15} />
            <span>{formatearKilometraje(moto.KM)}</span>
          </li>
          <li>
            <IconShieldCheck size={15} />
            <span>Lic. {licenciaRequerida}</span>
          </li>
        </ul>

        <div className="mc-footer">
          <div>
            <span className="mc-price">{formatearPrecioCOP(moto.dailyRate)}</span>
            <span className="mc-price-unit"> / día</span>
          </div>
          <button type="button" className="mc-button" onClick={() => onVerDetalle(moto)}>
            Ver detalles
          </button>
        </div>
      </div>
    </article>
  );
}

export default MotoCard;
