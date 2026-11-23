import { Router } from "express";
import {
  listarVerificacionesAdmin,
  resolverVerificacionAdmin,
  solicitarVerificacionOwner,
  solicitarVerificacionRenter,
} from "../controllers/verificacion-perfil.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";
import { permitirRoles } from "../middleware/role.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/renter/verificar:
 *   post:
 *     summary: Enviar solicitud de verificación de arrendatario (Renter)
 *     tags:
 *       - Verificación de Perfiles
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       201:
 *         description: Solicitud registrada en estado PENDING
 *       400:
 *         description: Datos o documentos inválidos
 *       401:
 *         description: Token inválido o ausente
 *       409:
 *         description: Perfil ya aprobado o documento duplicado
 */
router.post("/renter/verificar", verificarToken, solicitarVerificacionRenter);

/**
 * @openapi
 * /api/owner/verificar:
 *   post:
 *     summary: Enviar solicitud de verificación de propietario (Owner)
 *     tags:
 *       - Verificación de Perfiles
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       201:
 *         description: Solicitud registrada en estado PENDING
 *       400:
 *         description: Datos o documentos inválidos
 *       401:
 *         description: Token inválido o ausente
 *       409:
 *         description: Perfil ya aprobado o documento duplicado
 */
router.post("/owner/verificar", verificarToken, solicitarVerificacionOwner);

/**
 * @openapi
 * /api/admin/verificaciones:
 *   get:
 *     summary: Listar verificaciones pendientes (Solo ADMIN)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Colas pendientes de arrendatarios, propietarios y motos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 */
router.get(
  "/admin/verificaciones",
  verificarToken,
  permitirRoles("ADMIN"),
  listarVerificacionesAdmin
);

/**
 * @openapi
 * /api/admin/verificaciones/{tipo}/{id}:
 *   patch:
 *     summary: Aprobar o rechazar una verificación de perfil (Solo ADMIN)
 *     tags:
 *       - Administración
 *     security:
 *       - autenticacionJWT: []
 *     parameters:
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema:
 *           type: string
 *           enum: [renter, owner]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verificación resuelta correctamente
 *       400:
 *         description: Estado o motivo de rechazo inválido
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Solicitud no encontrada
 */
router.patch(
  "/admin/verificaciones/:tipo/:id",
  verificarToken,
  permitirRoles("ADMIN"),
  resolverVerificacionAdmin
);

export default router;
