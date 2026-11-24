import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import ClaseInfoHeader from "./ClaseInfoHeader"
import FloatingAlert from "../../../components/ui/FloatingAlert"
import { apiClient } from "../../../services/apiClient"
import { dateOf, fetchAllClasses } from "./asistenciasConsulta"

const nameOf = student => [student.apellido_paterno, student.apellido_materno, student.nombre].filter(Boolean).join(" ") || "Estudiante " + student.id_estudiante
const imageOf = data => {
  if (!data) return null
  const type = data.startsWith("/9j/") ? "jpeg" : data.startsWith("R0lGOD") ? "gif" : data.startsWith("UklGR") ? "webp" : "png"
  return "data:image/" + type + ";base64," + data
}
export default function ListaAsistenciaDetalle({ selected, catalogs, version, onClose }) {
  const [roster, setRoster] = useState([])
  const [attendances, setAttendances] = useState([])
  const [photos, setPhotos] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [permission, setPermission] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    setRoster([])
    setAttendances([])
    setPhotos({})
    setPermission(null)
    const parallelId = selected.id_paralelo
    Promise.all([
      fetchAllClasses("/asistencias", { id_clase: selected.id_clase }),
      parallelId ? apiClient.get("/llamar-lista/paralelos/" + parallelId + "/estudiantes").then(response => response.data) : Promise.resolve([]),
    ]).then(([records, students]) => {
      if (active) { setAttendances(records); setRoster(students) }
    }).catch(() => { if (active) setError("No se pudo cargar el detalle de la lista.") })
      .finally(() => { if (active) setLoading(false) })
    if (parallelId) apiClient.get("/llamar-lista/paralelos/" + parallelId + "/fotos")
      .then(({ data }) => { if (active) setPhotos(Object.fromEntries(data.map(item => [String(item.id_estudiante), item.foto_base64]))) })
      .catch(() => { if (active) setPhotos({}) })
    return () => { active = false }
  }, [selected, version])

  const parallel = (catalogs.paralelos ?? []).find(item => String(item.id_paralelo) === String(selected.id_paralelo))
  const course = (catalogs.capacitaciones ?? []).find(item => String(item.id_capacitacion) === String(parallel?.id_capacitacion))
  const aula = (catalogs.aulas ?? []).find(item => String(item.id_aula) === String(parallel?.id_aula))
  const time = parallel?.hora_inicio && parallel?.hora_fin ? String(parallel.hora_inicio).slice(0, 5) + " - " + String(parallel.hora_fin).slice(0, 5) : ""
  const fields = [
    ["Materia", selected.materia || selected.nombre_materia],
    ["Asesor", selected.asesor],
    ["Horario", time],
    ["Capacitación", course?.nombre || (parallel?.id_capacitacion ? "Capacitación " + parallel.id_capacitacion : "")],
    ["Aula", selected.aula || parallel?.aula_codigo || aula?.codigo],
    ["Nombre paralelo", selected.nombre_paralelo || parallel?.nombre_paralelo],
  ]
  const rosterRows = useMemo(() => {
    const byStudent = new Map(attendances.map(item => [String(item.id_estudiante), item]))
    const students = new Map(roster.map(item => [String(item.id_estudiante), item]))
    const catalogStudents = new Map((catalogs.estudiantes ?? []).map(item => [String(item.id_estudiante), item]))
    const users = new Map((catalogs.usuarios ?? []).map(item => [String(item.id_usuario), item]))
    for (const attendance of attendances) {
      const id = String(attendance.id_estudiante)
      if (!students.has(id)) {
        const entry = catalogStudents.get(id)
        students.set(id, { id_estudiante: attendance.id_estudiante, ...(users.get(String(entry?.id_usuario)) ?? {}) })
      }
    }
    return [...students.values()].map(student => ({ student, record: byStudent.get(String(student.id_estudiante)) }))
      .sort((a, b) => nameOf(a.student).localeCompare(nameOf(b.student), "es"))
  }, [attendances, roster, catalogs.estudiantes, catalogs.usuarios])

  return <section className="asistencias-detail clase-actual">
    <div className="asistencias-detail-head"><div><h2>Lista de asistencia</h2><p>{selected.nombre_paralelo || "Paralelo"} · {dateOf(selected.inicioclase)}</p></div><button type="button" className="secondary-button" onClick={onClose}>Cerrar</button></div>
    <ClaseInfoHeader fields={fields} />
    <p className="clase-actual-legend"><span>■ Ausente</span><span>■ Presente</span><span>■ Permiso</span></p>
    {loading ? <p role="status">Cargando lista…</p> : error ? <p role="alert">{error}</p> : <>
      <p className="asistencias-detail-note">Los estudiantes sin registro aparecen como ausentes. La matrícula mostrada corresponde a los inscritos actualmente.</p>
      <div className="clase-actual-table-wrap"><table className="clase-actual-table"><thead><tr><th>Nro</th><th>Apellidos y nombres</th><th>Nro carnet</th><th>Foto</th></tr></thead>
        <tbody>{rosterRows.map(({ student, record }, index) => {
          const status = record?.permiso === true ? "permiso" : record && record.permiso !== false ? "presente" : "ausente"
          const photo = imageOf(photos[String(student.id_estudiante)])
          return <tr key={student.id_estudiante} className={"clase-actual-" + status} onClick={() => { if (status === "permiso") setPermission({ student, record }) }}><td>{index + 1}</td><td>{status === "permiso" ? <button type="button" className="clase-actual-student" onClick={event => { event.stopPropagation(); setPermission({ student, record }) }}>{nameOf(student)} <small>(permiso)</small></button> : <span>{nameOf(student)} <small>({status})</small></span>}</td><td>{student.nro_carnet || "—"}</td><td>{photo ? <img src={photo} alt={"Foto de " + nameOf(student)} loading="lazy" decoding="async" /> : <span className="clase-actual-avatar" aria-label="Sin foto">—</span>}</td></tr>
        })}</tbody></table></div>
      {!rosterRows.length && <p>No hay estudiantes para mostrar en esta lista.</p>}
    </>}
    <div className="asistencias-detail-bottom"><label>Fecha<input type="date" value={dateOf(selected.inicioclase)} readOnly /></label><label>Tema avanzado<input type="text" value={selected.tema || ""} readOnly /></label></div>
    {permission && <FloatingAlert title="Motivo del permiso" onClose={() => setPermission(null)}><strong>{nameOf(permission.student)}</strong><p>{permission.record.razon_permiso || "No se registró un motivo."}</p></FloatingAlert>}
  </section>
}
ListaAsistenciaDetalle.propTypes = { selected: PropTypes.object.isRequired, catalogs: PropTypes.object.isRequired, version: PropTypes.number, onClose: PropTypes.func.isRequired }
