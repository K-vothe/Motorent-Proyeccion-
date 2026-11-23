/**
 * Utilidades puras del catálogo de motos (sin React ni navegador).
 *
 * Se encargan de:
 * 1. Formatear datos para mostrarlos (precio, kilometraje, fechas).
 * 2. Clasificar cada moto (cilindraje, licencia requerida, recorrido).
 * 3. Redactar una descripción completa a partir de la ficha técnica.
 * 4. Armar la galería de fotos combinando propietario + inspecciones.
 *
 * Al ser funciones puras, todas se prueban en `frontend/tests/moto.utils.test.ts`.
 */

export interface MotoCatalogo {
  id: number | string;
  brand: string;
  model: string;
  year: number;
  displacement: number | string;
  dailyRate: number | string;
  licensePlate?: string;
  color?: string;
  category?: string;
  KM?: number;
  status?: string;
  description?: string;
  fotoPortada?: string | null;
}

export interface FotoApi {
  url: string;
  origen: "PROPIETARIO" | "INSPECCION";
  descripcion: string | null;
  fecha: string | null;
}

export interface FotoVista {
  src: string;
  origen: "PROPIETARIO" | "INSPECCION" | "REFERENCIA";
  etiqueta: string;
  fecha: string | null;
  /** Encuadre opcional para vistas de muestra cuando aún no hay galería en BD. */
  encuadre?: string;
}

export interface DescripcionMoto {
  resumen: string;
  parrafos: string[];
  destacados: string[];
}

// ============================================================================
// 1. FORMATO
// ============================================================================

/** Agrega separador de miles con punto (formato colombiano) sin depender del navegador. */
export function formatearMiles(valor: number): string {
  const entero = Math.round(Math.abs(valor));
  const conPuntos = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return valor < 0 ? `-${conPuntos}` : conPuntos;
}

export function formatearPrecioCOP(valor: number | string): string {
  const numero = Number(valor);
  return `$${formatearMiles(Number.isFinite(numero) ? numero : 0)}`;
}

export function formatearKilometraje(km: number | undefined | null): string {
  if (km === undefined || km === null || !Number.isFinite(Number(km))) {
    return "Sin registro";
  }
  return `${formatearMiles(Number(km))} km`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Convierte una fecha ISO a "18 nov 2026" (independiente del idioma del sistema). */
export function formatearFechaCorta(fechaIso: string | null | undefined): string {
  if (!fechaIso) return "";
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]} ${fecha.getUTCFullYear()}`;
}

/** Días entre dos fechas (YYYY-MM-DD). Mínimo 1 día. */
export function calcularDiasRenta(inicio: string, fin: string): number {
  const msInicio = new Date(inicio).getTime();
  const msFin = new Date(fin).getTime();
  if (!Number.isFinite(msInicio) || !Number.isFinite(msFin)) return 1;
  const dias = Math.ceil((msFin - msInicio) / (1000 * 60 * 60 * 24));
  return dias <= 0 ? 1 : dias;
}

// ============================================================================
// 2. CLASIFICACIÓN
// ============================================================================

export interface ClasificacionCilindraje {
  segmento: "Urbana" | "Media cilindrada" | "Alta cilindrada";
  licenciaRequerida: "A1 o A2" | "A2";
}

/** Extrae el número de cilindraje aunque venga con sufijo (ej. "321cc" -> 321). */
function numeroCilindraje(cc: number | string): number {
  if (typeof cc === "number") return Number.isFinite(cc) ? cc : 0;
  const digitos = String(cc).replace(/[^\d.]/g, "");
  const valor = Number(digitos);
  return Number.isFinite(valor) ? valor : 0;
}

/**
 * En Colombia la licencia A1 cubre motos de hasta 125 cc; por encima se requiere A2.
 */
export function clasificarCilindraje(cc: number | string): ClasificacionCilindraje {
  const valor = numeroCilindraje(cc);
  const licenciaRequerida = valor <= 125 ? "A1 o A2" : "A2";

  if (valor <= 160) return { segmento: "Urbana", licenciaRequerida };
  if (valor <= 400) return { segmento: "Media cilindrada", licenciaRequerida };
  return { segmento: "Alta cilindrada", licenciaRequerida };
}

export function describirRecorrido(km: number | undefined | null): string {
  if (km === undefined || km === null || !Number.isFinite(Number(km))) {
    return "Recorrido sin registrar";
  }
  const valor = Number(km);
  if (valor < 5000) return "Prácticamente nueva";
  if (valor < 20000) return "Bajo recorrido";
  if (valor < 50000) return "Recorrido moderado";
  return "Recorrido alto";
}

/** Categoría sugerida cuando la base de datos no la trae. */
export function inferirCategoria(moto: Pick<MotoCatalogo, "category" | "displacement">): string {
  if (moto.category) return moto.category;
  return numeroCilindraje(moto.displacement) >= 250 ? "Viaje" : "Uso diario";
}

// ============================================================================
// 3. DESCRIPCIÓN COMPLETA
// ============================================================================

const TEXTO_POR_CATEGORIA: Record<string, string> = {
  Viaje:
    "Pensada para recorrer carretera con comodidad: su cilindraje permite adelantar con seguridad y mantener velocidades de crucero estables en trayectos intermunicipales.",
  "Uso diario":
    "Ideal para moverse por la ciudad: es ágil en el tráfico, fácil de parquear y económica en consumo de combustible para trayectos de todos los días.",
  Trabajo:
    "Una opción práctica para jornadas de trabajo y mensajería: mecánica sencilla, consumo contenido y buena resistencia para uso intensivo.",
};

/**
 * Redacta la descripción de la ficha completa.
 * Solo usa datos reales de la moto (no inventa equipamiento como ABS o maletas).
 * Si el propietario escribió su propia descripción, se muestra primero.
 */
export function generarDescripcionMoto(
  moto: MotoCatalogo,
  descripcionPropietario?: string | null
): DescripcionMoto {
  const categoria = inferirCategoria(moto);
  const { segmento, licenciaRequerida } = clasificarCilindraje(moto.displacement);
  const recorrido = describirRecorrido(moto.KM);
  const nombre = `${moto.brand} ${moto.model}`.trim();

  const resumen = `${nombre} ${moto.year}, ${segmento.toLowerCase()} de ${moto.displacement} cc${
    moto.color ? ` en color ${moto.color.toLowerCase()}` : ""
  }.`;

  const parrafos: string[] = [];

  if (descripcionPropietario && descripcionPropietario.trim()) {
    parrafos.push(descripcionPropietario.trim());
  }

  parrafos.push(TEXTO_POR_CATEGORIA[categoria] ?? TEXTO_POR_CATEGORIA["Uso diario"]!);

  const textoKm =
    moto.KM !== undefined && moto.KM !== null
      ? `Registra ${formatearKilometraje(moto.KM)} (${recorrido.toLowerCase()}).`
      : "El kilometraje se confirma al momento de la entrega.";

  parrafos.push(
    `${textoKm} Antes de cada entrega y en cada devolución se realiza una inspección con fotografías, de modo que la galería muestra siempre el estado más reciente del vehículo.`
  );

  parrafos.push(
    `Para conducirla necesitas licencia de conducción categoría ${licenciaRequerida} vigente y tu perfil de arrendatario verificado en MotoRent.`
  );

  const destacados = [
    `${moto.displacement} cc · ${segmento}`,
    `${formatearKilometraje(moto.KM)} · ${recorrido}`,
    `Modelo ${moto.year}`,
    `Licencia ${licenciaRequerida}`,
    "Inspección fotográfica en cada entrega y devolución",
  ];

  return { resumen, parrafos, destacados };
}

// ============================================================================
// 4. GALERÍA
// ============================================================================

/** Convierte rutas relativas del backend (/uploads/...) en URLs completas. */
export function resolverUrlFoto(url: string, apiBase: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = apiBase.replace(/\/+$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface EntradaGaleria {
  fotosPropietario?: FotoApi[];
  fotosInspeccion?: FotoApi[];
  fotoPortada?: string | null;
  fotoLocal?: string | null;
  fotoPorDefecto: string;
  apiBase: string;
}

/**
 * Arma la lista final de fotos en este orden:
 * 1. Fotos del propietario (presentación del vehículo).
 * 2. Fotos de la inspección de devolución más reciente (estado actual tras la última renta).
 * Si no hay ninguna, usa la portada, la foto local o la imagen de referencia.
 */
export function construirGaleria(entrada: EntradaGaleria): FotoVista[] {
  const vistas: FotoVista[] = [];
  const vistos = new Set<string>();

  function agregar(foto: FotoVista) {
    if (vistos.has(foto.src)) return;
    vistos.add(foto.src);
    vistas.push(foto);
  }

  (entrada.fotosPropietario ?? []).forEach((foto, indice) => {
    agregar({
      src: resolverUrlFoto(foto.url, entrada.apiBase),
      origen: "PROPIETARIO",
      etiqueta: `Foto del propietario ${indice + 1}`,
      fecha: foto.fecha,
    });
  });

  (entrada.fotosInspeccion ?? []).forEach((foto) => {
    const fecha = formatearFechaCorta(foto.fecha);
    agregar({
      src: resolverUrlFoto(foto.url, entrada.apiBase),
      origen: "INSPECCION",
      etiqueta: `Inspección de devolución${fecha ? ` · ${fecha}` : ""}${
        foto.descripcion ? ` · ${foto.descripcion}` : ""
      }`,
      fecha: foto.fecha,
    });
  });

  if (vistas.length === 0) {
    if (entrada.fotoPortada) {
      agregar({
        src: resolverUrlFoto(entrada.fotoPortada, entrada.apiBase),
        origen: "PROPIETARIO",
        etiqueta: "Foto del propietario",
        fecha: null,
      });
    } else if (entrada.fotoLocal) {
      agregar({ src: entrada.fotoLocal, origen: "PROPIETARIO", etiqueta: "Foto del propietario", fecha: null });
    } else {
      agregar({
        src: entrada.fotoPorDefecto,
        origen: "REFERENCIA",
        etiqueta: "Imagen de referencia",
        fecha: null,
      });
    }
  }

  return vistas;
}

/** Índice siguiente/anterior de forma circular (para las flechas de la galería). */
export function moverIndiceCircular(actual: number, paso: number, total: number): number {
  if (total <= 0) return 0;
  return (((actual + paso) % total) + total) % total;
}

const VISTAS_BASE_CARRUSEL: {
  etiqueta: string;
  origen: "PROPIETARIO" | "INSPECCION";
  encuadre: string;
}[] = [
  { etiqueta: "1. Vista general 3/4", origen: "PROPIETARIO", encuadre: "50% 50%" },
  { etiqueta: "2. Frente y conjunto óptico", origen: "PROPIETARIO", encuadre: "20% 45%" },
  { etiqueta: "3. Lateral derecho", origen: "PROPIETARIO", encuadre: "78% 55%" },
  { etiqueta: "4. Lateral izquierdo", origen: "PROPIETARIO", encuadre: "24% 60%" },
  { etiqueta: "5. Tablero y mandos", origen: "PROPIETARIO", encuadre: "50% 20%" },
  { etiqueta: "6. Motor y chasis", origen: "PROPIETARIO", encuadre: "50% 78%" },
  { etiqueta: "7. Tren trasero y escape", origen: "PROPIETARIO", encuadre: "82% 72%" },
  { etiqueta: "8. Inspección post-renta", origen: "INSPECCION", encuadre: "35% 50%" },
];

/**
 * Garantiza que el carrusel giratorio dentro de la ficha muestre al menos 8
 * vistas inspeccionables. Si la moto ya tiene 8 o más fotos reales del backend,
 * se devuelven intactas; si tiene menos (por ejemplo en catálogo de respaldo),
 * completa hasta 8 vistas de referencia diferenciadas por ángulo.
 */
export function completarGaleriaCarrusel(
  fotos: FotoVista[],
  imagenBase: string,
  minimo = 8
): FotoVista[] {
  if (fotos.length >= minimo) {
    return fotos;
  }

  const baseSrc = fotos[0]?.src || imagenBase;
  const resultado = [...fotos];

  for (let i = resultado.length; i < minimo; i++) {
    const plantilla = VISTAS_BASE_CARRUSEL[i % VISTAS_BASE_CARRUSEL.length]!;
    resultado.push({
      src: baseSrc,
      origen: plantilla.origen,
      etiqueta: `${plantilla.etiqueta} (referencia)`,
      fecha: null,
      encuadre: plantilla.encuadre,
    });
  }

  return resultado;
}

// ============================================================================
// 5. FILTRADO INTELIGENTE POR CILINDRAJE (CC), ORDEN Y PAGINACIÓN (FASE 5.5)
// ============================================================================

export type RangoCilindraje = "TODOS" | "HASTA_125" | "150_250" | "MAS_300";
export type OrdenCatalogo =
  | "RELEVANCIA"
  | "PRECIO_ASC"
  | "PRECIO_DESC"
  | "KM_ASC"
  | "CC_DESC";

export interface OpcionesFiltroCatalogo {
  busqueda: string;
  categoria: string;
  rangoCc: RangoCilindraje;
  ccObjetivo: number | null;
  orden: OrdenCatalogo;
}

export interface ResultadoFiltroCatalogo {
  motos: MotoCatalogo[];
  coincidenciaCc: "SIN_FILTRO" | "EXACTA" | "CERCANA";
  ccMasCercano: number | null;
}

export interface ResultadoPaginacion<T> {
  itemsPagina: T[];
  paginaSegura: number;
  totalPaginas: number;
  totalItems: number;
  desde: number;
  hasta: number;
}

function cumpleRangoCc(cc: number, rango: RangoCilindraje): boolean {
  if (rango === "HASTA_125") return cc <= 125;
  if (rango === "150_250") return cc >= 150 && cc <= 250;
  if (rango === "MAS_300") return cc >= 300;
  return true;
}

/**
 * Filtra y ordena el catálogo de motos.
 *
 * Comportamiento del cilindraje escrito (`ccObjetivo`):
 * - Si existen motos con ese cilindraje exacto, devuelve únicamente las exactas.
 * - Si NO existe ninguna exacta, devuelve las candidatas ordenadas por cercanía
 *   (`|cc_moto - ccObjetivo|`) para evitar pantallas vacías innecesarias.
 */
export function filtrarYOrdenarMotos(
  motos: MotoCatalogo[],
  opciones: OpcionesFiltroCatalogo
): ResultadoFiltroCatalogo {
  const texto = opciones.busqueda.trim().toLowerCase();

  // 1. Filtros base: texto y categoría
  let candidatas = motos.filter((moto) => {
    const combinado = `${moto.brand} ${moto.model} ${moto.licensePlate || ""} ${moto.color || ""}`.toLowerCase();
    const coincideTexto = !texto || combinado.includes(texto);
    const coincideCategoria =
      opciones.categoria === "Todas" ||
      inferirCategoria(moto) === opciones.categoria;
    return coincideTexto && coincideCategoria;
  });

  let coincidenciaCc: "SIN_FILTRO" | "EXACTA" | "CERCANA" = "SIN_FILTRO";
  let ccMasCercano: number | null = null;

  // 2. Filtro de cilindraje (objetivo escrito tiene prioridad sobre chip de rango)
  if (opciones.ccObjetivo !== null && opciones.ccObjetivo > 0) {
    const objetivo = opciones.ccObjetivo;
    const exactas = candidatas.filter(
      (moto) => Number(moto.displacement) === objetivo
    );

    if (exactas.length > 0) {
      candidatas = exactas;
      coincidenciaCc = "EXACTA";
      ccMasCercano = objetivo;
    } else if (candidatas.length > 0) {
      candidatas = [...candidatas].sort((a, b) => {
        const diffA = Math.abs(Number(a.displacement) - objetivo);
        const diffB = Math.abs(Number(b.displacement) - objetivo);
        if (diffA !== diffB) return diffA - diffB;
        return Number(a.dailyRate) - Number(b.dailyRate);
      });
      coincidenciaCc = "CERCANA";
      ccMasCercano = Number(candidatas[0]?.displacement) || null;
    }
  } else if (opciones.rangoCc !== "TODOS") {
    candidatas = candidatas.filter((moto) =>
      cumpleRangoCc(Number(moto.displacement) || 0, opciones.rangoCc)
    );
  }

  // 3. Ordenamiento elegido (si es coincidencia cercana + RELEVANCIA, conservamos el orden por proximidad)
  const resultado = [...candidatas];
  if (opciones.orden === "PRECIO_ASC") {
    resultado.sort((a, b) => Number(a.dailyRate) - Number(b.dailyRate));
  } else if (opciones.orden === "PRECIO_DESC") {
    resultado.sort((a, b) => Number(b.dailyRate) - Number(a.dailyRate));
  } else if (opciones.orden === "KM_ASC") {
    resultado.sort(
      (a, b) => (Number(a.KM) || Number.MAX_SAFE_INTEGER) - (Number(b.KM) || Number.MAX_SAFE_INTEGER)
    );
  } else if (opciones.orden === "CC_DESC") {
    resultado.sort((a, b) => Number(b.displacement) - Number(a.displacement));
  }

  return { motos: resultado, coincidenciaCc, ccMasCercano };
}

/**
 * Divide una lista en páginas fijas (ej. 12, 24 o 30 elementos por página).
 * Corrige automáticamente `paginaActual` si supera el total al aplicar un filtro.
 */
export function paginarLista<T>(
  items: T[],
  paginaActual: number,
  porPagina: number
): ResultadoPaginacion<T> {
  const tamano = Math.max(1, porPagina);
  const totalItems = items.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / tamano));
  const paginaSegura = Math.min(Math.max(1, paginaActual), totalPaginas);

  const inicio = (paginaSegura - 1) * tamano;
  const itemsPagina = items.slice(inicio, inicio + tamano);

  return {
    itemsPagina,
    paginaSegura,
    totalPaginas,
    totalItems,
    desde: totalItems === 0 ? 0 : inicio + 1,
    hasta: inicio + itemsPagina.length,
  };
}
