import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { getMisAsistencias } from "../src/controllers/miInformacion.controllers.js";

const originalQuery = pool.query;
afterEach(() => { pool.query = originalQuery; });

function response() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test("el estudiante consulta solamente sus propias asistencias", async () => {
  const expected = [{ id_asistencia: 9, permiso: null, hora_entrada: "2026-11-23T08:00:00" }];
  pool.query = async (sql, params) => {
    assert.match(sql, /JOIN estudiantes e ON e\.id_estudiante = a\.id_estudiante/);
    assert.match(sql, /WHERE e\.id_usuario = \$1/);
    assert.deepEqual(params, [42, 100, 0]);
    return { rows: expected };
  };

  const req = { user: { id_usuario: 42, roles: ["Estudiante"] }, query: {} };
  const res = response();
  await getMisAsistencias(req, res, (error) => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, expected);
});

test("la vista personal de asistencias rechaza otros roles", async () => {
  pool.query = async () => { throw new Error("No debe consultar la base de datos"); };
  const req = { user: { id_usuario: 42, roles: ["Administración"] }, query: {} };
  const res = response();
  await getMisAsistencias(req, res, (error) => { throw error; });

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error, "Este portal es exclusivo para estudiantes");
});
