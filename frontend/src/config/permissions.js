export const ACCESS_ROLE_GROUPS = {
  management: ["SysAdmin", "Rooter", "Gerencia"],
  academic: ["SysAdmin", "Rooter", "Gerencia", "Cajero", "Administración"],
}

// Módulos visibles en la aplicación. La autorización real también se valida en la API.
export const MODULE_ACCESS = {
  dashboard: "management",
  usuarios: "management",
  capacitaciones: "academic",
  convocatorias: "academic",
  facultades: "academic",
  aulas: "academic",
  materias: "academic",
  temas: "academic",
  asesores: "academic",
  estudiantes: "academic",
  matriculaciones: "academic",
  mensualidades: "academic",
  "pase-lista": "academic",
}

const DEFAULT_MODULE_ORDER = [
  "dashboard",
  "usuarios",
  "capacitaciones",
  "matriculaciones",
  "pase-lista",
]

export function hasAllowedRole(user, allowedRoles) {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  return roles.some((role) => allowedRoles.includes(role))
}

export function canAccessModule(user, moduleKey) {
  const group = MODULE_ACCESS[moduleKey]
  if (!group) return false
  return hasAllowedRole(user, ACCESS_ROLE_GROUPS[group])
}

export function getDefaultAppPath(user) {
  const moduleKey = DEFAULT_MODULE_ORDER.find((key) => canAccessModule(user, key))
  if (!moduleKey) return "/app/sin-acceso"
  return moduleKey === "pase-lista" ? "/app/pase-lista" : `/app/${moduleKey}`
}

export function canAccessPath(user, pathname) {
  if (!pathname) return false
  if (pathname === "/" || pathname === "/app" || pathname === "/app/") {
    return getDefaultAppPath(user) !== "/app/sin-acceso"
  }
  if (pathname === "/app/sin-acceso") return true

  const match = pathname.match(/^\/app\/([^/?#]+)/)
  if (!match) return false
  return canAccessModule(user, match[1])
}
