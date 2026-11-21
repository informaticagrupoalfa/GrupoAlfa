import { pool } from "../db.js";
import { normalizeWeekday, parseWeekdays } from "../utils/weekdays.js";

export async function getConfiguracionParalelos(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, a.codigo AS aula_codigo, a.capacidad AS aula_capacidad,
             COALESCE(inscritos.total_estudiantes, 0) AS total_estudiantes,
             c.fecha_inicio AS capacitacion_inicio,
             json_agg(DISTINCT jsonb_build_object(
               'id_materia', m.id_materia, 'nombre_materia', m.nombre_materia
             )) FILTER (WHERE m.id_materia IS NOT NULL) AS asignaciones
      FROM paralelos p
      LEFT JOIN aulas a ON a.id_aula = p.id_aula
      LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
      LEFT JOIN (
        SELECT id_paralelo, COUNT(DISTINCT id_estudiante)::integer AS total_estudiantes
        FROM inscripciones
        WHERE id_estudiante IS NOT NULL
        GROUP BY id_paralelo
      ) inscritos ON inscritos.id_paralelo = p.id_paralelo
      LEFT JOIN paralelo_materia_asesor pma ON pma.id_paralelo = p.id_paralelo
      LEFT JOIN materias m ON m.id_materia = pma.id_materia
      GROUP BY p.id_paralelo, a.codigo, a.capacidad, inscritos.total_estudiantes, c.fecha_inicio
      ORDER BY p.id_paralelo DESC`);
    res.json(rows);
  } catch (error) { next(error); }
}

export async function createConfiguracionParalelo(req, res, next) {
  const client = await pool.connect();
  try {
    const { id_capacitacion, id_aula, nombre_paralelo, nivel, modalidad, hora_inicio, hora_fin, dias, materias = [] } = req.body;
    if (!Array.isArray(materias) || !materias.length) return res.status(400).json({ message: "Selecciona al menos una materia." });
    const weekdays = parseWeekdays(dias);
    if (!weekdays.length) return res.status(400).json({ message: "Selecciona al menos un día de clase." });
    if (hora_inicio && hora_fin && hora_fin <= hora_inicio) return res.status(400).json({ message: "La hora de fin debe ser posterior a la de inicio." });
    await client.query("BEGIN");
    const { rows: pRows } = await client.query(
      `INSERT INTO paralelos (id_capacitacion,id_aula,nombre_paralelo,nivel,modalidad,hora_inicio,hora_fin,dias,activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE) RETURNING id_paralelo`,
      [id_capacitacion,id_aula,nombre_paralelo,nivel||null,modalidad||null,hora_inicio||null,hora_fin||null,weekdays.join(", ")]);
    const idParalelo = pRows[0].id_paralelo;
    for (const item of materias) {
      if (!item.id_materia) throw new Error("Selecciona una materia válida.");
      const { rows: allowed } = await client.query(
        `SELECT 1 FROM materia_capacitacion WHERE id_capacitacion=$1 AND id_materia=$2`, [id_capacitacion,item.id_materia]);
      if (!allowed.length) throw new Error(`La materia ${item.id_materia} no está vinculada a la capacitación.`);
      await client.query(
        `INSERT INTO paralelo_materia_asesor (id_paralelo,id_materia) VALUES ($1,$2)`, [idParalelo,item.id_materia]);
    }
    await client.query("COMMIT");
    res.status(201).json({ id_paralelo: idParalelo });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return res.status(409).json({ message: "Ya existe una relación para uno de los pares paralelo/materia o asesor/asignación." });
    if (error.code === "23503") return res.status(409).json({ message: "La capacitación, aula, materia o docente seleccionados ya no existen." });
    if (error.code === "23514") return res.status(400).json({ message: "Revisa el horario del paralelo." });
    if (error.message?.startsWith("La materia") || error.message?.startsWith("Selecciona una materia")) return res.status(400).json({ message: error.message });
    next(error);
  } finally { client.release(); }
}

export async function updateConfiguracionParalelo(req, res, next) {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const { id_capacitacion, id_aula, nombre_paralelo, nivel, modalidad, hora_inicio, hora_fin, dias, materias = [] } = req.body;
    if (!Array.isArray(materias) || !materias.length) return res.status(400).json({ message: "Conserva o selecciona al menos una materia." });
    const weekdays = parseWeekdays(dias);
    if (!weekdays.length) return res.status(400).json({ message: "Selecciona al menos un día de clase." });
    if (hora_inicio && hora_fin && hora_fin <= hora_inicio) return res.status(400).json({ message: "La hora de fin debe ser posterior a la de inicio." });
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE paralelos SET id_capacitacion=$1,id_aula=$2,nombre_paralelo=$3,nivel=$4,modalidad=$5,hora_inicio=$6,hora_fin=$7,dias=$8
       WHERE id_paralelo=$9 RETURNING id_paralelo`,
      [id_capacitacion,id_aula,nombre_paralelo,nivel||null,modalidad||null,hora_inicio||null,hora_fin||null,weekdays.join(", "),id]);
    if (!updated.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Paralelo no encontrado." }); }
    const { rows: assignedDays } = await client.query(
      `SELECT DISTINCT dia FROM paralelo_materia_asesor
        WHERE id_paralelo = $1 AND id_asesor IS NOT NULL AND dia IS NOT NULL`, [id]);
    if (assignedDays.some(row => !weekdays.includes(normalizeWeekday(row.dia)))) {
      throw new Error("No se puede quitar un día que ya tiene asesor asignado.");
    }
    const desiredMatterIds = materias.map(item => Number(item.id_materia));
    const { rows: previous } = await client.query(
      `SELECT id_paralelo_materia, id_materia
       FROM paralelo_materia_asesor WHERE id_paralelo=$1`, [id]);
    for (const old of previous.filter(item => !desiredMatterIds.includes(Number(item.id_materia)))) {
      const history = await client.query(
        `SELECT 1 FROM clases c
         WHERE c.id_asesor_paralelo_materia=$1 LIMIT 1`, [old.id_paralelo_materia]);
      if (history.rowCount) throw new Error(`No se puede quitar la materia ${old.id_materia}: ya tiene clases registradas.`);
      await client.query(`DELETE FROM paralelo_materia_asesor WHERE id_paralelo_materia=$1`, [old.id_paralelo_materia]);
    }
    for (const item of materias) {
      if (!item.id_materia) throw new Error("Selecciona una materia válida.");
      const { rows: allowed } = await client.query(`SELECT 1 FROM materia_capacitacion WHERE id_capacitacion=$1 AND id_materia=$2`, [id_capacitacion,item.id_materia]);
      if (!allowed.length) throw new Error(`La materia ${item.id_materia} no está vinculada a la capacitación.`);
      await client.query(
        `INSERT INTO paralelo_materia_asesor (id_paralelo,id_materia) VALUES ($1,$2)
         ON CONFLICT (id_paralelo,id_materia) DO NOTHING`, [id,item.id_materia]);
    }
    await client.query("COMMIT"); res.json({ id_paralelo: id });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return res.status(409).json({ message: "La asignación de materia y docente ya existe." });
    if (error.code === "23503") return res.status(409).json({ message: "Revisa la capacitación, aula, materia y docente." });
    if (error.message?.startsWith("No se puede quitar") || error.message?.startsWith("No se puede cambiar")) return res.status(409).json({ message: error.message });
    if (error.message?.startsWith("La materia") || error.message?.startsWith("Selecciona una materia")) return res.status(400).json({ message: error.message });
    next(error);
  } finally { client.release(); }
}
