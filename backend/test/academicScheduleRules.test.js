import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { pool } from "../src/db.js";
import { createClase, updateClase } from "../src/controllers/clases.controllers.js";
import { createAsistencia, updateAsistencia } from "../src/controllers/asistencias.controllers.js";
import { academicClock, scheduleProblem } from "../src/utils/academicSchedule.js";

const originalQuery = pool.query;
const originalConnect = pool.connect;
afterEach(() => {
  pool.query = originalQuery;
  pool.connect = originalConnect;
});

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("usa fecha, hora y día de Bolivia para validar el horario académico", () => {
  const clock = academicClock(new Date("2026-11-23T13:30:00.000Z"));
  assert.deepEqual(clock, { date: "2026-11-23", time: "09:30:00", weekday: "lunes" });
  assert.equal(scheduleProblem({ dia_asignacion: "lunes", dias_paralelo: "lunes, martes", hora_inicio: "08:00", hora_fin: "10:00" }, clock), null);
  assert.match(
    scheduleProblem({ dia_asignacion: "martes", dias_paralelo: "lunes, martes", hora_inicio: "08:00", hora_fin: "10:00" }, clock),
    /asignada al día martes/,
  );
  assert.match(
    scheduleProblem({ dia_asignacion: "lunes", dias_paralelo: "lunes", hora_inicio: "10:00", hora_fin: "12:00" }, clock),
    /solo pueden registrarse/,
  );
});

test("crea la clase con la fecha del servidor dentro del horario del paralelo", async () => {
  let insertedValues;
  pool.connect = async () => ({
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM paralelo_materia_asesor pma")) {
        return { rows: [{
          id_paralelo_materia: 21,
          id_paralelo: 3,
          id_materia: 5,
          dia_asignacion: "lunes",
          dias_paralelo: "lunes, miércoles",
          hora_inicio: "08:00:00",
          hora_fin: "10:00:00",
          nombre_materia: "Matemática",
        }] };
      }
      if (sql.includes("SELECT c.id_clase FROM clases c")) return { rows: [] };
      if (sql.includes("INSERT INTO clases")) {
        insertedValues = params;
        return { rows: [{ id_clase: 31 }] };
      }
      if (sql.includes("WHERE c.id_clase = $1")) return { rows: [{ id_clase: 31, inicioclase: "2026-11-23" }] };
      return { rows: [] };
    },
  });
  const res = response();
  await createClase(
    {
      body: { id_asesor_paralelo_materia: 21, inicioclase: "2026-11-23" },
      academicNow: new Date("2026-11-23T13:30:00.000Z"),
    },
    res,
    (error) => { throw error; },
  );
  assert.equal(res.statusCode, 201);
  assert.equal(insertedValues[1], "2026-11-23");
});

test("una clase de un día anterior queda cerrada para modificaciones", async () => {
  pool.query = async () => ({ rows: [{ id_clase: 7, inicioclase: "2026-11-22" }] });
  const res = response();
  await updateClase(
    { params: { id: "7" }, body: { tema: "Otro tema" }, academicNow: new Date("2026-11-23T13:30:00.000Z") },
    res,
    (error) => { throw error; },
  );
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /cerrada/);
});

test("una asistencia de un día anterior queda cerrada para modificaciones", async () => {
  pool.query = async () => ({ rows: [{ id_asistencia: 9, id_clase: 7, inicioclase: "2026-11-22" }] });
  const res = response();
  await updateAsistencia(
    { params: { id: "9" }, body: { permiso: true }, academicNow: new Date("2026-11-23T13:30:00.000Z") },
    res,
    (error) => { throw error; },
  );
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /cerrada/);
});

function attendanceDatabase({ belongs = true, monthly = false } = {}) {
  pool.connect = async () => ({
    release() {},
    async query(sql) {
      if (sql.includes("FROM clases c")) {
        return { rows: [{
          id_clase: 7,
          inicioclase: "2026-11-23",
          id_paralelo: 3,
          id_materia: 5,
          dia_asignacion: "lunes",
          dias_paralelo: "lunes",
          hora_inicio: "08:00:00",
          hora_fin: "10:00:00",
          nombre_materia: "Matemática",
        }] };
      }
      if (sql.includes("AS pertenece_materia")) {
        return { rows: [{ pertenece_materia: belongs, mensualidad_vigente: monthly }] };
      }
      if (sql.includes("SELECT id_asistencia FROM asistencias")) return { rows: [] };
      if (sql.includes("INSERT INTO asistencias")) return { rows: [{ id_asistencia: 12, id_clase: 7, id_estudiante: 11 }] };
      return { rows: [] };
    },
  });
}

test("rechaza la asistencia si el estudiante no pertenece al paralelo de la materia", async () => {
  attendanceDatabase({ belongs: false });
  const res = response();
  await createAsistencia(
    { body: { id_clase: 7, id_estudiante: 11 }, academicNow: new Date("2026-11-23T13:30:00.000Z") },
    res,
    (error) => { throw error; },
  );
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.verificacion.pertenece_materia, false);
});

test("registra la asistencia y avisa cuando no existe mensualidad para la fecha", async () => {
  attendanceDatabase({ belongs: true, monthly: false });
  const res = response();
  await createAsistencia(
    { body: { id_clase: 7, id_estudiante: 11 }, academicNow: new Date("2026-11-23T13:30:00.000Z") },
    res,
    (error) => { throw error; },
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.verificacion.pertenece_materia, true);
  assert.equal(res.body.verificacion.mensualidad_vigente, false);
});
