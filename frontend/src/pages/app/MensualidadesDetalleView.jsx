import { useEffect, useRef, useState } from "react"
import { getResourceById, listResource } from "../../services/academicService"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"
import Pagination from "../../components/ui/Pagination"

const MENSUALIDADES_PER_PAGE = 15

function formatDate(value) {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

async function safeList(endpoint, params) {
  try {
    const data = await listResource(endpoint, params)
    return Array.isArray(data) ? data : data.rows || data.filas || []
  } catch (err) {
    return []
  }
}

export default function MensualidadesDetalleView() {
  const [mensualidades, setMensualidades] = useState([])
  const [mensualidadesLoading, setMensualidadesLoading] = useState(true)
  const [mensualidadesError, setMensualidadesError] = useState("")
  const [mensualidadPage, setMensualidadPage] = useState(1)
  const [selectedMensualidad, setSelectedMensualidad] = useState(null)

  const [estudianteInfo, setEstudianteInfo] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setMensualidadesLoading(true)
        const data = await safeList("mensualidades", {
          page: mensualidadPage,
          limit: MENSUALIDADES_PER_PAGE,
        })
        if (mounted) {
          setMensualidades(data)
          setMensualidadesLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setMensualidadesError(err.message || "No se pudieron cargar las mensualidades.")
          setMensualidadesLoading(false)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [mensualidadPage])

  const handleSelectMensualidad = async (m) => {
    setSelectedMensualidad(m)
    setEstudianteInfo(null)
    if (!m.id_inscripcion) return
    try {
      const [inscripcionRaw, estudiantesRaw, usuariosRaw] = await Promise.all([
        getResourceById("inscripciones", m.id_inscripcion).catch(() => null),
        safeList("estudiantes"),
        safeList("usuarios/catalogo"),
      ])
      // Unwrap posibles respuestas envueltas ({ data }, { inscripciones }, etc.)
      const unwrap = (v) => (v && typeof v === "object" && !Array.isArray(v)) ? (v.inscripcion ?? v.data ?? v) : v
      const inscripcion = unwrap(inscripcionRaw)
      const estudiantes = Array.isArray(estudiantesRaw) ? estudiantesRaw : (estudiantesRaw?.estudiantes ?? estudiantesRaw?.data ?? [])
      const usuarios = Array.isArray(usuariosRaw) ? usuariosRaw : (usuariosRaw?.usuarios ?? usuariosRaw?.data ?? [])
      // Compara IDs normalizados a string para evitar fallos por tipo (texto vs número).
      const est = estudiantes.find((e) => String(e.id_estudiante) === String(inscripcion?.id_estudiante))
      const user = est ? usuarios.find((u) => String(u.id_usuario) === String(est.id_usuario)) : null
      console.log("Estudiante info:", { est, user })
      if (est || user) {
        setEstudianteInfo({
          nombre: [user?.nombre, user?.apellido_paterno, user?.apellido_materno].filter(Boolean).join(" ")
            || `Estudiante ${est?.id_estudiante ?? "—"}`,
          carnet: user?.nro_carnet || "—",
          correo: user?.correo_electronico || "—",
          telefono: user?.nro_telefono || "—",
        })
      }
    } catch (err) {
      // error handled by outer boundary
    }
  }

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  if (mensualidadesLoading) return <Skeleton lines={15} />
  if (mensualidadesError) return <ErrorFallback message={mensualidadesError} onRetry={() => setMensualidadPage(1)} />

  const totalMensualidadPages = Math.ceil(mensualidades.length / MENSUALIDADES_PER_PAGE) || 1

  return (
    <section className="mensualidades-detalle-view">
      <div className="mensualidades-header">
        <h1>Mensualidades</h1>
        <p className="muted">Selecciona una mensualidad para ver su detalle.</p>
      </div>

      <div className="mensualidades-layout">
        {/* Left: Mensualidades grid */}
        <div className="mensualidades-panel">
          <h2>Mensualidades</h2>
          <div className="mensualidades-grid">
            {mensualidades.map((m) => {
              const isSelected = selectedMensualidad?.id_mensualidad === m.id_mensualidad
              return (
                <div
                  key={m.id_mensualidad}
                  className={`mensualidad-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectMensualidad(m)}
                >
                  <div className="mensualidad-estudiante">{m.estudiante || (m.id_inscripcion ? `Inscripción #${m.id_inscripcion}` : "—")}</div>
                  <div className="mensualidad-fechas">
                    <span className="label-small">Inicio:</span>
                    <span className="value-small">{formatDate(m.fecha_inicio_mensualidad)}</span>
                  </div>
                  <div className="mensualidad-fechas">
                    <span className="label-small">Fin:</span>
                    <span className="value-small">{formatDate(m.fecha_fin_mensualidad)}</span>
                  </div>
                  <div className="mensualidad-pago">
                    <span className="label-small">Pago:</span>
                    <span className="value-small">Bs. {m.pago != null ? m.pago : "—"}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mensualidades-pagination">
            <Pagination page={mensualidadPage} totalPages={totalMensualidadPages} onPageChange={setMensualidadPage} />
          </div>
        </div>

        {/* Right: Details */}
        <div className="details-panel">
          {!selectedMensualidad ? (
            <div className="empty-state">
              <p className="muted">Selecciona una mensualidad de la lista para ver su detalle.</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <h2>Mensualidad #{selectedMensualidad.id_mensualidad}</h2>
                <button
                  className="secondary-button small"
                  type="button"
                  onClick={() => setSelectedMensualidad(null)}
                >
                  Volver
                </button>
              </div>

              <div className="info-card">
                <h3>Estudiante</h3>
                <div className="info-row">
                  <span className="info-label">Nombre</span>
                  <span className="info-value">{estudianteInfo?.nombre || "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Carnet</span>
                  <span className="info-value">{estudianteInfo?.carnet || "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Correo</span>
                  <span className="info-value">{estudianteInfo?.correo || "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Teléfono</span>
                  <span className="info-value">{estudianteInfo?.telefono || "—"}</span>
                </div>
              </div>

              <div className="info-card">
                <h3>Mensualidad</h3>
                <div className="info-row">
                  <span className="info-label">Administrativo</span>
                  <span className="info-value">{selectedMensualidad.administrativo || selectedMensualidad.id_administrativo || "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha inicio</span>
                  <span className="info-value">{formatDate(selectedMensualidad.fecha_inicio_mensualidad)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha fin</span>
                  <span className="info-value">{formatDate(selectedMensualidad.fecha_fin_mensualidad)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Pago</span>
                  <span className="info-value">Bs. {selectedMensualidad.pago != null ? selectedMensualidad.pago : "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Comprobante</span>
                  <span className="info-value">{selectedMensualidad.codigo_comprobante != null ? selectedMensualidad.codigo_comprobante : "—"}</span>
                </div>
              </div>

              {selectedMensualidad?.fecha_inicio_mensualidad && selectedMensualidad?.fecha_fin_mensualidad && (
                <div className="calendar-panel">
                  <h3>Calendario de Mensualidad</h3>
                  <div className="calendar">
                    <div className="calendar-header">
                      <span className="calendar-label">Inicio:</span>
                      <span className="calendar-date">{formatDate(selectedMensualidad.fecha_inicio_mensualidad)}</span>
                    </div>
                    <div className="calendar-header">
                      <span className="calendar-label">Fin:</span>
                      <span className="calendar-date">{formatDate(selectedMensualidad.fecha_fin_mensualidad)}</span>
                    </div>
                    <div className="calendar-grid">
                      {generateCalendarDays(selectedMensualidad.fecha_inicio_mensualidad, selectedMensualidad.fecha_fin_mensualidad).map((day) => (
                        <div
                          key={day.date}
                          className={`calendar-day ${day.isSelected ? "calendar-day-selected" : ""} ${day.isRange ? "calendar-day-range" : ""}`}
                        >
                          {day.day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function generateCalendarDays(startDateStr, endDateStr) {
  const days = []
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  end.setHours(23, 59, 59, 999)
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  while (current <= end) {
    days.push({
      date: current.toISOString().split("T")[0],
      day: current.getDate(),
      isSelected: current.getTime() === start.getTime() || current.getTime() === end.getTime(),
      isRange: current.getTime() > start.getTime() && current.getTime() < end.getTime(),
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}
