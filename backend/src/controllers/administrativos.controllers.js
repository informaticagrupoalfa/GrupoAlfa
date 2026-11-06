import { pool } from "../db.js";

const SELECT_ADMINISTRATIVOS = `SELECT a.id_administrativo, a.id_usuario,
  u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_electronico
  FROM administrativos a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario`;

export const getAdministrativos = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${SELECT_ADMINISTRATIVOS} ORDER BY a.id_administrativo ASC`);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getAdministrativoById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query(`${SELECT_ADMINISTRATIVOS} WHERE a.id_administrativo = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Administrativo no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createAdministrativo = async (req, res, next) => {
  try {
    const { id_usuario } = req.body;
    const user = await pool.query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id_usuario]);
    if (user.rows.length === 0) return res.status(409).json({ error: "El usuario no existe" });
    const { rows } = await pool.query(
      "INSERT INTO administrativos (id_usuario) VALUES ($1) RETURNING *",
      [id_usuario]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateAdministrativo = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { id_usuario } = req.body;
    if (id_usuario != null) {
      const user = await pool.query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id_usuario]);
      if (user.rows.length === 0) return res.status(409).json({ error: "El usuario no existe" });
    }
    const { rows } = await pool.query(
      `UPDATE administrativos SET id_usuario = COALESCE($1, id_usuario)
       WHERE id_administrativo = $2 RETURNING *`,
      [id_usuario ?? null, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Administrativo no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteAdministrativo = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const exists = await pool.query("SELECT 1 FROM administrativos WHERE id_administrativo = $1", [id]);
    if (exists.rows.length === 0) return res.status(404).json({ message: "Administrativo no encontrado" });
    await pool.query("DELETE FROM administrativos WHERE id_administrativo = $1", [id]);
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
