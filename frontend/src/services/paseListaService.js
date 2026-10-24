import { createResource, deleteResource, listResource } from "./academicService"

/**
 * Catálogos necesarios para el pase de lista.
 * Reutiliza los endpoints CRUD existentes (materias, asesores,
 * capacitaciones, temas, estudiantes, usuarios).
 */
export async function loadPaseListaCatalogs() {
  const [materias, asesores, capacitaciones, temas, estudiantes, usuarios, aulas, asignacionesMaterias] =
    await Promise.all([
      listResource("materias").catch(() => []),
      listResource("asesores").catch(() => []),
      listResource("capacitaciones").catch(() => []),
      listResource("temas").catch(() => []),
      listResource("estudiantes").catch(() => []),
      listResource("usuarios/catalogo").catch(() => []),
      listResource("aulas").catch(() => []),
      listResource("asignaciones-materias").catch(() => []),
    ])
  return { materias, asesores, capacitaciones, temas, estudiantes, usuarios, aulas, asignacionesMaterias }
}

/**
 * Estudiantes registrados en un curso de capacitación.
 * Intenta el endpoint de matriculaciones cuando exista
 * (`GET /matriculaciones?id_curso_capacitacion=...` o `/matriculaciones/curso/:id`);
 * si el backend aún no lo expone, devuelve `null` para que la UI
 * aplique el fallback (todos los estudiantes) con aviso.
 */
export async function loadEstudiantesPorCurso(idCurso) {
  if (!idCurso) return null
  const params = { id_curso_capacitacion: idCurso, id_curso: idCurso, curso: idCurso }
  try {
    const rows = await listResource("matriculaciones", params)
    if (Array.isArray(rows)) return rows
    return null
  } catch {
    return null
  }
}

/**
 * Resuelve el id de un tema por su nombre (case-insensitive).
 * Devuelve `null` si no existe: la columna `clases.id_tema` es nulleable.
 */
export async function resolverTemaPorNombre(nombre) {
  const term = String(nombre ?? "").trim().toLowerCase()
  if (!term) return null
  try {
    const temas = await listResource("temas")
    const match = (Array.isArray(temas) ? temas : []).find(
      (t) => String(t.nombre_tema ?? "").trim().toLowerCase() === term,
    )
    return match?.id_tema ?? null
  } catch {
    return null
  }
}

function toApiError(error, fallback) {
  return (
    error?.userMessage ??
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    fallback
  )
}

/**
 * Persiste el pase de lista en la BD: crea la clase y una asistencia
 * por alumno marcado. Solo los marcados generan registro
 * (presente → hora_entrada; ausente → hora_entrada + permiso false).
 * Devuelve `{ idClase, fallos }`.
 */
export async function guardarListaEnBD({ idCurso, idAsesor, idTema, fecha, marcados }) {
  const hora = new Date().toTimeString().slice(0, 8)
  const clase = await createResource("clases", {
    id_curso_capacitacion: Number(idCurso),
    id_asesor: Number(idAsesor),
    ...(idTema != null ? { id_tema: Number(idTema) } : {}),
    inicioClase: fecha,
  }).catch((error) => {
    throw new Error(toApiError(error, "No se pudo crear la clase."))
  })
  const horaEntrada = `${fecha}T${hora}`
  const resultados = await Promise.allSettled(
    marcados.map((m) =>
      createResource("asistencias", {
        id_clase: clase.id_clase,
        id_estudiante: Number(m.id_estudiante),
        hora_entrada: horaEntrada,
        ...(m.presente === false ? { permiso: false } : {}),
      }),
    ),
  )
  const fallos = resultados.filter((r) => r.status === "rejected").length
  return { idClase: clase.id_clase, fallos }
}

/**
 * Clases paginadas con filtros combinables (AND).
 * `limit`/`offset` los aplica el backend; para detectar página siguiente
 * se pide `limit + 1` (técnica hasMore sin cambiar el formato array).
 */
export async function fetchClasesFiltradas({ desde, hasta, idCurso, idMateria, idTema, limit, offset }) {
  const params = {}
  if (desde) params.desde = desde
  if (hasta) params.hasta = hasta
  if (idCurso) params.id_curso_capacitacion = idCurso
  if (idMateria) params.id_materia = idMateria
  if (idTema) params.id_tema = idTema
  if (limit != null) params.limit = limit
  if (offset != null) params.offset = offset
  const rows = await listResource("clases", params)
  return Array.isArray(rows) ? rows : []
}

export async function fetchAsistenciasPorClase(idClase) {
  try {
    const rows = await listResource("asistencias", { id_clase: idClase })
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export async function deleteClase(idClase) {
  await deleteResource("clases", idClase)
}
