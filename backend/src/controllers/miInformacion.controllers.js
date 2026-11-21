import { pool } from "../db.js";
import { ROLE_NAMES } from "../config/roles.js";
import { hasAnyRole } from "../middleware/roleMiddleware.js";

const ESTUDIANTE_QUERY = `
  SELECT e.id_estudiante, e.id_usuario, e.id_apoderado,
         u.nro_carnet, u.nombre, u.apellido_paterno, u.apellido_materno,
         u.correo_electronico, u.fecha_nacimiento, u.nro_telefono, u.usuario_vigente,
         e.colegio_de_procedencia, e.direccion_de_domicilio,
         CASE WHEN e.foto IS NOT NULL THEN encode(e.foto, 'base64') END AS foto_base64,
         ap.parentesco AS apoderado_parentesco,
         au.nombre AS apoderado_nombre,
         au.apellido_paterno AS apoderado_apellido_paterno,
         au.apellido_materno AS apoderado_apellido_materno,
         au.nro_carnet AS apoderado_carnet,
         au.nro_telefono AS apoderado_telefono,
         au.correo_electronico AS apoderado_correo
  FROM estudiantes e
  JOIN usuarios u ON u.id_usuario = e.id_usuario
  LEFT JOIN apoderados ap ON ap.id_apoderado = e.id_apoderado
  LEFT JOIN usuarios au ON au.id_usuario = ap.id_usuario
  WHERE e.id_usuario = $1
  LIMIT 1
`;

// La inscripción más reciente determina el paralelo y la capacitación vigentes.
const INSCRIPCIONES_QUERY = `
  SELECT i.id_inscripcion, i.fecha_insc, i.num_credencial, i.id_paralelo,
         p.nombre_paralelo, p.nivel, p.modalidad, p.hora_inicio, p.hora_fin,
         p.dias, p.activo AS paralelo_activo,
         aul.codigo AS aula_codigo, aul.capacidad AS aula_capacidad,
         c.id_capacitacion, c.fecha_inicio AS capacitacion_inicio,
         c.fecha_fin AS capacitacion_fin, c.activo AS capacitacion_activa,
         cv.id_convocatoria, cv.fecha_inicio AS convocatoria_inicio,
         cv.modalidad AS convocatoria_modalidad,
         f.nombre AS facultad
  FROM inscripciones i
  LEFT JOIN paralelos p ON p.id_paralelo = i.id_paralelo
  LEFT JOIN aulas aul ON aul.id_aula = p.id_aula
  LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
  LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
  LEFT JOIN facultades f ON f.id_facultad = cv.id_facultad
  WHERE i.id_estudiante = $1
  ORDER BY i.fecha_insc DESC NULLS LAST, i.id_inscripcion DESC
`;

const MATERIAS_QUERY = `
  SELECT pma.id_paralelo_materia, m.id_materia, m.nombre_materia,
         pma.id_paralelo_materia AS id_asesor_paralelo_materia, pma.dia AS dias,
         a.id_asesor, ua.nombre, ua.apellido_paterno, ua.apellido_materno,
         ua.correo_electronico, ua.nro_telefono
  FROM paralelo_materia_asesor pma
  JOIN materias m ON m.id_materia = pma.id_materia
  LEFT JOIN asesores a ON a.id_asesor = pma.id_asesor
  LEFT JOIN usuarios ua ON ua.id_usuario = a.id_usuario
  WHERE pma.id_paralelo = $1
  ORDER BY m.nombre_materia, pma.dia
`;

const RESUMEN_ASISTENCIA_QUERY = `
  SELECT COUNT(*)::int AS asistencias,
         COUNT(*) FILTER (WHERE a.permiso)::int AS permisos,
         MAX(a.hora_entrada) AS ultima_asistencia
  FROM asistencias a
  JOIN clases c ON c.id_clase = a.id_clase
  JOIN paralelo_materia_asesor pma ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
  WHERE a.id_estudiante = $1 AND pma.id_paralelo = $2
`;

const TOTAL_CLASES_QUERY = `
  SELECT COUNT(*)::int AS total_clases
  FROM clases c
  JOIN paralelo_materia_asesor pma ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
  WHERE pma.id_paralelo = $1
`;

const MENSUALIDAD_QUERY = `
  SELECT id_mensualidad, fecha_inicio_mensualidad, fecha_fin_mensualidad,
         pago, codigo_comprobante
  FROM mensualidades
  WHERE id_inscripcion = $1
  ORDER BY fecha_fin_mensualidad DESC NULLS LAST
  LIMIT 1
`;

const fullName = (row) =>
  [row?.nombre, row?.apellido_paterno, row?.apellido_materno].filter(Boolean).join(" ");

const toApoderado = (row) => {
  if (!row?.apoderado_nombre) return null;
  return {
    nombre_completo: fullName({
      nombre: row.apoderado_nombre,
      apellido_paterno: row.apoderado_apellido_paterno,
      apellido_materno: row.apoderado_apellido_materno,
    }),
    parentesco: row.apoderado_parentesco ?? null,
    nro_carnet: row.apoderado_carnet ?? null,
    nro_telefono: row.apoderado_telefono ?? null,
    correo_electronico: row.apoderado_correo ?? null,
  };
};

const toMaterias = (rows) => {
  const byMateria = new Map();

  for (const row of rows) {
    let materia = byMateria.get(row.id_paralelo_materia);
    if (!materia) {
      materia = {
        id_paralelo_materia: row.id_paralelo_materia,
        id_materia: row.id_materia,
        nombre_materia: row.nombre_materia,
        asesores: [],
      };
      byMateria.set(row.id_paralelo_materia, materia);
    }

    if (row.id_asesor == null) continue;

    let asesor = materia.asesores.find((item) => item.id_asesor === row.id_asesor);
    if (!asesor) {
      asesor = {
        id_asesor: row.id_asesor,
        nombre_completo: fullName(row),
        correo_electronico: row.correo_electronico ?? null,
        nro_telefono: row.nro_telefono ?? null,
        dias: [],
      };
      materia.asesores.push(asesor);
    }

    const dias = String(row.dias ?? "")
      .split(",")
      .map((dia) => dia.trim())
      .filter(Boolean);

    for (const dia of dias) {
      if (!asesor.dias.includes(dia)) asesor.dias.push(dia);
    }
  }

  return [...byMateria.values()];
};

export const getMiInformacion = async (req, res, next) => {
  try {
    if (!hasAnyRole(req.user, [ROLE_NAMES.ESTUDIANTE])) {
      return res.status(403).json({ error: "Este portal es exclusivo para estudiantes" });
    }

    const { rows } = await pool.query(ESTUDIANTE_QUERY, [req.user.id_usuario]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: "Tu usuario tiene el rol Estudiante, pero no cuenta con una ficha de estudiante registrada",
      });
    }

    const row = rows[0];
    const { rows: inscripciones } = await pool.query(INSCRIPCIONES_QUERY, [row.id_estudiante]);
    const inscripcion = inscripciones[0] ?? null;

    let materias = [];
    let resumen = { asistencias: 0, permisos: 0, total_clases: 0, ultima_asistencia: null };
    let mensualidad = null;

    if (inscripcion) {
      const tasks = [pool.query(MENSUALIDAD_QUERY, [inscripcion.id_inscripcion])];

      if (inscripcion.id_paralelo != null) {
        tasks.push(
          pool.query(MATERIAS_QUERY, [inscripcion.id_paralelo]),
          pool.query(RESUMEN_ASISTENCIA_QUERY, [row.id_estudiante, inscripcion.id_paralelo]),
          pool.query(TOTAL_CLASES_QUERY, [inscripcion.id_paralelo]),
        );
      }

      const [mensualidadResult, materiasResult, asistenciaResult, clasesResult] = await Promise.all(tasks);
      mensualidad = mensualidadResult.rows[0] ?? null;
      materias = materiasResult ? toMaterias(materiasResult.rows) : [];

      if (asistenciaResult) {
        resumen = {
          asistencias: asistenciaResult.rows[0]?.asistencias ?? 0,
          permisos: asistenciaResult.rows[0]?.permisos ?? 0,
          total_clases: clasesResult?.rows[0]?.total_clases ?? 0,
          ultima_asistencia: asistenciaResult.rows[0]?.ultima_asistencia ?? null,
        };
      }
    }

    res.status(200).json({
      estudiante: {
        id_estudiante: row.id_estudiante,
        id_usuario: row.id_usuario,
        nro_carnet: row.nro_carnet,
        nombre: row.nombre,
        apellido_paterno: row.apellido_paterno,
        apellido_materno: row.apellido_materno,
        nombre_completo: fullName(row),
        correo_electronico: row.correo_electronico,
        fecha_nacimiento: row.fecha_nacimiento,
        nro_telefono: row.nro_telefono,
        usuario_vigente: row.usuario_vigente,
        colegio_de_procedencia: row.colegio_de_procedencia,
        direccion_de_domicilio: row.direccion_de_domicilio,
        foto_base64: row.foto_base64,
      },
      apoderado: toApoderado(row),
      inscripcion: inscripcion
        ? {
            id_inscripcion: inscripcion.id_inscripcion,
            fecha_insc: inscripcion.fecha_insc,
            num_credencial: inscripcion.num_credencial,
          }
        : null,
      paralelo: inscripcion?.id_paralelo != null
        ? {
            id_paralelo: inscripcion.id_paralelo,
            nombre_paralelo: inscripcion.nombre_paralelo,
            nivel: inscripcion.nivel,
            modalidad: inscripcion.modalidad,
            hora_inicio: inscripcion.hora_inicio,
            hora_fin: inscripcion.hora_fin,
            dias: inscripcion.dias,
            activo: inscripcion.paralelo_activo,
            aula_codigo: inscripcion.aula_codigo,
            aula_capacidad: inscripcion.aula_capacidad,
          }
        : null,
      capacitacion: inscripcion?.id_capacitacion != null
        ? {
            id_capacitacion: inscripcion.id_capacitacion,
            fecha_inicio: inscripcion.capacitacion_inicio,
            fecha_fin: inscripcion.capacitacion_fin,
            activo: inscripcion.capacitacion_activa,
            id_convocatoria: inscripcion.id_convocatoria,
            convocatoria_fecha_inicio: inscripcion.convocatoria_inicio,
            convocatoria_modalidad: inscripcion.convocatoria_modalidad,
            facultad: inscripcion.facultad,
          }
        : null,
      materias,
      resumen,
      mensualidad,
    });
  } catch (error) {
    next(error);
  }
};
