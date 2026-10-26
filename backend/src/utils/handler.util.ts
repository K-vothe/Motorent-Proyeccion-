import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { responseError } from "./response.util.js";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const exigirUsuario = (req: AuthRequest) => {
  if (!req.usuario) throw new AppError("No autenticado", 401);
  return req.usuario;
};

// Envuelve un controlador: atrapa errores y responde con el código correcto
export const ejecutar =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error("Error en controlador:", error);
      if ((error as { code?: string })?.code === "P2002") {
        return responseError(res, "Ya existe un registro con ese dato único (documento, licencia o placa)", null, 409);
      }
      const status = error instanceof AppError ? error.status : 400;
      const mensaje = error instanceof Error ? error.message : "Error desconocido";
      return responseError(res, mensaje, null, status);
    }
  };