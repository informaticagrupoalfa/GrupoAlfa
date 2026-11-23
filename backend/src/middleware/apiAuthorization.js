import { authMiddleware } from "./authMiddleware.js";
import { hasAnyRole } from "./roleMiddleware.js";
import { ACADEMIC_ROLES, INSCRIPCIONES_ROLES, MANAGEMENT_ROLES, ROLE_NAMES } from "../config/roles.js";
import { pool } from "../db.js";

const ADVISOR_ROUTES = new Set([
  "GET /materias",
  "GET /asesores",
  "GET /capacitaciones",
  "GET /paralelos",
  "GET /temas",
  "GET /estudiantes",
  "GET /usuarios/catalogo",
  "GET /aulas",
  "GET /materias-capacitacion",
  "GET /inscripciones",
  "GET /llamar-lista/asignaciones",
  "GET /llamar-lista/clases",
  "GET /llamar-lista/paralelos/:id/estudiantes",
  "GET /asistencias",
  "POST /temas",
  "POST /clases",
  "POST /asistencias",
]);

const PUBLIC_ROUTES = new Set([
  "POST /usuarios",
  "POST /usuarios/login",
  "POST /usuarios/logout",
]);

const normalizePath = (path = "/") => {
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
};

const isManagementRoute = (path) =>
  path === "/usuarios" ||
  (path.startsWith("/usuarios/") &&
    path !== "/usuarios/catalogo" &&
    path !== "/usuarios/me") ||
  path === "/roles" ||
  path.startsWith("/roles/") ||
  path === "/asignaciones-rol" ||
  path.startsWith("/asignaciones-rol/") ||
  path === "/datos" ||
  path.startsWith("/datos/");

const isInscripcionesRoute = (path) =>
  path === "/inscripciones" || path.startsWith("/inscripciones/");

// Las lecturas de inscripciones también las necesitan "llamar lista" y
// mensualidades (roles académicos). Solo las escrituras son exclusivas.
const isInscripcionesWriteRoute = (method, path) =>
  isInscripcionesRoute(path) && method !== "GET";

const isInscripcionFichaRoute = (method, path) =>
  method === "GET" && (path === "/inscripciones/fichas" || /^\/inscripciones\/\d+\/ficha$/.test(path));

const isAuthenticatedOnlyRoute = (method, path) =>
  method === "GET" &&
  (path === "/usuarios/me" || path === "/mis-paralelos" || path === "/mi-informacion" || path === "/mi-informacion/asistencias");

const isInscripcionUserLookup = (method, path) =>
  method === "GET" && /^\/usuarios\/ci\/[^/]+$/.test(path);

/**
 * Autoriza cada petición a /api después de validar el JWT.
 * - Registro, login y logout siguen siendo públicos.
 * - Usuarios, roles y asignaciones de rol: SysAdmin, Rooter y Gerencia.
 * - Resto de módulos académicos: además Cajero y Administración.
 */
export const authorizeApi = (req, res, next) => {
  const path = normalizePath(req.path);
  const routeKey = `${req.method} ${path}`;

  if (req.method === "OPTIONS" || PUBLIC_ROUTES.has(routeKey)) {
    return next();
  }

  authMiddleware(req, res, async () => {
    if (isAuthenticatedOnlyRoute(req.method, path)) {
      return next();
    }

    const advisorListRoute = req.method === "GET" && /^\/llamar-lista\/paralelos\/\d+\/estudiantes$/.test(path);
    const advisorFichaRoute = req.method === "GET" && /^\/llamar-lista\/clases\/\d+\/estudiantes\/\d+\/ficha$/.test(path);
    const advisorClassMutation = ["PUT", "DELETE"].includes(req.method) && /^\/clases\/\d+$/.test(path);
    const advisorAttendanceMutation = ["PUT", "DELETE"].includes(req.method) && /^\/asistencias\/\d+$/.test(path);
    if (hasAnyRole(req.user, [ROLE_NAMES.ASESOR, ROLE_NAMES.ASESOR_COORDINADOR])
      && !hasAnyRole(req.user, ACADEMIC_ROLES)
      && (ADVISOR_ROUTES.has(routeKey) || advisorListRoute || advisorFichaRoute || advisorClassMutation || advisorAttendanceMutation)) {
      try {
        if (advisorListRoute) {
          const parallelId = Number(path.match(/\/paralelos\/(\d+)\/estudiantes$/)[1]);
          const { rows } = await pool.query(
            `SELECT 1 FROM paralelo_materia_asesor pma
             JOIN asesores a ON a.id_asesor = pma.id_asesor
             WHERE pma.id_paralelo = $1 AND a.id_usuario = $2 AND pma.id_asesor IS NOT NULL LIMIT 1`,
            [parallelId, req.user.id_usuario],
          );
          if (!rows.length) return res.status(403).json({ error: "Solo puedes ver estudiantes de tus paralelos" });
        }

        if (routeKey === "GET /asistencias") {
          const classId = Number(req.query.id_clase);
          if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({ error: "Indica una clase válida" });
          }
          const { rows } = await pool.query(
            `SELECT 1 FROM clases c
             JOIN paralelo_materia_asesor pma ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
             JOIN asesores a ON a.id_asesor = pma.id_asesor
             WHERE c.id_clase = $1 AND a.id_usuario = $2 LIMIT 1`,
            [classId, req.user.id_usuario],
          );
          if (!rows.length) return res.status(403).json({ error: "Solo puedes ver la asistencia de tus clases" });
        }

        if (routeKey === "POST /clases") {
          const { rows } = await pool.query(
            `SELECT 1
             FROM paralelo_materia_asesor pma
             JOIN asesores a ON a.id_asesor = pma.id_asesor
             WHERE a.id_usuario = $2
               AND (
                 pma.id_paralelo_materia = $1
                 OR (pma.id_paralelo = $3 AND pma.id_materia = $4)
               )`,
            [
              req.body.id_asesor_paralelo_materia ?? null,
              req.user.id_usuario,
              req.body.id_paralelo ?? null,
              req.body.id_materia ?? null,
            ],
          );
          if (rows.length === 0) {
            return res.status(403).json({ error: "Solo puedes registrar clases en tus propias asignaciones" });
          }
        }

        if (routeKey === "POST /asistencias") {
          const { rows } = await pool.query(
            `SELECT 1
             FROM clases c
             JOIN paralelo_materia_asesor pma
               ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
             JOIN asesores a ON a.id_asesor = pma.id_asesor
             JOIN inscripciones i ON i.id_paralelo = pma.id_paralelo
             WHERE c.id_clase = $1 AND a.id_usuario = $2
               AND i.id_estudiante = $3`,
            [req.body.id_clase, req.user.id_usuario, req.body.id_estudiante],
          );
          if (rows.length === 0) {
            return res.status(403).json({ error: "Solo puedes registrar estudiantes inscritos en tu clase" });
          }
        }

        if (advisorClassMutation) {
          const classId = Number(path.match(/\/clases\/(\d+)$/)[1]);
          const { rows } = await pool.query(
            `SELECT 1 FROM clases c
             JOIN paralelo_materia_asesor pma ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
             JOIN asesores a ON a.id_asesor = pma.id_asesor
             WHERE c.id_clase = $1 AND a.id_usuario = $2 LIMIT 1`,
            [classId, req.user.id_usuario],
          );
          if (!rows.length) return res.status(403).json({ error: "Solo puedes modificar tus propias clases" });
        }

        if (advisorAttendanceMutation) {
          const attendanceId = Number(path.match(/\/asistencias\/(\d+)$/)[1]);
          const { rows } = await pool.query(
            `SELECT 1 FROM asistencias asistencia
             JOIN clases c ON c.id_clase = asistencia.id_clase
             JOIN paralelo_materia_asesor pma ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
             JOIN asesores a ON a.id_asesor = pma.id_asesor
             WHERE asistencia.id_asistencia = $1 AND a.id_usuario = $2 LIMIT 1`,
            [attendanceId, req.user.id_usuario],
          );
          if (!rows.length) return res.status(403).json({ error: "Solo puedes modificar asistencias de tus propias clases" });
        }

        return next();
      } catch (error) {
        return next(error);
      }
    }

    const allowedRoles = isInscripcionFichaRoute(req.method, path)
      ? INSCRIPCIONES_ROLES
      : isInscripcionUserLookup(req.method, path)
      ? INSCRIPCIONES_ROLES
      : isInscripcionesWriteRoute(req.method, path)
      ? INSCRIPCIONES_ROLES
      : isManagementRoute(path)
        ? MANAGEMENT_ROLES
        : ACADEMIC_ROLES;

    if (!hasAnyRole(req.user, allowedRoles)) {
      return res.status(403).json({
        error: "No tienes permisos para acceder a este recurso",
      });
    }

    next();
  });
};
