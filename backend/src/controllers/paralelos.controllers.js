import { pool } from "../db.js";

const SELECT_PARALELO = `
  SELECT p.*,
         c.fecha_inicio AS capacitacion_fecha_inicio,
         f.nombre AS capacitacion_facultad,
         CONCAT(c.fecha_inicio, ' — ', COALESCE(f.nombre, 'Sin facultad')) AS capacitacion_info,
         a.codigo AS aula_codigo,
         a.capacidad AS aula_capacidad
  FROM paralelos p
  LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
  LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
  LEFT JOIN facultades f ON f.id_facultad = cv.id_facultad
  LEFT JOIN aulas a ON a.id_aula = p.id_aula
`;

export const getParalelos = async (req, res, next) => {
  try {
    const { id_capacitacion, id_aula } = req.query;
    const conditions = [];
    const values = [];

    if (id_capacitacion !== undefined) {
      values.push(id_capacitacion);
      conditions.push(`p.id_capacitacion = $${values.length}`);
    }
    if (id_aula !== undefined) {
      values.push(id_aula);
      conditions.push(`p.id_aula = $${values.length}`);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(`${SELECT_PARALELO}${where} ORDER BY p.id_paralelo ASC`, values);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getParaleloById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query(`${SELECT_PARALELO} WHERE p.id_paralelo = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Paralelo no encontrado" });
    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

const checkFks = async ({ id_capacitacion, id_aula }) => {
  if (id_capacitacion !== undefined) {
    const { rows } = await pool.query("SELECT 1 FROM capacitaciones WHERE id_capacitacion = $1", [id_capacitacion]);
    if (rows.length === 0) return "La capacitación no existe";
  }
  if (id_aula !== undefined) {
    const { rows } = await pool.query("SELECT 1 FROM aulas WHERE id_aula = $1", [id_aula]);
    if (rows.length === 0) return "El aula no existe";
  }
  return null;
};

export const createParalelo = async (req, res, next) => {
  try {
    const { id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo } = req.body;
    const fkError = await checkFks({ id_capacitacion, id_aula });
    if (fkError) return res.status(409).json({ error: fkError });

    const { rows } = await pool.query(
      `INSERT INTO paralelos (id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, TRUE))
       RETURNING id_paralelo`,
      [id_capacitacion, id_aula, nivel ?? null, nombre_paralelo, modalidad ?? null, hora_inicio ?? null, hora_fin ?? null, dias ?? null, activo ?? null]
    );

    const created = await fetchParalelo(rows[0].id_paralelo);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const updateParalelo = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });

    const fkError = await checkFks({ id_capacitacion: req.body.id_capacitacion, id_aula: req.body.id_aula });
    if (fkError) return res.status(409).json({ error: fkError });

    const allowed = ["id_capacitacion", "id_aula", "nivel", "nombre_paralelo", "modalidad", "hora_inicio", "hora_fin", "dias", "activo"];
    const entries = allowed
      .filter((column) => req.body[column] !== undefined)
      .map((column) => [column, req.body[column]]);

    if (entries.length === 0) {
      const current = await fetchParalelo(id);
      if (!current) return res.status(404).json({ message: "Paralelo no encontrado" });
      return res.status(200).json(current);
    }

    const values = entries.map(([, value]) => value);
    values.push(id);
    const setClause = entries.map(([column], index) => `${column} = $${index + 1}`).join(", ");

    const { rowCount } = await pool.query(
      `UPDATE paralelos SET ${setClause} WHERE id_paralelo = $${values.length}`,
      values
    );
    if (rowCount === 0) return res.status(404).json({ message: "Paralelo no encontrado" });

    const updated = await fetchParalelo(id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteParalelo = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });

    const { rowCount } = await pool.query("DELETE FROM paralelos WHERE id_paralelo = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Paralelo no encontrado" });
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

async function fetchParalelo(id) {
  const { rows } = await pool.query(`${SELECT_PARALELO} WHERE p.id_paralelo = $1`, [id]);
  return rows[0] ?? null;
}
