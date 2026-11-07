import { pool } from "../db.js";

/**
 * Un tema puede pertenecer a varias materias-facultad.
 * Se devuelven arreglos agregados y también `nombre_materia` como texto
 * para mantener compatibilidad con las pantallas actuales.
 */
const SELECT_TEMAS = `
  SELECT t.id_tema,
         t.nombre_tema,
         COALESCE(
           jsonb_agg(DISTINCT m.id_materia)
             FILTER (WHERE m.id_materia IS NOT NULL),
           '[]'::jsonb
         ) AS id_materias,
         COALESCE(
           jsonb_agg(DISTINCT m.nombre_materia)
             FILTER (WHERE m.nombre_materia IS NOT NULL),
           '[]'::jsonb
         ) AS materias,
         COALESCE(
           jsonb_agg(DISTINCT f.nombre)
             FILTER (WHERE f.nombre IS NOT NULL),
           '[]'::jsonb
         ) AS facultades,
         COALESCE(string_agg(DISTINCT m.nombre_materia, ', '), '') AS nombre_materia
  FROM temas t
  LEFT JOIN materia_facultad_temas mft
    ON mft.id_tema = t.id_tema
  LEFT JOIN materia_facultad mf
    ON mf.id_materia_facultad = mft.id_materia_facultad
  LEFT JOIN materias m
    ON m.id_materia = mf.id_materia
  LEFT JOIN facultades f
    ON f.id_facultad = mf.id_facultad
`;

const GROUP_BY = "GROUP BY t.id_tema, t.nombre_tema";

const parseId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) || id <= 0 ? null : id;
};

const fetchTema = async (id) => {
  const { rows } = await pool.query(
    `${SELECT_TEMAS} WHERE t.id_tema = $1 ${GROUP_BY}`,
    [id],
  );
  return rows[0] ?? null;
};

export const getTemas = async (req, res, next) => {
  try {
    const conditions = [];
    const values = [];

    if (req.query.id_materia !== undefined && req.query.id_materia !== "") {
      const idMateria = parseId(req.query.id_materia);
      if (idMateria === null) {
        return res.status(400).json({ message: "id_materia debe ser un entero mayor a 0" });
      }
      values.push(idMateria);
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM materia_facultad_temas mft_filtro
          JOIN materia_facultad mf_filtro
            ON mf_filtro.id_materia_facultad = mft_filtro.id_materia_facultad
          WHERE mft_filtro.id_tema = t.id_tema
            AND mf_filtro.id_materia = $${values.length}
        )`,
      );
    }

    if (req.query.id_facultad !== undefined && req.query.id_facultad !== "") {
      const idFacultad = parseId(req.query.id_facultad);
      if (idFacultad === null) {
        return res.status(400).json({ message: "id_facultad debe ser un entero mayor a 0" });
      }
      values.push(idFacultad);
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM materia_facultad_temas mft_filtro
          JOIN materia_facultad mf_filtro
            ON mf_filtro.id_materia_facultad = mft_filtro.id_materia_facultad
          WHERE mft_filtro.id_tema = t.id_tema
            AND mf_filtro.id_facultad = $${values.length}
        )`,
      );
    }

    if (req.query.id_materia_facultad !== undefined && req.query.id_materia_facultad !== "") {
      const idMateriaFacultad = parseId(req.query.id_materia_facultad);
      if (idMateriaFacultad === null) {
        return res.status(400).json({ message: "id_materia_facultad debe ser un entero mayor a 0" });
      }
      values.push(idMateriaFacultad);
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM materia_facultad_temas mft_filtro
          WHERE mft_filtro.id_tema = t.id_tema
            AND mft_filtro.id_materia_facultad = $${values.length}
        )`,
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `${SELECT_TEMAS} ${where} ${GROUP_BY} ORDER BY t.id_tema ASC`,
      values,
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getTemaById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const tema = await fetchTema(id);
    if (!tema) return res.status(404).json({ message: "Tema no encontrado" });

    res.json(tema);
  } catch (error) {
    next(error);
  }
};

export const createTema = async (req, res, next) => {
  try {
    const { nombre_tema } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO temas (nombre_tema) VALUES ($1) RETURNING id_tema",
      [nombre_tema],
    );
    res.status(201).json(await fetchTema(rows[0].id_tema));
  } catch (error) {
    next(error);
  }
};

export const updateTema = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const { nombre_tema } = req.body;
    const { rows } = await pool.query(
      `UPDATE temas
       SET nombre_tema = COALESCE($1, nombre_tema)
       WHERE id_tema = $2
       RETURNING id_tema`,
      [nombre_tema ?? null, id],
    );
    if (rows.length === 0) return res.status(404).json({ message: "Tema no encontrado" });

    res.json(await fetchTema(id));
  } catch (error) {
    next(error);
  }
};

export const deleteTema = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const { rowCount } = await pool.query("DELETE FROM temas WHERE id_tema = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Tema no encontrado" });

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
