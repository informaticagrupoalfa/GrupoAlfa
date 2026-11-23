import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { apiClient } from "../../../services/apiClient"
import "./StudentAttendanceCalendar.css"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]
const PAGE_SIZE = 100

function dateKey(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? match[0] : null
}

function studentName(student) {
  if (student?.nombre_completo) return student.nombre_completo
  const parts = [student?.nombre, student?.apellido_paterno, student?.apellido_materno].filter(Boolean)
  return parts.join(" ") || `Estudiante ${student?.id_estudiante ?? ""}`
}

function attendanceState(records) {
  if (records.some((record) => record.permiso === false)) return "absent"
  if (records.some((record) => record.permiso === true)) return "excused"
  return records.length ? "present" : null
}

function stateLabel(state) {
  if (state === "present") return "Asistió"
  if (state === "absent") return "No asistió"
  if (state === "excused") return "Con permiso"
  return "Sin registro"
}

function Month({ year, month, attendanceByDay }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const today = dateKey(new Date().toISOString())

  return (
    <article className="student-calendar-month">
      <h3>{MONTHS[month]}</h3>
      <div className="student-calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="student-calendar-days">
        {Array.from({ length: firstDayOffset }, (_, index) => <span className="student-calendar-blank" key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const records = attendanceByDay.get(key) ?? []
          const state = attendanceState(records)
          const reasons = records.map((record) => record.razon_permiso).filter(Boolean).join("; ")
          const detail = records.length > 1 ? `${records.length} registros` : stateLabel(state)
          return (
            <span
              className={["student-calendar-day", state && `is-${state}`, key === today && "is-today"].filter(Boolean).join(" ")}
              key={key}
              title={`${day} de ${MONTHS[month]}: ${detail}${reasons ? `. ${reasons}` : ""}`}
              aria-label={`${day} de ${MONTHS[month]}: ${detail}`}
            >
              {day}
            </span>
          )
        })}
      </div>
    </article>
  )
}

Month.propTypes = {
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  attendanceByDay: PropTypes.instanceOf(Map).isRequired,
}

export default function StudentAttendanceCalendar({ student, attendanceEndpoint = "/asistencias" }) {
  const [attendances, setAttendances] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const studentId = student?.id_estudiante

  useEffect(() => {
    if (!studentId) {
      setAttendances([])
      setError("")
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError("")

    const loadAttendances = async () => {
      const rows = []
      let offset = 0
      while (!cancelled) {
        const response = await apiClient.get(attendanceEndpoint, {
          params: { id_estudiante: studentId, limit: PAGE_SIZE, offset },
        })
        const page = Array.isArray(response.data) ? response.data : []
        rows.push(...page)
        if (page.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      }
      if (!cancelled) setAttendances(rows)
    }

    loadAttendances()
      .catch((requestError) => {
        if (!cancelled) setError(requestError.userMessage || "No se pudieron cargar las asistencias del estudiante.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [attendanceEndpoint, studentId])

  const attendanceByDay = useMemo(() => {
    const grouped = new Map()
    for (const attendance of attendances) {
      const key = dateKey(attendance.hora_entrada)
      if (!key || Number(key.slice(0, 4)) !== year) continue
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(attendance)
    }
    return grouped
  }, [attendances, year])

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, excused: 0 }
    for (const records of attendanceByDay.values()) {
      const state = attendanceState(records)
      if (state) counts[state] += 1
    }
    return counts
  }, [attendanceByDay])

  return (
    <section className="student-calendar-panel" aria-labelledby="student-calendar-title">
      <header className="student-calendar-heading">
        <div>
          <h2 id="student-calendar-title">Calendario anual de asistencia</h2>
          <p>{student ? studentName(student) : "Selecciona un estudiante para consultar su registro."}</p>
        </div>
        <div className="student-calendar-year" aria-label="Año del calendario">
          <button type="button" onClick={() => setYear((current) => current - 1)} aria-label="Ver año anterior">‹</button>
          <strong>{year}</strong>
          <button type="button" onClick={() => setYear((current) => current + 1)} aria-label="Ver año siguiente">›</button>
        </div>
      </header>

      <div className="student-calendar-legend" aria-label="Estados de asistencia">
        <span><i className="is-present" /> Asistió</span>
        <span><i className="is-absent" /> No asistió</span>
        <span><i className="is-excused" /> Con permiso</span>
        <span><i /> Sin registro</span>
      </div>

      {!student ? (
        <p className="student-calendar-empty">Selecciona una tarjeta de estudiante para mostrar sus 12 meses.</p>
      ) : loading ? (
        <p className="student-calendar-empty" role="status">Cargando asistencias…</p>
      ) : error ? (
        <p className="student-calendar-error" role="alert">{error}</p>
      ) : (
        <>
          <div className="student-calendar-summary">
            <span><strong>{summary.present}</strong> días asistidos</span>
            <span><strong>{summary.absent}</strong> ausencias</span>
            <span><strong>{summary.excused}</strong> permisos</span>
          </div>
          <div className="student-calendar-grid">
            {MONTHS.map((month, index) => (
              <Month attendanceByDay={attendanceByDay} key={month} month={index} year={year} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

StudentAttendanceCalendar.propTypes = {
  student: PropTypes.object,
  attendanceEndpoint: PropTypes.string,
}
