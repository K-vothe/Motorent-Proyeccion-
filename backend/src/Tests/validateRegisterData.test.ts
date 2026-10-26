
import { test, mock} from "node:test";
import assert from "node:assert";
import { validateData } from "../middleware/validateRegisterData.js";



const datosValidos = {
    username: "usuario123",
    email: "usuario@ejemplo.com",
    password: "Clave123!",
    fullName: "Usuario De Prueba",
    phone: "3001234567"
};

function ejecutarValidacion(datos: Record<string, unknown>) {
    let statusCode = 0;
    let responseBody: unknown;

    const next = mock.fn();

    const req = {
        body: { ...datos }
    };

    const res = {
        status(code: number) {
            statusCode = code;
            return this;
        },
        json(data: unknown) {
            responseBody = data;
            return this;
        }
    };

    validateData(
        req as any,
        res as any,
        next as any
    );

    return { statusCode, responseBody, next };
}

test("Debe rechazar un username vacío", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        username: ""
    });

    console.log("Mensajeerror:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Dato incorrecto"
    });
});

test("Debe rechazar un username que no sea texto", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        username: 123
    });

    console.log("Mensajeerror:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Dato incorrecto"
    });
});

test("Debe rechazar un correo sin arroba", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        email: "correosinArroba.com"
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "El correo debe ser valido"
    });
});

test("Debe rechazar un correo que no sea texto", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        email: 123
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "El correo debe ser valido"
    });
});

test("Debe rechazar una contraseña vacía", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        password: ""
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Dato incorrecto"
    });
});

test("Debe rechazar una contraseña que no cumple el regex", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        password: "clave123"
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Contraseña no cumple los parametros"
    });
});

test("Debe rechazar un nombre completo vacío", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        fullName: ""
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Dato incorrecto"
    });
});

test("Debe rechazar un nombre completo demasiado corto", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        fullName: "Juan"
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Dato incorrecto"
    });
});

test("Debe rechazar un teléfono vacío", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        phone: ""
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Dato incorrecto"
    });
});

test("Debe rechazar un teléfono con letras", () => {
    const resultado = ejecutarValidacion({
        ...datosValidos,
        phone: "300ABC4567"
    });

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 400);
    assert.strictEqual(resultado.next.mock.callCount(), 0);
    assert.deepStrictEqual(resultado.responseBody, {
        ok: false,
        message: "Numero de telefono invalido"
    });
});

test("Debe permitir datos válidos", () => {
    const resultado = ejecutarValidacion(datosValidos);

    console.log("Debe permitir datos válidos:", resultado.responseBody);

    assert.strictEqual(resultado.statusCode, 0);
    assert.strictEqual(resultado.next.mock.callCount(), 1);
    assert.strictEqual(resultado.responseBody, undefined);
});


