import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  IconCheckCircle,
  IconClock,
  IconMoto,
  IconShieldCheck,
  IconStar,
} from "../../components/Icons";
import {
  obtenerPerfilPublico,
  type PerfilPublicoData,
  type ResenaPublica,
} from "../../services/resenas.service";
import { formatearFechaCorta, formatearPrecioCOP } from "../../utils/moto.utils";
import "./PerfilPublico.css";

function EstrellasLectura({ valor }: { valor: number }) {
  return (
    <span className="pp-stars" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar key={n} size={15} rellena={n <= Math.round(valor)} />
      ))}
    </span>
  );
}

function ListaResenas({ items, vacio }: { items: ResenaPublica[]; vacio: string }) {
  if (items.length === 0) {
    return <p className="pp-empty">{vacio}</p>;
  }

  return (
    <div className="pp-reviews-list">
      {items.map((resena) => (
        <article key={resena.id} className="resena-item-card">
          <div className="pp-review-top">
            <div>
              <Link to={`/usuario/${resena.autor.id}`} className="pp-review-author">
                {resena.autor.nombrePublico}
              </Link>
              <span className="pp-review-date">
                {formatearFechaCorta(resena.createdAt)}
              </span>
            </div>
            <EstrellasLectura valor={resena.rating} />
          </div>
          {resena.comment && <p className="pp-review-comment">{resena.comment}</p>}
        </article>
      ))}
    </div>
  );
}

/**
 * Perfil Público de Reputación (/usuario/:id).
 * Muestra únicamente información segura: nombre público, antigüedad, insignias
 * verificadas, reputación y reseñas verificadas (nunca expone datos privados).
 */
function PerfilPublico() {
  const { id } = useParams();
  const [perfil, setPerfil] = useState<PerfilPublicoData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"propietario" | "arrendatario">("propietario");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const data = await obtenerPerfilPublico(id || "demo-propietario");
      if (!activo) return;
      setPerfil(data);
      setCargando(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [id]);

  if (cargando) {
    return (
      <div className="perfil-page">
        <main className="perfil-content">
          <p className="pp-loading">Cargando perfil público...</p>
        </main>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="perfil-page">
        <main className="perfil-content">
          <section className="perfil-publico-card">
            <h1>Perfil no encontrado</h1>
            <Link to="/motos" className="perfil-primary-btn">
              Volver al catálogo
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const inicial = perfil.nombrePublico.charAt(0).toUpperCase();

  return (
    <div className="perfil-page">
      <main className="perfil-content">
        <section className="perfil-publico-card pp-header">
          <div className="avatar-circle">{inicial}</div>
          <div className="pp-header-info">
            <div className="pp-badges">
              {perfil.verificaciones.esPropietarioVerificado && (
                <span className="pp-verified-pill">
                  <IconShieldCheck size={14} /> Propietario verificado
                </span>
              )}
              {perfil.verificaciones.esArrendatarioVerificado && (
                <span className="pp-verified-pill pp-verified-pill--renter">
                  <IconCheckCircle size={14} /> Arrendatario verificado
                </span>
              )}
            </div>
            <h1>{perfil.nombrePublico}</h1>
            <p className="pp-member-since">
              Miembro de MotoRent desde {formatearFechaCorta(perfil.miembroDesde)}
            </p>
          </div>
          <div className="pp-score-box">
            <div className="pp-score-num">
              <IconStar size={20} rellena />
              <strong>
                {perfil.estadisticas.reputacionGeneral.total > 0
                  ? perfil.estadisticas.reputacionGeneral.promedio.toFixed(1)
                  : "Nuevo"}
              </strong>
            </div>
            <span>
              {perfil.estadisticas.reputacionGeneral.total} reseñas verificadas
            </span>
          </div>
        </section>

        <div className="pp-policy-note">
          <IconClock size={16} />
          <span>
            Todas las opiniones provienen de rentas completadas bajo política de{" "}
            <strong>doble ciego (30 minutos)</strong>. Por privacidad nunca se
            muestran correo, teléfono ni documentos de identidad.
          </span>
        </div>

        <section className="pp-stats-row">
          <div className="perfil-publico-card pp-stat">
            <span>Como Propietario</span>
            <strong>
              {perfil.estadisticas.reputacionPropietario.total > 0
                ? `${perfil.estadisticas.reputacionPropietario.promedio.toFixed(1)} / 5`
                : "Sin reseñas"}
            </strong>
          </div>
          <div className="perfil-publico-card pp-stat">
            <span>Como Arrendatario</span>
            <strong>
              {perfil.estadisticas.reputacionArrendatario.total > 0
                ? `${perfil.estadisticas.reputacionArrendatario.promedio.toFixed(1)} / 5`
                : "Sin reseñas"}
            </strong>
          </div>
          <div className="perfil-publico-card pp-stat">
            <span>Rentas completadas</span>
            <strong>{perfil.estadisticas.rentasComoArrendatario}</strong>
          </div>
        </section>

        <section className="perfil-publico-card pp-reviews-section">
          <div className="pp-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "propietario"}
              className={`tab-btn ${tab === "propietario" ? "active" : ""}`}
              onClick={() => setTab("propietario")}
            >
              Reseñas como Propietario ({perfil.resenasComoPropietario.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "arrendatario"}
              className={`tab-btn ${tab === "arrendatario" ? "active" : ""}`}
              onClick={() => setTab("arrendatario")}
            >
              Reseñas como Arrendatario ({perfil.resenasComoArrendatario.length})
            </button>
          </div>

          {tab === "propietario" ? (
            <ListaResenas
              items={perfil.resenasComoPropietario}
              vacio="Aún no tiene reseñas visibles como propietario."
            />
          ) : (
            <ListaResenas
              items={perfil.resenasComoArrendatario}
              vacio="Aún no tiene reseñas visibles como arrendatario."
            />
          )}
        </section>

        {perfil.motos.length > 0 && (
          <section className="perfil-publico-card pp-motos-section">
            <h2>
              <IconMoto size={18} /> Motocicletas publicadas
            </h2>
            <div className="pp-motos-grid">
              {perfil.motos.map((m) => (
                <Link key={m.id} to="/motos" className="pp-moto-chip">
                  <strong>
                    {m.brand} {m.model} ({m.year})
                  </strong>
                  <span>
                    {m.displacement} cc · {formatearPrecioCOP(m.dailyRate)}/día
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default PerfilPublico;
