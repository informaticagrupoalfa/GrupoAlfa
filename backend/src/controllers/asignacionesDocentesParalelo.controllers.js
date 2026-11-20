import { pool } from "../db.js";
import { normalizeWeekday, parseWeekdays } from "../utils/weekdays.js";

const failure = (status, message) => Object.assign(new Error(message), { status });
const validId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function lockParallels(db, ids) {
  const { rows } = await db.query(
    "SELECT id_paralelo, dias FROM paralelos WHERE id_paralelo = ANY($1::int[]) ORDER BY id_paralelo FOR UPDATE",
    [ids],
  );
  if (rows.length !== new Set(ids).size) throw failure(404, "El paralelo no existe.");
  return rows;
}

async function assignmentIds(db, advisorId, parallelId, day) {
  const { rows } = await db.query(
    `SELECT apm.id_asesor_paralelo_materia
       FROM asesor_paralelo_materia apm
       JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
      WHERE apm.id_asesor = $1 AND pm.id_paralelo = $2 AND apm.dias = $3`,
    [advisorId, parallelId, day],
  );
  return rows.map((row) => row.id_asesor_paralelo_materia);
}

async function hasClasses(db, ids) {
  const { rowCount } = await db.query(
    "SELECT 1 FROM clases WHERE id_asesor_paralelo_materia = ANY($1::int[]) LIMIT 1",
    [ids],
  );
  return rowCount > 0;
}

async function rowsFor(db, advisorId = null, parallelId = null, day = null) {
  const { rows } = await db.query(
    `SELECT apm.id_asesor, pm.id_paralelo, apm.dias, p.nombre_paralelo,
            concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_asesor,
            json_agg(DISTINCT jsonb_build_object('id_materia', m.id_materia, 'nombre_materia', m.nombre_materia)) AS materias,
            array_agg(DISTINCT apm.id_asesor_paralelo_materia) AS ids_asignacion
       FROM asesor_paralelo_materia apm
       JOIN asesores a ON a.id_asesor = apm.id_asesor
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
       JOIN paralelos p ON p.id_paralelo = pm.id_paralelo
       JOIN materias m ON m.id_materia = pm.id_materia
      WHERE ($1::int IS NULL OR apm.id_asesor = $1)
        AND ($2::int IS NULL OR pm.id_paralelo = $2)
        AND ($3::text IS NULL OR apm.dias = $3)
      GROUP BY apm.id_asesor, pm.id_paralelo, apm.dias, p.nombre_paralelo,
               u.nombre, u.apellido_paterno, u.apellido_materno
      ORDER BY p.nombre_paralelo, apm.dias, nombre_asesor`,
    [advisorId, parallelId, day],
  );
  return rows;
}

async function insertDay(db, advisorId, parallelId, day, lockedParallel) {
  if (!parseWeekdays(lockedParallel.dias).includes(day)) {
    throw failure(400, "Ese día no está incluido en los días del paralelo.");
  }
  const { rows: subjects } = await db.query(
    "SELECT id_paralelo_materia FROM paralelo_materia WHERE id_paralelo = $1",
    [parallelId],
  );
  if (!subjects.length) throw failure(400, "El paralelo no tiene materias asignadas.");
  const { rows: occupied } = await db.query(
    `SELECT apm.dias FROM asesor_paralelo_materia apm
       JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
      WHERE pm.id_paralelo = $1 AND apm.dias IS NOT NULL`,
    [parallelId],
  );
  if (occupied.some((row) => normalizeWeekday(row.dias) === day)) {
    throw failure(409, "Ese día ya tiene un asesor asignado para el paralelo.");
  }
  for (const subject of subjects) {
    await db.query(
      "INSERT INTO asesor_paralelo_materia (id_asesor, id_paralelo_materia, dias) VALUES ($1, $2, $3)",
      [advisorId, subject.id_paralelo_materia, day],
    );
  }
}

function handleError(error, res, next) {
  if (error.code === "23505") return res.status(409).json({ message: "Ese día ya tiene un asesor asignado." });
  if (error.code === "23503") return res.status(409).json({ message: "El asesor, paralelo o materia ya no existe." });
  if (error.status) return res.status(error.status).json({ message: error.message });
  return next(error);
}

function readAssignment(body) {
  const advisorId = Number(body?.id_asesor);
  const parallelId = Number(body?.id_paralelo);
  const day = normalizeWeekday(body?.dias);
  if (!validId(advisorId) || !validId(parallelId) || !day) {
    throw failure(400, "Indica un asesor, un paralelo y un día válido.");
  }
  return { advisorId, parallelId, day };
}

export async function getAsignacionesDocentes(req, res, next) {
  try { res.json(await rowsFor(pool)); } catch (error) { next(error); }
}

export async function createAsignacionDocente(req, res, next) {
  try {
    const { advisorId, parallelId, day } = readAssignment(req.body);
    await transaction(async (db) => {
      const [parallel] = await lockParallels(db, [parallelId]);
      await insertDay(db, advisorId, parallelId, day, parallel);
    });
    res.status(201).json((await rowsFor(pool, advisorId, parallelId, day))[0]);
  } catch (error) { handleError(error, res, next); }
}

export async function updateAsignacionDocente(req, res, next) {
  try {
    const current = readAssignment({
      id_asesor: req.body.id_asesor_anterior,
      id_paralelo: req.body.id_paralelo_anterior,
      dias: req.body.dias_anterior,
    });
    const target = readAssignment(req.body);
    await transaction(async (db) => {
      const locked = await lockParallels(db, [...new Set([current.parallelId, target.parallelId])]);
      const ids = await assignmentIds(db, current.advisorId, current.parallelId, current.day);
      if (!ids.length) throw failure(404, "Asignación no encontrada.");
      if (await hasClasses(db, ids)) throw failure(409, "No se puede cambiar una asignación que ya tiene clases registradas.");
      await db.query("DELETE FROM asesor_paralelo_materia WHERE id_asesor_paralelo_materia = ANY($1::int[])", [ids]);
      await insertDay(db, target.advisorId, target.parallelId, target.day,
        locked.find((item) => item.id_paralelo === target.parallelId));
    });
    res.json((await rowsFor(pool, target.advisorId, target.parallelId, target.day))[0]);
  } catch (error) { handleError(error, res, next); }
}

export async function deleteAsignacionDocente(req, res, next) {
  try {
    const { advisorId, parallelId, day } = readAssignment(req.body);
    await transaction(async (db) => {
      await lockParallels(db, [parallelId]);
      const ids = await assignmentIds(db, advisorId, parallelId, day);
      if (!ids.length) throw failure(404, "Asignación no encontrada.");
      if (await hasClasses(db, ids)) throw failure(409, "No se puede eliminar una asignación que ya tiene clases registradas.");
      await db.query("DELETE FROM asesor_paralelo_materia WHERE id_asesor_paralelo_materia = ANY($1::int[])", [ids]);
    });
    res.sendStatus(204);
  } catch (error) { handleError(error, res, next); }
}
