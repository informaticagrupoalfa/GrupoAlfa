// Roles del catálogo `roles` que participan en la autorización de la API.
// Los nombres deben coincidir exactamente con los registrados en la base de datos.
export const ROLE_NAMES = Object.freeze({
  SYS_ADMIN: "SysAdmin",
  ROOTER: "Rooter",
  GERENCIA: "Gerencia",
  CAJERO: "Cajero",
  ADMINISTRACION: "Administración",
});

// Administración del sistema: dashboard y gestión de usuarios/roles.
export const MANAGEMENT_ROLES = Object.freeze([
  ROLE_NAMES.SYS_ADMIN,
  ROLE_NAMES.ROOTER,
  ROLE_NAMES.GERENCIA,
]);

// Operación académica: capacitaciones, matriculaciones y llamar lista.
// Incluye a los roles de gestión porque tienen acceso a todos los módulos.
export const ACADEMIC_ROLES = Object.freeze([
  ...MANAGEMENT_ROLES,
  ROLE_NAMES.CAJERO,
  ROLE_NAMES.ADMINISTRACION,
]);
