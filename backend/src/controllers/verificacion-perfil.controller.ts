import {
  obtenerVerificacionesPendientes,
  procesarSolicitudOwner,
  procesarSolicitudRenter,
  resolverVerificacionPerfil,
} from "../services/verificacion-perfil.service.js";
import { ejecutar, exigirUsuario } from "../utils/handler.util.js";
import { responseSuccess } from "../utils/response.util.js";

/**
 * POST /api/renter/verificar
 * Recibe los datos y documentos en Base64 del usuario autenticado
 * para crear o reenviar su verificación de Arrendatario.
 */
export const solicitarVerificacionRenter = ejecutar(async (req, res) => {
  const usuario = exigirUsuario(req);
  const perfil = await procesarSolicitudRenter(usuario.id, req.body ?? {});

  return responseSuccess(
    res,
    "Solicitud de verificación de arrendatario enviada correctamente. Tus documentos quedaron en revisión.",
    perfil,
    201
  );
});

/**
 * POST /api/owner/verificar
 * Recibe los datos y documentos en Base64 del usuario autenticado
 * para crear o reenviar su verificación de Propietario.
 */
export const solicitarVerificacionOwner = ejecutar(async (req, res) => {
  const usuario = exigirUsuario(req);
  const perfil = await procesarSolicitudOwner(usuario.id, req.body ?? {});

  return responseSuccess(
    res,
    "Solicitud de verificación de propietario enviada correctamente. Tus documentos quedaron en revisión.",
    perfil,
    201
  );
});

/**
 * GET /api/admin/verificaciones
 * Retorna las colas pendientes de Arrendatarios, Propietarios y el conteo de motos por aprobar.
 */
export const listarVerificacionesAdmin = ejecutar(async (_req, res) => {
  const colas = await obtenerVerificacionesPendientes();

  return responseSuccess(
    res,
    "Cola de verificaciones pendientes obtenida correctamente",
    colas,
    200
  );
});

/**
 * PATCH /api/admin/verificaciones/:tipo/:id
 * Aprueba o rechaza una solicitud de verificación de perfil (renter u owner).
 */
export const resolverVerificacionAdmin = ejecutar(async (req, res) => {
  const tipo = String(req.params.tipo ?? "");
  const id = String(req.params.id ?? "");

  const resultado = await resolverVerificacionPerfil(tipo, id, req.body ?? {});

  return responseSuccess(
    res,
    "Estado de verificación actualizado correctamente",
    resultado,
    200
  );
});
