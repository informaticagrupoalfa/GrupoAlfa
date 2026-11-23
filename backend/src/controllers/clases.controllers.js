import { pool } from "../db.js";
import { PAGE_DEFAULT_LIMIT, PAGE_MAX_LIMIT } from "../utils/crudFactory.js";
import { academicClock, dateKey, scheduleProblem } from "../utils/academicSchedule.js";

// Esquema actual:
//   clases -> paralelo_materia_asesor -> asesor + paralelo + materia
// `clases` conserva además una instantánea de asesor/materia/aula en texto.
const SELECT_CLASE = `
  SELECT c.id_clase, c.inicioclase, c.tema,
         c.id_asesor_paralelo_materia,
         c.asesor, c.materia, c.aula,
         pma.id_paralelo, pma.id_materia, pma.id_asesor,
         p.nombre_paralelo, m.nombre_materia
    FROM clases c
    LEFT JOIN paralelo_materia_asesor pma
      ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
    LEFT JOIN paralelos p ON p.id_paralelo = pma.id_paralelo
    LEFT JOIN materias m ON m.id_materia = pma.id_materia
`;

const ASSIGNMENT_CONTEXT = `
  SELECT pma.id_paralelo_materia, pma.id_paralelo, pma.id_materia, pma.id_asesor,
         pma.dia AS dia_asignacion, p.nombre_paralelo, p.dias AS dias_paralelo,
         p.hora_inicio, p.hora_fin, m.nombre_materia,
         concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_asesor,
         aul.codigo AS aula_codigo
    FROM paralelo_materia_asesor pma
    JOIN paralelos p ON p.id_paralelo = pma.id_paralelo
    JOIN materias m ON m.id_materia = pma.id_materia
    LEFT JOIN asesores a ON a.id_asesor = pma.id_asesor
    LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
    LEFT JOIN aulas aul ON aul.id_aula = p.id_aula
`;

const failure = (status, message) => Object.assign(new Error(message), { status });

async function fetchClase(id, db = pool) {
  const { rows } = await db.query(`${SELECT_CLASE} WHERE c.id_clase = $1`, [id]);
  return rows[0] ?? null;
}

async function resolveAssignment(body, db = pool) {
  if (body?.id_asesor_paralelo_materia != null) {
    const { rows } = await db.query(
      `${ASSIGNMENT_CONTEXT} WHERE pma.id_paralelo_materia = $1`,
      [body.id_asesor_paralelo_materia],
    );
    if (!rows.length) throw failure(409, "La asignación del asesor no existe");
    return rows[0];
  }

  // Compatibilidad: permite indicar paralelo + materia (+ asesor) en lugar del id.
  if (body?.id_paralelo != null && body?.id_materia != null) {
    const values = [body.id_paralelo, body.id_materia];
    let advisorClause = "";
    if (body.id_asesor != null) {
      values.push(body.id_asesor);
      advisorClause = ` AND pma.id_asesor = $${values.length}`;
    }
    const { rows } = await db.query(
      `${ASSIGNMENT_CONTEXT} WHERE pma.id_paralelo = $1 AND pma.id_materia = $2${advisorClause} LIMIT 1`,
      values,
    );
    if (!rows.length) throw failure(409, "La materia no está vinculada al paralelo o el asesor no coincide.");
    return rows[0];
  }

  throw failure(400, "Indica la asignación (id_asesor_paralelo_materia) o el paralelo y la materia.");
}

function snapshots(body, assignment) {
  return {
    asesor: body.asesor !== undefined ? (body.asesor || null) : (assignment.nombre_asesor || null),
    materia: body.materia !== undefined ? (body.materia || null) : (assignment.nombre_materia || null),
    aula: body.aula !== undefined ? (body.aula || null) : (assignment.aula_codigo || null),
  };
}

export async function getClases(req, res, next) {
  try {
    const clauses = [];
    const values = [];
    const add = (sql, value) => { values.push(value); clauses.push(sql(values.length)); };

    if (req.query?.id_asesor_paralelo_materia !== undefined && req.query.id_asesor_paralelo_materia !== "") {
      add(n => `c.id_asesor_paralelo_materia = $${n}`, req.query.id_asesor_paralelo_materia);
    }
    if (req.query?.tema !== undefined && req.query.tema !== "") {
      add(n => `c.tema = $${n}`, req.query.tema);
    }
    if (req.query?.id_paralelo !== undefined && req.query.id_paralelo !== "") {
      add(n => `pma.id_paralelo = $${n}`, req.query.id_paralelo);
    }
    if (req.query?.id_materia !== undefined && req.query.id_materia !== "") {
      add(n => `pma.id_materia = $${n}`, req.query.id_materia);
    }
    for (const [param, operator] of [["desde", ">="], ["hasta", "<="]]) {
      const value = req.query?.[param];
      if (value === undefined || value === "") continue;
      if (Number.isNaN(new Date(value).getTime())) {
        return res.status(400).json({ message: `El parámetro ${param} debe ser una fecha válida` });
      }
      add(n => `c.inicioclase ${operator} $${n}`, value);
    }

    let limit = parseInt(req.query?.limit, 10);
    if (Number.isNaN(limit)) limit = PAGE_DEFAULT_LIMIT;
    limit = Math.min(Math.max(limit, 1), PAGE_MAX_LIMIT);
    let offset = parseInt(req.query?.offset, 10);
    if (Number.isNaN(offset) || offset < 0) offset = 0;
    values.push(limit, offset);

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `${SELECT_CLASE} ${where} ORDER BY c.id_clase DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    res.status(200).json(rows);
  } catch (error) { next(error); }
}

export async function getClaseById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const row = await fetchClase(id);
    if (!row) return res.status(404).json({ message: "Clase no encontrada" });
    res.json(row);
  } catch (error) { next(error); }
}

export async function createClase(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const clock = academicClock(req.academicNow);
    if (dateKey(req.body.inicioclase) !== clock.date) {
      throw failure(409, "Las clases solo pueden crearse en la fecha actual.");
    }
    const assignment = await resolveAssignment(req.body, client);
    const problem = scheduleProblem(assignment, clock);
    if (problem) throw failure(409, problem);

    const dayNumber = Math.floor((Date.parse(`${clock.date}T00:00:00Z`) - Date.parse("2000-01-01T00:00:00Z")) / 86400000);
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [assignment.id_paralelo, dayNumber]);
    const duplicate = await client.query(
      `SELECT c.id_clase FROM clases c
        JOIN paralelo_materia_asesor pma
          ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
       WHERE pma.id_paralelo = $1 AND c.inicioclase = $2 LIMIT 1`,
      [assignment.id_paralelo, clock.date],
    );
    if (duplicate.rows.length) throw failure(409, "Ya existe una clase para este paralelo en la fecha de hoy.");

    const snapshot = snapshots(req.body, assignment);
    const { rows } = await client.query(
      `INSERT INTO clases (id_asesor_paralelo_materia, inicioclase, tema, asesor, materia, aula)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_clase`,
      [
        assignment.id_paralelo_materia,
        clock.date,
        req.body.tema ?? null,
        snapshot.asesor,
        snapshot.materia,
        snapshot.aula,
      ],
    );
    const created = await fetchClase(rows[0].id_clase, client);
    await client.query("COMMIT");
    res.status(201).json(created);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === "23505") return res.status(409).json({ message: "Ya existe una clase para este paralelo en la fecha de hoy." });
    next(error);
  } finally {
    client.release();
  }
}

export async function updateClase(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });

    const current = await pool.query(`${SELECT_CLASE} WHERE c.id_clase = $1`, [id]);
    if (!current.rows.length) return res.status(404).json({ message: "Clase no encontrada" });
    const clock = academicClock(req.academicNow);
    if (dateKey(current.rows[0].inicioclase) !== clock.date) {
      return res.status(409).json({ message: "La clase ya está cerrada: solo puede modificarse el día en que fue creada." });
    }
    if (req.body.inicioclase !== undefined && dateKey(req.body.inicioclase) !== clock.date) {
      return res.status(409).json({ message: "No se puede cambiar la clase a otra fecha." });
    }
    if (req.body.id_asesor_paralelo_materia !== undefined || req.body.id_paralelo !== undefined || req.body.id_materia !== undefined) {
      return res.status(409).json({ message: "No se puede cambiar el paralelo o la materia de una clase ya creada." });
    }

    const updates = [];
    const values = [];
    const add = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (req.body.inicioclase !== undefined) add("inicioclase", req.body.inicioclase);
    if (req.body.tema !== undefined) add("tema", req.body.tema);

    if (req.body.asesor !== undefined) add("asesor", req.body.asesor || null);
    else if (req.body.id_asesor !== undefined) {
      // Compatibilidad con el editor anterior, que enviaba el id del asesor.
      const { rows } = await pool.query(
        `SELECT NULLIF(concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno), '') AS nombre
           FROM asesores a JOIN usuarios u ON u.id_usuario = a.id_usuario
          WHERE a.id_asesor = $1`,
        [req.body.id_asesor],
      );
      add("asesor", rows[0]?.nombre ?? null);
    }
    if (req.body.materia !== undefined) add("materia", req.body.materia || null);
    if (req.body.aula !== undefined) add("aula", req.body.aula || null);

    if (!updates.length) return res.json(current.rows[0]);
    values.push(id);
    await pool.query(`UPDATE clases SET ${updates.join(", ")} WHERE id_clase = $${values.length}`, values);
    res.json(await fetchClase(id));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

export async function deleteClase(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const current = await pool.query("SELECT inicioclase FROM clases WHERE id_clase = $1", [id]);
    if (!current.rows.length) return res.status(404).json({ message: "Clase no encontrada" });
    if (dateKey(current.rows[0].inicioclase) !== academicClock(req.academicNow).date) {
      return res.status(409).json({ message: "La clase ya está cerrada y no puede eliminarse después de su fecha." });
    }
    await pool.query("DELETE FROM clases WHERE id_clase = $1", [id]);
    res.sendStatus(204);
  } catch (error) { next(error); }
}
