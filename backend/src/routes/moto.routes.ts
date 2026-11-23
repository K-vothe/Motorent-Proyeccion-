import { Router } from "express";
import { getMotos, createMoto } from "../controllers/moto.controller.js";
import { getGaleriaMoto, postGaleriaMoto } from "../controllers/moto-galeria.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";
import { permitirRoles } from "../middleware/role.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/motos:
 *   get:
 *     summary: Obtener todas las motos
 *     description: Consulta las motos registradas en MotoRent.
 *     tags:
 *       - Motos
 *     responses:
 *       200:
 *         description: Motos obtenidas correctamente
 *       500:
 *         description: Error interno del servidor
 */

router.get("/motos", getMotos);


/**
 * @openapi
 * /api/create/moto:
 *   post:
 *     summary: Registrar una nueva moto
 *     description: Permite registrar una moto en MotoRent.
 *     tags:
 *       - Motos
 *     security:
 *       - autenticacionJWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand
 *               - model
 *               - year
 *               - licensePlate
 *               - dailyRate
 *               - displacement
 *               - color
 *               - KM
 *             properties:
 *               brand:
 *                 type: string
 *                 example: Yamaha
 *               model:
 *                 type: string
 *                 example: MT-03
 *               year:
 *                 type: integer
 *                 example: 2025
 *               licensePlate:
 *                 type: string
 *                 example: ABC123
 *               dailyRate:
 *                 type: number
 *                 example: 90000
 *               displacement:
 *                 type: number
 *                 example: 321
 *               color:
 *                 type: string
 *                 example: Negro
 *               KM:
 *                 type: number
 *                 example: 1500
 *     responses:
 *       201:
 *         description: Moto registrada correctamente
 *       400:
 *         description: Datos inválidos o incompletos
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: Sin permisos suficientes
 *       500:
 *         description: Error interno del servidor
 */

router.post(
  "/create/moto",
  verificarToken,
  permitirRoles("OWNER", "ADMIN"),
  createMoto
);

/**
 * @openapi
 * /api/motos/{id}/galeria:
 *   get:
 *     summary: Obtener la galería de fotos y la descripción de una moto
 *     description: Combina las fotos del propietario con las fotos de inspección tomadas en la devolución de cada renta.
 *     tags:
 *       - Motos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Galería obtenida correctamente
 *       404:
 *         description: Moto no encontrada
 *   post:
 *     summary: Agregar fotos o actualizar la descripción de una moto
 *     description: Solo el propietario de la moto o un ADMIN. Fotos en Base64 (JPG, PNG o WEBP, máx. 5 MB cada una, 6 por envío, 12 en total).
 *     tags:
 *       - Motos
 *     security:
 *       - autenticacionJWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Galería actualizada
 *       400:
 *         description: Fotos o descripción inválidas
 *       403:
 *         description: No eres el propietario de la moto
 *       404:
 *         description: Moto no encontrada
 */
router.get("/motos/:id/galeria", getGaleriaMoto);
router.post(
  "/motos/:id/galeria",
  verificarToken,
  permitirRoles("OWNER", "ADMIN"),
  postGaleriaMoto
);

export default router;