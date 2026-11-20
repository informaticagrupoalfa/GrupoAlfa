import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { createAsignacionDocente, deleteAsignacionDocente } from "../src/controllers/asignacionesDocentesParalelo.controllers.js";
import { createConfiguracionParalelo } from "../src/controllers/configuracionParalelos.controllers.js";
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

function fakeDatabase(occupiedDays = []) {
  const inserted = [];
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "Lunes, Miércoles y Viernes" }] };
      if (sql.includes("SELECT id_paralelo_materia FROM paralelo_materia")) {
        return { rows: [{ id_paralelo_materia: 11 }, { id_paralelo_materia: 12 }] };
      }
      if (sql.includes("SELECT apm.dias FROM asesor_paralelo_materia")) {
        return { rows: occupiedDays.map(dias => ({ dias })) };
      }
      if (sql.includes("INSERT INTO asesor_paralelo_materia")) {
        inserted.push(params);
        return { rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  });
  pool.query = async () => ({ rows: [{ id_asesor: 3, id_paralelo: 7, dias: "miercoles" }] });
  return inserted;
}

test("frontend y backend expanden los mismos días del paralelo", () => {
  const expected = ["lunes", "miercoles", "viernes"];
  assert.deepEqual(parseBackend("Lunes, Miércoles y Viernes"), expected);
  assert.deepEqual(parseFrontend("Lunes, Miércoles y Viernes"), expected);
  assert.deepEqual(parseBackend("lunes a viernes"), ["lunes", "martes", "miercoles", "jueves", "viernes"]);
});

test("asigna un asesor a cada materia del paralelo para un día", async () => {
  const inserted = fakeDatabase();
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 3, id_paralelo: 7, dias: "Miércoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(inserted, [[3, 11, "miercoles"], [3, 12, "miercoles"]]);
});

test("rechaza un día ocupado antes de insertar otra asignación", async () => {
  const inserted = fakeDatabase(["Miércoles"]);
  const res = response();
  await createAsignacionDocente({ body: { id_asesor: 4, id_paralelo: 7, dias: "miercoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 409);
  assert.equal(inserted.length, 0);
});

test("elimina únicamente las filas del asesor y día solicitados", async () => {
  let deletedIds;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelos WHERE")) return { rows: [{ id_paralelo: 7, dias: "lunes, miercoles" }] };
      if (sql.includes("SELECT apm.id_asesor_paralelo_materia")) {
        assert.deepEqual(params, [3, 7, "miercoles"]);
        return { rows: [{ id_asesor_paralelo_materia: 51 }, { id_asesor_paralelo_materia: 52 }] };
      }
      if (sql.includes("SELECT 1 FROM clases")) return { rowCount: 0 };
      if (sql.includes("DELETE FROM asesor_paralelo_materia")) deletedIds = params[0];
      return { rows: [], rowCount: 0 };
    },
  });
  const res = response();
  await deleteAsignacionDocente({ body: { id_asesor: 3, id_paralelo: 7, dias: "Miércoles" } }, res, error => { throw error; });
  assert.equal(res.statusCode, 204);
  assert.deepEqual(deletedIds, [51, 52]);
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
