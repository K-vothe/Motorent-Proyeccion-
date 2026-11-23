// frontend/src/pages/Motos/Motos.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import motoDefaultImg from "../../assets/imagenes/moto1.jpeg";
import { IconAlert, IconClose, IconSearch, IconSliders } from "../../components/Icons";
import { EmptyState, SkeletonMotoGrid } from "../../components/UiFeedback";
import { leerUsuarioLocal } from "../../services/dashboard.service";
import { API_URL, obtenerCatalogoMotos } from "../../services/motos.service";
import { obtenerEstadoVerificacionLocal } from "../../services/verificacion.service";
import {
  filtrarYOrdenarMotos,
  paginarLista,
  resolverUrlFoto,
  type MotoCatalogo,
  type OrdenCatalogo,
  type RangoCilindraje,
} from "../../utils/moto.utils";
import {
  EVENTO_PREFERENCIAS,
  leerPreferencias,
  type TamanoPaginaCatalogo,
} from "../../utils/preferencias.storage";
import { leerPreviewDev } from "../../utils/rolActivo.storage";
import { obtenerResumenRoles } from "../../utils/roles.utils";
import MotoCard from "./components/MotoCard";
import MotoDetalleModal from "./components/MotoDetalleModal";
import "./Motos.css";

// Motos de respaldo si el backend está apagado o la BD local aún no tiene registros
const motosRespaldo: MotoCatalogo[] = [
  {
    id: "ejemplo-1",
    brand: "Yamaha",
    model: "MT-03",
    year: 2023,
    displacement: 321,
    KM: 8400,
    color: "Negro Mate",
    dailyRate: 85000,
    licensePlate: "KTM45G",
    category: "Viaje",
    description:
      "Excelente para carretera y escapadas de fin de semana. Mantenimiento al día y entrega con inspección fotográfica.",
  },
  {
    id: "ejemplo-2",
    brand: "Honda",
    model: "CB160F",
    year: 2024,
    displacement: 160,
    KM: 3200,
    color: "Rojo Perlado",
    dailyRate: 45000,
    licensePlate: "HND16B",
    category: "Uso diario",
    description:
      "Ágil en tráfico urbano, bajo consumo de combustible y mantenimiento verificado tras cada renta.",
  },
  {
    id: "ejemplo-3",
    brand: "TVS",
    model: "Raider 125",
    year: 2025,
    displacement: 125,
    KM: 1900,
    color: "Azul Grafito",
    dailyRate: 38000,
    licensePlate: "TVS12C",
    category: "Trabajo",
    description:
      "Económica, ligera y apta para licencia A1. Ideal para recorridos urbanos diarios.",
  },
];

const ETIQUETAS_RANGO_CC: Record<RangoCilindraje, string> = {
  TODOS: "Todos los cc",
  HASTA_125: "Hasta 125 cc (A1)",
  "150_250": "150 – 250 cc",
  MAS_300: "300+ cc",
};

function obtenerFotoLocalPorPlaca(placa?: string): string | null {
  if (!placa) return null;
  return localStorage.getItem(`foto_moto_${placa.toUpperCase()}`);
}

function Motos() {
  const [searchParams] = useSearchParams();
  const categoriaInicial = (() => {
    const raw = searchParams.get("categoria");
    return raw === "Viaje" || raw === "Uso diario" || raw === "Trabajo" ? raw : "Todas";
  })();

  const [motos, setMotos] = useState<MotoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros (panel de precisión oculto por defecto hasta que el usuario lo despliegue)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [rangoCc, setRangoCc] = useState<RangoCilindraje>("TODOS");
  const [ccTexto, setCcTexto] = useState("");
  const [orden, setOrden] = useState<OrdenCatalogo>("RELEVANCIA");
  const [porPagina, setPorPagina] = useState<TamanoPaginaCatalogo>(
    () => leerPreferencias().motosPorPagina
  );
  const [pagina, setPagina] = useState(1);

  const [motoSeleccionada, setMotoSeleccionada] = useState<MotoCatalogo | null>(
    null
  );

  const token = localStorage.getItem("token");
  const haySesion = Boolean(token && token !== "undefined" && token !== "null");

  const previewDev = import.meta.env.DEV ? leerPreviewDev() : "REAL";
  const resumenUsuario = haySesion
    ? previewDev === "RENTER" || previewDev === "DUAL"
      ? obtenerResumenRoles({
          role: "RENTER",
          renter: { estadoVerificacion: "APPROVED" },
        })
      : previewDev === "ADMIN"
      ? obtenerResumenRoles({ role: "ADMIN" })
      : previewDev === "OWNER"
      ? obtenerResumenRoles({
          role: "OWNER",
          owner: { estadoVerificacion: "APPROVED" },
        })
      : previewDev === "USER"
      ? obtenerResumenRoles(
          { role: "USER" },
          obtenerEstadoVerificacionLocal("renter"),
          obtenerEstadoVerificacionLocal("owner")
        )
      : obtenerResumenRoles(
          leerUsuarioLocal(),
          obtenerEstadoVerificacionLocal("renter"),
          obtenerEstadoVerificacionLocal("owner")
        )
    : null;

  const puedeSolicitarRenta = Boolean(
    resumenUsuario && (resumenUsuario.puedeVerModoRenter || resumenUsuario.esAdmin)
  );
  const verificacionEnRevision = resumenUsuario?.estadoRenter === "PENDING";

  // Sincronizar tamaño de página si el usuario lo cambia en /configuracion
  useEffect(() => {
    function sincronizarPrefs() {
      setPorPagina(leerPreferencias().motosPorPagina);
      setPagina(1);
    }
    window.addEventListener(EVENTO_PREFERENCIAS, sincronizarPrefs);
    return () => window.removeEventListener(EVENTO_PREFERENCIAS, sincronizarPrefs);
  }, []);

  // Cargar catálogo real desde el backend (con respaldo limpio si está vacío o apagado)
  useEffect(() => {
    let activo = true;

    async function cargarMotos() {
      const resultado = await obtenerCatalogoMotos();
      if (!activo) return;

      if (resultado.ok && resultado.data && resultado.data.length > 0) {
        setMotos(resultado.data);
      } else {
        setMotos(motosRespaldo);
      }
      setCargando(false);
    }

    cargarMotos();
    return () => {
      activo = false;
    };
  }, []);

  const ccNumero = Number(ccTexto);
  const ccObjetivo =
    ccTexto.trim() !== "" && Number.isFinite(ccNumero) && ccNumero > 0
      ? ccNumero
      : null;

  const resultadoFiltro = filtrarYOrdenarMotos(motos, {
    busqueda,
    categoria,
    rangoCc,
    ccObjetivo,
    orden,
  });

  const paginacion = paginarLista(resultadoFiltro.motos, pagina, porPagina);

  const cantidadFiltrosPrecision =
    (categoria !== "Todas" ? 1 : 0) +
    (ccObjetivo !== null || rangoCc !== "TODOS" ? 1 : 0) +
    (orden !== "RELEVANCIA" ? 1 : 0);

  const hayFiltrosActivos = Boolean(
    busqueda.trim() ||
      categoria !== "Todas" ||
      rangoCc !== "TODOS" ||
      ccObjetivo !== null
  );

  function limpiarTodosLosFiltros() {
    setBusqueda("");
    setCategoria("Todas");
    setRangoCc("TODOS");
    setCcTexto("");
    setOrden("RELEVANCIA");
    setPagina(1);
  }

  return (
    <div className="motos-page">
      <main className="motos-content">
        <div className="motos-heading">
          <div>
            <h1>Catálogo de Motocicletas</h1>
            <p>
              Compara las especificaciones clave, filtra por cilindraje y abre
              cualquier motocicleta para ver su galería completa.
            </p>
          </div>
          <span className="count-badge">
            {cargando
              ? "Cargando..."
              : `Mostrando ${paginacion.desde}–${paginacion.hasta} de ${paginacion.totalItems}`}
          </span>
        </div>

        {/* BARRA COMPACTA DE BÚSQUEDA + DESPLEGABLE DE FILTROS DE PRECISIÓN */}
        <section className="motos-toolbar" aria-label="Búsqueda y filtros del catálogo">
          <div className="motos-search-bar-row">
            <label className="motos-search-field">
              <IconSearch size={16} />
              <input
                type="text"
                placeholder="Buscar por marca, modelo, color o placa..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
              />
            </label>

            <button
              type="button"
              className={`motos-filter-toggle ${filtrosAbiertos ? "active" : ""}`}
              aria-expanded={filtrosAbiertos}
              onClick={() => setFiltrosAbiertos((prev) => !prev)}
            >
              <IconSliders size={16} />
              <span>Filtros</span>
              {cantidadFiltrosPrecision > 0 && (
                <span className="motos-filter-count">
                  {cantidadFiltrosPrecision}
                </span>
              )}
            </button>
          </div>

          {/* PANEL DESPLEGABLE (OCULTO POR DEFECTO) */}
          {filtrosAbiertos && (
            <div className="motos-filters-drawer">
              <div className="motos-drawer-grid">
                <label className="motos-cc-field">
                  <span>Cilindraje exacto o cercano (cc)</span>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    step={25}
                    placeholder="Ej. 200"
                    value={ccTexto}
                    onChange={(e) => {
                      setCcTexto(e.target.value);
                      if (e.target.value.trim()) setRangoCc("TODOS");
                      setPagina(1);
                    }}
                  />
                </label>

                <label className="motos-select-field">
                  <span>Ordenar por</span>
                  <select
                    value={orden}
                    onChange={(e) => {
                      setOrden(e.target.value as OrdenCatalogo);
                      setPagina(1);
                    }}
                  >
                    <option value="RELEVANCIA">Relevancia</option>
                    <option value="PRECIO_ASC">Menor precio</option>
                    <option value="PRECIO_DESC">Mayor precio</option>
                    <option value="KM_ASC">Menor kilometraje</option>
                    <option value="CC_DESC">Mayor cilindraje</option>
                  </select>
                </label>

                <label className="motos-select-field">
                  <span>Motocicletas por página</span>
                  <select
                    value={porPagina}
                    onChange={(e) => {
                      setPorPagina(Number(e.target.value) as TamanoPaginaCatalogo);
                      setPagina(1);
                    }}
                  >
                    <option value={12}>12 motos</option>
                    <option value={24}>24 motos</option>
                    <option value={30}>30 motos</option>
                  </select>
                </label>
              </div>

              <div className="motos-chips-row">
                <div className="category-filters" role="group" aria-label="Categorías">
                  {["Todas", "Viaje", "Uso diario", "Trabajo"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={
                        categoria === cat ? "filter-chip active" : "filter-chip"
                      }
                      onClick={() => {
                        setCategoria(cat);
                        setPagina(1);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="motos-cc-chips" role="group" aria-label="Rangos de cilindraje">
                  <span className="motos-cc-chips-label">Rangos:</span>
                  {(["TODOS", "HASTA_125", "150_250", "MAS_300"] as RangoCilindraje[]).map(
                    (rango) => (
                      <button
                        key={rango}
                        type="button"
                        className={`filter-chip filter-chip--sm ${
                          rangoCc === rango && ccObjetivo === null ? "active" : ""
                        }`}
                        onClick={() => {
                          setRangoCc(rango);
                          setCcTexto("");
                          setPagina(1);
                        }}
                      >
                        {ETIQUETAS_RANGO_CC[rango]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="motos-drawer-footer">
                {hayFiltrosActivos && (
                  <button
                    type="button"
                    className="motos-clear-all"
                    onClick={limpiarTodosLosFiltros}
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  type="button"
                  className="motos-drawer-done"
                  onClick={() => setFiltrosAbiertos(false)}
                >
                  Ver resultados ({paginacion.totalItems})
                </button>
              </div>
            </div>
          )}

          {/* RESUMEN DE FILTROS ACTIVOS (Patrón Baymard Institute) */}
          {hayFiltrosActivos && (
            <div className="motos-active-filters">
              <span className="motos-active-label">Filtros activos:</span>
              {busqueda.trim() && (
                <button
                  type="button"
                  className="motos-active-chip"
                  onClick={() => setBusqueda("")}
                >
                  <span>Texto: "{busqueda.trim()}"</span>
                  <IconClose size={13} />
                </button>
              )}
              {categoria !== "Todas" && (
                <button
                  type="button"
                  className="motos-active-chip"
                  onClick={() => setCategoria("Todas")}
                >
                  <span>Categoría: {categoria}</span>
                  <IconClose size={13} />
                </button>
              )}
              {ccObjetivo !== null && (
                <button
                  type="button"
                  className="motos-active-chip"
                  onClick={() => setCcTexto("")}
                >
                  <span>Cilindraje: {ccObjetivo} cc</span>
                  <IconClose size={13} />
                </button>
              )}
              {rangoCc !== "TODOS" && ccObjetivo === null && (
                <button
                  type="button"
                  className="motos-active-chip"
                  onClick={() => setRangoCc("TODOS")}
                >
                  <span>{ETIQUETAS_RANGO_CC[rangoCc]}</span>
                  <IconClose size={13} />
                </button>
              )}
              <button
                type="button"
                className="motos-clear-all"
                onClick={limpiarTodosLosFiltros}
              >
                Limpiar todo
              </button>
            </div>
          )}
        </section>

        {/* AVISO DE COINCIDENCIA MÁS CERCANA POR CILINDRAJE */}
        {!cargando &&
          resultadoFiltro.coincidenciaCc === "CERCANA" &&
          ccObjetivo !== null && (
            <div className="motos-nearest-banner" role="status">
              <IconAlert size={17} />
              <span>
                No encontramos motocicletas exactas de{" "}
                <strong>{ccObjetivo} cc</strong>. Te mostramos las opciones más
                cercanas ordenadas por proximidad
                {resultadoFiltro.ccMasCercano
                  ? ` (más cercana: ${resultadoFiltro.ccMasCercano} cc).`
                  : "."}
              </span>
            </div>
          )}

        {/* GRID DE TARJETAS COMPACTAS + SKELETON SHIMMER (FASE 11 · H3) */}
        {cargando ? (
          <SkeletonMotoGrid cantidad={6} />
        ) : (
          <div className="motos-grid">
            {paginacion.itemsPagina.map((moto) => {
              const fotoLocal = obtenerFotoLocalPorPlaca(moto.licensePlate);
              const fotoPortada = moto.fotoPortada
                ? resolverUrlFoto(moto.fotoPortada, API_URL)
                : fotoLocal || motoDefaultImg;

              return (
                <MotoCard
                  key={moto.id}
                  moto={moto}
                  fotoPortada={fotoPortada}
                  fotoRespaldo={motoDefaultImg}
                  onVerDetalle={setMotoSeleccionada}
                />
              );
            })}
          </div>
        )}

        {!cargando && paginacion.totalItems === 0 && (
          <EmptyState
            titulo="Sin coincidencias con estos filtros"
            descripcion="No encontramos motocicletas que cumplan con todos los criterios seleccionados. Restablece los filtros para explorar el catálogo completo."
            accionTexto="Ver todas las motos"
            onAccion={limpiarTodosLosFiltros}
          />
        )}

        {/* PAGINACIÓN NUMERADA (24–30 MOTOS POR PÁGINA) */}
        {!cargando && paginacion.totalPaginas > 1 && (
          <nav className="motos-pagination" aria-label="Paginación del catálogo">
            <button
              type="button"
              className="motos-page-btn"
              disabled={paginacion.paginaSegura <= 1}
              onClick={() => {
                setPagina(paginacion.paginaSegura - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Anterior
            </button>

            <div className="motos-page-numbers">
              {Array.from(
                { length: paginacion.totalPaginas },
                (_, i) => i + 1
              ).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`motos-page-btn ${
                    num === paginacion.paginaSegura ? "active" : ""
                  }`}
                  onClick={() => {
                    setPagina(num);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="motos-page-btn"
              disabled={paginacion.paginaSegura >= paginacion.totalPaginas}
              onClick={() => {
                setPagina(paginacion.paginaSegura + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Siguiente
            </button>
          </nav>
        )}
      </main>

      {/* FICHA COMPLETA CON GALERÍA ACTUALIZADA Y CALCULADORA */}
      {motoSeleccionada && (
        <MotoDetalleModal
          moto={motoSeleccionada}
          fotoLocal={obtenerFotoLocalPorPlaca(motoSeleccionada.licensePlate)}
          fotoRespaldo={motoDefaultImg}
          haySesion={haySesion}
          puedeSolicitarRenta={puedeSolicitarRenta}
          verificacionEnRevision={verificacionEnRevision}
          onCerrar={() => setMotoSeleccionada(null)}
        />
      )}
    </div>
  );
}

export default Motos;
