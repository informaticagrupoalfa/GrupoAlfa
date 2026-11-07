import { useEffect, useState } from "react"
import { apiClient } from "../../services/apiClient"

export default function MateriaMultiSelector({ value, onChange, label = "Materias vinculadas" }) {
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get("/materias")
      .then((r) => {
        setMaterias(Array.isArray(r.data) ? r.data : [])
        setLoading(false)
      })
      .catch(() => {
        setMaterias([])
        setLoading(false)
      })
  }, [])

  const selectedIds = new Set(Array.isArray(value) ? value : [])

  const toggle = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(Array.from(next))
  }

  if (loading) return <div className="muted">Cargando materias...</div>

  return (
    <div className="materia-multi">
      <label className="materia-label">{label}</label>
      <div className="materia-chips">
        {materias.map((m) => {
          const checked = selectedIds.has(m.id_materia)
          return (
            <button
              key={m.id_materia}
              type="button"
              className={`materia-chip ${checked ? "active" : ""}`}
              onClick={() => toggle(m.id_materia)}
            >
              {m.nombre_materia}
            </button>
          )
        })}
      </div>
      {selectedIds.size > 0 && (
        <div className="materia-count">
          {selectedIds.size} materia(s) seleccionada(s)
        </div>
      )}
    </div>
  )
}
