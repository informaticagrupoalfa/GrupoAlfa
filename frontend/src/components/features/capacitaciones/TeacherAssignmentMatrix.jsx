import { useEffect, useMemo, useRef, useState } from "react"
import PropTypes from "prop-types"
import { normalizeWeekday, parseWeekdays, WEEKDAYS, weekdayLabel } from "../../../utils/weekdays"
import "./TeacherAssignmentMatrix.css"

const scheduleKey = parallel => `${parallel.hora_inicio?.slice(0, 5) || "--:--"}|${parallel.hora_fin?.slice(0, 5) || "--:--"}`
const slotKey = (day, schedule) => `${day}|${schedule}`
const assignmentKey = (parallelId, day) => `${parallelId}|${day}`

const advisorName = advisor =>
  [advisor?.nombre, advisor?.apellido_paterno, advisor?.apellido_materno].filter(Boolean).join(" ") ||
  (advisor ? `Asesor ${advisor.id_asesor}` : "")

function formatDate(value, fallback = "sin fecha de inicio") {
  const iso = String(value ?? "").slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
    : fallback
}

const facultyKey = course => course?.id_facultad == null ? "sin-facultad" : String(course.id_facultad)
const facultyName = course => course?.nombre_facultad || "Facultad sin definir"
const courseDates = course => `${formatDate(course?.fecha_inicio)} – ${formatDate(course?.fecha_fin, "sin fecha de fin")}`
const courseLabel = course => `${facultyName(course)} · ${courseDates(course)} · #${course.id_capacitacion}`

function ParallelInfo({ parallel, course }) {
  return <div className="teacher-parallel-info">
    <strong>{parallel.nombre_paralelo}</strong>
    <span>Capacitación #{parallel.id_capacitacion} · {courseDates(course)}</span>
    <span>{parallel.aula_codigo || "Sin aula"} · {parallel.modalidad || "Modalidad sin definir"}</span>
    <span className="teacher-parallel-capacity">Estudiantes: {parallel.total_estudiantes ?? 0} · Capacidad del aula: {parallel.aula_capacidad ?? "sin definir"}</span>
    <small>{facultyName(course)}</small>
  </div>
}

ParallelInfo.propTypes = { parallel: PropTypes.object.isRequired, course: PropTypes.object }

function buildMatrix(data, parallels) {
  const courses = new Map(data.capacitaciones.map(item => [String(item.id_capacitacion), item]))
  const schedules = [...new Set(parallels.map(scheduleKey))].sort((a, b) => a.localeCompare(b))
  const slots = new Map()
  for (const parallel of parallels) {
    for (const day of parseWeekdays(parallel.dias)) {
      const key = slotKey(day, scheduleKey(parallel))
      slots.set(key, [...(slots.get(key) || []), parallel])
    }
  }
  for (const group of slots.values()) group.sort((a, b) => a.nombre_paralelo.localeCompare(b.nombre_paralelo, "es"))
  const assignments = new Map()
  const parallelIds = new Set(parallels.map(item => String(item.id_paralelo)))
  for (const item of data.asignacionesDocentes) {
    if (!parallelIds.has(String(item.id_paralelo))) continue
    const day = normalizeWeekday(item.dias)
    if (!day) continue
    const key = assignmentKey(item.id_paralelo, day)
    assignments.set(key, [...(assignments.get(key) || []), item])
  }
  return {
    courses,
    schedules,
    slots,
    assignments,
    legacyCount: data.asignacionesDocentes.filter(item => parallelIds.has(String(item.id_paralelo)) && !normalizeWeekday(item.dias)).length,
    withoutDays: parallels.filter(item => !parseWeekdays(item.dias).length).length,
  }
}

export default function TeacherAssignmentMatrix({ data, assignment, assignmentSlot, pickedAdvisor, pickedSubjectId, busy, message, onSelectAdvisor, onSelectSubject, onAssign, onEdit, onSave, onDelete, onCancel }) {
  const controlsRef = useRef(null)
  const [facultyFilter, setFacultyFilter] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [expandedSlot, setExpandedSlot] = useState("")
  const courseIdsWithParallels = useMemo(() => new Set(data.paralelos.map(item => String(item.id_capacitacion))), [data.paralelos])
  const availableCourses = useMemo(() => data.capacitaciones.filter(item => courseIdsWithParallels.has(String(item.id_capacitacion))), [data.capacitaciones, courseIdsWithParallels])
  const faculties = useMemo(() => [...new Map(availableCourses.map(course => [facultyKey(course), facultyName(course)])).entries()], [availableCourses])
  const courseOptions = useMemo(() => availableCourses.filter(course => !facultyFilter || facultyKey(course) === facultyFilter), [availableCourses, facultyFilter])
  const filteredParallels = useMemo(() => data.paralelos.filter(item => {
    if (courseFilter) return String(item.id_capacitacion) === courseFilter
    if (!facultyFilter) return true
    const course = availableCourses.find(entry => String(entry.id_capacitacion) === String(item.id_capacitacion))
    return facultyKey(course) === facultyFilter
  }), [data.paralelos, courseFilter, facultyFilter, availableCourses])
  const { courses, schedules, slots, assignments, legacyCount, withoutDays } = useMemo(() => buildMatrix(data, filteredParallels), [data, filteredParallels])
  const assignedCount = [...assignments.values()].reduce((count, group) => count + group.length, 0)
  const parallel = assignmentSlot?.parallel
  const assignedInSlot = assignments.get(assignmentKey(parallel?.id_paralelo, assignmentSlot?.day)) || []
  const subjects = (parallel?.asignaciones || []).filter(item => item.id_materia != null)
  const availableSubjects = subjects.filter(item => !assignedInSlot.some(existing =>
    Number(existing.id_materia) === Number(item.id_materia) && existing.id_asesor_paralelo_materia !== assignment?.id_asesor_paralelo_materia))

  useEffect(() => {
    if (assignmentSlot) controlsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [assignmentSlot])

  const changeFaculty = value => {
    setFacultyFilter(value)
    setCourseFilter("")
    setExpandedSlot("")
    onCancel()
  }
  const changeCourse = value => {
    setCourseFilter(value)
    setExpandedSlot("")
    onCancel()
  }
  const toggleSlot = (parallelId, day) => {
    const key = assignmentKey(parallelId, day)
    setExpandedSlot(current => current === key ? "" : key)
  }

  return (
    <section className="teacher-matrix-section">
      <header className="teacher-matrix-heading">
        <div>
          <h2>Asignación docente por día</h2>
          <p>Haz clic en un paralelo, elige asesor y materia, y guarda la asignación.</p>
        </div>
        <span>{assignedCount} asignaciones</span>
      </header>

      <div className="teacher-matrix-filters" aria-label="Filtros de la tabla de asignación docente">
        <label htmlFor="teacher-faculty-filter">Facultad
          <select id="teacher-faculty-filter" value={facultyFilter} disabled={busy} onChange={event => changeFaculty(event.target.value)}>
            <option value="">Todas las facultades</option>
            {faculties.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </label>
        <label htmlFor="teacher-course-filter">Capacitación
          <select id="teacher-course-filter" value={courseFilter} disabled={busy} onChange={event => changeCourse(event.target.value)}>
            <option value="">Todas las capacitaciones</option>
            {courseOptions.map(course => <option key={course.id_capacitacion} value={course.id_capacitacion}>{courseLabel(course)}</option>)}
          </select>
        </label>
        <span className="teacher-matrix-filter-count">{filteredParallels.length} paralelo(s) · {assignedCount} asignación(es)</span>
      </div>

      {assignmentSlot && <div className="teacher-matrix-controls" ref={controlsRef}>
        <div className="teacher-matrix-editing">
          <strong>{assignment ? "Editar" : "Nueva asignación"}: {parallel?.nombre_paralelo} · {weekdayLabel(assignmentSlot.day)}</strong>
          <span>Selecciona el asesor y la materia que dictará ese día.</span>
        </div>
        <label htmlFor="teacher-advisor">Asesor
          <select id="teacher-advisor" disabled={busy} value={pickedAdvisor?.id_asesor ?? ""} onChange={event => onSelectAdvisor(data.asesores.find(item => String(item.id_asesor) === event.target.value) || null)}>
            <option value="">Selecciona un asesor</option>
            {data.asesores.map(item => <option key={item.id_asesor} value={item.id_asesor}>{advisorName(item)}</option>)}
          </select>
        </label>
        <label htmlFor="teacher-subject">Materia
          <select id="teacher-subject" disabled={busy} value={pickedSubjectId} onChange={event => onSelectSubject(event.target.value)}>
            <option value="">Selecciona una materia</option>
            {availableSubjects.map(item => <option key={item.id_materia} value={item.id_materia}>{item.nombre_materia}</option>)}
          </select>
        </label>
        <div className="teacher-matrix-actions">
          <button type="button" className="submit-button" disabled={!pickedAdvisor || !pickedSubjectId || busy} onClick={onSave}>{busy ? "Guardando…" : "Guardar asignación"}</button>
          {assignment && <button type="button" className="teacher-delete" disabled={busy} onClick={onDelete}>Eliminar</button>}
          <button type="button" className="teacher-cancel" disabled={busy} onClick={onCancel}>Cancelar</button>
        </div>
      </div>}
      {message && <p className="teacher-matrix-message" role="status">{message}</p>}
      {legacyCount > 0 && <p className="teacher-matrix-warning">{legacyCount} asignación(es) anterior(es) no tienen día y no aparecen en esta cuadrícula.</p>}
      {withoutDays > 0 && <p className="teacher-matrix-warning">{withoutDays} paralelo(s) no tienen días reconocibles. Edítalos en la etapa 6 para mostrarlos aquí.</p>}

      {schedules.length ? (
        <div className="teacher-matrix-scroll" role="region" aria-label="Horarios por día de la semana" tabIndex={0}>
          <table className="teacher-matrix">
            <thead><tr>
              <th scope="col" className="teacher-matrix-time">Horario</th>
              {WEEKDAYS.map(day => <th scope="col" key={day.key}>{day.label}</th>)}
            </tr></thead>
            <tbody>
              {schedules.map(schedule => {
                const [start, end] = schedule.split("|")
                return <tr key={schedule}>
                  <th scope="row" className="teacher-matrix-time">{start} – {end}</th>
                  {WEEKDAYS.map(day => <td key={day.key} className="teacher-matrix-slot">
                    {(slots.get(slotKey(day.key, schedule)) || []).map(parallel => {
                      const course = courses.get(String(parallel.id_capacitacion))
                      const assigned = assignments.get(assignmentKey(parallel.id_paralelo, day.key)) || []
                      const hasAvailableSubject = (parallel.asignaciones || []).some(subject => subject.id_materia != null && !assigned.some(item => Number(item.id_materia) === Number(subject.id_materia)))
                      const slotId = assignmentKey(parallel.id_paralelo, day.key)
                      const isExpanded = expandedSlot === slotId
                      const status = assigned.length >= 3 ? "danger" : assigned.length === 2 ? "warning" : assigned.length === 1 ? "success" : "empty"
                      const assignedAdvisors = [...new Set(assigned.map(item => item.nombre_asesor).filter(Boolean))].join(", ")
                      return <article className={`teacher-parallel-card status-${status}`} key={parallel.id_paralelo}>
                        <button type="button" className="teacher-parallel-toggle" disabled={busy}
                          aria-expanded={isExpanded} aria-controls={`teacher-slot-${parallel.id_paralelo}-${day.key}`}
                          aria-label={`${parallel.nombre_paralelo}${assignedAdvisors ? `, ${assignedAdvisors}` : ""}: ${assigned.length} asignación${assigned.length === 1 ? "" : "es"}. ${isExpanded ? "Ocultar opciones" : "Mostrar opciones"}`}
                          onClick={() => toggleSlot(parallel.id_paralelo, day.key)}>
                          <span className="teacher-parallel-title">{parallel.nombre_paralelo}</span>
                          {assignedAdvisors && <span className="teacher-parallel-advisors">{assignedAdvisors}</span>}
                        </button>
                        {isExpanded && <div id={`teacher-slot-${parallel.id_paralelo}-${day.key}`} className="teacher-parallel-details">
                          <ParallelInfo parallel={parallel} course={course} />
                          <div className="teacher-parallel-assignments">
                            {assigned.map(item => <button type="button" key={item.id_asesor_paralelo_materia} className="teacher-assigned" disabled={busy} onClick={() => onEdit(item)}>
                              <strong>{item.nombre_materia}</strong> · {item.nombre_asesor} <span>Editar</span>
                            </button>)}
                            {hasAvailableSubject && <button type="button" className="teacher-slot-select" disabled={busy} onClick={() => onAssign(parallel, day.key)}>Añadir materia y asesor</button>}
                            {!hasAvailableSubject && assigned.length === 0 && <span className="teacher-slot-unavailable">Este paralelo no tiene materias disponibles.</span>}
                          </div>
                        </div>}
                      </article>
                    })}
                  </td>)}
                </tr>
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="teacher-matrix-empty-state">{data.paralelos.length ? "No hay paralelos con días reconocibles para los filtros seleccionados." : "Crea un paralelo con materias y días para comenzar a asignar asesores."}</p>}
    </section>
  )
}

TeacherAssignmentMatrix.propTypes = {
  data: PropTypes.shape({ capacitaciones: PropTypes.array.isRequired, paralelos: PropTypes.array.isRequired, asignacionesDocentes: PropTypes.array.isRequired, asesores: PropTypes.array.isRequired }).isRequired,
  assignment: PropTypes.object,
  assignmentSlot: PropTypes.shape({ parallel: PropTypes.object, day: PropTypes.string }),
  pickedAdvisor: PropTypes.object,
  pickedSubjectId: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  onSelectAdvisor: PropTypes.func.isRequired,
  onSelectSubject: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}
