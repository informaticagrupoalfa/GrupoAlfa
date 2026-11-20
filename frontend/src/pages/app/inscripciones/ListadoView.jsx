import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import { useSearchParams } from "react-router-dom"
import { getResourceById, listResource } from "../../../services/academicService"
import Pagination from "../../../components/ui/Pagination"
import Skeleton from "../../../components/ui/Skeleton"
import ErrorFallback from "../../../components/ui/ErrorFallback"
import "./ListadoView.css"

const PAGE_SIZE = 20

const fullName = (record, prefix) => [
  record?.[`${prefix}_nombre`],
  record?.[`${prefix}_apellido_paterno`],
  record?.[`${prefix}_apellido_materno`],
].filter(Boolean).join(" ")

const dateText = (value) => {
  const iso = String(value ?? "").slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
    : "—"
}

const timeText = (value) => value ? String(value).slice(0, 5) : "—"

function Field({ label, value }) {
  return <div className="ins-listado-field"><dt>{label}</dt><dd>{value === null || value === undefined || value === "" ? "—" : value}</dd></div>
}
Field.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node }

function DetailSection({ title, children }) {
  return <section className="ins-listado-section"><h3>{title}</h3><dl className="ins-listado-fields">{children}</dl></section>
}
DetailSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired }

function Detail({ record }) {
  const student = fullName(record, "estudiante") || `Estudiante #${record.id_estudiante}`
  const admin = fullName(record, "administrativo") || (record.id_administrativo ? `Administrativo #${record.id_administrativo}` : "Sin asignar")
  return <div className="ins-listado-detail">
    <header className="ins-listado-detail-head">
      <div><p>Inscripción #{record.id_inscripcion}</p><h2>{student}</h2><span>{record.facultad_nombre || "Facultad sin asignar"} · {record.carrera_nombre || "Carrera sin registrar"}</span></div>
      <strong>{dateText(record.fecha_insc)}</strong>
    </header>

    <div className="ins-listado-detail-grid">
      <DetailSection title="Facultad y carrera">
        <Field label="Facultad" value={record.facultad_nombre} />
        <Field label="ID de facultad" value={record.id_facultad} />
        <Field label="Carrera" value={record.carrera_nombre} />
        <Field label="ID de carrera" value={record.id_carrera} />
      </DetailSection>

      <DetailSection title="Inscripción">
        <Field label="ID de inscripción" value={record.id_inscripcion} />
        <Field label="Fecha" value={dateText(record.fecha_insc)} />
        <Field label="Nº de credencial" value={record.num_credencial} />
        <Field label="Cómo se enteró" value={record.como_se_entero_de_nosotros} />
        <Field label="Recálculo" value={record.recalculo ? "Sí" : "No"} />
        <Field label="Preparación previa" value={record.preparacion_previa ? "Sí" : "No"} />
        <Field label="Meses de preparación" value={record.tiempo_de_preparacion_meses} />
        <Field label="Lugar de preparación" value={record.lugar_de_preparacion} />
      </DetailSection>

      <DetailSection title="Capacitación y paralelo">
        <Field label="ID de capacitación" value={record.id_capacitacion} />
        <Field label="Convocatoria" value={record.id_convocatoria} />
        <Field label="Inicio" value={dateText(record.capacitacion_inicio)} />
        <Field label="Fin" value={dateText(record.capacitacion_fin)} />
        <Field label="Estado" value={record.id_capacitacion ? (record.capacitacion_activa ? "Activa" : "Inactiva") : null} />
        <Field label="Paralelo" value={record.nombre_paralelo} />
        <Field label="Nivel" value={record.paralelo_nivel} />
        <Field label="Modalidad" value={record.paralelo_modalidad} />
        <Field label="Días" value={record.paralelo_dias} />
        <Field label="Horario" value={record.paralelo_hora_inicio || record.paralelo_hora_fin ? `${timeText(record.paralelo_hora_inicio)} – ${timeText(record.paralelo_hora_fin)}` : null} />
      </DetailSection>

      <DetailSection title="Aula">
        <Field label="ID de aula" value={record.id_aula} />
        <Field label="Código" value={record.aula_codigo} />
        <Field label="Capacidad" value={record.aula_capacidad} />
      </DetailSection>

      <DetailSection title="Administrativo y usuario">
        <Field label="ID de administrativo" value={record.id_administrativo} />
        <Field label="Nombre" value={admin} />
        <Field label="ID de usuario" value={record.administrativo_usuario_id} />
        <Field label="CI" value={record.administrativo_ci} />
        <Field label="Correo" value={record.administrativo_correo} />
        <Field label="Teléfono" value={record.administrativo_telefono} />
        <Field label="Usuario vigente" value={record.administrativo_usuario_id ? (record.administrativo_usuario_vigente ? "Sí" : "No") : null} />
      </DetailSection>

      <DetailSection title="Estudiante y usuario">
        <Field label="ID de estudiante" value={record.id_estudiante} />
        <Field label="Nombre" value={student} />
        <Field label="ID de usuario" value={record.estudiante_usuario_id} />
        <Field label="CI" value={record.estudiante_ci} />
        <Field label="Fecha de nacimiento" value={dateText(record.estudiante_fecha_nacimiento)} />
        <Field label="Correo" value={record.estudiante_correo} />
        <Field label="Teléfono" value={record.estudiante_telefono} />
        <Field label="Usuario vigente" value={record.estudiante_usuario_id ? (record.estudiante_usuario_vigente ? "Sí" : "No") : null} />
        <Field label="Colegio de procedencia" value={record.colegio_de_procedencia} />
        <Field label="Dirección" value={record.direccion_de_domicilio} />
      </DetailSection>
    </div>
  </div>
}
Detail.propTypes = { record: PropTypes.object.isRequired }

export default function ListadoView() {
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
        .catch((error) => { if (active) setListError(error.userMessage || "No se pudo cargar el listado.") })
        .finally(() => { if (active) setLoadingList(false) })
    }, search ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [page, search, listVersion])

  useEffect(() => {
    if (!selectedId) { setRecord(null); setDetailError(""); setLoadingDetail(false); return }
    let active = true
    setRecord(null); setDetailError(""); setLoadingDetail(true)
    getResourceById("inscripciones", `${selectedId}/detalle`)
      .then((result) => { if (active) setRecord(result) })
      .catch((error) => { if (active) setDetailError(error.userMessage || "No se pudo cargar el detalle.") })
      .finally(() => { if (active) setLoadingDetail(false) })
    return () => { active = false }
  }, [selectedId, detailVersion])

  const open = (id) => {
    setSearchParams({ tab: "listado", id: String(id) })
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

  return <div className="ins-listado-layout">
    <aside className="ins-listado-rail" aria-label="Inscripciones">
      <header className="ins-listado-rail-head"><h2>Listado de inscripciones</h2><p>{total} inscripciones</p></header>
      <label className="ins-listado-search">Buscar por nombre, CI, facultad, carrera o paralelo
        <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar inscripción" />
      </label>
      {listError && <ErrorFallback message={listError} onRetry={() => setListVersion(value => value + 1)} />}
      {loadingList ? <Skeleton lines={6} /> : <div className="ins-listado-items">
        {!items.length && !listError && <p className="ins-listado-empty">No hay inscripciones para esta búsqueda.</p>}
        {items.map((item) => <button key={item.id_inscripcion} type="button"
          className={`ins-listado-item${String(item.id_inscripcion) === selectedId ? " selected" : ""}`}
          aria-pressed={String(item.id_inscripcion) === selectedId} onClick={() => open(item.id_inscripcion)}>
          <span>Inscripción #{item.id_inscripcion}<time>{dateText(item.fecha_insc)}</time></span>
          <strong>{item.estudiante_nombre || `Estudiante #${item.id_estudiante}`}</strong>
          <small>CI {item.estudiante_ci ?? "—"} · {item.nombre_paralelo || "Sin paralelo"}</small>
          <small>{item.facultad_nombre || "Facultad sin asignar"} · {item.carrera_nombre || "Carrera sin registrar"}</small>
        </button>)}
      </div>}
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} />
    </aside>

    <section className="ins-listado-panel" aria-label="Detalle de inscripción" ref={detailRef}>
      {loadingDetail ? <Skeleton lines={9} /> : detailError ? <ErrorFallback message={detailError} onRetry={() => setDetailVersion(value => value + 1)} />
        : record ? <Detail record={record} />
          : <div className="ins-listado-placeholder"><h2>Selecciona una inscripción</h2><p>Su información académica, el aula y las personas vinculadas aparecerán aquí.</p></div>}
    </section>
  </div>
}
