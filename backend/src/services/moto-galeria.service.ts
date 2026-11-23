import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as motoRepository from "../repositories/moto.repository.js";
import { parseDataUrl } from "../utils/file.util.js";
import { AppError } from "../utils/handler.util.js";

/**
 * GALERÍA DE FOTOS Y FICHA DESCRIPTIVA DE CADA MOTO
 *
 * La galería combina dos fuentes:
 * 1. Fotos del propietario: subidas al publicar o editar la moto.
 *    Se guardan en `backend/uploads/motos/<motoId>/` (carpeta pública).
 * 2. Fotos de inspección: evidencias de la entrega de DEVOLUCIÓN de cada renta
 *    (modelos VehicleHandover + HandoverEvidence que ya existen en Prisma).
 *    Por eso la galería se actualiza sola después de cada renta.
 *
 * NOTA PARA EL EQUIPO: la descripción del propietario se guarda temporalmente en
 * `ficha.json` dentro de la misma carpeta, porque el modelo Moto aún no tiene un
 * campo `description`. Cuando se agregue (y un modelo MotoImage), solo hay que
 * cambiar la implementación de `almacenamientoEnDisco` sin tocar controladores.
 */

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES_FOTO = 5 * 1024 * 1024;
const MAX_FOTOS_POR_ENVIO = 8;
const MAX_FOTOS_TOTALES = 12;
const MIN_DESCRIPCION = 20;
const MAX_DESCRIPCION = 1200;

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface FotoGaleria {
  url: string;
  origen: "PROPIETARIO" | "INSPECCION";
  descripcion: string | null;
  fecha: string | null;
}

export interface FichaMoto {
  descripcion: string | null;
  actualizadaEn: string | null;
}

export interface ArchivoFoto {
  nombre: string;
}

export interface AlmacenamientoGaleria {
  listarFotos: (motoId: string) => Promise<ArchivoFoto[]>;
  guardarFoto: (motoId: string, nombre: string, buffer: Buffer) => Promise<void>;
  leerFicha: (motoId: string) => Promise<FichaMoto | null>;
  guardarFicha: (motoId: string, ficha: FichaMoto) => Promise<void>;
}

export interface DependenciasGaleria {
  repo: Pick<typeof motoRepository, "buscarMotoPorId" | "obtenerEvidenciasDevolucion">;
  almacenamiento: AlmacenamientoGaleria;
  ahora: () => Date;
}

export interface UsuarioSolicitante {
  id: string;
  role: string;
}

export interface PayloadGaleria {
  fotos?: unknown;
  descripcion?: unknown;
}

/** Limpia el id para usarlo como nombre de carpeta (evita rutas como ../). */
export function idSeguro(motoId: string): string {
  return motoId.replace(/[^a-zA-Z0-9_-]/g, "");
}

function urlPublicaFoto(motoId: string, nombre: string): string {
  return `/uploads/motos/${idSeguro(motoId)}/${nombre}`;
}

// ============================================================================
// ALMACENAMIENTO REAL EN DISCO (implementación por defecto)
// ============================================================================

function carpetaMoto(motoId: string): string {
  return path.resolve(process.cwd(), "uploads", "motos", idSeguro(motoId));
}

export const almacenamientoEnDisco: AlmacenamientoGaleria = {
  async listarFotos(motoId) {
    try {
      const archivos = await readdir(carpetaMoto(motoId));
      return archivos
        .filter((nombre) => /\.(jpg|png|webp)$/i.test(nombre))
        .sort()
        .map((nombre) => ({ nombre }));
    } catch {
      // La carpeta aún no existe: la moto no tiene fotos subidas
      return [];
    }
  },

  async guardarFoto(motoId, nombre, buffer) {
    const carpeta = carpetaMoto(motoId);
    await mkdir(carpeta, { recursive: true });
    await writeFile(path.join(carpeta, nombre), buffer);
  },

  async leerFicha(motoId) {
    try {
      const contenido = await readFile(path.join(carpetaMoto(motoId), "ficha.json"), "utf8");
      return JSON.parse(contenido) as FichaMoto;
    } catch {
      return null;
    }
  },

  async guardarFicha(motoId, ficha) {
    const carpeta = carpetaMoto(motoId);
    await mkdir(carpeta, { recursive: true });
    await writeFile(path.join(carpeta, "ficha.json"), JSON.stringify(ficha, null, 2), "utf8");
  },
};

const dependenciasPorDefecto: DependenciasGaleria = {
  repo: motoRepository,
  almacenamiento: almacenamientoEnDisco,
  ahora: () => new Date(),
};

// ============================================================================
// CASOS DE USO
// ============================================================================

/**
 * Devuelve la URL de la primera foto del propietario (portada para la tarjeta del catálogo).
 * Nunca lanza error: si algo falla, el catálogo simplemente usa la imagen por defecto.
 */
export async function obtenerPortadaMoto(
  motoId: string,
  almacenamiento: AlmacenamientoGaleria = almacenamientoEnDisco
): Promise<string | null> {
  try {
    const fotos = await almacenamiento.listarFotos(motoId);
    const primera = fotos[0];
    return primera ? urlPublicaFoto(motoId, primera.nombre) : null;
  } catch {
    return null;
  }
}

/**
 * Galería completa de una moto: fotos del propietario + fotos de la última(s)
 * inspección(es) de devolución + descripción escrita por el propietario.
 */
export async function obtenerGaleriaMoto(
  motoId: string,
  deps: DependenciasGaleria = dependenciasPorDefecto
) {
  if (!motoId || !idSeguro(motoId)) {
    throw new AppError("Debes indicar un identificador de moto válido", 400);
  }

  const moto = await deps.repo.buscarMotoPorId(motoId);
  if (!moto) {
    throw new AppError("No se encontró la motocicleta indicada", 404);
  }

  const [archivos, ficha, evidencias] = await Promise.all([
    deps.almacenamiento.listarFotos(motoId),
    deps.almacenamiento.leerFicha(motoId),
    deps.repo.obtenerEvidenciasDevolucion(motoId),
  ]);

  const fotosPropietario: FotoGaleria[] = archivos.map((archivo) => ({
    url: urlPublicaFoto(motoId, archivo.nombre),
    origen: "PROPIETARIO",
    descripcion: null,
    fecha: null,
  }));

  const fotosInspeccion: FotoGaleria[] = evidencias.map((evidencia) => ({
    url: evidencia.fileUrl,
    origen: "INSPECCION",
    descripcion: evidencia.description ?? null,
    fecha: evidencia.handover.createdAt.toISOString(),
  }));

  return {
    motoId,
    fotosPropietario,
    fotosInspeccion,
    ultimaInspeccion: fotosInspeccion[0]?.fecha ?? null,
    descripcionPropietario: ficha?.descripcion ?? null,
    descripcionActualizadaEn: ficha?.actualizadaEn ?? null,
  };
}

/**
 * Permite al propietario de la moto (o a un ADMIN) agregar fotos y/o
 * actualizar la descripción. Valida TODO antes de escribir en disco.
 */
export async function actualizarGaleriaMoto(
  usuario: UsuarioSolicitante,
  motoId: string,
  payload: PayloadGaleria,
  deps: DependenciasGaleria = dependenciasPorDefecto
) {
  const moto = await deps.repo.buscarMotoPorId(motoId);
  if (!moto) {
    throw new AppError("No se encontró la motocicleta indicada", 404);
  }

  const esAdmin = String(usuario.role).toUpperCase() === "ADMIN";
  const esDueno = moto.owner?.idUser === usuario.id;
  if (!esAdmin && !esDueno) {
    throw new AppError("Solo el propietario de la moto puede modificar su galería", 403);
  }

  // 1. Validar fotos
  const fotosRecibidas = payload.fotos === undefined ? [] : payload.fotos;
  if (!Array.isArray(fotosRecibidas)) {
    throw new AppError("El campo 'fotos' debe ser una lista de imágenes en Base64", 400);
  }
  if (fotosRecibidas.length > MAX_FOTOS_POR_ENVIO) {
    throw new AppError(`Puedes subir máximo ${MAX_FOTOS_POR_ENVIO} fotos por envío`, 400);
  }

  const existentes = await deps.almacenamiento.listarFotos(motoId);
  if (existentes.length + fotosRecibidas.length > MAX_FOTOS_TOTALES) {
    throw new AppError(
      `La galería admite máximo ${MAX_FOTOS_TOTALES} fotos (actualmente tiene ${existentes.length})`,
      400
    );
  }

  const fotosValidadas = fotosRecibidas.map((dataUrl, indice) => {
    try {
      return parseDataUrl(dataUrl, { allowed: TIPOS_IMAGEN, maxBytes: MAX_BYTES_FOTO });
    } catch (error) {
      const detalle = error instanceof Error ? error.message : "Imagen inválida";
      throw new AppError(`Foto ${indice + 1}: ${detalle}`, 400);
    }
  });

  // 2. Validar descripción (opcional)
  let descripcion: string | null = null;
  if (payload.descripcion !== undefined && payload.descripcion !== null) {
    if (typeof payload.descripcion !== "string") {
      throw new AppError("La descripción debe ser texto", 400);
    }
    const limpia = payload.descripcion.trim();
    if (limpia.length > 0) {
      if (limpia.length < MIN_DESCRIPCION || limpia.length > MAX_DESCRIPCION) {
        throw new AppError(
          `La descripción debe tener entre ${MIN_DESCRIPCION} y ${MAX_DESCRIPCION} caracteres`,
          400
        );
      }
      descripcion = limpia;
    }
  }

  if (fotosValidadas.length === 0 && descripcion === null) {
    throw new AppError("Envía al menos una foto o una descripción para actualizar", 400);
  }

  // 3. Persistir (solo llega aquí si todo fue válido)
  const marcaTiempo = deps.ahora().getTime();
  await Promise.all(
    fotosValidadas.map((foto, indice) => {
      const extension = EXTENSIONES[foto.mime] ?? "jpg";
      const nombre = `foto-${marcaTiempo}-${String(indice + 1).padStart(2, "0")}.${extension}`;
      return deps.almacenamiento.guardarFoto(motoId, nombre, foto.buffer);
    })
  );

  if (descripcion !== null) {
    await deps.almacenamiento.guardarFicha(motoId, {
      descripcion,
      actualizadaEn: deps.ahora().toISOString(),
    });
  }

  return await obtenerGaleriaMoto(motoId, deps);
}
