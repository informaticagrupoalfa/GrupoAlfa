import { useEffect, useMemo, useRef, useState } from "react"
import PropTypes from "prop-types"
import ClaseInfoHeader from "./ClaseInfoHeader"
import FloatingAlert from "../../../components/ui/FloatingAlert"
import { apiClient } from "../../../services/apiClient"
import { horarioActual } from "./horarioActual"
import "./AsistenciasView.css"

const dateOf = value => String(value ?? "").slice(0, 10)
const studentName = student => [student.apellido_paterno, student.apellido_materno, student.nombre].filter(Boolean).join(" ") || "Estudiante " + student.id_estudiante
const imageOf = data => {
  if (!data) return null
  const type = data.startsWith("/9j/") ? "jpeg" : data.startsWith("R0lGOD") ? "gif" : data.startsWith("UklGR") ? "webp" : "png"
  return "data:image/" + type + ";base64," + data
}

async function fetchAll(path, params) {
  const result = []
  for (let offset = 0; ; offset += 100) {
    const { data } = await apiClient.get(path, { params: { ...params, limit: 100, offset } })
    if (!Array.isArray(data)) throw new Error("La respuesta del servidor no es válida.")
    result.push(...data)
    if (data.length < 100) return result
  }
}

function ClassCard({ clase, selected, onSelect }) {
  return <button type="button" className={"asistencias-class-card" + (selected ? " is-selected" : "")} onClick={() => onSelect(clase)}>
    <strong>{clase.nombre_paralelo || "Paralelo sin definir"}</strong>
    <span>{clase.materia || clase.nombre_materia || "Materia sin definir"}</span>
    <span>{clase.asesor || "Asesor sin definir"}</span>
    <small>{dateOf(clase.inicioclase)} · {clase.tema || "Sin tema"}</small>
  </button>
}

ClassCard.propTypes = { clase: PropTypes.object.isRequired, selected: PropTypes.bool, onSelect: PropTypes.func.isRequired }

export default function AsistenciasView({ catalogs, version }) {
  const [today, setToday] = useState(() => horarioActual().fecha)
  const [todayClasses, setTodayClasses] = useState([])
  const [todayLoading, setTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState("")
  const [selected, setSelected] = useState(null)
  const [roster, setRoster] = useState([])
  const [attendances, setAttendances] = useState([])
  const [photos, setPhotos] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [permission, setPermission] = useState(null)
  const carouselRef = useRef(null)
  const detailsRef = useRef(null)

  useEffect(() => {
    const timer = window.setInterval(() => setToday(horarioActual().fecha), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    setTodayLoading(true)
    setTodayError("")
    fetchAll("/clases", { desde: today, hasta: today })
      .then(rows => { if (active) setTodayClasses(rows) })
      .catch(() => { if (active) { setTodayClasses([]); setTodayError("No se pudieron cargar las listas de hoy.") } })
      .finally(() => { if (active) setTodayLoading(false) })
    return () => { active = false }
  }, [today, version])

  useEffect(() => {
    if (!selected) return undefined
    let active = true
    setDetailLoading(true)
    setDetailError("")
    setRoster([])
    setAttendances([])
    setPhotos({})
    const parallelId = selected.id_paralelo
    Promise.all([
      fetchAll("/asistencias", { id_clase: selected.id_clase }),
      parallelId ? apiClient.get("/llamar-lista/paralelos/" + parallelId + "/estudiantes").then(response => response.data) : Promise.resolve([]),
    ]).then(([records, students]) => {
      if (!active) return
      setAttendances(records)
      setRoster(students)
    }).catch(() => { if (active) setDetailError("No se pudo cargar el detalle de la lista.") })
      .finally(() => { if (active) setDetailLoading(false) })
    if (parallelId) apiClient.get("/llamar-lista/paralelos/" + parallelId + "/fotos")
      .then(({ data }) => { if (active) setPhotos(Object.fromEntries(data.map(item => [String(item.id_estudiante), item.foto_base64]))) })
      .catch(() => { if (active) setPhotos({}) })
    return () => { active = false }
  }, [selected, version])

  const parallel = (catalogs.paralelos ?? []).find(item => String(item.id_paralelo) === String(selected?.id_paralelo))
  const course = (catalogs.capacitaciones ?? []).find(item => String(item.id_capacitacion) === String(parallel?.id_capacitacion))
  const aula = (catalogs.aulas ?? []).find(item => String(item.id_aula) === String(parallel?.id_aula))
  const time = parallel?.hora_inicio && parallel?.hora_fin ? `${String(parallel.hora_inicio).slice(0, 5)} - ${String(parallel.hora_fin).slice(0, 5)}` : ""
  const fields = [
    ["Materia", selected?.materia || selected?.nombre_materia],
    ["Asesor", selected?.asesor],
    ["Horario", time],
    ["Capacitación", course?.nombre || (parallel?.id_capacitacion ? `Capacitación ${parallel.id_capacitacion}` : "")],
    ["Aula", selected?.aula || parallel?.aula_codigo || aula?.codigo],
    ["Nombre paralelo", selected?.nombre_paralelo || parallel?.nombre_paralelo],
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
      .sort((a, b) => studentName(a.student).localeCompare(studentName(b.student), "es"))
  }, [attendances, roster, catalogs.estudiantes, catalogs.usuarios])

  const selectClass = clase => {
    setSelected(clase)
    setPermission(null)
    window.setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }
  const scrollCarousel = direction => carouselRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" })

  return <section className="asistencias-consulta">
    <section className="asistencias-today">
      <div className="asistencias-today-head">
        <div><h2>Listas de hoy</h2><p>{today} · Selecciona una clase para ver su lista.</p></div>
        <div className="asistencias-carousel-controls">
          <button type="button" aria-label="Listas anteriores" onClick={() => scrollCarousel(-1)}>‹</button>
          <button type="button" aria-label="Listas siguientes" onClick={() => scrollCarousel(1)}>›</button>
        </div>
      </div>
      {todayLoading ? <p role="status">Cargando listas de hoy…</p> : todayError ? <p role="alert">{todayError}</p> : todayClasses.length ?
        <div className="asistencias-carousel" ref={carouselRef} aria-label="Listas de hoy">
          {todayClasses.map(clase => <ClassCard key={clase.id_clase} clase={clase} selected={selected?.id_clase === clase.id_clase} onSelect={selectClass} />)}
        </div> : <p>No hay listas registradas hoy.</p>}
    </section>

    {selected && <section className="asistencias-detail clase-actual" ref={detailsRef}>
      <div className="asistencias-detail-head"><div><h2>Lista de asistencia</h2><p>{selected.nombre_paralelo || "Paralelo"} · {dateOf(selected.inicioclase)}</p></div><button type="button" className="secondary-button" onClick={() => setSelected(null)}>Cerrar</button></div>
      <ClaseInfoHeader fields={fields} />
      <p className="clase-actual-legend"><span>■ Ausente</span><span>■ Presente</span><span>■ Permiso</span></p>
      {detailLoading ? <p role="status">Cargando lista…</p> : detailError ? <p role="alert">{detailError}</p> : <>
        <p className="asistencias-detail-note">Los estudiantes sin registro aparecen como ausentes. La matrícula mostrada corresponde a los inscritos actualmente.</p>
        <div className="clase-actual-table-wrap"><table className="clase-actual-table"><thead><tr><th>Nro</th><th>Apellidos y nombres</th><th>Nro carnet</th><th>Foto</th></tr></thead>
          <tbody>{rosterRows.map(({ student, record }, index) => {
            const status = record?.permiso === true ? "permiso" : record && record.permiso !== false ? "presente" : "ausente"
            const photo = imageOf(photos[String(student.id_estudiante)])
            return <tr key={student.id_estudiante} className={"clase-actual-" + status} onClick={() => { if (status === "permiso") setPermission({ student, record }) }}><td>{index + 1}</td><td>{status === "permiso" ? <button type="button" className="clase-actual-student" onClick={event => { event.stopPropagation(); setPermission({ student, record }) }}>{studentName(student)} <small>(permiso)</small></button> : <span>{studentName(student)} <small>({status})</small></span>}</td><td>{student.nro_carnet || "—"}</td><td>{photo ? <img src={photo} alt={"Foto de " + studentName(student)} loading="lazy" decoding="async" /> : <span className="clase-actual-avatar" aria-label="Sin foto">—</span>}</td></tr>
          })}</tbody></table></div>
        {!rosterRows.length && <p>No hay estudiantes para mostrar en esta lista.</p>}
      </>}
      <div className="asistencias-detail-bottom"><label>Fecha<input type="date" value={dateOf(selected.inicioclase)} readOnly /></label><label>Tema avanzado<input type="text" value={selected.tema || ""} readOnly /></label></div>
    </section>}
    {permission && <FloatingAlert title="Motivo del permiso" onClose={() => setPermission(null)}>
      <strong>{studentName(permission.student)}</strong><p>{permission.record.razon_permiso || "No se registró un motivo."}</p>
    </FloatingAlert>}
  </section>
}

AsistenciasView.propTypes = { catalogs: PropTypes.object.isRequired, version: PropTypes.number }
