import { ENTITIES } from "./entities"

function buildTabs(keys) {
  return keys.map((key) => ({
    key,
    label: ENTITIES[key]?.label ?? key,
  }))
}

// Opciones que se muestran en la barra superior de cada módulo del sidebar.
export const MODULE_TABS = {
  usuarios: {
    path: "/app/usuarios",
    defaultTab: "usuarios",
    items: buildTabs(["usuarios", "asesores", "administrativos", "apoderados", "estudiantes"]),
  },
  capacitaciones: {
    path: "/app/capacitaciones",
    defaultTab: "gestion",
    items: [{ key: "gestion", label: "Gestión académica" }, ...buildTabs(["capacitaciones", "paralelos", "convocatorias", "facultades", "aulas", "materias"])],
  },
  matriculaciones: {
    path: "/app/matriculaciones",
    defaultTab: "mensualidades",
    items: [
      { key: "mensualidades-estudiantes", label: "Realizar pago" },
      { key: "mensualidades", label: "Listado" },
      { key: "mensualidades-tabla", label: "Tabla" },
    ],
  },
  inscripciones: {
    path: "/app/inscripciones",
    defaultTab: "registro",
    items: [
      { key: "registro", label: "Registro de usuario" },
      { key: "lista", label: "Registros" },
    ],
  },
  "pase-lista": {
    path: "/app/pase-lista",
    defaultTab: "asistencias",
    items: [
      { key: "asistencias", label: "Asistencias" },
      { key: "tomar-clase", label: "Tomar clase" },
    ],
  },
  "llamar-lista": {
    path: "/app/llamar-lista",
    defaultTab: "tomar-clase",
    items: [{ key: "tomar-clase", label: "Tomar clase" }],
  },
}

export function getModuleTabConfig(moduleKey) {
  return MODULE_TABS[moduleKey] ?? null
}

export function resolveModuleTab(config, search) {
  if (!config) return ""
  const requested = new URLSearchParams(search).get("tab")
  return config.items.some((item) => item.key === requested) ? requested : config.defaultTab
}
