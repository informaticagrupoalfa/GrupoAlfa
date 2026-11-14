import { pool } from "../db.js";

/**
 * Paralelos del estudiante autenticado.
 * La consulta se delimita siempre por `req.user.id_usuario`, de modo que un
 * estudiante nunca pueda solicitar los datos de otro cambiando un parámetro.
 */
const SELECT_MIS_PARALELOS = `
  SELECT i.id_inscripcion AS id_matriculacion,
         TRUE AS esta_vigente,
         NULL::integer AS nro_comprobante,
         i.num_credencial AS nro_credencial,
         i.id_inscripcion,
         i.fecha_insc,
         p.id_paralelo,
         p.nombre_paralelo,
         p.nivel,
         p.modalidad,
         p.hora_inicio,
         p.hora_fin,
         p.dias,
         p.activo,
         c.fecha_inicio AS capacitacion_fecha_inicio,
         c.fecha_fin AS capacitacion_fecha_fin,
         f.nombre AS facultad,
         a.codigo AS aula_codigo,
         a.capacidad AS aula_capacidad
  FROM estudiantes e
  JOIN inscripciones i ON i.id_estudiante = e.id_estudiante
  JOIN paralelos p ON p.id_paralelo = i.id_paralelo
  LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
  LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
  LEFT JOIN facultades f ON f.id_facultad = cv.id_facultad
  LEFT JOIN aulas a ON a.id_aula = p.id_aula
  WHERE e.id_usuario = $1
  ORDER BY p.nombre_paralelo DESC
`;

export const getMisParalelos = async (req, res, next) => {
  try {
    const idUsuario = req.user?.id_usuario;
    if (idUsuario == null) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const { rows } = await pool.query(SELECT_MIS_PARALELOS, [idUsuario]);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};
