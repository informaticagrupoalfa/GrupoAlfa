import { pool } from "../db.js";

const SELECT_APODERADOS = `SELECT a.id_apoderado, a.id_usuario, a.celular,
  u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_electronico
  FROM apoderados a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario`;

export const getApoderados = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${SELECT_APODERADOS} ORDER BY a.id_apoderado ASC`);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getApoderadoById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query(`${SELECT_APODERADOS} WHERE a.id_apoderado = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Apoderado no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createApoderado = async (req, res, next) => {
  try {
    const { id_usuario, celular } = req.body;
    const user = await pool.query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id_usuario]);
    if (user.rows.length === 0) return res.status(409).json({ error: "El usuario no existe" });
    const { rows } = await pool.query(
      "INSERT INTO apoderados (id_usuario, celular) VALUES ($1, $2) RETURNING *",
      [id_usuario, celular ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateApoderado = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { id_usuario, celular } = req.body;
    if (id_usuario != null) {
      const user = await pool.query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id_usuario]);
      if (user.rows.length === 0) return res.status(409).json({ error: "El usuario no existe" });
    }
    const { rows } = await pool.query(
      `UPDATE apoderados SET id_usuario = COALESCE($1, id_usuario),
        celular = COALESCE($2, celular)
       WHERE id_apoderado = $3 RETURNING *`,
      [id_usuario ?? null, celular ?? null, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Apoderado no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteApoderado = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const exists = await pool.query("SELECT 1 FROM apoderados WHERE id_apoderado = $1", [id]);
    if (exists.rows.length === 0) return res.status(404).json({ message: "Apoderado no encontrado" });
    await pool.query("DELETE FROM apoderados WHERE id_apoderado = $1", [id]);
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
