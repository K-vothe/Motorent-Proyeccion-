import test from "node:test";
import assert from "node:assert/strict";
import { permitirRoles } from "../src/middleware/role.middleware.js";

function crearRespuestaSimulada() {
  return {
    statusCode: 0,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

test("permitirRoles responde 401 si no existe req.usuario", () => {
  const middleware = permitirRoles("OWNER", "ADMIN");
  const req: any = {};
  const res = crearRespuestaSimulada();
  let nextLlamado = false;

  middleware(req, res as any, () => {
    nextLlamado = true;
  });

  assert.strictEqual(nextLlamado, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body?.ok, false);
});

test("permitirRoles responde 403 cuando USER intenta acceder a una ruta OWNER/ADMIN", () => {
  const middleware = permitirRoles("OWNER", "ADMIN");
  const req: any = { usuario: { id: "u-1", role: "USER" } };
  const res = crearRespuestaSimulada();
  let nextLlamado = false;

  middleware(req, res as any, () => {
    nextLlamado = true;
  });

  assert.strictEqual(nextLlamado, false);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body?.error?.rolActual, "USER");
  assert.deepStrictEqual(res.body?.error?.rolesRequeridos, ["OWNER", "ADMIN"]);
});

test("permitirRoles responde 403 cuando RENTER intenta acceder a una ruta exclusiva de ADMIN", () => {
  const middleware = permitirRoles("ADMIN");
  const req: any = { usuario: { id: "u-2", role: "RENTER" } };
  const res = crearRespuestaSimulada();
  let nextLlamado = false;

  middleware(req, res as any, () => {
    nextLlamado = true;
  });

  assert.strictEqual(nextLlamado, false);
  assert.strictEqual(res.statusCode, 403);
});

test("permitirRoles permite el paso (llama next) cuando el rol es OWNER", () => {
  const middleware = permitirRoles("OWNER", "ADMIN");
  const req: any = { usuario: { id: "u-3", role: "OWNER" } };
  const res = crearRespuestaSimulada();
  let nextLlamado = false;

  middleware(req, res as any, () => {
    nextLlamado = true;
  });

  assert.strictEqual(nextLlamado, true);
  assert.strictEqual(res.statusCode, 0);
});

test("permitirRoles normaliza mayúsculas/minúsculas y permite el paso a ADMIN", () => {
  const middleware = permitirRoles("ADMIN");
  const req: any = { usuario: { id: "u-4", role: "admin" } };
  const res = crearRespuestaSimulada();
  let nextLlamado = false;

  middleware(req, res as any, () => {
    nextLlamado = true;
  });

  assert.strictEqual(nextLlamado, true);
  assert.strictEqual(res.statusCode, 0);
});
