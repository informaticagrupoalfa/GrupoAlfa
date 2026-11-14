import { pool } from "../db.js";

const LIMIT_DEFAULT = 25;

const SELECT_BASE = `
  FROM estudiantes e
  JOIN usuarios u ON u.id_usuario = e.id_usuario
  LEFT JOIN LATERAL (
    SELECT i.id_paralelo
    FROM inscripciones i
    WHERE i.id_estudiante = e.id_estudiante
    ORDER BY i.fecha_insc DESC NULLS LAST, i.id_inscripcion DESC
    LIMIT 1
  ) ins ON TRUE
  LEFT JOIN paralelos p ON p.id_paralelo = ins.id_paralelo
  LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
  LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
  LEFT JOIN facultades f ON f.id_facultad = cv.id_facultad
  LEFT JOIN LATERAL (
    SELECT me.fecha_fin_mensualidad
    FROM mensualidades me
    JOIN inscripciones i ON i.id_inscripcion = me.id_inscripcion
    WHERE i.id_estudiante = e.id_estudiante
    ORDER BY me.fecha_fin_mensualidad DESC NULLS LAST
    LIMIT 1
  ) latest ON TRUE
  LEFT JOIN (
    SELECT id_estudiante, COUNT(*) AS asistencias
    FROM asistencias
    GROUP BY id_estudiante
  ) a ON a.id_estudiante = e.id_estudiante
`;

const toInt = (value) => {
  if (value === undefined || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

export const getEstudiantesResumen = async (req, res, next) => {
  try {
    const { q, id_capacitacion, id_paralelo, page, limit } = req.query;
    const pagina = Math.max(parseInt(page, 10) || 1, 1);
    const limite = Math.min(Math.max(parseInt(limit, 10) || LIMIT_DEFAULT, 1), 100);
    const offset = (pagina - 1) * limite;

    const conditions = [];
    const values = [];

    if (q) {
      const searchTerm = `%${q}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm);
      const base = values.length - 3;
      conditions.push(
        `u.nombre ILIKE $${base}
         OR u.apellido_paterno ILIKE $${base + 1}
         OR u.apellido_materno ILIKE $${base + 2}
         OR u.nro_carnet::text ILIKE $${base + 3}`,
      );
    }

    const idCapacitacion = toInt(id_capacitacion);
    if (idCapacitacion !== null) {
      values.push(idCapacitacion);
      conditions.push(`c.id_capacitacion = $${values.length}`);
    }

    const idParalelo = toInt(id_paralelo);
    if (idParalelo !== null) {
      values.push(idParalelo);
      conditions.push(`ins.id_paralelo = $${values.length}`);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) AS total ${SELECT_BASE}${where}`;
    const { rows: countRows } = await pool.query(countQuery, values);
    const total = parseInt(countRows[0].total, 10) || 0;

    const dataQuery = `
      SELECT e.id_estudiante, e.id_usuario, u.nro_carnet, u.nombre, u.apellido_paterno,
             u.apellido_materno, u.correo_electronico, e.colegio_de_procedencia,
             e.direccion_de_domicilio, ins.id_paralelo, p.nombre_paralelo, c.id_capacitacion,
             f.nombre AS nombre_facultad, latest.fecha_fin_mensualidad,
             COALESCE(a.asistencias, 0) AS asistencias
      ${SELECT_BASE}${where}
      ORDER BY e.id_estudiante ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const dataValues = [...values, limite, offset];
    const { rows } = await pool.query(dataQuery, dataValues);

    const totalPaginas = Math.ceil(total / limite) || 0;

    res.status(200).json({
      filas: rows,
      total,
      pagina,
      limite,
      totalPaginas,
    });
  } catch (error) {
    next(error);
  }
};

const DETALLE_QUERY = `
  SELECT e.id_estudiante, e.id_usuario, e.id_apoderado, u.nro_carnet, u.nombre,
         u.apellido_paterno, u.apellido_materno, u.correo_electronico,
         u.fecha_nacimiento, u.nro_telefono, u.usuario_vigente,
         e.colegio_de_procedencia, e.direccion_de_domicilio,
         ins.id_paralelo, p.nombre_paralelo, c.id_capacitacion, f.nombre AS nombre_facultad,
         latest.fecha_fin_mensualidad, COALESCE(a.asistencias, 0) AS asistencias,
         CASE WHEN e.foto IS NOT NULL THEN encode(e.foto, 'base64') END AS foto_base64
  ${SELECT_BASE}
  WHERE e.id_estudiante = $1
  LIMIT 1
`;

export const getEstudianteDetalle = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID debe ser numérico" });
    }
    const { rows } = await pool.query(DETALLE_QUERY, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Estudiante no encontrado" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};
