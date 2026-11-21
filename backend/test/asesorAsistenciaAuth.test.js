import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { authorizeApi } from "../src/middleware/apiAuthorization.js";

const originalQuery = pool.query;
afterEach(() => { pool.query = originalQuery; });

function authorize(method, path, { body = {}, query = {}, roles = ["Asesor"] } = {}) {
  return new Promise((resolve) => {
    const req = {
      method, path, body, query,
      user: { id_usuario: 42, roles },
    };
    const res = {
      status(code) { this.code = code; return this; },
      json(payload) { resolve({ status: this.code, payload }); },
    };
    authorizeApi(req, res, () => resolve({ status: 200 }));
  });
}

test("asesor solo consulta estudiantes de un paralelo propio", async () => {
  pool.query = async () => ({ rows: [] });
  assert.equal((await authorize("GET", "/llamar-lista/paralelos/9/estudiantes")).status, 403);
  pool.query = async () => ({ rows: [{ "?column?": 1 }] });
  assert.equal((await authorize("GET", "/llamar-lista/paralelos/9/estudiantes")).status, 200);
});

test("asesor consulta asistencia solo de su clase", async () => {
  pool.query = async () => ({ rows: [] });
  assert.equal((await authorize("GET", "/asistencias", { query: { id_clase: "3" } })).status, 403);
  assert.equal((await authorize("GET", "/asistencias")).status, 400);
  pool.query = async () => ({ rows: [{ "?column?": 1 }] });
  assert.equal((await authorize("GET", "/asistencias", { query: { id_clase: "3" } })).status, 200);
});

test("asesor registra asistencia solo de estudiante inscrito en su clase", async () => {
  pool.query = async (sql, params) => {
    assert.match(sql, /JOIN inscripciones i ON i\.id_paralelo = pma\.id_paralelo/);
    assert.deepEqual(params, [3, 42, 11]);
    return { rows: [] };
  };
  assert.equal((await authorize("POST", "/asistencias", {
    body: { id_clase: 3, id_estudiante: 11 },
  })).status, 403);
});

test("Administración con rol de Asesor puede crear clases y registrar asistencias sin la restricción de asignación propia", async () => {
  pool.query = async () => { throw new Error("No debe consultar asignaciones propias"); };
  const roles = ["Asesor", "Administración"];
  assert.equal((await authorize("POST", "/clases", {
    roles,
    body: { id_paralelo: 3, inicioclase: "2026-11-20" },
  })).status, 200);
  assert.equal((await authorize("POST", "/asistencias", {
    roles,
    body: { id_clase: 7, id_estudiante: 11 },
  })).status, 200);
});
