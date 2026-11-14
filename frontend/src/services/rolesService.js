import { createResource, deleteResource, listResource } from "./academicService"

export const ROLE_KEYS = ["asesores", "administrativos", "apoderados", "estudiantes"]

export const ROLE_LABELS = {
  asesores: "Asesor",
  administrativos: "Administrativo",
  apoderados: "Apoderado",
  estudiantes: "Estudiante",
}

export const ROLE_PK = {
  asesores: "id_asesor",
  administrativos: "id_administrativo",
  apoderados: "id_apoderado",
  estudiantes: "id_estudiante",
}

function toMessage(error, fallback) {
  return (
    error?.userMessage ??
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    fallback
  )
}

async function safeList(endpoint) {
  try {
    const rows = await listResource(endpoint)
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

// Mapa rol -> Map(id_usuario -> fila de rol)
export async function fetchRoleMap() {
  const [asesores, administrativos, apoderados, estudiantes] = await Promise.all([
    safeList("asesores"),
    safeList("administrativos"),
    safeList("apoderados"),
    safeList("estudiantes"),
  ])

  const toMap = (rows) => {
    const map = new Map()
    for (const row of rows) {
      if (row?.id_usuario != null) map.set(Number(row.id_usuario), row)
    }
    return map
  }

  return {
    asesores: toMap(asesores),
    administrativos: toMap(administrativos),
    apoderados: toMap(apoderados),
    estudiantes: toMap(estudiantes),
  }
}

export function getUserRoles(idUsuario, roleMap) {
  if (!roleMap || idUsuario == null) return []
  const id = Number(idUsuario)
  return ROLE_KEYS.filter((role) => roleMap[role]?.has(id))
}

export function formatUserRoles(idUsuario, roleMap) {
  const roles = getUserRoles(idUsuario, roleMap)
  if (roles.length === 0) return "—"
  return roles.map((role) => ROLE_LABELS[role]).join(", ")
}

function buildRolePayload(role, idUsuario, roleFields = {}) {
  const fields = roleFields[role] ?? {}
  if (role === "estudiantes") {
    const payload = { id_usuario: idUsuario }
    if (fields.id_apoderado !== "" && fields.id_apoderado != null) {
      payload.id_apoderado = Number(fields.id_apoderado)
    }
    if (fields.colegio_de_procedencia) payload.colegio_de_procedencia = fields.colegio_de_procedencia
    if (fields.direccion_de_domicilio) payload.direccion_de_domicilio = fields.direccion_de_domicilio
    return payload
  }
  if (role === "apoderados") {
    const payload = { id_usuario: idUsuario }
    if (fields.parentesco) payload.parentesco = fields.parentesco
    return payload
  }
  return { id_usuario: idUsuario }
}

// Crea las filas de rol faltantes. Devuelve [{ role, message }] con los fallos.
export async function createRoles(idUsuario, roles, roleFields = {}) {
  const errors = []
  for (const role of ROLE_KEYS) {
    if (!roles[role]) continue
    try {
      await createResource(role, buildRolePayload(role, idUsuario, roleFields))
    } catch (error) {
      errors.push({ role, message: toMessage(error, `No se pudo asignar el rol ${ROLE_LABELS[role]}.`) })
    }
  }
  return errors
}

// Sincroniza roles en edición: crea los activados que faltan y elimina los desactivados.
// Devuelve [{ role, message }] con los fallos.
export async function syncRoles(idUsuario, roles, roleFields = {}, roleMap) {
  const errors = []
  const id = Number(idUsuario)
  for (const role of ROLE_KEYS) {
    const hasRow = Boolean(roleMap?.[role]?.has(id))
    if (roles[role] && !hasRow) {
      try {
        await createResource(role, buildRolePayload(role, idUsuario, roleFields))
      } catch (error) {
        errors.push({ role, message: toMessage(error, `No se pudo asignar el rol ${ROLE_LABELS[role]}.`) })
      }
    } else if (!roles[role] && hasRow) {
      const row = roleMap[role].get(id)
      const rowId = row?.[ROLE_PK[role]]
      try {
        await deleteResource(role, rowId)
      } catch (error) {
        errors.push({ role, message: toMessage(error, `No se pudo quitar el rol ${ROLE_LABELS[role]}.`) })
      }
    }
  }
  return errors
}
