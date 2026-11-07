import { pool } from "../db.js";

const SELECT_CAPACITACION = `
  SELECT c.id_capacitacion,
         c.id_convocatoria,
         c.fecha_inicio,
         c.fecha_fin,
         c.activo,
         cv.id_facultad,
         f.nombre AS nombre_facultad
  FROM capacitaciones c
  JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
  JOIN facultades f ON f.id_facultad = cv.id_facultad
`;

export const getCapacitaciones = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${SELECT_CAPACITACION} ORDER BY c.fecha_inicio DESC, c.id_capacitacion DESC`,
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getCapacitacionById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query(`${SELECT_CAPACITACION} WHERE c.id_capacitacion = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Capacitación no encontrada" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

const checkConvocatoria = async (idConvocatoria) => {
  if (idConvocatoria == null) return null;
  const { rows } = await pool.query(
    "SELECT 1 FROM convocatorias_preuniversitario WHERE id_convocatoria = $1",
    [idConvocatoria],
  );
  return rows.length === 0 ? "La convocatoria no existe" : null;
};

export const createCapacitacion = async (req, res, next) => {
  try {
    const { id_convocatoria, fecha_inicio, fecha_fin, activo } = req.body;
    const fkError = await checkConvocatoria(id_convocatoria);
    if (fkError) return res.status(409).json({ error: fkError });

    const { rows } = await pool.query(
      `INSERT INTO capacitaciones (id_convocatoria, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, COALESCE($4, TRUE))
       RETURNING id_capacitacion`,
      [id_convocatoria, fecha_inicio, fecha_fin ?? null, activo ?? null],
    );
    res.status(201).json(await fetchCapacitacion(rows[0].id_capacitacion));
  } catch (error) {
    next(error);
  }
};

export const updateCapacitacion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });

    const fkError = await checkConvocatoria(req.body.id_convocatoria);
    if (fkError) return res.status(409).json({ error: fkError });

    const allowed = ["id_convocatoria", "fecha_inicio", "fecha_fin", "activo"];
    const entries = allowed
      .filter((column) => req.body[column] !== undefined)
      .map((column) => [column, req.body[column]]);

    if (entries.length === 0) {
      const current = await fetchCapacitacion(id);
      if (!current) return res.status(404).json({ message: "Capacitación no encontrada" });
      return res.json(current);
    }

    const values = entries.map(([, value]) => value);
    values.push(id);
    const setClause = entries.map(([column], index) => `${column} = $${index + 1}`).join(", ");

    const { rowCount } = await pool.query(
      `UPDATE capacitaciones SET ${setClause} WHERE id_capacitacion = $${values.length}`,
      values,
    );
    if (rowCount === 0) return res.status(404).json({ message: "Capacitación no encontrada" });

    res.json(await fetchCapacitacion(id));
  } catch (error) {
    next(error);
  }
};

export const deleteCapacitacion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });

    const paralelos = await pool.query("SELECT 1 FROM paralelos WHERE id_capacitacion = $1 LIMIT 1", [id]);
    if (paralelos.rows.length > 0) {
      return res.status(409).json({
        error: "No se puede eliminar: la capacitación tiene paralelos asociados",
      });
    }

    const { rowCount } = await pool.query("DELETE FROM capacitaciones WHERE id_capacitacion = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Capacitación no encontrada" });
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

export const getCapacitacionesActivas = async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().split("T")[0];
    const { rows } = await pool.query(
      `${SELECT_CAPACITACION}
       WHERE c.activo = TRUE
         AND c.fecha_inicio <= $1
         AND (c.fecha_fin IS NULL OR $1 <= c.fecha_fin)
       ORDER BY c.fecha_inicio ASC, c.id_capacitacion ASC`,
      [hoy],
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

async function fetchCapacitacion(id) {
  const { rows } = await pool.query(`${SELECT_CAPACITACION} WHERE c.id_capacitacion = $1`, [id]);
  return rows[0] ?? null;
}
