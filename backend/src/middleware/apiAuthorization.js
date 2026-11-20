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

const isAuthenticatedOnlyRoute = (method, path) =>
  method === "GET" && (path === "/usuarios/me" || path === "/mis-paralelos");

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
    if (hasAnyRole(req.user, [ROLE_NAMES.ASESOR, ROLE_NAMES.ASESOR_COORDINADOR]) && (ADVISOR_ROUTES.has(routeKey) || advisorListRoute)) {
      try {
        if (routeKey === "POST /clases") {
          const { rows } = await pool.query(
            `SELECT 1
             FROM asesor_paralelo_materia apm
             JOIN asesores a ON a.id_asesor = apm.id_asesor
             WHERE apm.id_asesor_paralelo_materia = $1
               AND a.id_usuario = $2`,
            [req.body.id_asesor_paralelo_materia, req.user.id_usuario],
          );
          if (rows.length === 0) {
            return res.status(403).json({ error: "Solo puedes registrar clases en tus propias asignaciones" });
          }
        }

        if (routeKey === "POST /asistencias") {
          const { rows } = await pool.query(
            `SELECT 1
             FROM clases c
             JOIN asesor_paralelo_materia apm
               ON apm.id_asesor_paralelo_materia = c.id_asesor_paralelo_materia
             JOIN asesores a ON a.id_asesor = apm.id_asesor
             WHERE c.id_clase = $1 AND a.id_usuario = $2`,
            [req.body.id_clase, req.user.id_usuario],
          );
          if (rows.length === 0) {
            return res.status(403).json({ error: "Solo puedes registrar asistencia en tus propias clases" });
          }
        }

        return next();
      } catch (error) {
        return next(error);
      }
    }

    const allowedRoles = isInscripcionUserLookup(req.method, path)
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
