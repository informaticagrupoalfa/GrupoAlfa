import { pool } from "../db.js";

const SELECT_MATERIA_FACULTAD_TEMA = `
  SELECT mft.id_materia_facultad_tema,
         mft.id_materia_facultad,
         mft.id_tema,
         t.nombre_tema,
         mf.id_materia,
         mf.id_facultad,
         m.nombre_materia,
         f.nombre AS nombre_facultad
  FROM materia_facultad_temas mft
  JOIN materia_facultad mf ON mf.id_materia_facultad = mft.id_materia_facultad
  JOIN materias m ON m.id_materia = mf.id_materia
  JOIN facultades f ON f.id_facultad = mf.id_facultad
  JOIN temas t ON t.id_tema = mft.id_tema
`;

const parseId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) || id <= 0 ? null : id;
};

const fetchMateriaFacultadTema = async (id) => {
  const { rows } = await pool.query(
    `${SELECT_MATERIA_FACULTAD_TEMA} WHERE mft.id_materia_facultad_tema = $1`,
    [id],
  );
  return rows[0] ?? null;
};

const existeMateriaFacultad = async (id) => {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM materia_facultad WHERE id_materia_facultad = $1",
    [id],
  );
  return rowCount > 0;
};

const existeTema = async (id) => {
  const { rowCount } = await pool.query("SELECT 1 FROM temas WHERE id_tema = $1", [id]);
  return rowCount > 0;
};

export const getMateriasFacultadesTemas = async (req, res, next) => {
  try {
    const conditions = [];
    const values = [];

    if (req.query.id_materia_facultad !== undefined && req.query.id_materia_facultad !== "") {
      const idMateriaFacultad = parseId(req.query.id_materia_facultad);
      if (idMateriaFacultad === null) {
        return res.status(400).json({ message: "id_materia_facultad debe ser un entero mayor a 0" });
      }
      values.push(idMateriaFacultad);
      conditions.push(`mft.id_materia_facultad = $${values.length}`);
    }

    if (req.query.id_tema !== undefined && req.query.id_tema !== "") {
      const idTema = parseId(req.query.id_tema);
      if (idTema === null) {
        return res.status(400).json({ message: "id_tema debe ser un entero mayor a 0" });
      }
      values.push(idTema);
      conditions.push(`mft.id_tema = $${values.length}`);
    }

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
      `${SELECT_MATERIA_FACULTAD_TEMA} ${where} ORDER BY mft.id_materia_facultad_tema ASC`,
      values,
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getMateriaFacultadTemaById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const row = await fetchMateriaFacultadTema(id);
    if (!row) return res.status(404).json({ message: "Asignación materia-facultad-tema no encontrada" });

    res.json(row);
  } catch (error) {
    next(error);
  }
};

export const createMateriaFacultadTema = async (req, res, next) => {
  try {
    const { id_materia_facultad, id_tema } = req.body;

    if (!(await existeMateriaFacultad(id_materia_facultad))) {
      return res.status(409).json({ error: "La asignación materia-facultad no existe" });
    }
    if (!(await existeTema(id_tema))) {
      return res.status(409).json({ error: "El tema no existe" });
    }

    const { rows } = await pool.query(
      `INSERT INTO materia_facultad_temas (id_materia_facultad, id_tema)
       VALUES ($1, $2)
       RETURNING id_materia_facultad_tema`,
      [id_materia_facultad, id_tema],
    );

    res.status(201).json(await fetchMateriaFacultadTema(rows[0].id_materia_facultad_tema));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "El tema ya está asignado a esa materia-facultad" });
    }
    next(error);
  }
};

export const updateMateriaFacultadTema = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const current = await fetchMateriaFacultadTema(id);
    if (!current) {
      return res.status(404).json({ message: "Asignación materia-facultad-tema no encontrada" });
    }

    const { id_materia_facultad, id_tema } = req.body;

    if (id_materia_facultad !== undefined && !(await existeMateriaFacultad(id_materia_facultad))) {
      return res.status(409).json({ error: "La asignación materia-facultad no existe" });
    }
    if (id_tema !== undefined && !(await existeTema(id_tema))) {
      return res.status(409).json({ error: "El tema no existe" });
    }

    await pool.query(
      `UPDATE materia_facultad_temas
       SET id_materia_facultad = COALESCE($1, id_materia_facultad),
           id_tema = COALESCE($2, id_tema)
       WHERE id_materia_facultad_tema = $3`,
      [id_materia_facultad ?? null, id_tema ?? null, id],
    );

    res.json(await fetchMateriaFacultadTema(id));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "El tema ya está asignado a esa materia-facultad" });
    }
    next(error);
  }
};

export const deleteMateriaFacultadTema = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const { rowCount } = await pool.query(
      "DELETE FROM materia_facultad_temas WHERE id_materia_facultad_tema = $1",
      [id],
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: "Asignación materia-facultad-tema no encontrada" });
    }

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
