import { Router } from "express";
import { verificarToken } from "../middleware/auth.middleware.js";
import {
  listarClausulas,
  listarMisRentas,
  crearRenta,
  firmarContrato,
  pagarRenta,
  registrarEntrega,
  registrarDevolucion,
  cancelarRenta,
  reportarIncidente,
} from "../controllers/renta.controller.js";

const router = Router();

router.get("/clausulas", listarClausulas);
router.get("/rentas/mias", verificarToken, listarMisRentas);
router.post("/rentas", verificarToken, crearRenta);
router.post("/rentas/:id/contrato/firmar", verificarToken, firmarContrato);
router.post("/rentas/:id/pago", verificarToken, pagarRenta);
router.post("/rentas/:id/entrega", verificarToken, registrarEntrega);
router.post("/rentas/:id/devolucion", verificarToken, registrarDevolucion);
router.post("/rentas/:id/cancelar", verificarToken, cancelarRenta);
router.post("/rentas/:id/incidente", verificarToken, reportarIncidente);

export default router;
