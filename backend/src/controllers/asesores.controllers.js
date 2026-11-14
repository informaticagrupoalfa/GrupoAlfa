import { pool } from "../db.js";

const SELECT_ASESORES = `SELECT a.id_asesor, a.id_usuario,
  u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_electronico
  FROM asesores a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario`;

export const getAsesores = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${SELECT_ASESORES} ORDER BY a.id_asesor DESC`);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getAsesorById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query(`${SELECT_ASESORES} WHERE a.id_asesor = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Asesor no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createAsesor = async (req, res, next) => {
  try {
    const { id_usuario } = req.body;
    const user = await pool.query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id_usuario]);
    if (user.rows.length === 0) return res.status(409).json({ error: "El usuario no existe" });
    const { rows } = await pool.query(
      "INSERT INTO asesores (id_usuario) VALUES ($1) RETURNING *",
      [id_usuario]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateAsesor = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { id_usuario } = req.body;
    if (id_usuario != null) {
      const user = await pool.query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id_usuario]);
      if (user.rows.length === 0) return res.status(409).json({ error: "El usuario no existe" });
    }
    const { rows } = await pool.query(
      `UPDATE asesores SET id_usuario = COALESCE($1, id_usuario)
       WHERE id_asesor = $2 RETURNING *`,
      [id_usuario ?? null, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Asesor no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteAsesor = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rowCount } = await pool.query("DELETE FROM asesores WHERE id_asesor = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Asesor no encontrado" });
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
