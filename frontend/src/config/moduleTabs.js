import { ENTITIES } from "./entities"
import { ACCESS_ROLE_GROUPS } from "./permissions"

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
    items: [
      { key: "gestion", label: "Gestión académica" },
      { key: "asignacion-docente", label: "Asignación docente" },
      ...buildTabs(["capacitaciones", "paralelos", "convocatorias", "facultades", "aulas", "materias"]),
    ],
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
    items: [{ key: "registro", label: "Inscripciones" }, { key: "listado", label: "Listado" }, { key: "reportes", label: "Reportes" }],
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

export function getModuleTabConfig(moduleKey, activeRole) {
  const config = MODULE_TABS[moduleKey] ?? null
  if (config && moduleKey === "inscripciones" && !ACCESS_ROLE_GROUPS.enrollment.includes(activeRole)) {
    return { ...config, defaultTab: "listado", items: config.items.filter((item) => item.key === "listado") }
  }
  if (!config || moduleKey !== "capacitaciones" || activeRole === "SysAdmin") return config
  return { ...config, items: config.items.filter((item) => ["gestion", "asignacion-docente"].includes(item.key)) }
}

export function resolveModuleTab(config, search) {
  if (!config) return ""
  const requested = new URLSearchParams(search).get("tab")
  return config.items.some((item) => item.key === requested) ? requested : config.defaultTab
}
