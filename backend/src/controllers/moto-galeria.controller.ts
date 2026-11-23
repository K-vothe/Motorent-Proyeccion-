import {
  actualizarGaleriaMoto,
  obtenerGaleriaMoto,
} from "../services/moto-galeria.service.js";
import { ejecutar, exigirUsuario } from "../utils/handler.util.js";
import { responseSuccess } from "../utils/response.util.js";

/** GET /api/motos/:id/galeria — pública, cualquiera puede ver las fotos. */
export const getGaleriaMoto = ejecutar(async (req, res) => {
  const galeria = await obtenerGaleriaMoto(String(req.params.id ?? ""));
  return responseSuccess(res, "Galería obtenida correctamente", galeria, 200);
});

/** POST /api/motos/:id/galeria — solo el propietario de la moto o un ADMIN. */
export const postGaleriaMoto = ejecutar(async (req, res) => {
  const usuario = exigirUsuario(req);
  const galeria = await actualizarGaleriaMoto(
    usuario,
    String(req.params.id ?? ""),
    req.body ?? {}
  );
  return responseSuccess(res, "Galería actualizada correctamente", galeria, 200);
});
