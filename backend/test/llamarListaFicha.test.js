import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { getFichaEstudianteRegistrado } from "../src/controllers/llamarLista.controllers.js";
import { authorizeApi } from "../src/middleware/apiAuthorization.js";

const originalQuery = pool.query;
afterEach(() => { pool.query = originalQuery; });

async function getFicha({ roles = ["Asesor"], scope = "mine", rows = [] } = {}) {
  let query;
  pool.query = async (sql, params) => {
    query = { sql, params };
    return { rows };
  };
  const response = { status: 200 };
  const res = {
    status(code) { response.status = code; return this; },
    json(data) { response.data = data; },
  };
  await getFichaEstudianteRegistrado(
    { params: { classId: "7", studentId: "11" }, query: { scope }, user: { id_usuario: 42, roles } },
    res,
    (error) => { throw error; },
  );
  return { query, response };
}

test("la ficha del asesor exige clase propia, inscripción y asistencia registrada", async () => {
  const { query, response } = await getFicha();
  assert.equal(response.status, 404);
  assert.deepEqual(query.params, [7, 11, 42]);
  assert.match(query.sql, /asesor\.id_usuario = \$3/);
  assert.match(query.sql, /i\.id_paralelo = p\.id_paralelo AND i\.id_estudiante = \$2/);
  assert.match(query.sql, /EXISTS \(SELECT 1 FROM asistencias/);
  assert.match(query.sql, /apoderado_nombre/);
  assert.match(query.sql, /carrera_nombre/);
  assert.match(query.sql, /foto_base64/);
});

test("SysAdmin puede consultar otra clase y respeta el alcance de Asesor activo", async () => {
  assert.deepEqual((await getFicha({ roles: ["SysAdmin"], scope: "all" })).query.params, [7, 11, null]);
  assert.deepEqual((await getFicha({ roles: ["SysAdmin", "Asesor"], scope: "mine" })).query.params, [7, 11, 42]);
});

test("otros roles no pueden obtener la ficha", async () => {
  const { query, response } = await getFicha({ roles: ["Administración"] });
  assert.equal(response.status, 403);
  assert.equal(query, undefined);
});

test("la autorización API permite al Asesor solicitar la ficha limitada", async () => {
  const result = await new Promise(resolve => {
    const req = {
      method: "GET", path: "/llamar-lista/clases/7/estudiantes/11/ficha",
      user: { id_usuario: 42, roles: ["Asesor"] }, query: { scope: "mine" },
    };
    authorizeApi(req, { status(code) { this.code = code; return this; }, json() { resolve(this.code); } }, () => resolve(200));
  });
  assert.equal(result, 200);
});
