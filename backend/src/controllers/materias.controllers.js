import { pool } from "../db.js";

/**
 * Devuelve las materias junto con las facultades donde se dictan.
 * La relación es N:N mediante materia_facultad.
 */
const SELECT_MATERIAS = `
  SELECT m.id_materia,
         m.nombre_materia,
         COALESCE(
           jsonb_agg(
             DISTINCT jsonb_build_object(
               'id_facultad', f.id_facultad,
               'nombre', f.nombre
             )
           ) FILTER (WHERE f.id_facultad IS NOT NULL),
           '[]'::jsonb
         ) AS facultades
  FROM materias m
  LEFT JOIN materia_facultad mf ON mf.id_materia = m.id_materia
  LEFT JOIN facultades f ON f.id_facultad = mf.id_facultad
`;

const GROUP_BY = "GROUP BY m.id_materia, m.nombre_materia";

const parseId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) || id <= 0 ? null : id;
};

const fetchMateria = async (id) => {
  const { rows } = await pool.query(
    `${SELECT_MATERIAS} WHERE m.id_materia = $1 ${GROUP_BY}`,
    [id],
  );
  return rows[0] ?? null;
};

export const getMaterias = async (req, res, next) => {
  try {
    const conditions = [];
    const values = [];

    if (req.query.id_facultad !== undefined && req.query.id_facultad !== "") {
      const idFacultad = parseId(req.query.id_facultad);
      if (idFacultad === null) {
        return res.status(400).json({ message: "id_facultad debe ser un entero mayor a 0" });
      }
      values.push(idFacultad);
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM materia_facultad mf_filtro
          WHERE mf_filtro.id_materia = m.id_materia
            AND mf_filtro.id_facultad = $${values.length}
        )`,
      );
    }

    if (req.query.activas === "true") {
      values.push(new Date().toISOString().slice(0, 10));
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM materia_curso_capacitacion mcc
          JOIN cursos_capacitacion cc
            ON cc.id_capacitacion = mcc.id_curso_capacitacion
          WHERE mcc.id_materia = m.id_materia
            AND cc.activo = true
            AND cc.fecha_inicio <= $${values.length}
            AND ($${values.length} <= cc.fecha_fin OR cc.fecha_fin IS NULL)
        )`,
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `${SELECT_MATERIAS} ${where} ${GROUP_BY} ORDER BY m.id_materia ASC`,
      values,
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getMateriaById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const materia = await fetchMateria(id);
    if (!materia) return res.status(404).json({ message: "Materia no encontrada" });

    res.json(materia);
  } catch (error) {
    next(error);
  }
};

export const createMateria = async (req, res, next) => {
  try {
    const { nombre_materia } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO materias (nombre_materia) VALUES ($1) RETURNING id_materia",
      [nombre_materia],
    );
    const materia = await fetchMateria(rows[0].id_materia);
    res.status(201).json(materia);
  } catch (error) {
    next(error);
  }
};

export const updateMateria = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const { nombre_materia } = req.body;
    const { rows } = await pool.query(
      `UPDATE materias
       SET nombre_materia = COALESCE($1, nombre_materia)
       WHERE id_materia = $2
       RETURNING id_materia`,
      [nombre_materia ?? null, id],
    );
    if (rows.length === 0) return res.status(404).json({ message: "Materia no encontrada" });

    res.json(await fetchMateria(id));
  } catch (error) {
    next(error);
  }
};

export const deleteMateria = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID debe ser numérico" });

    const { rowCount } = await pool.query("DELETE FROM materias WHERE id_materia = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Materia no encontrada" });

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
