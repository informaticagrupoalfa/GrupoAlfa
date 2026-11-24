import { useEffect, useState } from "react"
import { apiClient } from "../../../services/apiClient"
import { useAuth } from "../../../hooks/useAuth"
import ClaseActualView from "./ClaseActualView"
import "./LlamarListaDocentePage.css"

export default function LlamarListaDocentePage() {
  const { activeRole } = useAuth()
  const [view, setView] = useState("actual")
  const [classes, setClasses] = useState([])
  const [error, setError] = useState("")
  const isSysAdmin = activeRole === "SysAdmin"

  useEffect(() => {
    if (view !== "creadas") return undefined
    let active = true
    setError("")
    apiClient.get("/llamar-lista/clases", { params: { scope: isSysAdmin ? "all" : "mine" } })
      .then(({ data }) => { if (active) setClasses(data) })
      .catch(() => { if (active) setError("No se pudo cargar el historial de clases.") })
    return () => { active = false }
  }, [view, isSysAdmin])

  return <div className="llamar-lista">
    <nav className="llamar-views" aria-label="Vistas de clases">
      <button type="button" className={view === "actual" ? "is-active" : ""} aria-current={view === "actual" ? "page" : undefined} onClick={() => setView("actual")}>Clase actual</button>
      <button type="button" className={view === "creadas" ? "is-active" : ""} aria-current={view === "creadas" ? "page" : undefined} onClick={() => setView("creadas")}>Clases creadas</button>
    </nav>
    {view === "actual" ? <ClaseActualView /> : <section className="llamar-panel llamar-history">
      <h2>{isSysAdmin ? "Clases creadas" : "Mis clases creadas"} <span>{classes.length}</span></h2>
      <p className="llamar-scan-hint">Historial de clases registradas. Para pasar lista, vuelve a Clase actual durante el horario del paralelo.</p>
      {error && <p role="alert">{error}</p>}
      <div className="llamar-list">
        {!classes.length && !error && <p className="llamar-scan-hint">Todavía no hay clases creadas.</p>}
        {classes.map(item => <article className="llamar-choice" key={item.id_clase}>
          <strong>{String(item.fecha).slice(0, 10)} · {item.nombre_paralelo || "Paralelo"}</strong>
          <span>{item.nombre_materia || "Materia sin nombre"}</span>
          <small>{item.nombre_asesor ? item.nombre_asesor + " · " : ""}{item.total_asistencias} asistencias</small>
        </article>)}
      </div>
    </section>}
  </div>
}
