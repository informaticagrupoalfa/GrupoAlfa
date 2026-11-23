import { useCallback, useEffect, useState } from "react"
import PropTypes from "prop-types"
import QRCode from "qrcode"
import { apiClient } from "../../../services/apiClient"
import ErrorFallback from "../../../components/ui/ErrorFallback"
import MensualidadesCalendar from "../../../components/features/mensualidades/MensualidadesCalendar"
import StudentAttendanceCalendar from "../../../components/features/estudiantes/StudentAttendanceCalendar"
import "./MiInformacionPage.css"

const DATE_FORMATTER = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const MONEY_FORMATTER = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
})

function parseDate(value) {
  if (!value) return null
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value) {
  const date = parseDate(value)
  return date ? DATE_FORMATTER.format(date) : "—"
}

function formatShortDate(value) {
  const date = parseDate(value)
  return date ? SHORT_DATE_FORMATTER.format(date) : "—"
}

function formatDateTime(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return `${SHORT_DATE_FORMATTER.format(date)} ${date.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "—"
}

function text(value) {
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}

function fullName(person) {
  if (!person) return "Estudiante"
  return (
    [person.nombre, person.apellido_paterno, person.apellido_materno].filter(Boolean).join(" ") ||
    person.nombre_completo ||
    "Estudiante"
  )
}

function initials(person) {
  const value = [person?.nombre, person?.apellido_paterno]
    .map((part) => (part ? String(part).trim().charAt(0) : ""))
    .filter(Boolean)
    .join("")
  return value ? value.toUpperCase() : "ES"
}

function photoSrc(base64) {
  if (!base64) return null
  if (base64.startsWith("/9j/")) return `data:image/jpeg;base64,${base64}`
  if (base64.startsWith("R0lGOD")) return `data:image/gif;base64,${base64}`
  if (base64.startsWith("UklGR")) return `data:image/webp;base64,${base64}`
  return `data:image/png;base64,${base64}`
}

function estadoLabel(value) {
  if (value === true) return "Activo"
  if (value === false) return "Inactivo"
  return "—"
}

function InfoRow({ label, value }) {
  return (
    <div className="mi-info-row">
      <dt>{label}</dt>
      <dd>{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  )
}

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
}

function InfoCard({ title, children, className = "" }) {
  return (
    <section className={`mi-info-card ${className}`.trim()}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
}

function StudentQr({ id, nombre, carnet }) {
  const [image, setImage] = useState("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setImage("")
    setFailed(false)

    if (id == null) return undefined

    QRCode.toDataURL(String(id), {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0c4e64", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setImage(url)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
    }
  }, [id])

  if (failed) return <p className="muted">No se pudo generar el QR.</p>
  if (!image) return <div className="mi-qr-placeholder">Generando QR…</div>

  return (
    <>
      <img className="mi-qr-image" src={image} alt={`Código QR de asistencia de ${nombre}`} />
      <a className="mi-qr-download" href={image} download={`QR-asistencia-${carnet ?? id}.png`}>
        Descargar QR
      </a>
    </>
  )
}

StudentQr.propTypes = {
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  nombre: PropTypes.string.isRequired,
  carnet: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

function MateriaCard({ materia }) {
  return (
    <article className="mi-materia-card">
      <header>
        <h4>{materia.nombre_materia}</h4>
        <span>Materia #{materia.id_materia}</span>
      </header>

      {materia.asesores.length === 0 ? (
        <p className="muted">Aún no tiene un asesor asignado.</p>
      ) : (
        <div className="mi-asesor-list">
          {materia.asesores.map((asesor) => (
            <div className="mi-asesor-item" key={asesor.id_asesor}>
              <span className="mi-asesor-avatar" aria-hidden="true">
                {initials(asesor)}
              </span>
              <div className="mi-asesor-data">
                <strong>{asesor.nombre_completo}</strong>
                <span>
                  {asesor.dias.length > 0 ? `Clases: ${asesor.dias.join(", ")}` : "Días de clase por confirmar"}
                </span>
                {asesor.correo_electronico && <span>{asesor.correo_electronico}</span>}
                {asesor.nro_telefono && <span>Tel. {asesor.nro_telefono}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

MateriaCard.propTypes = {
  materia: PropTypes.shape({
    id_materia: PropTypes.number,
    nombre_materia: PropTypes.string.isRequired,
    asesores: PropTypes.arrayOf(
      PropTypes.shape({
        id_asesor: PropTypes.number.isRequired,
        nombre_completo: PropTypes.string,
        correo_electronico: PropTypes.string,
        nro_telefono: PropTypes.string,
        dias: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
    ).isRequired,
  }).isRequired,
}

function LoadingState() {
  return (
    <section className="mi-info-page" aria-label="Cargando información del estudiante">
      <div className="mi-info-hero skeleton-card">
        <div className="mi-info-identity">
          <div className="mi-info-photo mi-info-photo-placeholder" />
          <div className="mi-info-identity-text">
            <span className="skeleton-line skeleton-line-short" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line-short" />
          </div>
        </div>
        <div className="mi-info-qr-card skeleton-card">
          <span className="skeleton-line" />
          <div className="mi-qr-placeholder" />
        </div>
      </div>
      <div className="mi-info-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="mi-info-card skeleton-card" key={item}>
            <span className="skeleton-line skeleton-line-short" />
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line-short" />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function MiInformacionPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeView, setActiveView] = useState("informacion")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await apiClient.get("/mi-informacion")
      setData(response.data)
    } catch (err) {
      setError(err.userMessage || "No se pudo cargar tu información.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingState />
  if (error) return <ErrorFallback message={error} onRetry={load} />
  if (!data) return null

  const { estudiante, apoderado, inscripcion, paralelo, capacitacion, materias, resumen, mensualidad, mensualidades = [] } = data
  const nombre = fullName(estudiante)
  const imagen = photoSrc(estudiante.foto_base64)
  const rutaInicio = capacitacion?.facultad || (capacitacion ? `Capacitación #${capacitacion.id_capacitacion}` : "Sin capacitación")

  return (
    <section className="mi-info-page">
      <div className="mi-info-tabs" role="tablist" aria-label="Secciones de mi información">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "informacion"}
          className={activeView === "informacion" ? "active" : ""}
          onClick={() => setActiveView("informacion")}
        >
          Mi información
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "mensualidades"}
          className={activeView === "mensualidades" ? "active" : ""}
          onClick={() => setActiveView("mensualidades")}
        >
          Mensualidades
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "asistencias"}
          className={activeView === "asistencias" ? "active" : ""}
          onClick={() => setActiveView("asistencias")}
        >
          Asistencias
        </button>
      </div>

      {activeView === "informacion" ? (
        <>
          <div className="mi-info-hero">
        <div className="mi-info-identity">
          {imagen ? (
            <img className="mi-info-photo" src={imagen} alt={`Foto de ${nombre}`} />
          ) : (
            <div className="mi-info-photo mi-info-photo-placeholder">{initials(estudiante)}</div>
          )}

          <div className="mi-info-identity-text">
            <p className="eyebrow">Portal del estudiante</p>
            <h2>{nombre}</h2>
            <p className="mi-info-subtitle">
              Carnet {text(estudiante.nro_carnet)} · ID {text(estudiante.id_estudiante)}
            </p>
            <div className="mi-info-badges">
              <span className={estudiante.usuario_vigente === false ? "mi-badge mi-badge-muted" : "mi-badge"}>
                {estudiante.usuario_vigente === false ? "Usuario inactivo" : "Usuario vigente"}
              </span>
              {paralelo && <span className="mi-badge mi-badge-soft">Paralelo {paralelo.nombre_paralelo}</span>}
              <span className="mi-badge mi-badge-soft">{rutaInicio}</span>
            </div>
          </div>
        </div>

        <div className="mi-info-qr-card">
          <p className="mi-info-qr-title">QR de asistencia</p>
          <StudentQr id={estudiante.id_estudiante} nombre={nombre} carnet={estudiante.nro_carnet} />
          <p className="mi-info-qr-help">
            Presenta este código al asesor para registrar tu asistencia a clase.
          </p>
          <span className="mi-info-qr-id">ID {estudiante.id_estudiante}</span>
        </div>
          </div>

          <div className="mi-info-grid">
        <InfoCard title="Datos personales">
          <dl className="mi-info-list">
            <InfoRow label="Nombre completo" value={nombre} />
            <InfoRow label="Carnet de identidad" value={estudiante.nro_carnet} />
            <InfoRow label="Fecha de nacimiento" value={formatDate(estudiante.fecha_nacimiento)} />
            <InfoRow label="Correo electrónico" value={estudiante.correo_electronico} />
            <InfoRow label="Teléfono" value={estudiante.nro_telefono} />
            <InfoRow label="Colegio de procedencia" value={estudiante.colegio_de_procedencia} />
            <InfoRow label="Dirección de domicilio" value={estudiante.direccion_de_domicilio} />
            <InfoRow
              label="Estado"
              value={estudiante.usuario_vigente === false ? "No vigente" : "Vigente"}
            />
          </dl>
        </InfoCard>

        <InfoCard title="Apoderado">
          {apoderado ? (
            <dl className="mi-info-list">
              <InfoRow label="Nombre completo" value={apoderado.nombre_completo} />
              <InfoRow label="Parentesco" value={apoderado.parentesco} />
              <InfoRow label="Carnet de identidad" value={apoderado.nro_carnet} />
              <InfoRow label="Teléfono" value={apoderado.nro_telefono} />
              <InfoRow label="Correo electrónico" value={apoderado.correo_electronico} />
            </dl>
          ) : (
            <p className="muted">No tienes un apoderado registrado.</p>
          )}
        </InfoCard>

        <InfoCard title="Capacitación">
          {capacitacion ? (
            <dl className="mi-info-list">
              <InfoRow label="Facultad" value={capacitacion.facultad} />
              <InfoRow label="Capacitación" value={`#${capacitacion.id_capacitacion}`} />
              <InfoRow label="Inicio" value={formatDate(capacitacion.fecha_inicio)} />
              <InfoRow label="Fin" value={formatDate(capacitacion.fecha_fin)} />
              <InfoRow
                label="Modalidad"
                value={capacitacion.convocatoria_modalidad || paralelo?.modalidad}
              />
              <InfoRow label="Convocatoria" value={capacitacion.id_convocatoria != null ? `#${capacitacion.id_convocatoria}` : null} />
              <InfoRow label="Estado" value={estadoLabel(capacitacion.activo)} />
            </dl>
          ) : (
            <p className="muted">Aún no tienes una capacitación asignada.</p>
          )}
        </InfoCard>

        <InfoCard title="Paralelo e inscripción">
          {paralelo ? (
            <dl className="mi-info-list">
              <InfoRow label="Paralelo" value={paralelo.nombre_paralelo} />
              <InfoRow label="Nivel" value={paralelo.nivel} />
              <InfoRow label="Modalidad" value={paralelo.modalidad} />
              <InfoRow label="Aula" value={paralelo.aula_codigo ? `${paralelo.aula_codigo} (${paralelo.aula_capacidad ?? "—"} estudiantes)` : null} />
              <InfoRow label="Días de clase" value={paralelo.dias} />
              <InfoRow label="Horario" value={`${formatTime(paralelo.hora_inicio)} – ${formatTime(paralelo.hora_fin)}`} />
              <InfoRow label="Fecha de inscripción" value={formatDate(inscripcion?.fecha_insc)} />
              <InfoRow label="Nro. de credencial" value={inscripcion?.num_credencial} />
              <InfoRow label="Estado del paralelo" value={estadoLabel(paralelo.activo)} />
            </dl>
          ) : (
            <p className="muted">Aún no estás inscrito en un paralelo.</p>
          )}
        </InfoCard>

        <InfoCard title="Materias y asesores" className="mi-info-card-wide">
          {materias.length === 0 ? (
            <p className="muted">Aún no tienes materias asignadas.</p>
          ) : (
            <div className="mi-materias-grid">
              {materias.map((materia) => (
                <MateriaCard materia={materia} key={materia.id_paralelo_materia} />
              ))}
            </div>
          )}
        </InfoCard>

        <InfoCard title="Asistencia">
          <div className="mi-stat-grid">
            <div>
              <strong>{resumen.asistencias}</strong>
              <span>Asistencias</span>
            </div>
            <div>
              <strong>{resumen.total_clases}</strong>
              <span>Clases registradas</span>
            </div>
            <div>
              <strong>{resumen.permisos}</strong>
              <span>Con permiso</span>
            </div>
          </div>
          <p className="mi-info-note">
            Última asistencia: {resumen.ultima_asistencia ? formatDateTime(resumen.ultima_asistencia) : "Sin registros"}
          </p>
        </InfoCard>

        <InfoCard title="Mensualidad">
          {mensualidad ? (
            <dl className="mi-info-list">
              <InfoRow label="Periodo" value={`${formatShortDate(mensualidad.fecha_inicio_mensualidad)} – ${formatShortDate(mensualidad.fecha_fin_mensualidad)}`} />
              <InfoRow label="Fecha de vencimiento" value={formatDate(mensualidad.fecha_fin_mensualidad)} />
              <InfoRow label="Monto pagado" value={MONEY_FORMATTER.format(Number(mensualidad.pago ?? 0))} />
              <InfoRow label="Código de comprobante" value={mensualidad.codigo_comprobante} />
            </dl>
          ) : (
            <p className="muted">No tienes mensualidades registradas.</p>
          )}
        </InfoCard>
          </div>
        </>
      ) : activeView === "mensualidades" ? (
        <section className="mi-mensualidades-view" role="tabpanel">
          <header className="mi-mensualidades-header">
            <div>
              <h2>Mis mensualidades</h2>
              <p>Consulta los periodos cubiertos, pagos y comprobantes registrados a tu nombre.</p>
            </div>
            <span>{mensualidades.length} registrada{mensualidades.length === 1 ? "" : "s"}</span>
          </header>
          <MensualidadesCalendar
            title={`Calendario de mensualidades · ${nombre}`}
            mensualidades={mensualidades}
            emptyMessage="No tienes mensualidades registradas."
          />
        </section>
      ) : (
        <div className="mi-asistencias-view" role="tabpanel">
          <StudentAttendanceCalendar
            student={estudiante}
            attendanceEndpoint="/mi-informacion/asistencias"
          />
        </div>
      )}
    </section>
  )
}
