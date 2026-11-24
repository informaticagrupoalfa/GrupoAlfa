import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import ListaAsistenciaDetalle from "./ListaAsistenciaDetalle"
import { dateOf, fetchAllClasses } from "./asistenciasConsulta"
import { horarioActual } from "./horarioActual"
import "./AsistenciasView.css"

export default function AsistenciasView({ catalogs, version }) {
  const [today, setToday] = useState(() => horarioActual().fecha)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(null)
  const carouselRef = useRef(null)
  const detailsRef = useRef(null)

  useEffect(() => {
    const timer = window.setInterval(() => setToday(horarioActual().fecha), 60000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    fetchAllClasses("/clases", { desde: today, hasta: today })
      .then(rows => { if (active) setClasses(rows) })
      .catch(() => { if (active) { setClasses([]); setError("No se pudieron cargar las listas de hoy.") } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [today, version])

  const selectClass = clase => {
    setSelected(clase)
    window.setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }
  return <section className="asistencias-consulta">
    <section className="asistencias-today">
      <div className="asistencias-today-head">
        <div><h2>Listas de hoy</h2><p>{today} · Selecciona una clase para ver su lista.</p></div>
        <div className="asistencias-carousel-controls">
          <button type="button" aria-label="Listas anteriores" onClick={() => carouselRef.current?.scrollBy({ left: -300, behavior: "smooth" })}>‹</button>
          <button type="button" aria-label="Listas siguientes" onClick={() => carouselRef.current?.scrollBy({ left: 300, behavior: "smooth" })}>›</button>
        </div>
      </div>
      {loading ? <p role="status">Cargando listas de hoy…</p> : error ? <p role="alert">{error}</p> : classes.length ?
        <div className="asistencias-carousel" ref={carouselRef} aria-label="Listas de hoy">
          {classes.map(clase => <button type="button" key={clase.id_clase} className={"asistencias-class-card" + (selected?.id_clase === clase.id_clase ? " is-selected" : "")} onClick={() => selectClass(clase)}>
            <strong>{clase.nombre_paralelo || "Paralelo sin definir"}</strong><span>{clase.materia || clase.nombre_materia || "Materia sin definir"}</span><span>{clase.asesor || "Asesor sin definir"}</span><small>{dateOf(clase.inicioclase)} · {clase.tema || "Sin tema"}</small>
          </button>)}
        </div> : <p>No hay listas registradas hoy.</p>}
    </section>
    {selected && <div ref={detailsRef}><ListaAsistenciaDetalle selected={selected} catalogs={catalogs} version={version} onClose={() => setSelected(null)} /></div>}
  </section>
}
AsistenciasView.propTypes = { catalogs: PropTypes.object.isRequired, version: PropTypes.number }
