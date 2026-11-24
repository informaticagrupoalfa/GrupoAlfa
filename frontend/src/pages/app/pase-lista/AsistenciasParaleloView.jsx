import { useEffect, useMemo, useRef, useState } from "react"
import PropTypes from "prop-types"
import { apiClient } from "../../../services/apiClient"
import ListaAsistenciaDetalle from "./ListaAsistenciaDetalle"
import { dateOf, fetchAllClasses } from "./asistenciasConsulta"
import { horarioActual } from "./horarioActual"
import "./AsistenciasView.css"
import "./AsistenciasParaleloView.css"

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]
const keyFor = (year, month, day) => String(year).padStart(4, "0") + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0")

export default function AsistenciasParaleloView({ catalogs, version }) {
  const [today, setToday] = useState(() => horarioActual().fecha)
  const [courses, setCourses] = useState([])
  const [parallels, setParallels] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [todayCount, setTodayCount] = useState(null)
  const [countError, setCountError] = useState("")
  const [courseId, setCourseId] = useState("")
  const [parallelId, setParallelId] = useState("")
  const [year, setYear] = useState(() => Number(horarioActual().fecha.slice(0, 4)))
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedDay, setSelectedDay] = useState("")
  const [selected, setSelected] = useState(null)
  const foldersRef = useRef(null)
  const detailsRef = useRef(null)

  useEffect(() => {
    const timer = window.setInterval(() => setToday(horarioActual().fecha), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    setCatalogLoading(true)
    setCatalogError("")
    Promise.all([apiClient.get("/capacitaciones"), apiClient.get("/paralelos")])
      .then(([coursesResponse, parallelsResponse]) => {
        if (active) { setCourses(coursesResponse.data); setParallels(parallelsResponse.data) }
      })
      .catch(() => { if (active) setCatalogError("No se pudieron cargar las capacitaciones y paralelos.") })
      .finally(() => { if (active) setCatalogLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setTodayCount(null)
    setCountError("")
    fetchAllClasses("/clases", { desde: today, hasta: today })
      .then(rows => { if (active) setTodayCount(rows.length) })
      .catch(() => { if (active) setCountError("No se pudo consultar el total de hoy.") })
    return () => { active = false }
  }, [today, version])

  useEffect(() => {
    let active = true
    setClasses([])
    setError("")
    if (!parallelId) { setLoading(false); return () => { active = false } }
    setLoading(true)
    fetchAllClasses("/clases", { id_paralelo: parallelId, desde: keyFor(year, 0, 1), hasta: keyFor(year, 11, 31) })
      .then(rows => { if (active) setClasses(rows) })
      .catch(() => { if (active) setError("No se pudieron cargar las listas de este paralelo.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [parallelId, year, version])

  const course = courses.find(item => String(item.id_capacitacion) === courseId)
  const parallel = parallels.find(item => String(item.id_paralelo) === parallelId)
  const courseParallels = parallels.filter(item => String(item.id_capacitacion) === courseId)
    .sort((a, b) => a.nombre_paralelo.localeCompare(b.nombre_paralelo, "es"))
  const byDay = useMemo(() => {
    const map = new Map()
    for (const clase of classes) {
      const key = dateOf(clase.inicioclase)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(clase)
    }
    return map
  }, [classes])
  const detailCatalogs = useMemo(() => ({ ...catalogs, capacitaciones: courses, paralelos: parallels }), [catalogs, courses, parallels])
  const selectCourse = id => { setCourseId(String(id)); setParallelId(""); setSelectedDay(""); setSelected(null) }
  const selectParallel = id => { setParallelId(String(id)); setSelectedDay(""); setSelected(null) }
  const selectDay = day => {
    const dayClasses = byDay.get(day) || []
    setSelectedDay(day)
    setSelected(dayClasses.length === 1 ? dayClasses[0] : null)
    window.setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }
  const changeYear = delta => { setYear(value => value + delta); setSelectedDay(""); setSelected(null) }

  return <section className="ap-view">
    <header className="ap-heading">
      <div><h2>Asistencias por paralelo</h2><p>Consulta las listas registradas por capacitación, paralelo y fecha.</p></div>
      <div className="ap-counter" role="status"><span>Listas presentadas hoy</span><strong>{countError ? "—" : todayCount ?? "…"}</strong>{countError && <small>{countError}</small>}</div>
    </header>

    <section className="ap-panel">
      <div className="ap-section-head"><div><h3>Capacitaciones</h3><p>Selecciona una carpeta para ver sus paralelos.</p></div>
        <div className="ap-arrows"><button type="button" aria-label="Capacitaciones anteriores" onClick={() => foldersRef.current?.scrollBy({ left: -300, behavior: "smooth" })}>‹</button><button type="button" aria-label="Capacitaciones siguientes" onClick={() => foldersRef.current?.scrollBy({ left: 300, behavior: "smooth" })}>›</button></div>
      </div>
      {catalogLoading ? <p role="status">Cargando capacitaciones…</p> : catalogError ? <p role="alert">{catalogError}</p> : courses.length ? <div className="ap-folders" ref={foldersRef} aria-label="Capacitaciones">
        {courses.map(item => <button type="button" key={item.id_capacitacion} className={"ap-folder" + (String(item.id_capacitacion) === courseId ? " is-selected" : "")} aria-pressed={String(item.id_capacitacion) === courseId} onClick={() => selectCourse(item.id_capacitacion)}>
          <span>{item.nombre || "Capacitación " + item.id_capacitacion}</span>
        </button>)}
      </div> : <p>No hay capacitaciones registradas.</p>}
    </section>

    {course && <section className="ap-panel">
      <div className="ap-section-head"><div><h3>Paralelos</h3><p>{course.nombre || "Capacitación " + course.id_capacitacion}</p></div></div>
      {courseParallels.length ? <div className="ap-parallels">{courseParallels.map(item => <button type="button" key={item.id_paralelo} className={"ap-parallel" + (String(item.id_paralelo) === parallelId ? " is-selected" : "")} aria-pressed={String(item.id_paralelo) === parallelId} onClick={() => selectParallel(item.id_paralelo)}>
        <strong>{item.nombre_paralelo}</strong><span>{item.dias || "Días sin definir"}{item.hora_inicio && item.hora_fin ? " · " + item.hora_inicio.slice(0, 5) + " - " + item.hora_fin.slice(0, 5) : ""}</span>
      </button>)}</div> : <p>Esta capacitación no tiene paralelos registrados.</p>}
    </section>}

    {parallel && <section className="ap-panel ap-calendar">
      <div className="ap-section-head"><div><h3>Calendario de listas</h3><p>{parallel.nombre_paralelo} · Selecciona una fecha marcada para consultar la lista.</p></div>
        <div className="ap-year"><button type="button" aria-label="Año anterior" onClick={() => changeYear(-1)} disabled={year <= 1900}>‹</button><strong>{year}</strong><button type="button" aria-label="Año siguiente" onClick={() => changeYear(1)} disabled={year >= 9999}>›</button></div>
      </div>
      <p className="ap-legend"><span /> Fecha con lista registrada</p>
      {loading ? <p role="status">Cargando listas…</p> : error ? <p role="alert">{error}</p> : <>
        <p className="ap-total">{classes.length} lista(s) registrada(s) en {year}.</p>
        <div className="ap-month-grid">{MONTHS.map((month, index) => {
          const count = new Date(Date.UTC(year, index + 1, 0)).getUTCDate()
          const offset = (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7
          return <article key={month} className="ap-month"><h4>{month}</h4>
            <div className="ap-weekdays" aria-hidden="true">{WEEKDAYS.map((day, i) => <span key={i}>{day}</span>)}</div>
            <div className="ap-days">
              {Array.from({ length: offset }, (_, i) => <span key={"empty-" + i} />)}
              {Array.from({ length: count }, (_, i) => {
                const day = keyFor(year, index, i + 1)
                const records = byDay.get(day) || []
                return records.length ? <button type="button" key={day} className={"ap-day has-list" + (selectedDay === day ? " is-selected" : "") + (day === today ? " is-today" : "")} aria-label={day + ": " + records.length + " lista(s)"} aria-pressed={selectedDay === day} onClick={() => selectDay(day)}>{i + 1}</button> : <span key={day} className={"ap-day" + (day === today ? " is-today" : "")}>{i + 1}</span>
              })}
            </div>
          </article>
        })}</div>
      </>}
    </section>}

    {selectedDay && <div ref={detailsRef}>
      {(byDay.get(selectedDay) || []).length > 1 && <section className="ap-panel"><h3>Listas del {selectedDay}</h3><div className="ap-parallels">{byDay.get(selectedDay).map(clase => <button type="button" className="ap-parallel" key={clase.id_clase} onClick={() => setSelected(clase)}><strong>{clase.materia || clase.nombre_materia || "Materia sin definir"}</strong><span>{clase.asesor || "Asesor sin definir"} · {clase.tema || "Sin tema"}</span></button>)}</div></section>}
      {selected && <ListaAsistenciaDetalle selected={selected} catalogs={detailCatalogs} version={version} onClose={() => { setSelected(null); setSelectedDay("") }} />}
    </div>}
  </section>
}
AsistenciasParaleloView.propTypes = { catalogs: PropTypes.object.isRequired, version: PropTypes.number }
