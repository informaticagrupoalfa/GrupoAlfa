import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import { renderToStaticMarkup } from "react-dom/server"
import { useSearchParams } from "react-router-dom"
import { getResourceById, listResource } from "../../../services/academicService"
import Pagination from "../../../components/ui/Pagination"
import Skeleton from "../../../components/ui/Skeleton"
import InscripcionReport from "./InscripcionReport"
import reportCss from "./InscripcionReport.css?inline"
import "./ReportesView.css"

const PAGE_SIZE = 15
const CONDUCT_STORAGE_KEY = "grupoalfa.codigoConductaInscripciones.v1"
const DEFAULT_CONDUCT = [
  "1. Asistir puntualmente a las clases y cumplir las indicaciones académicas del paralelo.",
  "2. Tratar con respeto a estudiantes, asesores y personal de la institución; evitar toda forma de discriminación, acoso o violencia.",
  "3. Presentar trabajos y evaluaciones con honestidad, sin suplantación ni copia.",
  "4. Cuidar aulas, equipos, materiales y espacios comunes; informar cualquier daño o situación de riesgo.",
  "5. Usar dispositivos electrónicos de manera que no interrumpan la clase ni vulneren la privacidad de otras personas.",
  "6. Seguir las normas de seguridad y las instrucciones del personal durante las actividades presenciales y virtuales.",
  "7. Comunicar oportunamente ausencias, dificultades o incidentes al asesor o a la administración.",
  "8. Ante un incumplimiento, la institución escuchará a las personas involucradas y aplicará las medidas previstas en su normativa vigente.",
].join("\n")

const readConduct = () => {
  try { return window.localStorage.getItem(CONDUCT_STORAGE_KEY) ?? DEFAULT_CONDUCT }
  catch { return DEFAULT_CONDUCT }
}

const show = (value) => value === null || value === undefined || value === "" ? "—" : value
const dateText = (value) => {
  const iso = String(value ?? "").slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4)
    : "—"
}
const fullName = (...parts) => parts.filter(Boolean).join(" ")

function DetailField({ label, value }) {
  return <div className="reportes-dato"><dt>{label}</dt><dd>{show(value)}</dd></div>
}

DetailField.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node }

function DetailSection({ title, children }) {
  return <section className="reportes-seccion"><h3>{title}</h3><dl>{children}</dl></section>
}

DetailSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired }

function ReportDetail({ record }) {
  const student = record.estudiante_nombre
    || fullName(record.nombre, record.apellido_paterno, record.apellido_materno)
  const guardian = fullName(record.apoderado_nombre, record.apoderado_apellido_paterno, record.apoderado_apellido_materno)
  const admin = fullName(record.administrativo_nombre, record.administrativo_apellido_paterno, record.administrativo_apellido_materno)
  const start = record.paralelo_hora_inicio ?? record.hora_inicio
  const end = record.paralelo_hora_fin ?? record.hora_fin
  const schedule = start || end ? [start, end].filter(Boolean).map((time) => String(time).slice(0, 5)).join(" a ") : null

  return (
    <div className="reportes-detalle">
      <header className="reportes-detalle-head">
        <div>
          <span>Inscripción #{record.id_inscripcion}</span>
          <h2>{student || "Estudiante sin nombre"}</h2>
          <p>{record.facultad_nombre || record.facultad || "Facultad sin asignar"} · {record.carrera_nombre || "Carrera sin registrar"}</p>
        </div>
        <time>{dateText(record.fecha_insc)}</time>
      </header>
      <div className="reportes-secciones">
        <DetailSection title="Inscripción">
          <DetailField label="Número" value={record.id_inscripcion} />
          <DetailField label="Fecha" value={dateText(record.fecha_insc)} />
          <DetailField label="Credencial" value={record.num_credencial} />
          <DetailField label="Cómo se enteró" value={record.como_se_entero_de_nosotros} />
          <DetailField label="Detalle del medio" value={record.como_se_entero_detalle} />
          <DetailField label="Recálculo" value={record.recalculo ? "Sí" : "No"} />
          <DetailField label="Preparación previa" value={record.preparacion_previa ? "Sí" : "No"} />
          <DetailField label="Meses de preparación" value={record.tiempo_de_preparacion_meses} />
          <DetailField label="Lugar de preparación" value={record.lugar_de_preparacion} />
        </DetailSection>
        <DetailSection title="Capacitación y aula">
          <DetailField label="Facultad" value={record.facultad_nombre ?? record.facultad} />
          <DetailField label="Carrera" value={record.carrera_nombre} />
          <DetailField label="Capacitación" value={record.id_capacitacion} />
          <DetailField label="Inicio" value={dateText(record.capacitacion_inicio ?? record.inicio_clases)} />
          <DetailField label="Fin" value={dateText(record.capacitacion_fin)} />
          <DetailField label="Paralelo" value={record.nombre_paralelo} />
          <DetailField label="Nivel" value={record.paralelo_nivel ?? record.nivel} />
          <DetailField label="Modalidad" value={record.paralelo_modalidad ?? record.modalidad} />
          <DetailField label="Días" value={record.paralelo_dias ?? record.dias} />
          <DetailField label="Horario" value={schedule} />
          <DetailField label="Aula" value={record.aula_codigo} />
        </DetailSection>
        <DetailSection title="Estudiante">
          <DetailField label="Nombre" value={student} />
          <DetailField label="CI" value={record.estudiante_ci ?? record.ci} />
          <DetailField label="Fecha de nacimiento" value={dateText(record.estudiante_fecha_nacimiento ?? record.fecha_nacimiento)} />
          <DetailField label="Correo" value={record.estudiante_correo ?? record.correo_electronico} />
          <DetailField label="Teléfono" value={record.estudiante_telefono ?? record.celular} />
        </DetailSection>
        <DetailSection title="Apoderado y responsable">
          <DetailField label="Apoderado" value={guardian} />
          <DetailField label="CI" value={record.apoderado_ci} />
          <DetailField label="Parentesco" value={record.apoderado_parentesco} />
          <DetailField label="Teléfono" value={record.apoderado_telefono} />
          <DetailField label="Correo del apoderado" value={record.apoderado_correo_electronico} />
          <DetailField label="Responsable" value={admin} />
          <DetailField label="Sucursal" value={record.sucursal} />
        </DetailSection>
      </div>
    </div>
  )
}

ReportDetail.propTypes = { record: PropTypes.object.isRequired }

export default function ReportesView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get("id")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState("")
  const [listVersion, setListVersion] = useState(0)
  const [record, setRecord] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [detailVersion, setDetailVersion] = useState(0)
  const [windowError, setWindowError] = useState("")
  const [codigoConducta, setCodigoConducta] = useState(readConduct)
  const detailRef = useRef(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoadingList(true)
      listResource("inscripciones/listado", { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q: search.trim() })
        .then((result) => {
          if (!active) return
          setItems(result.items ?? [])
          setTotal(result.total ?? 0)
          setListError("")
          const lastPage = Math.max(1, Math.ceil((result.total ?? 0) / PAGE_SIZE))
          if (page > lastPage) setPage(lastPage)
        })
        .catch((error) => { if (active) setListError(error.userMessage ?? "No se pudieron cargar las inscripciones.") })
        .finally(() => { if (active) setLoadingList(false) })
    }, search ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [page, search, listVersion])

  useEffect(() => {
    if (!selectedId) { setRecord(null); setDetailError(""); setLoadingDetail(false); return }
    let active = true
    setRecord(null)
    setDetailError("")
    setWindowError("")
    setLoadingDetail(true)
    Promise.all([
      getResourceById("inscripciones", String(selectedId) + "/ficha"),
      getResourceById("inscripciones", String(selectedId) + "/detalle"),
    ])
      .then(([ficha, detalle]) => { if (active) setRecord({ ...ficha, ...detalle }) })
      .catch((error) => { if (active) setDetailError(error.userMessage ?? "No se pudo cargar la inscripción.") })
      .finally(() => { if (active) setLoadingDetail(false) })
    return () => { active = false }
  }, [selectedId, detailVersion])

  useEffect(() => {
    try { window.localStorage.setItem(CONDUCT_STORAGE_KEY, codigoConducta) }
    catch { /* El texto permanece en esta sesión. */ }
  }, [codigoConducta])

  const openRecord = (id) => {
    setSearchParams({ tab: "reportes", id: String(id) })
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

  const generateReport = () => {
    if (!record || loadingDetail || String(record.id_inscripcion) !== String(selectedId)) return
    setWindowError("")
    const reportWindow = window.open("", "_blank")
    if (!reportWindow) {
      setWindowError("El navegador bloqueó la nueva ventana. Permite ventanas emergentes e inténtalo de nuevo.")
      return
    }
    reportWindow.opener = null
    const issuedAt = new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())
    const logoUrl = new URL(import.meta.env.BASE_URL + "LogoGrupoAlfa.svg", window.location.origin).href
    const report = renderToStaticMarkup(
      <InscripcionReport record={record} codigoConducta={codigoConducta} logoUrl={logoUrl} issuedAt={issuedAt} />
    )
    const documentHtml = [
      '<!doctype html><html lang="es"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      "<title>Constancia de inscripción " + Number(record.id_inscripcion) + "</title>",
      "<style>", reportCss, "</style></head><body>",
      '<div class="report-window-actions"><button id="report-print" type="button">Imprimir o guardar PDF</button>',
      "<span>Constancia de inscripción #" + Number(record.id_inscripcion) + "</span></div>",
      report, "</body></html>",
    ].join("")
    reportWindow.document.open()
    reportWindow.document.write(documentHtml)
    reportWindow.document.close()
    reportWindow.document.getElementById("report-print")?.addEventListener("click", () => reportWindow.print())
    reportWindow.focus()
  }

  return (
    <div className="reportes-vista">
      <header className="reportes-toolbar">
        <div>
          <h1>Reportes de inscripción</h1>
          <p>Selecciona una inscripción para revisar sus datos y emitir la constancia.</p>
        </div>
        <div className="reportes-toolbar-actions">
          <button className="submit-button" type="button" disabled={!record || loadingDetail}
            onClick={generateReport}>Generar constancia</button>
        </div>
        {windowError && <p className="error-message" role="alert">{windowError}</p>}
        <details className="reportes-conducta">
          <summary>Código de conducta incluido en el reporte</summary>
          <p>Puedes editar este texto antes de generar la constancia. Se guarda en este navegador.</p>
          <textarea value={codigoConducta} onChange={(event) => setCodigoConducta(event.target.value)}
            rows={9} aria-label="Código de conducta" />
          <button className="secondary-button" type="button" onClick={() => setCodigoConducta(DEFAULT_CONDUCT)}>
            Restablecer texto
          </button>
        </details>
      </header>

      <div className="reportes-columnas">
        <aside className="reportes-lista" aria-label="Inscripciones">
          <div className="reportes-lista-head">
            <h2>Inscripciones</h2><span>{total} registros</span>
          </div>
          <label className="reportes-buscar">Buscar por estudiante, CI, facultad, carrera o paralelo
            <input type="search" value={search} placeholder="Buscar inscripción"
              onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
          </label>
          {listError && <p className="error-message" role="alert">{listError} <button type="button"
            onClick={() => setListVersion((value) => value + 1)}>Reintentar</button></p>}
          {loadingList ? <Skeleton lines={6} /> : (
            <div className="reportes-tarjetas">
              {!items.length && !listError && <p className="reportes-vacio">No hay inscripciones para esta búsqueda.</p>}
              {items.map((item) => (
                <button key={item.id_inscripcion} type="button"
                  className={"reportes-tarjeta" + (String(item.id_inscripcion) === selectedId ? " selected" : "")}
                  aria-pressed={String(item.id_inscripcion) === selectedId}
                  onClick={() => openRecord(item.id_inscripcion)}>
                  <span>Inscripción #{item.id_inscripcion}<time>{dateText(item.fecha_insc)}</time></span>
                  <strong>{item.estudiante_nombre || "Estudiante #" + item.id_estudiante}</strong>
                  <small>CI {show(item.estudiante_ci)} · {item.nombre_paralelo || "Sin paralelo"}</small>
                  <small>{item.facultad_nombre || "Facultad sin asignar"} · {item.carrera_nombre || "Carrera sin registrar"}</small>
                </button>
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} />
        </aside>

        <section className="reportes-panel" aria-label="Detalle de inscripción" ref={detailRef}>
          {loadingDetail ? <Skeleton lines={9} /> : detailError ? (
            <p className="error-message" role="alert">{detailError} <button type="button"
              onClick={() => setDetailVersion((value) => value + 1)}>Reintentar</button></p>
          ) : record ? <ReportDetail record={record} /> : (
            <div className="reportes-placeholder">
              <h2>Selecciona una inscripción</h2>
              <p>El detalle aparecerá aquí. Podrás generar la constancia desde la barra superior.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
