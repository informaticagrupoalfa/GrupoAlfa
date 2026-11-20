import { pool } from "../db.js";

export async function getDashboardResumen(req, res, next) {
  try {
    const countTables = {
      usuarios: "usuarios",
      materias: "materias",
      asesores: "asesores",
      capacitaciones: "capacitaciones",
      matriculaciones: "mensualidades",
      inscripciones: "inscripciones",
      temas: "temas",
      estudiantes: "estudiantes",
    };
    const present = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
      [Object.values(countTables)],
    );
    const existing = new Set(present.rows.map((row) => row.table_name));
    const [counts, roles, aulas, paralelos] = await Promise.all([
      Promise.all(Object.entries(countTables).map(async ([key, table]) => [
        key,
        existing.has(table) ? (await pool.query(`SELECT count(*)::int AS total FROM ${table}`)).rows[0].total : null,
      ])).then(Object.fromEntries),
      pool.query(`SELECT r.nombre, count(DISTINCT ur.id_usuario)::int AS cantidad
        FROM roles r
        LEFT JOIN usuario_rol ur ON ur.id_rol = r.id_rol
        GROUP BY r.id_rol
        ORDER BY r.id_rol`),
      pool.query("SELECT id_aula, codigo, capacidad FROM aulas ORDER BY codigo NULLS LAST, id_aula"),
      pool.query(`SELECT p.id_paralelo, p.nombre_paralelo, p.id_aula, p.dias,
          p.hora_inicio, p.hora_fin, p.activo,
          f.nombre AS facultad,
          COALESCE(inscritos.ocupados, 0) AS ocupados
        FROM paralelos p
        LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
        LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
        LEFT JOIN facultades f ON f.id_facultad = cv.id_facultad
        LEFT JOIN (
          SELECT id_paralelo, count(DISTINCT id_estudiante)::int AS ocupados
          FROM inscripciones
          WHERE id_estudiante IS NOT NULL
          GROUP BY id_paralelo
        ) inscritos ON inscritos.id_paralelo = p.id_paralelo
        ORDER BY p.id_paralelo`),
    ]);

    res.json({
      counts,
      roles: roles.rows,
      aulas: aulas.rows,
      paralelos: paralelos.rows,
    });
  } catch (error) {
    next(error);
  }
}
