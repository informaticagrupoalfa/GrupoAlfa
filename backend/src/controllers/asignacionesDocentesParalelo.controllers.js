import { pool } from "../db.js";
import { normalizeWeekday, parseWeekdays } from "../utils/weekdays.js";

// Esquema actual: paralelo_materia_asesor (id_paralelo_materia, id_paralelo,
// id_materia, id_asesor, dia). Una fila sin asesor representa una materia del
// paralelo aún no asignada; asignar un docente completará id_asesor y dia.
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

async function subjectRow(db, parallelId, subjectId, lock = false) {
  const { rows } = await db.query(
    `SELECT id_paralelo_materia, id_paralelo, id_materia, id_asesor, dia
       FROM paralelo_materia_asesor
      WHERE id_paralelo = $1 AND id_materia = $2${lock ? " FOR UPDATE" : ""}`,
    [parallelId, subjectId],
  );
  if (!rows.length) throw failure(400, "La materia no está vinculada al paralelo.");
  return rows[0];
}

async function assignmentRow(db, assignmentId, lock = false) {
  const { rows } = await db.query(
    `SELECT id_paralelo_materia, id_paralelo, id_materia, id_asesor, dia
       FROM paralelo_materia_asesor
      WHERE id_paralelo_materia = $1${lock ? " FOR UPDATE" : ""}`,
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

async function assertSubjectAvailable(row) {
  if (row.id_asesor != null || row.dia != null) {
    throw failure(409, "La materia ya tiene un asesor asignado en el paralelo.");
  }
}

async function rowsFor(db, assignmentId = null) {
  const { rows } = await db.query(
    `SELECT pma.id_paralelo_materia,
            pma.id_paralelo_materia AS id_asesor_paralelo_materia,
            pma.id_asesor, pma.id_paralelo, pma.id_materia,
            m.nombre_materia, pma.dia, pma.dia AS dias, p.nombre_paralelo,
            concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_asesor,
            jsonb_build_array(jsonb_build_object('id_materia', m.id_materia, 'nombre_materia', m.nombre_materia)) AS materias,
            ARRAY[pma.id_paralelo_materia] AS ids_asignacion
       FROM paralelo_materia_asesor pma
       LEFT JOIN asesores a ON a.id_asesor = pma.id_asesor
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       JOIN paralelos p ON p.id_paralelo = pma.id_paralelo
       JOIN materias m ON m.id_materia = pma.id_materia
      WHERE (pma.id_asesor IS NOT NULL OR pma.dia IS NOT NULL)
        AND ($1::int IS NULL OR pma.id_paralelo_materia = $1)
      ORDER BY p.nombre_paralelo, pma.dia, m.nombre_materia, nombre_asesor`,
    [assignmentId],
  );
  return rows;
}

function assignmentIdFrom(body) {
  return body?.id_paralelo_materia ?? body?.id_asesor_paralelo_materia;
}

function readAssignment(body, allowUnassigned = false) {
  const advisorId = body?.id_asesor === null && allowUnassigned ? null : Number(body?.id_asesor);
  const parallelId = Number(body?.id_paralelo);
  const subjectId = Number(body?.id_materia);
  const day = normalizeWeekday(body?.dia ?? body?.dias);
  if ((advisorId !== null && !validId(advisorId)) || !validId(parallelId) || !validId(subjectId) || !day) {
    throw failure(400, "Indica un asesor, un paralelo, una materia y un día válido.");
  }
  return { advisorId, parallelId, subjectId, day };
}

function readAssignmentId(body) {
  const assignmentId = Number(assignmentIdFrom(body));
  if (!validId(assignmentId)) throw failure(400, "Indica una asignación válida.");
  return assignmentId;
}

function handleError(error, res, next) {
  if (error.code === "23505") return res.status(409).json({ message: "La materia ya tiene un asesor asignado en el paralelo." });
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
      const subject = await subjectRow(db, parallelId, subjectId, true);
      await assertSubjectAvailable(subject);
      const { rows } = await db.query(
        `UPDATE paralelo_materia_asesor
            SET id_asesor = $1, dia = $2
          WHERE id_paralelo_materia = $3
        RETURNING id_paralelo_materia`,
        [advisorId, day, subject.id_paralelo_materia],
      );
      return rows[0].id_paralelo_materia;
    });
    res.status(201).json((await rowsFor(pool, assignmentId))[0]);
  } catch (error) { handleError(error, res, next); }
}

export async function updateAsignacionDocente(req, res, next) {
  try {
    const assignmentId = readAssignmentId(req.body);
    const { advisorId, parallelId, subjectId, day } = readAssignment(req.body, true);
    const resultId = await transaction(async (db) => {
      const current = await assignmentRow(db, assignmentId);
      if (Number(current.id_paralelo) !== parallelId) throw failure(400, "La asignación pertenece a otro paralelo.");
      const parallel = await lockParallel(db, parallelId);
      const locked = await assignmentRow(db, assignmentId, true);
      if (Number(locked.id_paralelo) !== parallelId) throw failure(409, "La asignación cambió; vuelve a cargarla.");
      if (!parseWeekdays(parallel.dias).includes(day)) throw failure(400, "Ese día no está incluido en los días del paralelo.");
      if (await hasClasses(db, assignmentId)) {
        if (Number(locked.id_materia) !== subjectId || normalizeWeekday(locked.dia) !== day) {
          throw failure(409, "No se puede cambiar la materia o el día de una asignación que ya tiene clases registradas.");
        }
        if (locked.id_asesor != null && Number(locked.id_asesor) !== advisorId) {
          await db.query(
            `UPDATE clases c SET asesor = COALESCE(c.asesor, NULLIF(concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno), ''))
               FROM asesores a JOIN usuarios u ON u.id_usuario = a.id_usuario
              WHERE c.id_asesor_paralelo_materia = $1 AND a.id_asesor = $2 AND c.asesor IS NULL`,
            [assignmentId, locked.id_asesor],
          );
        }
      }

      if (Number(locked.id_materia) !== subjectId) {
        const target = await subjectRow(db, parallelId, subjectId, true);
        if (target.id_paralelo_materia !== assignmentId) {
          await assertSubjectAvailable(target);
          // La materia actual queda libre y la nueva recibe al asesor.
          await db.query(
            "UPDATE paralelo_materia_asesor SET id_asesor = NULL, dia = NULL WHERE id_paralelo_materia = $1",
            [assignmentId],
          );
          await db.query(
            "UPDATE paralelo_materia_asesor SET id_asesor = $1, dia = $2 WHERE id_paralelo_materia = $3",
            [advisorId, day, target.id_paralelo_materia],
          );
          return target.id_paralelo_materia;
        }
      }

      await db.query(
        "UPDATE paralelo_materia_asesor SET id_asesor = $1, dia = $2 WHERE id_paralelo_materia = $3",
        [advisorId, day, assignmentId],
      );
      return assignmentId;
    });
    res.json((await rowsFor(pool, resultId))[0]);
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
      // La fila representa la materia del paralelo: al eliminar la asignación
      // solo se libera el asesor y el día, sin borrar la materia.
      await db.query(
        "UPDATE paralelo_materia_asesor SET id_asesor = NULL, dia = NULL WHERE id_paralelo_materia = $1",
        [assignmentId],
      );
    });
    res.sendStatus(204);
  } catch (error) { handleError(error, res, next); }
}
