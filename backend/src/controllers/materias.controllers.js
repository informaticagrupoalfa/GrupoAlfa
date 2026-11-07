import { pool } from "../db.js";

const hoy = new Date().toISOString().split("T")[0];

export const getMaterias = async (req, res, next) => {
  try {
    const { activas } = req.query;

    if (activas === "true") {
      const { rows } = await pool.query(
        `SELECT DISTINCT m.id_materia, m.nombre_materia
         FROM materias m
         JOIN convocatoria_materia cm ON cm.id_materia = m.id_materia
         JOIN cursos_capacitacion cc ON cc.id_convocatoria = cm.id_convocatoria
         WHERE cc.fecha_inicio <= $1 AND ($1 <= cc.fecha_fin OR cc.fecha_fin IS NULL)
         ORDER BY m.nombre_materia ASC`,
        [hoy],
      );
      return res.status(200).json(rows);
    }

    const { rows } = await pool.query("SELECT * FROM materias ORDER BY id_materia ASC");
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getMateriaById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query("SELECT * FROM materias WHERE id_materia = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Materia no encontrada" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createMateria = async (req, res, next) => {
  try {
    const { nombre_materia } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO materias (nombre_materia) VALUES ($1) RETURNING *",
      [nombre_materia]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateMateria = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { nombre_materia } = req.body;
    const { rows } = await pool.query(
      `UPDATE materias SET nombre_materia = COALESCE($1, nombre_materia)
       WHERE id_materia = $2 RETURNING *`,
      [nombre_materia ?? null, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Materia no encontrada" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteMateria = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rowCount } = await pool.query("DELETE FROM materias WHERE id_materia = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Materia no encontrada" });
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
