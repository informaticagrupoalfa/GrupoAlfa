import { pool } from "../db.js";

const LIMIT_DEFAULT = 25;

const SELECT_BASE = `
  FROM estudiantes e
  JOIN usuarios u ON u.id_usuario = e.id_usuario
  LEFT JOIN matriculaciones m ON m.id_estudiante = e.id_estudiante AND m.esta_vigente = TRUE
  LEFT JOIN paralelos p ON p.id_paralelo = m.id_paralelo
  LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
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
      conditions.push(`m.id_paralelo = $${values.length}`);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) AS total ${SELECT_BASE}${where}`;
    const { rows: countRows } = await pool.query(countQuery, values);
    const total = parseInt(countRows[0].total, 10) || 0;

    const dataQuery = `
      SELECT e.id_estudiante, e.id_usuario, u.nro_carnet, u.nombre, u.apellido_paterno,
             u.apellido_materno, u.correo_electronico, e.colegio_de_procedencia,
             e.direccion_de_domicilio, m.id_paralelo, p.nombre_paralelo, c.id_capacitacion,
             latest.fecha_fin_mensualidad, COALESCE(a.asistencias, 0) AS asistencias
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
