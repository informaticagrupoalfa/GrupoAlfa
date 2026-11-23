import { pool } from "../db.js";
import { createCrud } from "../utils/crudFactory.js";
import { academicClock, dateKey, scheduleProblem } from "../utils/academicSchedule.js";

const readCrud = createCrud({
  table: "asistencias",
  pk: "id_asistencia",
  label: "Asistencia no encontrada",
  writable: [],
  filters: ["id_clase", "id_estudiante"],
});

const CLASS_CONTEXT = `
  SELECT c.id_clase, c.inicioclase, pma.id_paralelo, pma.id_materia,
         pma.dia AS dia_asignacion, p.dias AS dias_paralelo,
         p.hora_inicio, p.hora_fin, p.nombre_paralelo, m.nombre_materia
    FROM clases c
    JOIN paralelo_materia_asesor pma
      ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
    JOIN paralelos p ON p.id_paralelo = pma.id_paralelo
    JOIN materias m ON m.id_materia = pma.id_materia
`;

const failure = (status, message, verification) => Object.assign(new Error(message), { status, verification });

async function studentVerification(client, context, studentId) {
  const { rows } = await client.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM inscripciones i
          WHERE i.id_estudiante = $1 AND i.id_paralelo = $2
       ) AS pertenece_materia,
       EXISTS (
         SELECT 1
           FROM inscripciones i
           JOIN mensualidades men ON men.id_inscripcion = i.id_inscripcion
          WHERE i.id_estudiante = $1 AND i.id_paralelo = $2
            AND $3::date BETWEEN men.fecha_inicio_mensualidad AND men.fecha_fin_mensualidad
       ) AS mensualidad_vigente,
       (SELECT men.id_mensualidad
          FROM inscripciones i
          JOIN mensualidades men ON men.id_inscripcion = i.id_inscripcion
         WHERE i.id_estudiante = $1 AND i.id_paralelo = $2
           AND $3::date BETWEEN men.fecha_inicio_mensualidad AND men.fecha_fin_mensualidad
         ORDER BY men.fecha_fin_mensualidad DESC, men.id_mensualidad DESC LIMIT 1) AS id_mensualidad,
       (SELECT men.fecha_inicio_mensualidad
          FROM inscripciones i
          JOIN mensualidades men ON men.id_inscripcion = i.id_inscripcion
         WHERE i.id_estudiante = $1 AND i.id_paralelo = $2
           AND $3::date BETWEEN men.fecha_inicio_mensualidad AND men.fecha_fin_mensualidad
         ORDER BY men.fecha_fin_mensualidad DESC, men.id_mensualidad DESC LIMIT 1) AS mensualidad_desde,
       (SELECT men.fecha_fin_mensualidad
          FROM inscripciones i
          JOIN mensualidades men ON men.id_inscripcion = i.id_inscripcion
         WHERE i.id_estudiante = $1 AND i.id_paralelo = $2
           AND $3::date BETWEEN men.fecha_inicio_mensualidad AND men.fecha_fin_mensualidad
         ORDER BY men.fecha_fin_mensualidad DESC, men.id_mensualidad DESC LIMIT 1) AS mensualidad_hasta`,
    [studentId, context.id_paralelo, dateKey(context.inicioclase)],
  );
  return {
    pertenece_materia: Boolean(rows[0]?.pertenece_materia),
    mensualidad_vigente: Boolean(rows[0]?.mensualidad_vigente),
    id_mensualidad: rows[0]?.id_mensualidad ?? null,
    mensualidad_desde: rows[0]?.mensualidad_desde ?? null,
    mensualidad_hasta: rows[0]?.mensualidad_hasta ?? null,
    id_materia: context.id_materia,
    nombre_materia: context.nombre_materia,
    fecha_registro: dateKey(context.inicioclase),
  };
}

async function attendanceWithClass(id) {
  const { rows } = await pool.query(
    `SELECT a.*, c.inicioclase FROM asistencias a
      JOIN clases c ON c.id_clase = a.id_clase
     WHERE a.id_asistencia = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export const getAsistencias = readCrud.list;
export const getAsistenciaById = readCrud.getById;

export async function createAsistencia(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const clock = academicClock(req.academicNow);
    const classResult = await client.query(`${CLASS_CONTEXT} WHERE c.id_clase = $1 FOR SHARE`, [req.body.id_clase]);
    if (!classResult.rows.length) throw failure(404, "La clase no existe.");
    const context = classResult.rows[0];
    if (dateKey(context.inicioclase) !== clock.date) {
      throw failure(409, "Las asistencias solo pueden registrarse el mismo día de la clase.");
    }
    const problem = scheduleProblem(context, clock);
    if (problem) throw failure(409, problem);

    const verification = await studentVerification(client, context, req.body.id_estudiante);
    if (!verification.pertenece_materia) {
      throw failure(409, "El estudiante no está inscrito en el paralelo de esta materia.", verification);
    }

    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [req.body.id_clase, req.body.id_estudiante]);
    const duplicate = await client.query(
      "SELECT id_asistencia FROM asistencias WHERE id_clase = $1 AND id_estudiante = $2 LIMIT 1",
      [req.body.id_clase, req.body.id_estudiante],
    );
    if (duplicate.rows.length) throw failure(409, "La asistencia de este estudiante ya fue registrada.", verification);

    const { rows } = await client.query(
      `INSERT INTO asistencias
         (id_clase, id_estudiante, hora_entrada, salida_antes_de_tiempo, permiso, razon_permiso)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.body.id_clase,
        req.body.id_estudiante,
        `${clock.date}T${clock.time}`,
        req.body.salida_antes_de_tiempo ?? null,
        req.body.permiso ?? null,
        req.body.razon_permiso ?? null,
      ],
    );
    await client.query("COMMIT");
    res.status(201).json({ ...rows[0], verificacion: verification });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error.status) {
      return res.status(error.status).json({ message: error.message, ...(error.verification && { verificacion: error.verification }) });
    }
    if (error.code === "23505") return res.status(409).json({ message: "La asistencia de este estudiante ya fue registrada." });
    next(error);
  } finally {
    client.release();
  }
}

export async function updateAsistencia(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "ID debe ser numérico" });
    const current = await attendanceWithClass(id);
    if (!current) return res.status(404).json({ message: "Asistencia no encontrada" });
    if (dateKey(current.inicioclase) !== academicClock(req.academicNow).date) {
      return res.status(409).json({ message: "La asistencia ya está cerrada y no puede modificarse después del día de la clase." });
    }

    const allowed = ["salida_antes_de_tiempo", "permiso", "razon_permiso"];
    const fields = allowed.filter((field) => req.body[field] !== undefined);
    if (!fields.length) return res.json(current);
    const values = fields.map((field) => req.body[field]);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE asistencias SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")}
        WHERE id_asistencia = $${values.length} RETURNING *`,
      values,
    );
    res.json(rows[0]);
  } catch (error) { next(error); }
}

export async function deleteAsistencia(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "ID debe ser numérico" });
    const current = await attendanceWithClass(id);
    if (!current) return res.status(404).json({ message: "Asistencia no encontrada" });
    if (dateKey(current.inicioclase) !== academicClock(req.academicNow).date) {
      return res.status(409).json({ message: "La asistencia ya está cerrada y no puede eliminarse después del día de la clase." });
    }
    await pool.query("DELETE FROM asistencias WHERE id_asistencia = $1", [id]);
    res.sendStatus(204);
  } catch (error) { next(error); }
}
