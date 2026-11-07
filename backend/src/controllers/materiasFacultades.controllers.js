import { pool } from "../db.js";

const SELECT_MATERIA_FACULTAD = `
  SELECT mf.id_materia_facultad,
         mf.id_materia,
         mf.id_facultad,
         m.nombre_materia,
         f.nombre AS nombre_facultad
  FROM materia_facultad mf
  JOIN materias m ON m.id_materia = mf.id_materia
  JOIN facultades f ON f.id_facultad = mf.id_facultad
`;

const parseId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) || id <= 0 ? null : id;
};

const fetchMateriaFacultad = async (id) => {
  const { rows } = await pool.query(
    `${SELECT_MATERIA_FACULTAD} WHERE mf.id_materia_facultad = $1`,
    [id],
  );
  return rows[0] ?? null;
};

const existeMateria = async (id) => {
  const { rowCount } = await pool.query("SELECT 1 FROM materias WHERE id_materia = $1", [id]);
  return rowCount > 0;
};

const existeFacultad = async (id) => {
  const { rowCount } = await pool.query("SELECT 1 FROM facultades WHERE id_facultad = $1", [id]);
  return rowCount > 0;
};

export const getMateriasFacultades = async (req, res, next) => {
  try {
    const conditions = [];
    const values = [];

    if (req.query.id_materia !== undefined && req.query.id_materia !== "") {
      const idMateria = parseId(req.query.id_materia);
      if (idMateria === null) {
        return res.status(400).json({ message: "id_materia debe ser un entero mayor a 0" });
      }
      values.push(idMateria);
      conditions.push(`mf.id_materia = $${values.length}`);
    }

    if (req.query.id_facultad !== undefined && req.query.id_facultad !== "") {
      const idFacultad = parseId(req.query.id_facultad);
      if (idFacultad === null) {
        return res.status(400).json({ message: "id_facultad debe ser un entero mayor a 0" });
      }
      values.push(idFacultad);
      conditions.push(`mf.id_facultad = $${values.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `${SELECT_MATERIA_FACULTAD} ${where} ORDER BY mf.id_materia_facultad ASC`,
      values,
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getMateriaFacultadById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const row = await fetchMateriaFacultad(id);
    if (!row) return res.status(404).json({ message: "Asignación materia-facultad no encontrada" });

    res.json(row);
  } catch (error) {
    next(error);
  }
};

export const createMateriaFacultad = async (req, res, next) => {
  try {
    const { id_materia, id_facultad } = req.body;

    if (!(await existeMateria(id_materia))) {
      return res.status(409).json({ error: "La materia no existe" });
    }
    if (!(await existeFacultad(id_facultad))) {
      return res.status(409).json({ error: "La facultad no existe" });
    }

    const { rows } = await pool.query(
      `INSERT INTO materia_facultad (id_materia, id_facultad)
       VALUES ($1, $2)
       RETURNING id_materia_facultad`,
      [id_materia, id_facultad],
    );

    res.status(201).json(await fetchMateriaFacultad(rows[0].id_materia_facultad));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "La materia ya está asignada a esa facultad" });
    }
    next(error);
  }
};

export const updateMateriaFacultad = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const current = await fetchMateriaFacultad(id);
    if (!current) return res.status(404).json({ message: "Asignación materia-facultad no encontrada" });

    const { id_materia, id_facultad } = req.body;

    if (id_materia !== undefined && !(await existeMateria(id_materia))) {
      return res.status(409).json({ error: "La materia no existe" });
    }
    if (id_facultad !== undefined && !(await existeFacultad(id_facultad))) {
      return res.status(409).json({ error: "La facultad no existe" });
    }

    await pool.query(
      `UPDATE materia_facultad
       SET id_materia = COALESCE($1, id_materia),
           id_facultad = COALESCE($2, id_facultad)
       WHERE id_materia_facultad = $3`,
      [id_materia ?? null, id_facultad ?? null, id],
    );

    res.json(await fetchMateriaFacultad(id));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "La materia ya está asignada a esa facultad" });
    }
    next(error);
  }
};

export const deleteMateriaFacultad = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const { rowCount } = await pool.query(
      "DELETE FROM materia_facultad WHERE id_materia_facultad = $1",
      [id],
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: "Asignación materia-facultad no encontrada" });
    }

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
