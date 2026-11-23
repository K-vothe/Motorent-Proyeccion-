import { Router } from "express";
import {
  crearResenaController,
  obtenerPendientesController,
  obtenerPerfilPublicoController,
  obtenerResenasMotoController,
} from "../controllers/resena.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/resenas:
 *   post:
 *     summary: Registrar una reseña verificada (doble ciego 30 minutos)
 *     tags:
 *       - Reseñas y Reputación
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       201:
 *         description: Reseña registrada
 *       400:
 *         description: Datos inválidos o renta no completada
 *       403:
 *         description: El usuario no participó con el rol requerido en esa renta
 *       409:
 *         description: Ya calificó ese objetivo en esa renta
 */
router.post("/resenas", verificarToken, crearResenaController);

/**
 * @openapi
 * /api/resenas/pendientes:
 *   get:
 *     summary: Consultar rentas completadas pendientes de evaluación obligatoria
 *     tags:
 *       - Reseñas y Reputación
 *     security:
 *       - autenticacionJWT: []
 *     responses:
 *       200:
 *         description: Lista de evaluaciones pendientes
 */
router.get("/resenas/pendientes", verificarToken, obtenerPendientesController);

/**
 * @openapi
 * /api/motos/{id}/resenas:
 *   get:
 *     summary: Obtener reseñas públicas visibles de una motocicleta
 *     tags:
 *       - Reseñas y Reputación
 *     responses:
 *       200:
 *         description: Promedio y lista de reseñas visibles
 */
router.get("/motos/:id/resenas", obtenerResenasMotoController);

/**
 * @openapi
 * /api/usuarios/{id}/perfil-publico:
 *   get:
 *     summary: Obtener perfil público de reputación de un usuario (sin datos privados)
 *     tags:
 *       - Reseñas y Reputación
 *     responses:
 *       200:
 *         description: Perfil público con insignias, promedio y reseñas visibles
 *       404:
 *         description: Usuario no encontrado
 */
router.get("/usuarios/:id/perfil-publico", obtenerPerfilPublicoController);

export default router;
