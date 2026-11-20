import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { getInscripcionFichas, getInscripcionFichaById } from "../src/controllers/inscripciones.controllers.js";
import { authorizeApi } from "../src/middleware/apiAuthorization.js";

const originalQuery = pool.query;
afterEach(() => { pool.query = originalQuery; });

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("las fichas paginan y buscan por identificadores del estudiante", async () => {
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    return sql.includes("COUNT(*)")
      ? { rows: [{ total: 21 }] }
      : { rows: [{ id_inscripcion: 9, nombre: "Ana", ci: "123" }] };
  };
  const res = response();
  await getInscripcionFichas({ query: { q: "Ana", limit: "15", offset: "15" } }, res, (error) => { throw error; });
  assert.equal(res.body.total, 21);
  assert.equal(res.body.items[0].nombre, "Ana");
  assert.deepEqual(queries[0].params, ["%Ana%", 15, 15]);
  assert.deepEqual(queries[1].params, ["%Ana%"]);
  assert.match(queries[0].sql, /LEFT JOIN usuarios u ON u\.id_usuario = e\.id_usuario/);
});

test("la ficha individual responde 404 si no existe", async () => {
  pool.query = async () => ({ rows: [] });
  const res = response();
  await getInscripcionFichaById({ params: { id: "99" } }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 404);
});

test("solo los roles de inscripciones acceden a las fichas con datos personales", async () => {
  const authorize = (role) => new Promise((resolve) => {
    const req = { method: "GET", path: "/inscripciones/9/ficha", user: { id_usuario: 1, roles: [role] } };
    const res = { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code, body }); } };
    authorizeApi(req, res, () => resolve({ status: 200 }));
  });
  assert.equal((await authorize("Cajero")).status, 403);
  assert.equal((await authorize("Administración")).status, 200);
});
