import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { authorizeApi } from "../src/middleware/apiAuthorization.js";

const originalQuery = pool.query;
afterEach(() => { pool.query = originalQuery; });

function authorize(method, path, { body = {}, query = {} } = {}) {
  return new Promise((resolve) => {
    const req = {
      method, path, body, query,
      user: { id_usuario: 42, roles: ["Asesor"] },
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
    assert.match(sql, /JOIN inscripciones i ON i\.id_paralelo = pm\.id_paralelo/);
    assert.deepEqual(params, [3, 42, 11]);
    return { rows: [] };
  };
  assert.equal((await authorize("POST", "/asistencias", {
    body: { id_clase: 3, id_estudiante: 11 },
  })).status, 403);
});
