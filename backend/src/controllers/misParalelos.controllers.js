import { pool } from "../db.js";

/**
 * Paralelos del estudiante autenticado.
 * La consulta se delimita siempre por `req.user.id_usuario`, de modo que un
 * estudiante nunca pueda solicitar los datos de otro cambiando un parámetro.
 */
const SELECT_MIS_PARALELOS = `
  SELECT m.id_matriculacion,
         m.esta_vigente,
         m.nro_comprobante,
         m.nro_credencial,
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
  JOIN matriculaciones m ON m.id_estudiante = e.id_estudiante
  JOIN paralelos p ON p.id_paralelo = m.id_paralelo
  LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
  LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
  LEFT JOIN facultades f ON f.id_facultad = cv.id_facultad
  LEFT JOIN aulas a ON a.id_aula = p.id_aula
  WHERE e.id_usuario = $1
    AND COALESCE(m.esta_vigente, TRUE) = TRUE
  ORDER BY p.nombre_paralelo ASC
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
