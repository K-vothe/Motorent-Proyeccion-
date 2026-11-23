import { useEffect, useState } from "react";
import { IconCamera, IconChevronLeft, IconChevronRight } from "../../../components/Icons";
import { moverIndiceCircular, type FotoVista } from "../../../utils/moto.utils";

type FiltroGaleria = "TODAS" | "PROPIETARIO" | "INSPECCION";

interface MotoGaleriaProps {
  fotos: FotoVista[];
  titulo: string;
  fotoRespaldo: string;
  cargando: boolean;
}

const INTERVALO_GIRO_MS = 4000;

/**
 * Carrusel giratorio de fotografías dentro de la ficha de la moto.
 *
 * Características:
 * - Desplazamiento circular continuo (pasa de la última foto a la primera).
 * - Giro automático cada 4 segundos, con pausa automática al pasar el cursor
 *   y botón manual para pausar o reanudar.
 * - Navegación con flechas, miniaturas y teclado (ArrowLeft / ArrowRight).
 */
function MotoGaleria({ fotos, titulo, fotoRespaldo, cargando }: MotoGaleriaProps) {
  const [indice, setIndice] = useState(0);
  const [filtro, setFiltro] = useState<FiltroGaleria>("TODAS");
  const [autoGiro, setAutoGiro] = useState(true);
  const [cursorEncima, setCursorEncima] = useState(false);

  const hayPropietario = fotos.some((f) => f.origen === "PROPIETARIO");
  const hayInspeccion = fotos.some((f) => f.origen === "INSPECCION");
  const mostrarFiltros = hayPropietario && hayInspeccion;

  const fotosVisibles =
    filtro === "TODAS" ? fotos : fotos.filter((foto) => foto.origen === filtro);
  const total = fotosVisibles.length;
  const indiceSeguro = total > 0 ? Math.min(indice, total - 1) : 0;
  const actual = fotosVisibles[indiceSeguro];

  // Giro automático circular (se pausa si el usuario pasa el mouse o lo desactiva)
  useEffect(() => {
    if (!autoGiro || cursorEncima || total <= 1) return;

    const temporizador = window.setInterval(() => {
      setIndice((prev) => moverIndiceCircular(Math.min(prev, total - 1), 1, total));
    }, INTERVALO_GIRO_MS);

    return () => window.clearInterval(temporizador);
  }, [autoGiro, cursorEncima, total]);

  // Navegación con flechas del teclado
  useEffect(() => {
    if (total <= 1) return;

    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "ArrowRight") {
        setIndice((prev) => moverIndiceCircular(Math.min(prev, total - 1), 1, total));
      }
      if (evento.key === "ArrowLeft") {
        setIndice((prev) => moverIndiceCircular(Math.min(prev, total - 1), -1, total));
      }
    }

    window.addEventListener("keydown", manejarTeclado);
    return () => window.removeEventListener("keydown", manejarTeclado);
  }, [total]);

  function cambiarFiltro(nuevo: FiltroGaleria) {
    setFiltro(nuevo);
    setIndice(0);
  }

  if (!actual) {
    return <div className="mg-empty">No hay fotos disponibles.</div>;
  }

  return (
    <div
      className="mg-gallery"
      onMouseEnter={() => setCursorEncima(true)}
      onMouseLeave={() => setCursorEncima(false)}
    >
      <div className="mg-main">
        {/* Pista horizontal del carrusel giratorio */}
        <div
          className="mg-track"
          style={{ transform: `translateX(-${indiceSeguro * 100}%)` }}
        >
          {fotosVisibles.map((foto, i) => (
            <div key={`${foto.src}-${i}`} className="mg-slide">
              <img
                src={foto.src}
                alt={`${titulo} — ${foto.etiqueta}`}
                style={
                  foto.encuadre
                    ? { objectPosition: foto.encuadre, transform: "scale(1.12)" }
                    : undefined
                }
                onError={(evento) => {
                  if (evento.currentTarget.src !== fotoRespaldo) {
                    evento.currentTarget.src = fotoRespaldo;
                  }
                }}
              />
            </div>
          ))}
        </div>

        <span className={`mg-origin mg-origin--${actual.origen.toLowerCase()}`}>
          <IconCamera size={13} />
          {actual.etiqueta}
        </span>

        {total > 1 && (
          <>
            <button
              type="button"
              className="mg-nav mg-nav--prev"
              aria-label="Foto anterior"
              onClick={() => setIndice(moverIndiceCircular(indiceSeguro, -1, total))}
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              className="mg-nav mg-nav--next"
              aria-label="Foto siguiente"
              onClick={() => setIndice(moverIndiceCircular(indiceSeguro, 1, total))}
            >
              <IconChevronRight />
            </button>
            <span className="mg-counter">
              {indiceSeguro + 1} / {total}
            </span>
          </>
        )}

        {cargando && <span className="mg-loading">Actualizando galería...</span>}
      </div>

      {/* Barra de filtros por origen + control de giro automático */}
      <div className="mg-controls-bar">
        {mostrarFiltros ? (
          <div className="mg-filters" role="tablist" aria-label="Filtrar fotos">
            {(
              [
                ["TODAS", `Todas (${fotos.length})`],
                ["PROPIETARIO", "Propietario"],
                ["INSPECCION", "Inspección"],
              ] as [FiltroGaleria, string][]
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={filtro === valor}
                className={`mg-filter ${filtro === valor ? "active" : ""}`}
                onClick={() => cambiarFiltro(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        {total > 1 && (
          <button
            type="button"
            className="mg-autoplay-btn"
            onClick={() => setAutoGiro((prev) => !prev)}
          >
            {autoGiro ? "Pausar giro" : "Reanudar giro"}
          </button>
        )}
      </div>

      {/* Miniaturas navegables (8+ vistas) */}
      {total > 1 && (
        <div className="mg-thumbs" aria-label="Miniaturas de la galería">
          {fotosVisibles.map((foto, i) => (
            <button
              key={`${foto.src}-thumb-${i}`}
              type="button"
              className={`mg-thumb ${i === indiceSeguro ? "active" : ""}`}
              onClick={() => setIndice(i)}
              aria-label={`Ver ${foto.etiqueta}`}
            >
              <img
                src={foto.src}
                alt=""
                loading="lazy"
                style={
                  foto.encuadre
                    ? { objectPosition: foto.encuadre, transform: "scale(1.12)" }
                    : undefined
                }
              />
              <span className="mg-thumb-num">{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MotoGaleria;
