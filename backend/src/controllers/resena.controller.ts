import {
  obtenerCalificacionesPendientes,
  obtenerPerfilPublico,
  obtenerResenasPublicasMoto,
  registrarResena,
} from "../services/resena.service.js";
import { ejecutar, exigirUsuario } from "../utils/handler.util.js";
import { responseSuccess } from "../utils/response.util.js";

/** POST /api/resenas — Crea una calificación verificada con doble ciego a 30 min. */
export const crearResenaController = ejecutar(async (req, res) => {
  const usuario = exigirUsuario(req);
  const resena = await registrarResena(usuario.id, req.body ?? {});

  return responseSuccess(
    res,
    "Calificación registrada correctamente. Quedará visible al completarse el doble ciego o en 30 minutos.",
    resena,
    201
  );
});

/** GET /api/resenas/pendientes — Lista rentas completadas pendientes de calificar. */
export const obtenerPendientesController = ejecutar(async (req, res) => {
  const usuario = exigirUsuario(req);
  const pendientes = await obtenerCalificacionesPendientes(usuario.id);

  return responseSuccess(
    res,
    "Estado de calificaciones pendientes consultado correctamente",
    pendientes,
    200
  );
});

/** GET /api/motos/:id/resenas — Reseñas públicas visibles de una motocicleta. */
export const obtenerResenasMotoController = ejecutar(async (req, res) => {
  const motoId = String(req.params.id ?? "");
  const resultado = await obtenerResenasPublicasMoto(motoId);

  return responseSuccess(
    res,
    "Reseñas de la motocicleta obtenidas correctamente",
    resultado,
    200
  );
});

/** GET /api/usuarios/:id/perfil-publico — Perfil público de reputación (sin datos sensibles). */
export const obtenerPerfilPublicoController = ejecutar(async (req, res) => {
  const userId = String(req.params.id ?? "");
  const perfil = await obtenerPerfilPublico(userId);

  return responseSuccess(
    res,
    "Perfil público obtenido correctamente",
    perfil,
    200
  );
});
