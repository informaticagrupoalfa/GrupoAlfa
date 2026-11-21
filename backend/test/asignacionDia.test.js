import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { createAsignacionDocente, deleteAsignacionDocente, updateAsignacionDocente } from "../src/controllers/asignacionesDocentesParalelo.controllers.js";
import { createConfiguracionParalelo, updateConfiguracionParalelo } from "../src/controllers/configuracionParalelos.controllers.js";
import { parseWeekdays as parseBackend } from "../src/utils/weekdays.js";
import { parseWeekdays as parseFrontend } from "../../frontend/src/utils/weekdays.js";

const originalConnect = pool.connect;
const originalQuery = pool.query;

afterEach(() => {
  pool.connect = originalConnect;
  pool.query = originalQuery;
});

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    sendStatus(code) { this.statusCode = code; return this; },
  };
}

function fakeDatabase({ duplicate = false, subjectLink = 11, subjectId = 5 } = {}) {
  const updates = [];
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "Lunes, Miércoles y Viernes" }] };
      if (sql.includes("WHERE id_paralelo = $1 AND id_materia = $2")) {
        assert.deepEqual(params, [7, subjectId]);
        return { rows: [{
          id_paralelo_materia: subjectLink,
          id_paralelo: 7,
          id_materia: subjectId,
          id_asesor: duplicate ? 3 : null,
          dia: duplicate ? "lunes" : null,
        }] };
      }
      if (sql.includes("UPDATE paralelo_materia_asesor")) {
        updates.push(params);
        return { rows: [{ id_paralelo_materia: subjectLink }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  });
  pool.query = async () => ({ rows: [{ id_paralelo_materia: 51, id_asesor: 3, id_paralelo: 7, id_materia: 5, dia: "miercoles", dias: "miercoles" }] });
  return updates;
}

test("frontend y backend expanden los mismos días del paralelo", () => {
  const expected = ["lunes", "miercoles", "viernes"];
  assert.deepEqual(parseBackend("Lunes, Miércoles y Viernes"), expected);
  assert.deepEqual(parseFrontend("Lunes, Miércoles y Viernes"), expected);
  assert.deepEqual(parseBackend("lunes a viernes"), ["lunes", "martes", "miercoles", "jueves", "viernes"]);
});

test("asigna asesor y día sobre la materia existente del paralelo", async () => {
  const updates = fakeDatabase();
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 3, id_paralelo: 7, id_materia: 5, dia: "Miércoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(updates, [[3, "miercoles", 11]]);
});

test("permite asignar otra materia del mismo paralelo", async () => {
  const updates = fakeDatabase({ subjectLink: 12, subjectId: 6 });
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 4, id_paralelo: 7, id_materia: 6, dia: "miercoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(updates, [[4, "miercoles", 12]]);
});

test("rechaza una materia que ya tiene asesor en el paralelo", async () => {
  const updates = fakeDatabase({ duplicate: true });
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 4, id_paralelo: 7, id_materia: 5, dia: "miercoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 409);
  assert.equal(updates.length, 0);
});

test("actualiza solo la asignación seleccionada", async () => {
  let updated;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "lunes, miercoles" }] };
      if (sql.includes("WHERE id_paralelo_materia = $1")) {
        return { rows: [{ id_paralelo_materia: 51, id_paralelo: 7, id_materia: 5, id_asesor: 3, dia: "lunes" }] };
      }
      if (sql.includes("SELECT 1 FROM clases")) return { rowCount: 0 };
      if (sql.includes("WHERE id_paralelo = $1 AND id_materia = $2")) {
        return { rows: [{ id_paralelo_materia: 12, id_paralelo: 7, id_materia: 6, id_asesor: null, dia: null }] };
      }
      if (sql.includes("UPDATE paralelo_materia_asesor")) updated = params;
      return { rows: [], rowCount: 0 };
    },
  });
  pool.query = async () => ({ rows: [{ id_paralelo_materia: 51 }] });
  const res = response();
  await updateAsignacionDocente({ body: { id_paralelo_materia: 51, id_asesor: 4, id_paralelo: 7, id_materia: 6, dia: "Miércoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(updated, [4, "miercoles", 12]);
});

test("elimina la asignación liberando la materia del paralelo", async () => {
  let freedId;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "lunes, miercoles" }] };
      if (sql.includes("SET id_asesor = NULL")) { freedId = params[0]; return { rows: [], rowCount: 1 }; }
      if (sql.includes("WHERE id_paralelo_materia = $1")) {
        return { rows: [{ id_paralelo_materia: 51, id_paralelo: 7, id_materia: 5, id_asesor: 3, dia: "lunes" }] };
      }
      if (sql.includes("SELECT 1 FROM clases")) return { rowCount: 0 };
      return { rows: [], rowCount: 0 };
    },
  });
  const res = response();
  await deleteAsignacionDocente({ body: { id_paralelo_materia: 51 } }, res, error => { throw error; });
  assert.equal(res.statusCode, 204);
  assert.equal(freedId, 51);
});

test("crear un paralelo guarda materias y días sin asignar un asesor implícito", async () => {
  let storedDays;
  let matterInserts = 0;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("INSERT INTO paralelos")) {
        storedDays = params[7];
        return { rows: [{ id_paralelo: 7 }] };
      }
      if (sql.includes("SELECT 1 FROM materia_capacitacion")) return { rows: [{ "?column?": 1 }] };
      if (sql.includes("INSERT INTO paralelo_materia_asesor")) matterInserts++;
      return { rows: [], rowCount: 1 };
    },
  });
  const res = response();
  await createConfiguracionParalelo({ body: {
    id_capacitacion: 2, id_aula: 4, nombre_paralelo: "A mañana", dias: "Lunes, Miércoles y Viernes",
    hora_inicio: "08:00", hora_fin: "10:00", materias: [{ id_materia: 5 }],
  } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(storedDays, "lunes, miercoles, viernes");
  assert.equal(matterInserts, 1);
});

test("agregar una materia a un paralelo no le copia el asesor de otra materia", async () => {
  let assignmentInserts = 0;
  pool.connect = async () => ({
    release() {},
    async query(sql) {
      if (sql.includes("UPDATE paralelos SET")) return { rowCount: 1 };
      if (sql.includes("SELECT DISTINCT dia FROM paralelo_materia_asesor")) return { rows: [{ dia: "lunes" }] };
      if (sql.includes("SELECT id_paralelo_materia, id_materia")) return { rows: [{ id_paralelo_materia: 11, id_materia: 5 }] };
      if (sql.includes("SELECT 1 FROM materia_capacitacion")) return { rows: [{ "?column?": 1 }] };
      if (sql.includes("INSERT INTO paralelo_materia_asesor")) assignmentInserts++;
      return { rows: [], rowCount: 0 };
    },
  });
  const res = response();
  await updateConfiguracionParalelo({ params: { id: "7" }, body: {
    id_capacitacion: 2, id_aula: 4, nombre_paralelo: "A mañana", dias: "Lunes, Miércoles",
    materias: [{ id_materia: 5 }, { id_materia: 6 }],
  } }, res, error => { throw error; });
  assert.equal(res.statusCode, 200);
  // Se intenta insertar cada materia, pero el INSERT no incluye id_asesor.
  assert.equal(assignmentInserts, 2);
});
