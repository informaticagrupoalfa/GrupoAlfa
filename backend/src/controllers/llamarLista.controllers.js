import { pool } from "../db.js";
import { ROLE_NAMES } from "../config/roles.js";
import { hasAnyRole } from "../middleware/roleMiddleware.js";

const canSeeAllAssignments = (req) =>
  hasAnyRole(req.user, [ROLE_NAMES.SYS_ADMIN]) && req.query?.scope !== "mine";

export async function getAsignacionesAsesor(req, res, next) {
  try {
    const allAssignments = canSeeAllAssignments(req);
    const { rows } = await pool.query(
      `SELECT apm.id_asesor_paralelo_materia, apm.dias, pm.id_paralelo_materia,
              p.id_paralelo, p.nombre_paralelo, p.nivel, p.dias AS dias_paralelo,
              p.hora_inicio, p.hora_fin, aul.codigo AS aula_codigo,
              m.id_materia, m.nombre_materia,
              concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_asesor
       FROM asesores a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       JOIN asesor_paralelo_materia apm ON apm.id_asesor = a.id_asesor
       JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
       JOIN paralelos p ON p.id_paralelo = pm.id_paralelo
       LEFT JOIN aulas aul ON aul.id_aula = p.id_aula
       JOIN materias m ON m.id_materia = pm.id_materia
       ${allAssignments ? "" : "WHERE a.id_usuario = $1"}
       ORDER BY p.nombre_paralelo, apm.dias, m.nombre_materia, nombre_asesor`,
      allAssignments ? [] : [req.user.id_usuario],
    );
    res.json(rows);
  } catch (error) { next(error); }
}

export async function getEstudiantesDelParalelo(req, res, next) {
  try {
    const paraleloId = Number(req.params.id);
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (e.id_estudiante)
              e.id_estudiante, u.nro_carnet, u.nombre, u.apellido_paterno,
              u.apellido_materno, i.id_inscripcion
       FROM inscripciones i
       JOIN estudiantes e ON e.id_estudiante = i.id_estudiante
       JOIN usuarios u ON u.id_usuario = e.id_usuario
       WHERE i.id_paralelo = $1
       ORDER BY e.id_estudiante, i.fecha_insc DESC NULLS LAST, i.id_inscripcion DESC`,
      [paraleloId],
    );
    res.json(rows);
  } catch (error) { next(error); }
}

export async function getClasesAsesor(req, res, next) {
  try {
    const allAssignments = canSeeAllAssignments(req);
    const { rows } = await pool.query(
      `SELECT c.id_clase, c.inicioclase AS fecha, apm.id_asesor_paralelo_materia,
              p.nombre_paralelo, m.nombre_materia,
              concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_asesor,
              COUNT(DISTINCT a.id_asistencia) FILTER (WHERE a.id_estudiante IS NOT NULL) AS total_asistencias
       FROM clases c
       JOIN asesor_paralelo_materia apm ON apm.id_asesor_paralelo_materia = c.id_asesor_paralelo_materia
       JOIN asesores asesor ON asesor.id_asesor = apm.id_asesor
       JOIN usuarios u ON u.id_usuario = asesor.id_usuario
       JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
       JOIN paralelos p ON p.id_paralelo = pm.id_paralelo
       JOIN materias m ON m.id_materia = pm.id_materia
       LEFT JOIN asistencias a ON a.id_clase = c.id_clase
       ${allAssignments ? "" : "WHERE asesor.id_usuario = $1"}
       GROUP BY c.id_clase, apm.id_asesor_paralelo_materia, p.nombre_paralelo, m.nombre_materia, u.id_usuario
       ORDER BY c.inicioclase DESC, c.id_clase DESC`,
      allAssignments ? [] : [req.user.id_usuario],
    );
    res.json(rows);
  } catch (error) { next(error); }
}
