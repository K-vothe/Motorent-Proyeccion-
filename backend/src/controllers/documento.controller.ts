import * as service from "../services/documento.service.js";
import { responseSuccess } from "../utils/response.util.js";
import { ejecutar, exigirUsuario } from "../utils/handler.util.js";

export const guardarDocumentosCliente = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.guardarDocumentosCliente(u.id, req.body);
  return responseSuccess(res, "Documentos del cliente guardados", data, 200);
});

export const verArchivoCliente = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const { mime, buffer } = await service.obtenerArchivoCliente(
    u, String(req.params.userId), String(req.params.campo)
  );
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(buffer);
});

export const guardarDocumentoLegal = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.guardarDocumentoLegal(
    u, String(req.params.motoId), String(req.params.tipo), req.body
  );
  return responseSuccess(res, "Documento legal guardado", data, 200);
});

export const verDocumentoLegal = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const { mime, buffer } = await service.obtenerDocumentoLegal(
    u, String(req.params.motoId), String(req.params.tipo)
  );
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(buffer);
});

export const disponibilidadMoto = ejecutar(async (req, res) => {
  const data = await service.consultarDisponibilidad(String(req.params.motoId));
  return responseSuccess(res, "Disponibilidad consultada", data, 200);
});

export const subirImagenMoto = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.guardarImagenMoto(u, String(req.params.motoId), req.body);
  return responseSuccess(res, "Imagen guardada", data, 201);
});

export const listarImagenesMoto = ejecutar(async (req, res) => {
  const data = await service.listarImagenes(String(req.params.motoId));
  return responseSuccess(res, "Imágenes de la moto", data, 200);
});

export const verImagenMoto = ejecutar(async (req, res) => {
  const { mime, buffer } = await service.obtenerImagen(String(req.params.imageId));
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(buffer);
});