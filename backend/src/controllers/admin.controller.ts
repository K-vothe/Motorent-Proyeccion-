import {
  cambiarEstadoMotoAdmin,
  obtenerMotosParaAdmin,
  obtenerResenasParaAdmin,
  obtenerResumenAdmin,
  obtenerUsuariosParaAdmin,
  validarExistenciaDocumentoPrivado,
} from "../services/admin.service.js";
import { ejecutar } from "../utils/handler.util.js";
import { responseSuccess } from "../utils/response.util.js";

/** GET /api/admin/resumen — Métricas globales del panel administrativo. */
export const getResumenAdminController = ejecutar(async (_req, res) => {
  const resumen = await obtenerResumenAdmin();
  return responseSuccess(res, "Resumen administrativo obtenido", resumen, 200);
});

/** GET /api/admin/motos — Motocicletas para revisión y aprobación. */
export const getMotosAdminController = ejecutar(async (_req, res) => {
  const motos = await obtenerMotosParaAdmin();
  return responseSuccess(res, "Motocicletas obtenidas", motos, 200);
});

/** PATCH /api/admin/motos/:id/estado — Aprueba, rechaza o pausa una moto. */
export const patchEstadoMotoAdminController = ejecutar(async (req, res) => {
  const id = String(req.params.id ?? "");
  const actualizada = await cambiarEstadoMotoAdmin(id, req.body?.status);
  return responseSuccess(
    res,
    "Estado de la motocicleta actualizado correctamente",
    actualizada,
    200
  );
});

/** GET /api/admin/usuarios — Directorio de cuentas con búsqueda opcional (?q=). */
export const getUsuariosAdminController = ejecutar(async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const usuarios = await obtenerUsuariosParaAdmin(q);
  return responseSuccess(res, "Usuarios obtenidos", usuarios, 200);
});

/** GET /api/admin/resenas — Supervisión de calificaciones y alertas (<=3 estrellas). */
export const getResenasAdminController = ejecutar(async (_req, res) => {
  const resenas = await obtenerResenasParaAdmin();
  return responseSuccess(res, "Reseñas obtenidas para supervisión", resenas, 200);
});

/**
 * GET /api/admin/documentos/:tipo/:userId/:archivo
 * Sirve un documento privado de verificación EXCLUSIVAMENTE a cuentas ADMIN.
 */
export const getDocumentoPrivadoAdminController = ejecutar(async (req, res) => {
  const tipo = String(req.params.tipo ?? "");
  const userId = String(req.params.userId ?? "");
  const archivo = String(req.params.archivo ?? "");

  const { rutaAbsoluta, contentType } = await validarExistenciaDocumentoPrivado(
    tipo,
    userId,
    archivo
  );

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, no-store");
  return res.sendFile(rutaAbsoluta);
});
