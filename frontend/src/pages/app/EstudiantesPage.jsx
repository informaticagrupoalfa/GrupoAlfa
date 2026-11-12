import { useCallback, useEffect, useState } from "react"
import { apiClient } from "../../services/apiClient"
import ErrorFallback from "../../components/ui/ErrorFallback"
import Pagination from "../../components/ui/Pagination"

const LIMIT = 25

export default function EstudiantesPage() {
  const [filtros, setFiltros] = useState({ q: "", id_capacitacion: "", id_paralelo: "" })
  const [page, setPage] = useState(1)
  const [capacitaciones, setCapacitaciones] = useState([])
  const [paralelos, setParalelos] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadCapacitaciones = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/capacitaciones")
      setCapacitaciones(Array.isArray(data) ? data : [])
    } catch (e) {
      setCapacitaciones([])
    }
  }, [])

  const loadParalelos = useCallback(async () => {
    if (!filtros.id_capacitacion) {
      setParalelos([])
      return
    }
    try {
      const { data } = await apiClient.get("/paralelos", {
        params: { id_capacitacion: filtros.id_capacitacion },
      })
      setParalelos(Array.isArray(data) ? data : [])
    } catch (e) {
      setParalelos([])
    }
  }, [filtros.id_capacitacion])

  const loadResumen = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        q: filtros.q || undefined,
        id_capacitacion: filtros.id_capacitacion || undefined,
        id_paralelo: filtros.id_paralelo || undefined,
        page,
        limit: LIMIT,
      }
      const { data } = await apiClient.get("/estudiantes/resumen", { params })
      setData(data)
    } catch (e) {
      setError(e.userMessage || "No se pudieron cargar los estudiantes.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filtros.q, filtros.id_capacitacion, filtros.id_paralelo, page])

  useEffect(() => {
    loadCapacitaciones()
  }, [loadCapacitaciones])

  useEffect(() => {
    loadParalelos()
  }, [loadParalelos])

  useEffect(() => {
    loadResumen()
  }, [loadResumen])

  const diasRestantes = (fechaFin) => {
    if (!fechaFin) return "Sin fecha"
    const fin = new Date(fechaFin)
    fin.setHours(0, 0, 0, 0)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const diff = (fin - hoy) / (1000 * 60 * 60 * 24)
    if (diff < 0) return "Vencida"
    const d = Math.round(diff)
    return `${d} día${d !== 1 ? "s" : ""}`
  }

  const handleChange = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }))
    if (key === "id_capacitacion") setFiltros((prev) => ({ ...prev, id_paralelo: "" }))
    setPage(1)
  }

  const limpiarFiltros = () => {
    setFiltros({ q: "", id_capacitacion: "", id_paralelo: "" })
    setPage(1)
  }

  const filas = data?.filas ?? []
  const total = data?.total ?? 0
  const totalPaginas = data?.totalPaginas ?? 0

  if (error) return <ErrorFallback message={error} onRetry={loadResumen} />

  const renderSkeletonCard = (key) => (
    <div className="estudiante-card skeleton-card" key={key}>
      <div className="campo-valor"><span className="label">Nombre</span><span className="valor skeleton-line" /></div>
      <div className="campo-valor"><span className="label">Carnet</span><span className="valor skeleton-line" /></div>
      <div className="campo-valor"><span className="label">Correo</span><span className="valor skeleton-line" /></div>
      <div className="campo-valor"><span className="label">Colegio</span><span className="valor skeleton-line" /></div>
      <div className="campo-valor"><span className="label">Dirección</span><span className="valor skeleton-line" /></div>
      <div className="campo-valor"><span className="label">Paralelo</span><span className="valor skeleton-line" /></div>
      <div className="campo-valor"><span className="label">Capacitación</span><span className="valor skeleton-line" /></div>
      <div className="campo-extra"><span className="label">Clases asistidas</span><span className="valor skeleton-line" /></div>
      <div className="campo-extra"><span className="label">Fin de mensualidad</span><span className="valor skeleton-line" /></div>
    </div>
  )

  return (
    <section className="estudiantes-page">
      <h1>Estudiantes</h1>

      <div className="estudiantes-toolbar">
        <div>
          <label htmlFor="filtro-q">Buscar</label>
          <input
            id="filtro-q"
            type="search"
            value={filtros.q}
            placeholder="Nombre, apellidos o carnet"
            onChange={(e) => handleChange("q", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filtro-capacitacion">Capacitación</label>
          <select
            id="filtro-capacitacion"
            value={filtros.id_capacitacion}
            onChange={(e) => handleChange("id_capacitacion", e.target.value)}
          >
            <option value="">Todas</option>
            {capacitaciones.map((c) => (
              <option key={c.id_capacitacion} value={c.id_capacitacion}>
                {c.nombre_facultad || `Capacitación ${c.id_capacitacion}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-paralelo">Paralelo</label>
          <select
            id="filtro-paralelo"
            value={filtros.id_paralelo}
            onChange={(e) => handleChange("id_paralelo", e.target.value)}
            disabled={!filtros.id_capacitacion}
          >
            <option value="">Todos</option>
            {paralelos.map((p) => (
              <option key={p.id_paralelo} value={p.id_paralelo}>
                {p.nombre_paralelo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </div>

      <p className="muted estudiantes-total">Total: {total} estudiante{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="estudiantes-grid">
          {[...Array(25)].map((_, i) => renderSkeletonCard(i))}
        </div>
      ) : filas.length === 0 ? (
        <p className="muted">No se encontraron estudiantes con los filtros aplicados.</p>
      ) : (
        <>
          <div className="estudiantes-grid">
            {filas.map((f) => {
              const nombre = [f.nombre, f.apellido_paterno, f.apellido_materno]
                .filter(Boolean)
                .join(" ")
              return (
                <div key={f.id_estudiante} className="estudiante-card">
                  <div className="campo-valor"><span className="label">Nombre</span><span className="valor">{nombre}</span></div>
                  <div className="campo-valor"><span className="label">Carnet</span><span className="valor">{f.nro_carnet ?? "-"}</span></div>
                  <div className="campo-valor"><span className="label">Correo</span><span className="valor">{f.correo_electronico ?? "-"}</span></div>
                  <div className="campo-valor"><span className="label">Colegio</span><span className="valor">{f.colegio_de_procedencia ?? "-"}</span></div>
                  <div className="campo-valor"><span className="label">Dirección</span><span className="valor">{f.direccion_de_domicilio ?? "-"}</span></div>
                  <div className="campo-valor"><span className="label">Paralelo</span><span className="valor">{f.nombre_paralelo ?? "-"}</span></div>
                  <div className="campo-valor"><span className="label">Capacitación</span><span className="valor">{f.id_capacitacion != null ? f.id_capacitacion : "-"}</span></div>
                  <div className="campo-extra"><span className="label">Clases asistidas</span><span className="valor">{f.asistencias ?? 0}</span></div>
                  <div className="campo-extra"><span className="label">Fin de mensualidad</span><span className="valor">{diasRestantes(f.fecha_fin_mensualidad)}</span></div>
                </div>
              )
            })}
          </div>
          <Pagination page={page} totalPages={totalPaginas} onPageChange={setPage} />
        </>
      )}
    </section>
  )
}
