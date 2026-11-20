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

async function lockParallel(db, parallelId) {
  const { rows } = await db.query(
    "SELECT id_paralelo, dias FROM paralelos WHERE id_paralelo = $1 FOR UPDATE",
    [parallelId],
  );
  if (!rows.length) throw failure(404, "El paralelo no existe.");
  return rows[0];
}

async function parallelSubject(db, parallelId, subjectId) {
  const { rows } = await db.query(
    "SELECT id_paralelo_materia FROM paralelo_materia WHERE id_paralelo = $1 AND id_materia = $2",
    [parallelId, subjectId],
  );
  if (!rows.length) throw failure(400, "La materia no está vinculada al paralelo.");
  return rows[0].id_paralelo_materia;
}

async function assignmentRow(db, assignmentId, lock = false) {
  const { rows } = await db.query(
    `SELECT apm.id_asesor_paralelo_materia, pm.id_paralelo
       FROM asesor_paralelo_materia apm
       JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
      WHERE apm.id_asesor_paralelo_materia = $1${lock ? " FOR UPDATE OF apm" : ""}`,
    [assignmentId],
  );
  if (!rows.length) throw failure(404, "Asignación no encontrada.");
  return rows[0];
}

async function hasClasses(db, assignmentId) {
  const { rowCount } = await db.query(
    "SELECT 1 FROM clases WHERE id_asesor_paralelo_materia = $1 LIMIT 1",
    [assignmentId],
  );
  return rowCount > 0;
}

async function assertSubjectAvailable(db, subjectLinkId, day, assignmentId = 0) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM asesor_paralelo_materia
      WHERE id_paralelo_materia = $1 AND dias = $2
        AND id_asesor_paralelo_materia <> $3 LIMIT 1`,
    [subjectLinkId, day, assignmentId],
  );
  if (rowCount) throw failure(409, "La materia ya tiene un asesor asignado ese día en el paralelo.");
}

async function rowsFor(db, assignmentId = null) {
  const { rows } = await db.query(
    `SELECT apm.id_asesor_paralelo_materia, apm.id_asesor, pm.id_paralelo,
            pm.id_materia, m.nombre_materia, apm.dias, p.nombre_paralelo,
            concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_asesor,
            jsonb_build_array(jsonb_build_object('id_materia', m.id_materia, 'nombre_materia', m.nombre_materia)) AS materias,
            ARRAY[apm.id_asesor_paralelo_materia] AS ids_asignacion
       FROM asesor_paralelo_materia apm
       JOIN asesores a ON a.id_asesor = apm.id_asesor
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
       JOIN paralelos p ON p.id_paralelo = pm.id_paralelo
       JOIN materias m ON m.id_materia = pm.id_materia
      WHERE ($1::int IS NULL OR apm.id_asesor_paralelo_materia = $1)
      ORDER BY p.nombre_paralelo, apm.dias, m.nombre_materia, nombre_asesor`,
    [assignmentId],
  );
  return rows;
}

function readAssignment(body) {
  const advisorId = Number(body?.id_asesor);
  const parallelId = Number(body?.id_paralelo);
  const subjectId = Number(body?.id_materia);
  const day = normalizeWeekday(body?.dias);
  if (!validId(advisorId) || !validId(parallelId) || !validId(subjectId) || !day) {
    throw failure(400, "Indica un asesor, un paralelo, una materia y un día válido.");
  }
  return { advisorId, parallelId, subjectId, day };
}

function readAssignmentId(body) {
  const assignmentId = Number(body?.id_asesor_paralelo_materia);
  if (!validId(assignmentId)) throw failure(400, "Indica una asignación válida.");
  return assignmentId;
}

function handleError(error, res, next) {
  if (error.code === "23505") return res.status(409).json({ message: "La materia ya tiene un asesor asignado ese día en el paralelo." });
  if (error.code === "23503") return res.status(409).json({ message: "El asesor, paralelo o materia ya no existe." });
  if (error.status) return res.status(error.status).json({ message: error.message });
  return next(error);
}

export async function getAsignacionesDocentes(req, res, next) {
  try { res.json(await rowsFor(pool)); } catch (error) { next(error); }
}

export async function createAsignacionDocente(req, res, next) {
  try {
    const { advisorId, parallelId, subjectId, day } = readAssignment(req.body);
    const assignmentId = await transaction(async (db) => {
      const parallel = await lockParallel(db, parallelId);
      if (!parseWeekdays(parallel.dias).includes(day)) throw failure(400, "Ese día no está incluido en los días del paralelo.");
      const subjectLinkId = await parallelSubject(db, parallelId, subjectId);
      await assertSubjectAvailable(db, subjectLinkId, day);
      const { rows } = await db.query(
        "INSERT INTO asesor_paralelo_materia (id_asesor, id_paralelo_materia, dias) VALUES ($1, $2, $3) RETURNING id_asesor_paralelo_materia",
        [advisorId, subjectLinkId, day],
      );
      return rows[0].id_asesor_paralelo_materia;
    });
    res.status(201).json((await rowsFor(pool, assignmentId))[0]);
  } catch (error) { handleError(error, res, next); }
}

export async function updateAsignacionDocente(req, res, next) {
  try {
    const assignmentId = readAssignmentId(req.body);
    const { advisorId, parallelId, subjectId, day } = readAssignment(req.body);
    await transaction(async (db) => {
      const current = await assignmentRow(db, assignmentId);
      if (Number(current.id_paralelo) !== parallelId) throw failure(400, "La asignación pertenece a otro paralelo.");
      const parallel = await lockParallel(db, parallelId);
      const locked = await assignmentRow(db, assignmentId, true);
      if (Number(locked.id_paralelo) !== parallelId) throw failure(409, "La asignación cambió; vuelve a cargarla.");
      if (!parseWeekdays(parallel.dias).includes(day)) throw failure(400, "Ese día no está incluido en los días del paralelo.");
      if (await hasClasses(db, assignmentId)) throw failure(409, "No se puede cambiar una asignación que ya tiene clases registradas.");
      const subjectLinkId = await parallelSubject(db, parallelId, subjectId);
      await assertSubjectAvailable(db, subjectLinkId, day, assignmentId);
      await db.query(
        "UPDATE asesor_paralelo_materia SET id_asesor = $1, id_paralelo_materia = $2, dias = $3 WHERE id_asesor_paralelo_materia = $4",
        [advisorId, subjectLinkId, day, assignmentId],
      );
    });
    res.json((await rowsFor(pool, assignmentId))[0]);
  } catch (error) { handleError(error, res, next); }
}

export async function deleteAsignacionDocente(req, res, next) {
  try {
    const assignmentId = readAssignmentId(req.body);
    await transaction(async (db) => {
      const current = await assignmentRow(db, assignmentId);
      await lockParallel(db, current.id_paralelo);
      await assignmentRow(db, assignmentId, true);
      if (await hasClasses(db, assignmentId)) throw failure(409, "No se puede eliminar una asignación que ya tiene clases registradas.");
      await db.query("DELETE FROM asesor_paralelo_materia WHERE id_asesor_paralelo_materia = $1", [assignmentId]);
    });
    res.sendStatus(204);
  } catch (error) { handleError(error, res, next); }
}
