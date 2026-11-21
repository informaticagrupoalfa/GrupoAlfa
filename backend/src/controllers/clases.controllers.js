import { pool } from "../db.js";
import { PAGE_DEFAULT_LIMIT, PAGE_MAX_LIMIT } from "../utils/crudFactory.js";

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
         p.nombre_paralelo, m.nombre_materia,
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

async function fetchClase(id) {
  const { rows } = await pool.query(`${SELECT_CLASE} WHERE c.id_clase = $1`, [id]);
  return rows[0] ?? null;
}

async function resolveAssignment(body) {
  if (body?.id_asesor_paralelo_materia != null) {
    const { rows } = await pool.query(
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
    const { rows } = await pool.query(
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
  try {
    const assignment = await resolveAssignment(req.body);
    const snapshot = snapshots(req.body, assignment);
    const { rows } = await pool.query(
      `INSERT INTO clases (id_asesor_paralelo_materia, inicioclase, tema, asesor, materia, aula)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_clase`,
      [
        assignment.id_paralelo_materia,
        req.body.inicioclase,
        req.body.tema ?? null,
        snapshot.asesor,
        snapshot.materia,
        snapshot.aula,
      ],
    );
    res.status(201).json(await fetchClase(rows[0].id_clase));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

export async function updateClase(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });

    const current = await pool.query(`${SELECT_CLASE} WHERE c.id_clase = $1`, [id]);
    if (!current.rows.length) return res.status(404).json({ message: "Clase no encontrada" });

    const updates = [];
    const values = [];
    const add = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (req.body.inicioclase !== undefined) add("inicioclase", req.body.inicioclase);
    if (req.body.tema !== undefined) add("tema", req.body.tema);

    let assignment = null;
    if (req.body.id_asesor_paralelo_materia !== undefined || req.body.id_paralelo !== undefined || req.body.id_materia !== undefined) {
      assignment = await resolveAssignment(req.body);
      add("id_asesor_paralelo_materia", assignment.id_paralelo_materia);
    }

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

    if (assignment) {
      const snapshot = snapshots(req.body, assignment);
      if (req.body.asesor === undefined && req.body.id_asesor === undefined) add("asesor", snapshot.asesor);
      if (req.body.materia === undefined) add("materia", snapshot.materia);
      if (req.body.aula === undefined) add("aula", snapshot.aula);
    }

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
    const { rowCount } = await pool.query("DELETE FROM clases WHERE id_clase = $1", [id]);
    if (!rowCount) return res.status(404).json({ message: "Clase no encontrada" });
    res.sendStatus(204);
  } catch (error) { next(error); }
}
