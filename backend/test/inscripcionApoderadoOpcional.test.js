import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { registrarEstudiante } from "../src/controllers/inscripciones.controllers.js";

const originalConnect = pool.connect;
afterEach(() => { pool.connect = originalConnect; });

function mockDatabase(existingStudent = false) {
  const queries = [];
  pool.connect = async () => ({
    release() {},
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes("FROM usuarios WHERE nro_carnet")) return { rows: [{ id_usuario: params[0] === "123" ? 1 : 2 }] };
      if (sql.includes("FROM apoderados WHERE")) return { rows: [{ id_apoderado: 3 }] };
      if (sql.includes("FROM estudiantes WHERE")) return { rows: existingStudent ? [{ id_estudiante: 4 }] : [] };
      if (sql.includes("INSERT INTO estudiantes")) return { rows: [{ id_estudiante: 4 }] };
      if (sql.includes("INSERT INTO inscripciones")) return { rows: [{ id_inscripcion: 5 }] };
      return { rows: [] };
    },
  });
  return queries;
}

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("registra un estudiante sin crear apoderado", async () => {
  const queries = mockDatabase();
  const res = response();
  await registrarEstudiante({ body: { ci: "123" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.id_apoderado, null);
  assert.equal(queries.find(q => q.sql.includes("INSERT INTO estudiantes")).params[1], null);
  assert.equal(queries.some(q => q.sql.includes("FROM apoderados WHERE")), false);
  assert.equal(queries.some(q => q.params.includes("Apoderado")), false);
});

test("conserva el apoderado previo del estudiante si no se envía otro", async () => {
  const queries = mockDatabase(true);
  const res = response();
  await registrarEstudiante({ body: { ci: "123" } }, res, error => { throw error; });
  const update = queries.find(q => q.sql.includes("UPDATE estudiantes"));
  assert.equal(res.statusCode, 201);
  assert.match(update.sql, /id_apoderado = COALESCE\(\$1, id_apoderado\)/);
  assert.equal(update.params[0], null);
});

test("reutiliza el apoderado indicado y lo vincula al estudiante", async () => {
  const queries = mockDatabase();
  const res = response();
  await registrarEstudiante({ body: { ci: "123", apoderado_ci: "456" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.id_apoderado, 3);
  assert.equal(queries.find(q => q.sql.includes("INSERT INTO estudiantes")).params[1], 3);
  assert.equal(queries.some(q => q.params.includes("Apoderado")), true);
});

test("rechaza datos parciales de apoderado sin CI", async () => {
  const queries = mockDatabase();
  const res = response();
  await registrarEstudiante({ body: { ci: "123", apoderado_nombre: "Ana" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 400);
  assert.equal(queries.some(q => q.sql === "ROLLBACK"), true);
});
