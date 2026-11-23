import * as service from "../services/renta.service.js";
import { responseSuccess } from "../utils/response.util.js";
import { ejecutar, exigirUsuario } from "../utils/handler.util.js";

export const listarClausulas = ejecutar(async (_req, res) => {
  const data = await service.listarClausulas();
  return responseSuccess(res, "Cláusulas vigentes", data, 200);
});

export const listarMisRentas = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.listarMisRentas(u);
  return responseSuccess(res, "Historial de rentas obtenido", data, 200);
});

export const crearRenta = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.crearRenta(u, req.body ?? {});
  return responseSuccess(res, "Solicitud de renta creada", data, 201);
});

export const firmarContrato = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.firmarContrato(u, String(req.params.id), req.body ?? {}, req.ip);
  return responseSuccess(res, "Contrato firmado con respaldo criptográfico", data, 201);
});

export const pagarRenta = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.pagarRenta(u, String(req.params.id), req.body ?? {});
  return responseSuccess(res, "Pago registrado correctamente", data, 201);
});

export const registrarEntrega = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.registrarEntregaPickup(u, String(req.params.id), req.body ?? {});
  return responseSuccess(res, "Acta de entrega (PICKUP) registrada; renta activa", data, 201);
});

export const registrarDevolucion = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.registrarDevolucionReturn(u, String(req.params.id), req.body ?? {});
  return responseSuccess(res, "Acta de devolución (RETURN) registrada; renta completada", data, 201);
});

export const cancelarRenta = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.cancelarRenta(u, String(req.params.id));
  return responseSuccess(res, "Renta cancelada correctamente", data, 200);
});

export const reportarIncidente = ejecutar(async (req, res) => {
  const u = exigirUsuario(req);
  const data = await service.reportarIncidente(u, String(req.params.id), req.body ?? {});
  return responseSuccess(res, "Incidente reportado y motocicleta bloqueada por seguridad", data, 200);
});
