import type { NextFunction, Response } from "express";
import type { AuthRequest } from "./auth.middleware.js";

export type RolSistema = "USER" | "RENTER" | "OWNER" | "ADMIN";

/**
 * Middleware de control de acceso basado en roles (RBAC).
 *
 * Debe ejecutarse siempre DESPUÉS de `verificarToken`, ya que depende de
 * `req.usuario` (decodificado del JWT).
 *
 * Ejemplo de uso:
 *   router.post("/create/moto", verificarToken, permitirRoles("OWNER", "ADMIN"), createMoto);
 */
export const permitirRoles = (...rolesPermitidos: RolSistema[]) => {
  const rolesNormalizados = rolesPermitidos.map((rol) => rol.toUpperCase());

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        status: "error",
        mensaje: "Acceso denegado. No se encontró una sesión autenticada.",
        data: null,
        error: null,
        code: 401,
      });
    }

    const rolUsuario = String(req.usuario.role || "").toUpperCase();

    if (!rolesNormalizados.includes(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        status: "error",
        mensaje:
          "No tienes permisos suficientes para realizar esta acción con tu rol actual.",
        data: null,
        error: {
          rolActual: rolUsuario || "DESCONOCIDO",
          rolesRequeridos: rolesNormalizados,
        },
        code: 403,
      });
    }

    return next();
  };
};
