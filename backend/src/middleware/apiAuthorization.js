import { authMiddleware } from "./authMiddleware.js";
import { hasAnyRole } from "./roleMiddleware.js";
import { ACADEMIC_ROLES, MANAGEMENT_ROLES } from "../config/roles.js";

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
  path.startsWith("/asignaciones-rol/");

const isAuthenticatedOnlyRoute = (method, path) =>
  method === "GET" && path === "/usuarios/me";

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

  authMiddleware(req, res, () => {
    if (isAuthenticatedOnlyRoute(req.method, path)) {
      return next();
    }

    const allowedRoles = isManagementRoute(path)
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
