import { pool } from "../db.js";

const PUBLIC_COLUMNS = "id_estudiante, id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio";

export const getEstudiantes = async (req, res, next) => {
  try {
    const { q } = req.query;
    let query = `
      SELECT e.id_estudiante, e.id_usuario, e.id_apoderado, e.colegio_de_procedencia, e.direccion_de_domicilio,
             u.nro_carnet, u.nombre, u.apellido_paterno, u.apellido_materno
      FROM estudiantes e
      JOIN usuarios u ON u.id_usuario = e.id_usuario
    `;
    const params = [];
    if (q) {
      query += ` WHERE u.nombre ILIKE $${params.length + 1}
                 OR u.apellido_paterno ILIKE $${params.length + 2}
                 OR u.apellido_materno ILIKE $${params.length + 3}
                 OR u.nro_carnet::text ILIKE $${params.length + 4}`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    query += ` ORDER BY e.id_estudiante DESC`;
    const { rows } = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getEstudianteById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM estudiantes WHERE id_estudiante = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Estudiante no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

const checkFKs = async (id_usuario, id_apoderado) => {
  if (id_usuario != null) {
    const u = await pool.query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id_usuario]);
    if (u.rows.length === 0) return "El usuario no existe";
  }
  if (id_apoderado != null) {
    const a = await pool.query("SELECT 1 FROM apoderados WHERE id_apoderado = $1", [id_apoderado]);
    if (a.rows.length === 0) return "El apoderado no existe";
  }
  return null;
};

export const createEstudiante = async (req, res, next) => {
  try {
    const { id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio } = req.body;
    const fkError = await checkFKs(id_usuario, id_apoderado);
    if (fkError) return res.status(409).json({ error: fkError });
    const { rows } = await pool.query(
      `INSERT INTO estudiantes (id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio)
       VALUES ($1,$2,$3,$4) RETURNING ${PUBLIC_COLUMNS}`,
      [id_usuario, id_apoderado ?? null, colegio_de_procedencia ?? null, direccion_de_domicilio ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateEstudiante = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio } = req.body;
    const fkError = await checkFKs(id_usuario, id_apoderado);
    if (fkError) return res.status(409).json({ error: fkError });
    const { rows } = await pool.query(
      `UPDATE estudiantes SET
        id_usuario = COALESCE($1, id_usuario),
        id_apoderado = COALESCE($2, id_apoderado),
        colegio_de_procedencia = COALESCE($3, colegio_de_procedencia),
        direccion_de_domicilio = COALESCE($4, direccion_de_domicilio)
       WHERE id_estudiante = $5 RETURNING ${PUBLIC_COLUMNS}`,
      [id_usuario ?? null, id_apoderado ?? null, colegio_de_procedencia ?? null, direccion_de_domicilio ?? null, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Estudiante no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteEstudiante = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rowCount } = await pool.query("DELETE FROM estudiantes WHERE id_estudiante = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Estudiante no encontrado" });
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
