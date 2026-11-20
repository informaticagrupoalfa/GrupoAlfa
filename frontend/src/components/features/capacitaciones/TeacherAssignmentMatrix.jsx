import { useMemo } from "react"
import PropTypes from "prop-types"
import { normalizeWeekday, parseWeekdays, WEEKDAYS, weekdayLabel } from "../../../utils/weekdays"
import "./TeacherAssignmentMatrix.css"

const scheduleKey = parallel => `${parallel.hora_inicio?.slice(0, 5) || "--:--"}|${parallel.hora_fin?.slice(0, 5) || "--:--"}`
const slotKey = (day, schedule) => `${day}|${schedule}`
const assignmentKey = (parallelId, day) => `${parallelId}|${day}`

const advisorName = advisor =>
  [advisor?.nombre, advisor?.apellido_paterno, advisor?.apellido_materno].filter(Boolean).join(" ") ||
  (advisor ? `Asesor ${advisor.id_asesor}` : "")

function formatDate(value) {
  const iso = String(value ?? "").slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
    : "Fecha pendiente"
}

function ParallelInfo({ parallel, course }) {
  return <div className="teacher-parallel-info">
    <strong>{parallel.nombre_paralelo}</strong>
    <span>Capacitación #{parallel.id_capacitacion}</span>
    <span>{parallel.aula_codigo || "Sin aula"} · {parallel.modalidad || "Modalidad sin definir"}</span>
    <small>{course?.nombre_facultad || "Facultad sin definir"}</small>
    <small>Inicio: {formatDate(course?.fecha_inicio)}</small>
  </div>
}

ParallelInfo.propTypes = { parallel: PropTypes.object.isRequired, course: PropTypes.object }

function buildMatrix(data) {
  const courses = new Map(data.capacitaciones.map(item => [String(item.id_capacitacion), item]))
  const schedules = [...new Set(data.paralelos.map(scheduleKey))].sort((a, b) => a.localeCompare(b))
  const slots = new Map()
  for (const parallel of data.paralelos) {
    for (const day of parseWeekdays(parallel.dias)) {
      const key = slotKey(day, scheduleKey(parallel))
      slots.set(key, [...(slots.get(key) || []), parallel])
    }
  }
  for (const group of slots.values()) group.sort((a, b) => a.nombre_paralelo.localeCompare(b.nombre_paralelo, "es"))
  const assignments = new Map()
  for (const item of data.asignacionesDocentes) {
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
    legacyCount: data.asignacionesDocentes.filter(item => !normalizeWeekday(item.dias)).length,
    withoutDays: data.paralelos.filter(item => !parseWeekdays(item.dias).length).length,
  }
}

export default function TeacherAssignmentMatrix({ data, assignment, pickedAdvisor, busy, message, onSelectAdvisor, onAssign, onEdit, onUpdate, onDelete, onCancel }) {
  const { courses, schedules, slots, assignments, legacyCount, withoutDays } = useMemo(() => buildMatrix(data), [data])
  const assignedCount = [...assignments.keys()].length

  return (
    <section className="teacher-matrix-section">
      <header className="teacher-matrix-heading">
        <div>
          <h2>Asignación docente por día</h2>
          <p>Selecciona un asesor y haz clic en un paralelo del día correspondiente.</p>
        </div>
        <span>{assignedCount} días asignados</span>
      </header>

      <div className="teacher-matrix-controls">
        <label htmlFor="teacher-advisor">Asesor
          <select id="teacher-advisor" value={pickedAdvisor?.id_asesor ?? ""} onChange={event => onSelectAdvisor(data.asesores.find(item => String(item.id_asesor) === event.target.value) || null)}>
            <option value="">Selecciona un asesor</option>
            {data.asesores.map(item => <option key={item.id_asesor} value={item.id_asesor}>{advisorName(item)}</option>)}
          </select>
        </label>
        {assignment ? <div className="teacher-matrix-editing">
          <strong>Editando {assignment.nombre_paralelo} · {weekdayLabel(assignment.dias)}</strong>
          <span>Elige otro asesor y guarda el cambio.</span>
        </div> : <p className="teacher-matrix-hint">Cada casilla muestra los paralelos que se reúnen ese día y en ese horario.</p>}
        {assignment && <div className="teacher-matrix-actions">
          <button type="button" className="submit-button" disabled={!pickedAdvisor || busy} onClick={onUpdate}>{busy ? "Guardando…" : "Guardar cambio"}</button>
          <button type="button" className="teacher-delete" disabled={busy} onClick={onDelete}>Eliminar</button>
          <button type="button" className="teacher-cancel" disabled={busy} onClick={onCancel}>Cancelar</button>
        </div>}
      </div>
      {message && <p className="teacher-matrix-message" role="status">{message}</p>}
      {legacyCount > 0 && <p className="teacher-matrix-warning">{legacyCount} asignación(es) anterior(es) no tienen día y no aparecen en esta cuadrícula.</p>}
      {withoutDays > 0 && <p className="teacher-matrix-warning">{withoutDays} paralelo(s) no tienen días reconocibles. Edítalos en la etapa 6 para mostrarlos aquí.</p>}

      {data.paralelos.length ? (
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
                      return assigned.length
                        ? <article className="teacher-parallel-card occupied" key={parallel.id_paralelo}>
                          <ParallelInfo parallel={parallel} course={course} />
                          <div className="teacher-parallel-assignments">
                            {assigned.map(item => <button type="button" key={item.id_asesor} className="teacher-assigned" onClick={() => onEdit(item)}>
                              {item.nombre_asesor} <span>Editar</span>
                            </button>)}
                            {assigned.length > 1 && <small className="teacher-conflict">Revisa las asignaciones duplicadas de este día.</small>}
                          </div>
                        </article>
                        : <button type="button" className="teacher-parallel-card teacher-parallel-action" key={parallel.id_paralelo}
                          disabled={busy || Boolean(assignment)} onClick={() => onAssign(parallel, day.key)}
                          aria-label={`Asignar asesor a ${parallel.nombre_paralelo} el ${day.label}`}>
                          <ParallelInfo parallel={parallel} course={course} />
                          <span className="teacher-slot-select">Asignar asesor</span>
                        </button>
                    })}
                  </td>)}
                </tr>
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="teacher-matrix-empty-state">Crea un paralelo con materias y días para comenzar a asignar asesores.</p>}
    </section>
  )
}

TeacherAssignmentMatrix.propTypes = {
  data: PropTypes.shape({ capacitaciones: PropTypes.array.isRequired, paralelos: PropTypes.array.isRequired, asignacionesDocentes: PropTypes.array.isRequired, asesores: PropTypes.array.isRequired }).isRequired,
  assignment: PropTypes.object,
  pickedAdvisor: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  onSelectAdvisor: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}
