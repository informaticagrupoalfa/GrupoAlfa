import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { getAsignacionesAsesor, getClasesAsesor } from "../src/controllers/llamarLista.controllers.js";

const originalQuery = pool.query;
afterEach(() => { pool.query = originalQuery; });

async function run(handler, roles, scope) {
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    return { rows: [] };
  };
  await handler(
    { user: { id_usuario: 42, roles }, query: { scope } },
    { json: () => {} },
    (error) => { throw error; },
  );
  return queries[0];
}

test("SysAdmin consulta todas las asignaciones y clases para llamar lista", async () => {
  const asignaciones = await run(getAsignacionesAsesor, ["SysAdmin"]);
  const clases = await run(getClasesAsesor, ["SysAdmin"]);
  assert.deepEqual(asignaciones.params, []);
  assert.doesNotMatch(asignaciones.sql, /WHERE a\.id_usuario = \$1/);
  assert.deepEqual(clases.params, []);
  assert.doesNotMatch(clases.sql, /WHERE asesor\.id_usuario = \$1/);
});

test("Asesor sigue viendo solo sus asignaciones y clases", async () => {
  const asignaciones = await run(getAsignacionesAsesor, ["Asesor"]);
  const clases = await run(getClasesAsesor, ["Asesor"]);
  assert.deepEqual(asignaciones.params, [42]);
  assert.match(asignaciones.sql, /WHERE a\.id_usuario = \$1/);
  assert.deepEqual(clases.params, [42]);
  assert.match(clases.sql, /WHERE asesor\.id_usuario = \$1/);
});

test("una cuenta con ambos roles respeta el alcance activo de Asesor", async () => {
  const roles = ["SysAdmin", "Asesor"];
  const asignaciones = await run(getAsignacionesAsesor, roles, "mine");
  const clases = await run(getClasesAsesor, roles, "mine");
  assert.deepEqual(asignaciones.params, [42]);
  assert.deepEqual(clases.params, [42]);
});
