/**
 * GESTOR LOCAL DE POSTGRESQL 18 AISLADO PARA MOTORENT (FASE 8)
 *
 * Permite iniciar, detener y consultar una instancia independiente de PostgreSQL 18
 * en el puerto 5433 (base `motorent_trabajo`), almacenada fuera de OneDrive
 * (`%LOCALAPPDATA%\MotoRent\pgdata_trabajo`) para evitar bloqueos de sincronización
 * y sin interferir nunca con la base estable `motorent` del puerto 5432.
 *
 * Uso:
 *   node scripts/db-local.mjs status
 *   node scripts/db-local.mjs start
 *   node scripts/db-local.mjs stop
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const PG_BIN = process.env.PG_BIN_DIR || "C:\\Program Files\\PostgreSQL\\18\\bin";
const LOCAL_APP_DATA = process.env.LOCALAPPDATA || path.resolve(process.cwd(), ".local");
const DATA_DIR = process.env.MOTORENT_PG_DATA || path.join(LOCAL_APP_DATA, "MotoRent", "pgdata_trabajo");
const LOG_FILE = path.join(LOCAL_APP_DATA, "MotoRent", "pg_trabajo.log");
const PORT = process.env.MOTORENT_PG_PORT || "5433";
const DB_NAME = process.env.MOTORENT_PG_DB || "motorent_trabajo";
const DB_USER = process.env.MOTORENT_PG_USER || "postgres";
const DB_PASS = process.env.MOTORENT_PG_PASS || "Admin123";

function bin(nombre) {
  return path.join(PG_BIN, process.platform === "win32" ? `${nombre}.exe` : nombre);
}

function ejecutar(comando, args, envExtra = {}) {
  return spawnSync(comando, args, {
    stdio: "inherit",
    env: { ...process.env, ...envExtra },
  });
}

function estaLista() {
  const res = spawnSync(bin("pg_isready"), ["-h", "localhost", "-p", PORT], {
    stdio: "ignore",
  });
  return res.status === 0;
}

function inicializarSiNoExiste() {
  if (existsSync(path.join(DATA_DIR, "PG_VERSION"))) return;

  console.log(`[db-local] Inicializando cluster PostgreSQL en ${DATA_DIR}...`);
  mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  const pwFile = path.join(path.dirname(DATA_DIR), ".pgpw.tmp");
  writeFileSync(pwFile, DB_PASS, "ascii");

  const init = ejecutar(bin("initdb"), [
    "-D", DATA_DIR,
    "-U", DB_USER,
    `--pwfile=${pwFile}`,
    "--encoding=UTF8",
    "--locale=C",
    "--auth=scram-sha-256",
  ]);
  try { unlinkSync(pwFile); } catch { /* noop */ }
  if (init.status !== 0) process.exit(init.status ?? 1);

  appendFileSync(
    path.join(DATA_DIR, "postgresql.conf"),
    `\nport = ${PORT}\nlisten_addresses = 'localhost'\n`
  );
}

function asegurarBaseDeDatos() {
  const check = spawnSync(
    bin("psql"),
    ["-h", "localhost", "-p", PORT, "-U", DB_USER, "-d", "postgres", "-tAc",
      `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`],
    { encoding: "utf8", env: { ...process.env, PGPASSWORD: DB_PASS } }
  );
  if ((check.stdout || "").trim() === "1") return;

  console.log(`[db-local] Creando base de datos '${DB_NAME}'...`);
  const created = ejecutar(
    bin("createdb"),
    ["-h", "localhost", "-p", PORT, "-U", DB_USER, DB_NAME],
    { PGPASSWORD: DB_PASS }
  );
  if (created.status !== 0) process.exit(created.status ?? 1);
}

const accion = (process.argv[2] || "status").toLowerCase();

if (accion === "status") {
  if (estaLista()) {
    console.log(`[db-local] PostgreSQL aislado ACTIVO en localhost:${PORT} (BD: ${DB_NAME})`);
    process.exit(0);
  }
  console.log(`[db-local] PostgreSQL aislado DETENIDO en localhost:${PORT}`);
  process.exit(1);
}

if (accion === "start") {
  inicializarSiNoExiste();
  if (!estaLista()) {
    console.log(`[db-local] Iniciando PostgreSQL en localhost:${PORT}...`);
    const res = ejecutar(bin("pg_ctl"), ["-D", DATA_DIR, "-l", LOG_FILE, "-o", `-p ${PORT}`, "start"]);
    if (res.status !== 0) process.exit(res.status ?? 1);
  } else {
    console.log(`[db-local] PostgreSQL ya estaba activo en localhost:${PORT}.`);
  }
  asegurarBaseDeDatos();
  console.log(`[db-local] Listo: postgresql://${DB_USER}:***@localhost:${PORT}/${DB_NAME}`);
  process.exit(0);
}

if (accion === "stop") {
  if (!estaLista()) {
    console.log(`[db-local] PostgreSQL ya estaba detenido en localhost:${PORT}.`);
    process.exit(0);
  }
  const res = ejecutar(bin("pg_ctl"), ["-D", DATA_DIR, "stop", "-m", "fast"]);
  process.exit(res.status ?? 0);
}

console.error(`Acción desconocida: '${accion}'. Usa: status | start | stop`);
process.exit(1);
