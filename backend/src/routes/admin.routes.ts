import { Router } from "express";
import {
  getDocumentoPrivadoAdminController,
  getMotosAdminController,
  getResenasAdminController,
  getResumenAdminController,
  getUsuariosAdminController,
  patchEstadoMotoAdminController,
} from "../controllers/admin.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";
import { permitirRoles } from "../middleware/role.middleware.js";

const router = Router();
const soloAdmin = [verificarToken, permitirRoles("ADMIN")];

/**
 * @openapi
 * /api/admin/resumen:
 *   get:
 *     summary: Métricas globales del panel administrativo (Solo ADMIN)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Contadores operativos de la plataforma
 */
router.get("/admin/resumen", ...soloAdmin, getResumenAdminController);

/**
 * @openapi
 * /api/admin/motos:
 *   get:
 *     summary: Listar motocicletas para aprobación y control (Solo ADMIN)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Lista de motos priorizando PENDING_APPROVAL
 */
router.get("/admin/motos", ...soloAdmin, getMotosAdminController);

/**
 * @openapi
 * /api/admin/motos/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de una motocicleta (AVAILABLE, REJECTED, MAINTENANCE, INACTIVE)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch("/admin/motos/:id/estado", ...soloAdmin, patchEstadoMotoAdminController);

/**
 * @openapi
 * /api/admin/usuarios:
 *   get:
 *     summary: Directorio administrativo de usuarios (Solo ADMIN)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Lista de cuentas y estados de verificación
 */
router.get("/admin/usuarios", ...soloAdmin, getUsuariosAdminController);

/**
 * @openapi
 * /api/admin/resenas:
 *   get:
 *     summary: Supervisión de reseñas y alertas de baja calificación (Solo ADMIN)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Reseñas ordenadas priorizando alertas
 */
router.get("/admin/resenas", ...soloAdmin, getResenasAdminController);

/**
 * @openapi
 * /api/admin/documentos/{tipo}/{userId}/{archivo}:
 *   get:
 *     summary: Visualizar documento privado de verificación (Solo ADMIN)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Archivo binario protegido
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Documento no encontrado
 */
router.get(
  "/admin/documentos/:tipo/:userId/:archivo",
  ...soloAdmin,
  getDocumentoPrivadoAdminController
);

export default router;
