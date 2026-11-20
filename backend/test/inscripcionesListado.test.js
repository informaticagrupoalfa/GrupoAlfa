import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { getInscripcionesListado, getInscripcionDetalle } from "../src/controllers/inscripciones.controllers.js";
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

test("el listado pagina y busca sin cargar todos los registros", async () => {
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    return sql.includes("COUNT(*)")
      ? { rows: [{ total: 31 }] }
      : { rows: [{ id_inscripcion: 7, estudiante_nombre: "Ana Pérez" }] };
  };
  const res = response();
  await getInscripcionesListado({ query: { q: "Ana", limit: "20", offset: "20" } }, res, error => { throw error; });
  assert.equal(res.body.total, 31);
  assert.equal(res.body.items[0].id_inscripcion, 7);
  assert.deepEqual(queries[0].params, ["%Ana%", 20, 20]);
  assert.match(queries[0].sql, /LEFT JOIN facultades f/);
  assert.match(queries[0].sql, /LEFT JOIN carreras cr/);
  assert.match(queries[0].sql, /LEFT JOIN LATERAL \([\s\S]*FROM postulaciones po/);
  assert.doesNotMatch(queries[0].sql, /contraseña|foto_base64/);
});

test("el detalle reúne relaciones académicas y usuarios sin credenciales", async () => {
  let query = "";
  pool.query = async (sql, params) => {
    query = sql;
    assert.deepEqual(params, [7]);
    return { rows: [{ id_inscripcion: 7, facultad_nombre: "Ingeniería", estudiante_nombre: "Ana" }] };
  };
  const res = response();
  await getInscripcionDetalle({ params: { id: "7" } }, res, error => { throw error; });
  assert.equal(res.body.facultad_nombre, "Ingeniería");
  assert.match(query, /a\.capacidad AS aula_capacidad/);
  assert.match(query, /au\.correo_electronico AS administrativo_correo/);
  assert.match(query, /eu\.correo_electronico AS estudiante_correo/);
  assert.doesNotMatch(query, /contraseña|e\.foto/);
});

test("el detalle valida el ID y responde 404 si no existe", async () => {
  pool.query = async () => ({ rows: [] });
  const invalid = response();
  await getInscripcionDetalle({ params: { id: "x" } }, invalid, error => { throw error; });
  assert.equal(invalid.statusCode, 400);
  const missing = response();
  await getInscripcionDetalle({ params: { id: "99" } }, missing, error => { throw error; });
  assert.equal(missing.statusCode, 404);
});

test("roles académicos consultan el listado, pero no la ficha de edición", async () => {
  const authorize = (role, path, method = "GET") => new Promise(resolve => {
    const req = { method, path, user: { id_usuario: 1, roles: [role] } };
    const res = { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code, body }); } };
    authorizeApi(req, res, () => resolve({ status: 200 }));
  });
  assert.equal((await authorize("Cajero", "/inscripciones/listado")).status, 200);
  assert.equal((await authorize("Gerencia", "/inscripciones/7/detalle")).status, 200);
  assert.equal((await authorize("Asesor", "/inscripciones/listado")).status, 403);
  assert.equal((await authorize("Cajero", "/inscripciones/7/ficha")).status, 403);
  assert.equal((await authorize("Cajero", "/inscripciones", "POST")).status, 403);
});
