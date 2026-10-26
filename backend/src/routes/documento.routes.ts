import { Router } from "express";
import { verificarToken } from "../middleware/auth.middleware.js";
import {
  guardarDocumentosCliente, verArchivoCliente,
  guardarDocumentoLegal, verDocumentoLegal, disponibilidadMoto,
  subirImagenMoto, listarImagenesMoto, verImagenMoto,
} from "../controllers/documento.controller.js";

const router = Router();

// Cliente (licencia y documento cifrados)
router.put("/clientes/me/documentos", verificarToken, guardarDocumentosCliente);
router.get("/clientes/:userId/documentos/:campo", verificarToken, verArchivoCliente);

// Documentos legales de la moto (cifrados, con vigencia)
router.put("/motos/:motoId/documentos/:tipo", verificarToken, guardarDocumentoLegal);
router.get("/motos/:motoId/documentos/:tipo", verificarToken, verDocumentoLegal);
router.get("/motos/:motoId/disponibilidad", disponibilidadMoto);

// Imágenes de la moto (públicas)
router.post("/motos/:motoId/imagenes", verificarToken, subirImagenMoto);
router.get("/motos/:motoId/imagenes", listarImagenesMoto);
router.get("/imagenes-moto/:imageId", verImagenMoto);

export default router;