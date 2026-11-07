import { pool } from "../db.js";

export const getCapacitaciones = async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM cursos_capacitacion ORDER BY id_capacitacion ASC");
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getCapacitacionById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query("SELECT * FROM cursos_capacitacion WHERE id_capacitacion = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Capacitación no encontrada" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

const checkFKs = async (id_convocatoria, id_aula) => {
  if (id_convocatoria != null) {
    const c = await pool.query("SELECT 1 FROM convocatorias_preuniversitario WHERE id_convocatoria = $1", [id_convocatoria]);
    if (c.rows.length === 0) return "La convocatoria no existe";
  }
  if (id_aula != null) {
    const a = await pool.query("SELECT 1 FROM aulas WHERE id_aula = $1", [id_aula]);
    if (a.rows.length === 0) return "El aula no existe";
  }
  return null;
};

export const createCapacitacion = async (req, res, next) => {
  try {
    const { id_convocatoria, id_aula, nivel, nombre, modalidad, fecha_inicio, fecha_fin, hora_inicio, hora_fin, activo } = req.body;
    const fkError = await checkFKs(id_convocatoria, id_aula);
    if (fkError) return res.status(409).json({ error: fkError });
    const { rows } = await pool.query(
      `INSERT INTO cursos_capacitacion
       (id_convocatoria, id_aula, nivel, nombre, modalidad, fecha_inicio, fecha_fin, hora_inicio, hora_fin, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id_convocatoria, id_aula, nivel ?? null, nombre, modalidad ?? null, fecha_inicio ?? null, fecha_fin ?? null, hora_inicio ?? null, hora_fin ?? null, activo ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateCapacitacion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { id_convocatoria, id_aula, nivel, nombre, modalidad, fecha_inicio, fecha_fin, hora_inicio, hora_fin, activo } = req.body;
    const fkError = await checkFKs(id_convocatoria, id_aula);
    if (fkError) return res.status(409).json({ error: fkError });
    const { rows } = await pool.query(
      `UPDATE cursos_capacitacion SET
        id_convocatoria = COALESCE($1, id_convocatoria),
        id_aula = COALESCE($2, id_aula),
        nivel = COALESCE($3, nivel),
        nombre = COALESCE($4, nombre),
        modalidad = COALESCE($5, modalidad),
        fecha_inicio = COALESCE($6, fecha_inicio),
        fecha_fin = COALESCE($7, fecha_fin),
        hora_inicio = COALESCE($8, hora_inicio),
        hora_fin = COALESCE($9, hora_fin),
        activo = COALESCE($10, activo)
       WHERE id_capacitacion = $11 RETURNING *`,
      [id_convocatoria ?? null, id_aula ?? null, nivel ?? null, nombre ?? null, modalidad ?? null, fecha_inicio ?? null, fecha_fin ?? null, hora_inicio ?? null, hora_fin ?? null, activo ?? null, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Capacitación no encontrada" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteCapacitacion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rowCount } = await pool.query("DELETE FROM cursos_capacitacion WHERE id_capacitacion = $1", [id]);
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
      `SELECT *
       FROM cursos_capacitacion
       WHERE activo = true
         AND fecha_inicio <= $1 AND ($1 <= fecha_fin OR fecha_fin IS NULL)
       ORDER BY id_capacitacion ASC`,
      [hoy],
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};
