import { pool } from "../db.js";
import { ROLE_NAMES } from "../config/roles.js";
import { hasAnyRole } from "../middleware/roleMiddleware.js";

const canSeeAllAssignments = (req) =>
  hasAnyRole(req.user, [ROLE_NAMES.SYS_ADMIN]) && req.query?.scope !== "mine";

export async function getAsignacionesAsesor(req, res, next) {
  try {
    const allAssignments = canSeeAllAssignments(req);
    const { rows } = await pool.query(
      `SELECT pma.id_paralelo_materia AS id_asesor_paralelo_materia,
              pma.dia AS dias, pma.id_paralelo_materia,
              p.id_paralelo, p.nombre_paralelo, p.nivel, p.dias AS dias_paralelo,
              p.hora_inicio, p.hora_fin, aul.codigo AS aula_codigo,
              p.id_capacitacion, to_jsonb(cap)->>'nombre' AS nombre_capacitacion,
              m.id_materia, m.nombre_materia,
              concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_asesor
       FROM asesores a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       JOIN paralelo_materia_asesor pma ON pma.id_asesor = a.id_asesor
       JOIN paralelos p ON p.id_paralelo = pma.id_paralelo
       LEFT JOIN capacitaciones cap ON cap.id_capacitacion = p.id_capacitacion
       LEFT JOIN aulas aul ON aul.id_aula = p.id_aula
       JOIN materias m ON m.id_materia = pma.id_materia
       ${allAssignments ? "WHERE pma.id_asesor IS NOT NULL" : "WHERE a.id_usuario = $1 AND pma.id_asesor IS NOT NULL"}
       ORDER BY p.nombre_paralelo, pma.dia, m.nombre_materia, nombre_asesor`,
      allAssignments ? [] : [req.user.id_usuario],
    );
    res.json(rows);
  } catch (error) { next(error); }
}

export async function getFotosDelParalelo(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT e.id_estudiante, encode(e.foto, 'base64') AS foto_base64
       FROM inscripciones i JOIN estudiantes e ON e.id_estudiante = i.id_estudiante
       WHERE i.id_paralelo = $1 AND e.foto IS NOT NULL`,
      [Number(req.params.id)],
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
      `SELECT c.id_clase, c.inicioclase AS fecha, c.tema,
              c.id_asesor_paralelo_materia,
              p.nombre_paralelo,
              COALESCE(c.materia, m.nombre_materia) AS nombre_materia,
              COALESCE(c.asesor, concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno)) AS nombre_asesor,
              COUNT(DISTINCT a.id_asistencia) FILTER (WHERE a.id_estudiante IS NOT NULL) AS total_asistencias
       FROM clases c
       LEFT JOIN paralelo_materia_asesor pma ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
       LEFT JOIN asesores asesor ON asesor.id_asesor = pma.id_asesor
       LEFT JOIN usuarios u ON u.id_usuario = asesor.id_usuario
       LEFT JOIN paralelos p ON p.id_paralelo = pma.id_paralelo
       LEFT JOIN materias m ON m.id_materia = pma.id_materia
       LEFT JOIN asistencias a ON a.id_clase = c.id_clase
       ${allAssignments ? "" : "WHERE asesor.id_usuario = $1"}
       GROUP BY c.id_clase, c.id_asesor_paralelo_materia, c.materia, c.asesor,
                p.nombre_paralelo, m.nombre_materia, u.id_usuario
       ORDER BY c.inicioclase DESC, c.id_clase DESC`,
      allAssignments ? [] : [req.user.id_usuario],
    );
    res.json(rows);
  } catch (error) { next(error); }
}

export async function getFichaEstudianteRegistrado(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    const studentId = Number(req.params.studentId);
    if (!Number.isSafeInteger(classId) || classId <= 0 || !Number.isSafeInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ error: "Clase o estudiante inválido" });
    }

    const isSysAdmin = hasAnyRole(req.user, [ROLE_NAMES.SYS_ADMIN]);
    const isAdvisor = hasAnyRole(req.user, [ROLE_NAMES.ASESOR, ROLE_NAMES.ASESOR_COORDINADOR]);
    if (!isSysAdmin && !isAdvisor) {
      return res.status(403).json({ error: "No tienes permisos para ver esta ficha" });
    }
    const advisorId = isSysAdmin && req.query.scope !== "mine" ? null : req.user.id_usuario;
    const { rows } = await pool.query(
      `SELECT e.id_estudiante, u.nombre, u.apellido_paterno, u.apellido_materno,
              u.nro_carnet, CASE WHEN e.foto IS NOT NULL THEN encode(e.foto, 'base64') END AS foto_base64,
              p.nombre_paralelo, m.nombre_materia, c.inicioclase AS fecha_clase,
              TRUE AS pertenece_materia,
              (mensualidad.id_mensualidad IS NOT NULL) AS mensualidad_vigente,
              mensualidad.id_mensualidad,
              mensualidad.fecha_inicio_mensualidad AS mensualidad_desde,
              mensualidad.fecha_fin_mensualidad AS mensualidad_hasta,
              cr.nombre AS carrera_nombre,
              a.parentesco AS apoderado_parentesco, au.nombre AS apoderado_nombre,
              au.apellido_paterno AS apoderado_apellido_paterno,
              au.apellido_materno AS apoderado_apellido_materno,
              au.nro_carnet AS apoderado_ci, au.nro_telefono AS apoderado_telefono,
              au.correo_electronico AS apoderado_correo
       FROM clases c
       JOIN paralelo_materia_asesor pma ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
       JOIN asesores asesor ON asesor.id_asesor = pma.id_asesor
       JOIN paralelos p ON p.id_paralelo = pma.id_paralelo
       JOIN materias m ON m.id_materia = pma.id_materia
       JOIN inscripciones i ON i.id_paralelo = p.id_paralelo AND i.id_estudiante = $2
       JOIN estudiantes e ON e.id_estudiante = i.id_estudiante
       JOIN usuarios u ON u.id_usuario = e.id_usuario
       LEFT JOIN LATERAL (
         SELECT MIN(po.id_carrera) AS id_carrera
         FROM postulaciones po WHERE po.id_estudiante = e.id_estudiante
         HAVING COUNT(DISTINCT po.id_carrera) = 1
       ) postulacion ON true
       LEFT JOIN carreras cr ON cr.id_carrera = COALESCE(NULLIF(to_jsonb(i)->>'id_carrera', '')::integer, postulacion.id_carrera)
       LEFT JOIN LATERAL (
         SELECT men.id_mensualidad, men.fecha_inicio_mensualidad, men.fecha_fin_mensualidad
           FROM inscripciones im
           JOIN mensualidades men ON men.id_inscripcion = im.id_inscripcion
          WHERE im.id_estudiante = e.id_estudiante AND im.id_paralelo = p.id_paralelo
            AND c.inicioclase BETWEEN men.fecha_inicio_mensualidad AND men.fecha_fin_mensualidad
          ORDER BY men.fecha_fin_mensualidad DESC, men.id_mensualidad DESC
          LIMIT 1
       ) mensualidad ON true
       LEFT JOIN apoderados a ON a.id_apoderado = e.id_apoderado
       LEFT JOIN usuarios au ON au.id_usuario = a.id_usuario
       WHERE c.id_clase = $1 AND ($3::integer IS NULL OR asesor.id_usuario = $3)
         AND EXISTS (SELECT 1 FROM asistencias asistencia
                     WHERE asistencia.id_clase = c.id_clase AND asistencia.id_estudiante = e.id_estudiante)
       ORDER BY i.fecha_insc DESC NULLS LAST, i.id_inscripcion DESC
       LIMIT 1`,
      [classId, studentId, advisorId],
    );
    if (!rows.length) return res.status(404).json({ error: "Ficha no disponible para esta clase" });
    const row = rows[0];
    res.json({
      ...row,
      verificacion: {
        pertenece_materia: Boolean(row.pertenece_materia),
        mensualidad_vigente: Boolean(row.mensualidad_vigente),
        id_mensualidad: row.id_mensualidad,
        mensualidad_desde: row.mensualidad_desde,
        mensualidad_hasta: row.mensualidad_hasta,
        nombre_materia: row.nombre_materia,
        fecha_registro: row.fecha_clase,
      },
    });
  } catch (error) { next(error); }
}
