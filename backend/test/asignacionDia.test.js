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

function fakeDatabase({ duplicate = false, subjectLink = 11 } = {}) {
  const inserted = [];
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "Lunes, Miércoles y Viernes" }] };
      if (sql.includes("SELECT id_paralelo_materia FROM paralelo_materia")) {
        assert.deepEqual(params, [7, subjectLink === 11 ? 5 : 6]);
        return { rows: [{ id_paralelo_materia: subjectLink }] };
      }
      if (sql.includes("SELECT 1 FROM asesor_paralelo_materia")) return { rowCount: duplicate ? 1 : 0 };
      if (sql.includes("INSERT INTO asesor_paralelo_materia")) {
        inserted.push(params);
        return { rows: [{ id_asesor_paralelo_materia: 51 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  });
  pool.query = async () => ({ rows: [{ id_asesor_paralelo_materia: 51, id_asesor: 3, id_paralelo: 7, id_materia: 5, dias: "miercoles" }] });
  return inserted;
}

test("frontend y backend expanden los mismos días del paralelo", () => {
  const expected = ["lunes", "miercoles", "viernes"];
  assert.deepEqual(parseBackend("Lunes, Miércoles y Viernes"), expected);
  assert.deepEqual(parseFrontend("Lunes, Miércoles y Viernes"), expected);
  assert.deepEqual(parseBackend("lunes a viernes"), ["lunes", "martes", "miercoles", "jueves", "viernes"]);
});

test("guarda solo la materia y el día elegidos", async () => {
  const inserted = fakeDatabase();
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 3, id_paralelo: 7, id_materia: 5, dias: "Miércoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(inserted, [[3, 11, "miercoles"]]);
});

test("permite otra materia en el mismo día", async () => {
  const inserted = fakeDatabase({ subjectLink: 12 });
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 4, id_paralelo: 7, id_materia: 6, dias: "miercoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(inserted, [[4, 12, "miercoles"]]);
});

test("rechaza una materia duplicada para el mismo día", async () => {
  const inserted = fakeDatabase({ duplicate: true });
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 4, id_paralelo: 7, id_materia: 5, dias: "miercoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 409);
  assert.equal(inserted.length, 0);
});

test("actualiza solo la asignación seleccionada", async () => {
  let updated;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "lunes, miercoles" }] };
      if (sql.includes("FROM asesor_paralelo_materia apm")) return { rows: [{ id_asesor_paralelo_materia: 51, id_paralelo: 7 }] };
      if (sql.includes("SELECT 1 FROM clases")) return { rowCount: 0 };
      if (sql.includes("SELECT id_paralelo_materia FROM paralelo_materia")) return { rows: [{ id_paralelo_materia: 12 }] };
      if (sql.includes("UPDATE asesor_paralelo_materia")) updated = params;
      return { rows: [], rowCount: 0 };
    },
  });
  pool.query = async () => ({ rows: [{ id_asesor_paralelo_materia: 51 }] });
  const res = response();
  await updateAsignacionDocente({ body: { id_asesor_paralelo_materia: 51, id_asesor: 4, id_paralelo: 7, id_materia: 6, dias: "Miércoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(updated, [4, 12, "miercoles", 51]);
});

test("elimina únicamente la asignación seleccionada", async () => {
  let deletedId;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "lunes, miercoles" }] };
      if (sql.includes("FROM asesor_paralelo_materia apm")) return { rows: [{ id_asesor_paralelo_materia: 51, id_paralelo: 7 }] };
      if (sql.includes("SELECT 1 FROM clases")) return { rowCount: 0 };
      if (sql.includes("DELETE FROM asesor_paralelo_materia")) deletedId = params[0];
      return { rows: [], rowCount: 0 };
    },
  });
  const res = response();
  await deleteAsignacionDocente({ body: { id_asesor_paralelo_materia: 51 } }, res, error => { throw error; });
  assert.equal(res.statusCode, 204);
  assert.equal(deletedId, 51);
});

test("crear un paralelo guarda materias y días sin asignar un asesor implícito", async () => {
  let storedDays;
  let assignmentInserts = 0;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("INSERT INTO paralelos")) {
        storedDays = params[7];
        return { rows: [{ id_paralelo: 7 }] };
      }
      if (sql.includes("SELECT 1 FROM materia_capacitacion")) return { rows: [{ "?column?": 1 }] };
      if (sql.includes("INSERT INTO asesor_paralelo_materia")) assignmentInserts++;
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
  assert.equal(assignmentInserts, 0);
});

test("agregar una materia a un paralelo no le copia el asesor de otra materia", async () => {
  let assignmentInserts = 0;
  pool.connect = async () => ({
    release() {},
    async query(sql) {
      if (sql.includes("UPDATE paralelos SET")) return { rowCount: 1 };
      if (sql.includes("SELECT DISTINCT apm.dias")) return { rows: [{ dias: "lunes" }] };
      if (sql.includes("SELECT pm.id_paralelo_materia")) return { rows: [{ id_paralelo_materia: 11, id_materia: 5 }] };
      if (sql.includes("SELECT 1 FROM materia_capacitacion")) return { rows: [{ "?column?": 1 }] };
      if (sql.includes("INSERT INTO asesor_paralelo_materia")) assignmentInserts++;
      return { rows: [], rowCount: 0 };
    },
  });
  const res = response();
  await updateConfiguracionParalelo({ params: { id: "7" }, body: {
    id_capacitacion: 2, id_aula: 4, nombre_paralelo: "A mañana", dias: "Lunes, Miércoles",
    materias: [{ id_materia: 5 }, { id_materia: 6 }],
  } }, res, error => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.equal(assignmentInserts, 0);
});
