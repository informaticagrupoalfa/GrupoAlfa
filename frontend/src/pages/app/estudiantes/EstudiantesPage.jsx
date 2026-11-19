import { useCallback, useEffect, useState } from "react"
import { apiClient } from "../../../services/apiClient"
import ErrorFallback from "../../../components/ui/ErrorFallback"
import Pagination from "../../../components/ui/Pagination"

const LIMIT = 15

function nombreCompleto(estudiante) {
  if (!estudiante) return ""
  return [estudiante.nombre, estudiante.apellido_paterno, estudiante.apellido_materno]
    .filter(Boolean)
    .join(" ")
}

function parseFecha(value) {
  if (!value) return null
  const texto = String(value)
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (partes) {
    return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatFecha(value) {
  const d = parseFecha(value)
  if (!d) return value ? String(value) : "—"
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fotoSrc(fotoBase64) {
  if (!fotoBase64) return null
  if (fotoBase64.startsWith("/9j/")) return `data:image/jpeg;base64,${fotoBase64}`
  if (fotoBase64.startsWith("R0lGOD")) return `data:image/gif;base64,${fotoBase64}`
  if (fotoBase64.startsWith("UklGR")) return `data:image/webp;base64,${fotoBase64}`
  return `data:image/png;base64,${fotoBase64}`
}

export default function EstudiantesPage() {
  const [filtros, setFiltros] = useState({ q: "", id_capacitacion: "", id_paralelo: "" })
  const [page, setPage] = useState(1)
  const [capacitaciones, setCapacitaciones] = useState([])
  const [paralelos, setParalelos] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [detalleError, setDetalleError] = useState(null)
  const [detalleReloadKey, setDetalleReloadKey] = useState(0)

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

  useEffect(() => {
    if (selectedId == null) {
      setDetalle(null)
      setDetalleError(null)
      setDetalleLoading(false)
      return
    }
    let active = true
    setDetalleLoading(true)
    setDetalleError(null)
    setDetalle(null)
    apiClient
      .get(`/estudiantes/${selectedId}/detalle`)
      .then(({ data }) => {
        if (active) setDetalle(data)
      })
      .catch((e) => {
        if (active) setDetalleError(e.userMessage || "No se pudo cargar la información del estudiante.")
      })
      .finally(() => {
        if (active) setDetalleLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedId, detalleReloadKey])

  const diasRestantes = (fechaFin) => {
    const fin = parseFecha(fechaFin)
    if (!fin) return "Sin fecha"
    fin.setHours(0, 0, 0, 0)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const diff = (fin - hoy) / (1000 * 60 * 60 * 24)
    if (diff < 0) return "Vencida"
    const d = Math.round(diff)
    return `${d} día${d !== 1 ? "s" : ""}`
  }

  const seleccionarEstudiante = (id) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  const cambiarPagina = (nuevaPagina) => {
    setPage(nuevaPagina)
    setSelectedId(null)
  }

  const handleChange = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }))
    if (key === "id_capacitacion") setFiltros((prev) => ({ ...prev, id_paralelo: "" }))
    setPage(1)
    setSelectedId(null)
  }

  const limpiarFiltros = () => {
    setFiltros({ q: "", id_capacitacion: "", id_paralelo: "" })
    setPage(1)
    setSelectedId(null)
  }

  const filas = data?.filas ?? []
  const total = data?.total ?? 0
  const totalPaginas = data?.totalPaginas ?? 0

  if (error) return <ErrorFallback message={error} onRetry={loadResumen} />

  const renderSkeletonCard = (key) => (
    <div className="estudiante-list-card skeleton-card" key={key}>
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-line-short" />
      <span className="skeleton-line skeleton-line-short" />
    </div>
  )

  const renderDetalle = () => {
    if (selectedId == null) {
      return (
        <div className="estudiantes-detail-empty">
          <p className="muted">Selecciona un estudiante para ver toda su información.</p>
        </div>
      )
    }

    if (detalleLoading) {
      return (
        <div className="estudiante-detail-card skeleton-card">
          <div className="estudiante-photo estudiante-photo-placeholder" />
          <div className="estudiante-detail-head">
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line-short" />
          </div>
          <div className="estudiante-detail-fields">
            {[...Array(8)].map((_, i) => (
              <div className="info-row" key={i}>
                <span className="skeleton-line skeleton-line-short" />
                <span className="skeleton-line" />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (detalleError) {
      return (
        <ErrorFallback
          message={detalleError}
          onRetry={() => setDetalleReloadKey((k) => k + 1)}
        />
      )
    }

    if (!detalle) return null

    const nombre = nombreCompleto(detalle) || `Estudiante ${detalle.id_estudiante}`
    const iniciales = `${detalle.nombre?.[0] ?? ""}${detalle.apellido_paterno?.[0] ?? ""}`.toUpperCase()
    const imagen = fotoSrc(detalle.foto_base64)
    const capacitacion =
      detalle.nombre_facultad ||
      (detalle.id_capacitacion != null ? `Capacitación ${detalle.id_capacitacion}` : "—")

    return (
      <div className="estudiante-detail-card">
        <div className="estudiante-photo-wrapper">
          {imagen ? (
            <img src={imagen} alt={`Foto de ${nombre}`} className="estudiante-photo" />
          ) : (
            <div className="estudiante-photo estudiante-photo-placeholder">
              {iniciales || "?"}
            </div>
          )}
        </div>

        <div className="estudiante-detail-head">
          <h2>{nombre}</h2>
          <p className="muted">Carnet: {detalle.nro_carnet ?? "—"}</p>
        </div>

        <div className="estudiante-detail-fields">
          <div className="info-row">
            <span className="info-label">Correo</span>
            <span className="info-value">{detalle.correo_electronico ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Teléfono</span>
            <span className="info-value">{detalle.nro_telefono ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Fecha de nacimiento</span>
            <span className="info-value">{formatFecha(detalle.fecha_nacimiento)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Colegio de procedencia</span>
            <span className="info-value">{detalle.colegio_de_procedencia ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Dirección</span>
            <span className="info-value">{detalle.direccion_de_domicilio ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Capacitación</span>
            <span className="info-value">{capacitacion}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Paralelo</span>
            <span className="info-value">{detalle.nombre_paralelo ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Clases asistidas</span>
            <span className="info-value">{detalle.asistencias ?? 0}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Fin de mensualidad</span>
            <span className="info-value">
              {detalle.fecha_fin_mensualidad
                ? `${formatFecha(detalle.fecha_fin_mensualidad)} (${diasRestantes(detalle.fecha_fin_mensualidad)})`
                : "—"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Estado</span>
            <span className="info-value">
              {detalle.usuario_vigente == null
                ? "—"
                : detalle.usuario_vigente
                  ? "Vigente"
                  : "No vigente"}
            </span>
          </div>
        </div>
      </div>
    )
  }

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

      <div className="estudiantes-layout">
        <div className="estudiantes-list-panel">
          {loading ? (
            <div className="estudiantes-list-grid">
              {[...Array(LIMIT)].map((_, i) => renderSkeletonCard(i))}
            </div>
          ) : filas.length === 0 ? (
            <p className="muted">No se encontraron estudiantes con los filtros aplicados.</p>
          ) : (
            <>
              <div className="estudiantes-list-grid">
                {filas.map((f) => {
                  const nombre = nombreCompleto(f) || `Estudiante ${f.id_estudiante}`
                  const capacitacion =
                    f.nombre_facultad ||
                    (f.id_capacitacion != null ? `Capacitación ${f.id_capacitacion}` : "")
                  const isSelected = selectedId === f.id_estudiante
                  return (
                    <button
                      type="button"
                      key={f.id_estudiante}
                      className={`estudiante-list-card ${isSelected ? "selected" : ""}`}
                      onClick={() => seleccionarEstudiante(f.id_estudiante)}
                      aria-pressed={isSelected}
                    >
                      <span className="estudiante-list-card-name">{nombre}</span>
                      <span className="estudiante-list-card-meta">
                        Carnet: {f.nro_carnet ?? "—"}
                      </span>
                      <span className="estudiante-list-card-meta">
                        {[capacitacion, f.nombre_paralelo].filter(Boolean).join(" · ") || "Sin paralelo"}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="estudiantes-list-pagination">
                <Pagination page={page} totalPages={totalPaginas} onPageChange={cambiarPagina} />
              </div>
            </>
          )}
        </div>

        <div className="estudiantes-detail-panel">{renderDetalle()}</div>
      </div>
    </section>
  )
}
