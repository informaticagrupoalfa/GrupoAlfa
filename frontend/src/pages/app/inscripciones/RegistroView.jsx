import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import PropTypes from "prop-types"
import { useSearchParams } from "react-router-dom"
import { deleteResource, getResourceById, listResource, updateResource } from "../../../services/academicService"
import InscripcionRegistroForm from "../../../components/features/inscripciones/InscripcionRegistroForm"
import InscripcionReport from "./InscripcionReport"
import Pagination from "../../../components/ui/Pagination"
import Skeleton from "../../../components/ui/Skeleton"
import "./RegistroView.css"

const CATALOGOS = ["carreras", "capacitaciones", "convocatorias", "paralelos", "administrativos", "apoderados"]
const PAGE_SIZE = 15
const CONDUCTA_STORAGE_KEY = "grupoalfa.codigoConductaInscripciones.v1"
const CODIGO_CONDUCTA_INICIAL = `1. Asistir puntualmente a las clases y cumplir las indicaciones académicas del paralelo.
2. Tratar con respeto a estudiantes, asesores y personal de la institución; evitar toda forma de discriminación, acoso o violencia.
3. Presentar trabajos y evaluaciones con honestidad, sin suplantación ni copia.
4. Cuidar aulas, equipos, materiales y espacios comunes; informar cualquier daño o situación de riesgo.
5. Usar dispositivos electrónicos de manera que no interrumpan la clase ni vulneren la privacidad de otras personas.
6. Seguir las normas de seguridad y las instrucciones del personal durante las actividades presenciales y virtuales.
7. Comunicar oportunamente ausencias, dificultades o incidentes al asesor o a la administración.
8. Ante un incumplimiento, la institución escuchará a las personas involucradas y aplicará las medidas previstas en su normativa vigente.`

function readCodigoConducta() {
  try { return window.localStorage.getItem(CONDUCTA_STORAGE_KEY) ?? CODIGO_CONDUCTA_INICIAL }
  catch { return CODIGO_CONDUCTA_INICIAL }
}

const nombreCompleto = (persona) =>
  [persona?.nombre, persona?.apellido_paterno, persona?.apellido_materno].filter(Boolean).join(" ")

const fechaCorta = (value) => value ? String(value).slice(0, 10) : ""
const fechaVisible = (value) => {
  const date = fechaCorta(value)
  return date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "—"
}

function FichaDato({ label, value }) {
  return <div className="registro-ficha-dato"><dt>{label}</dt><dd>{value || "—"}</dd></div>
}

FichaDato.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node }

function useInscripcionCatalogos() {
  const [catalogos, setCatalogos] = useState({
    carreras: [],
    capacitaciones: [],
    convocatorias: [],
    paralelos: [],
    administrativos: [],
    apoderados: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.allSettled(CATALOGOS.map((endpoint) => listResource(endpoint)))
      .then((results) => {
        if (!mounted) return
        const next = {
          carreras: [],
          capacitaciones: [],
          convocatorias: [],
          paralelos: [],
          administrativos: [],
          apoderados: [],
        }
        results.forEach((result, index) => {
          next[CATALOGOS[index]] = result.status === "fulfilled" && Array.isArray(result.value)
            ? result.value
            : []
        })
        setCatalogos(next)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => { mounted = false }
  }, [])

  return { ...catalogos, isLoading }
}

function buildParalelosPorCarrera(carreras, convocatorias, capacitaciones, paralelos) {
  const convocatoriasPorFacultad = new Map()
  convocatorias.forEach((convocatoria) => {
    const key = String(convocatoria.id_facultad)
    if (!convocatoriasPorFacultad.has(key)) convocatoriasPorFacultad.set(key, new Set())
    convocatoriasPorFacultad.get(key).add(String(convocatoria.id_convocatoria))
  })

  const capacitacionesPorConvocatoria = new Map()
  capacitaciones
    .filter((capacitacion) => capacitacion.activo !== false)
    .forEach((capacitacion) => {
      const key = String(capacitacion.id_convocatoria)
      if (!capacitacionesPorConvocatoria.has(key)) capacitacionesPorConvocatoria.set(key, [])
      capacitacionesPorConvocatoria.get(key).push(capacitacion)
    })

  const paralelosPorCapacitacion = new Map()
  paralelos
    .filter((paralelo) => paralelo.activo !== false)
    .forEach((paralelo) => {
      const key = String(paralelo.id_capacitacion)
      if (!paralelosPorCapacitacion.has(key)) paralelosPorCapacitacion.set(key, [])
      paralelosPorCapacitacion.get(key).push(paralelo)
    })

  const result = new Map()
  carreras.forEach((carrera) => {
    const convocatoriaIds = convocatoriasPorFacultad.get(String(carrera.id_facultad)) ?? new Set()
    const disponibles = []
    convocatoriaIds.forEach((idConvocatoria) => {
      for (const capacitacion of capacitacionesPorConvocatoria.get(idConvocatoria) ?? []) {
        for (const paralelo of paralelosPorCapacitacion.get(String(capacitacion.id_capacitacion)) ?? []) {
          disponibles.push({ ...paralelo, capacitacion })
        }
      }
    })
    disponibles.sort((a, b) => {
      const fechaA = a.capacitacion?.fecha_inicio
        ? new Date(a.capacitacion.fecha_inicio).getTime()
        : Number.MAX_SAFE_INTEGER
      const fechaB = b.capacitacion?.fecha_inicio
        ? new Date(b.capacitacion.fecha_inicio).getTime()
        : Number.MAX_SAFE_INTEGER
      if (fechaA !== fechaB) return fechaA - fechaB
      return String(a.nombre_paralelo ?? "").localeCompare(String(b.nombre_paralelo ?? ""))
    })
    result.set(String(carrera.id_carrera), disponibles)
  })

  return result
}

function FichaInscripcion({ id, paralelos, administrativos, onChanged, onDeleted, onLoaded }) {
  const [ficha, setFicha] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError("")
    getResourceById("inscripciones", `${id}/ficha`)
      .then((record) => {
        if (!mounted) return
        setFicha(record)
        onLoaded(record)
        setForm({
          id_paralelo: String(record.id_paralelo ?? ""),
          id_administrativo: String(record.id_administrativo ?? ""),
          num_credencial: String(record.num_credencial ?? ""),
          fecha_insc: fechaCorta(record.fecha_insc),
          como_se_entero_de_nosotros: record.como_se_entero_de_nosotros ?? "",
          recalculo: Boolean(record.recalculo),
          preparacion_previa: Boolean(record.preparacion_previa),
          tiempo_de_preparacion_meses: String(record.tiempo_de_preparacion_meses ?? ""),
          lugar_de_preparacion: record.lugar_de_preparacion ?? "",
        })
      })
      .catch((err) => { if (mounted) setError(err.userMessage ?? "No se pudo cargar la inscripción.") })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id, onLoaded])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async (event) => {
    event.preventDefault()
    setError("")
    setSaving(true)
    try {
      const payload = {
        ...(form.id_paralelo ? { id_paralelo: Number(form.id_paralelo) } : {}),
        ...(form.id_administrativo ? { id_administrativo: Number(form.id_administrativo) } : {}),
        ...(form.num_credencial ? { num_credencial: Number(form.num_credencial) } : {}),
        ...(form.fecha_insc ? { fecha_insc: form.fecha_insc } : {}),
        como_se_entero_de_nosotros: form.como_se_entero_de_nosotros.trim(),
        recalculo: form.recalculo,
        preparacion_previa: form.preparacion_previa,
        ...(form.tiempo_de_preparacion_meses ? { tiempo_de_preparacion_meses: Number(form.tiempo_de_preparacion_meses) } : {}),
        lugar_de_preparacion: form.lugar_de_preparacion.trim(),
      }
      const updated = await updateResource("inscripciones", id, payload)
      const refreshed = await getResourceById("inscripciones", `${id}/ficha`).catch(() => null)
      const updatedFicha = refreshed ?? { ...ficha, ...updated }
      setFicha(updatedFicha)
      onLoaded(updatedFicha)
      onChanged()
      if (!refreshed) setError("Cambios guardados, pero no se pudo actualizar la ficha. Vuelve a abrirla antes de imprimir.")
    } catch (err) {
      setError(err.userMessage ?? "No se pudieron guardar los cambios.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la inscripción #${id}?`)) return
    setError("")
    setSaving(true)
    try {
      await deleteResource("inscripciones", id)
      onDeleted()
    } catch (err) {
      setError(err.userMessage ?? "No se pudo eliminar la inscripción.")
      setSaving(false)
    }
  }

  if (loading) return <Skeleton lines={8} />
  if (error && !ficha) return <p className="error-message" role="alert">{error}</p>
  if (!ficha || !form) return null

  return (
    <div className="registro-ficha">
      <div className="registro-ficha-head">
        <div><span>Inscripción #{id}</span><h2>{nombreCompleto(ficha) || `Estudiante #${ficha.id_estudiante}`}</h2></div>
        <p>CI {ficha.ci || "—"}</p>
      </div>

      <section className="registro-ficha-section">
        <h3>Estudiante</h3>
        <dl className="registro-ficha-datos">
          <FichaDato label="ID de estudiante" value={ficha.id_estudiante} />
          <FichaDato label="Carnet" value={ficha.ci} />
          <FichaDato label="Fecha de nacimiento" value={fechaVisible(ficha.fecha_nacimiento)} />
          <FichaDato label="Correo" value={ficha.correo_electronico} />
          <FichaDato label="Teléfono" value={ficha.celular} />
          <FichaDato label="Colegio" value={ficha.colegio_de_procedencia} />
          <FichaDato label="Dirección" value={ficha.direccion_de_domicilio} />
        </dl>
      </section>

      <section className="registro-ficha-section">
        <h3>Apoderado</h3>
        <dl className="registro-ficha-datos">
          <FichaDato label="Nombre" value={nombreCompleto({ nombre: ficha.apoderado_nombre, apellido_paterno: ficha.apoderado_apellido_paterno, apellido_materno: ficha.apoderado_apellido_materno })} />
          <FichaDato label="Carnet" value={ficha.apoderado_ci} />
          <FichaDato label="Parentesco" value={ficha.apoderado_parentesco} />
          <FichaDato label="Teléfono" value={ficha.apoderado_telefono} />
          <FichaDato label="Correo" value={ficha.apoderado_correo_electronico} />
        </dl>
      </section>

      <form onSubmit={handleSave} className="registro-ficha-section registro-edicion">
        <h3>Datos de la inscripción</h3>
        <div className="registro-ficha-datos">
          <label>Paralelo
            <select value={form.id_paralelo} onChange={(e) => set("id_paralelo", e.target.value)}>
              <option value="">Sin paralelo</option>
              {paralelos.map((item) => <option key={item.id_paralelo} value={item.id_paralelo}>{item.nombre_paralelo || `Paralelo #${item.id_paralelo}`}</option>)}
            </select>
          </label>
          <label>Administrativo
            <select value={form.id_administrativo} onChange={(e) => set("id_administrativo", e.target.value)}>
              <option value="">Sin asignar</option>
              {administrativos.map((item) => <option key={item.id_administrativo} value={item.id_administrativo}>{nombreCompleto(item) || `Administrativo #${item.id_administrativo}`}</option>)}
            </select>
          </label>
          <label>Nº de credencial
            <input type="number" min="0" value={form.num_credencial} onChange={(e) => set("num_credencial", e.target.value)} />
          </label>
          <label>Fecha de inscripción
            <input type="date" value={form.fecha_insc} onChange={(e) => set("fecha_insc", e.target.value)} />
          </label>
          <label className="registro-campo-ancho">Cómo se enteró de nosotros
            <input maxLength={255} value={form.como_se_entero_de_nosotros} onChange={(e) => set("como_se_entero_de_nosotros", e.target.value)} />
          </label>
          <label>Preparación previa
            <select value={form.preparacion_previa ? "si" : "no"} onChange={(e) => set("preparacion_previa", e.target.value === "si")}>
              <option value="no">No</option><option value="si">Sí</option>
            </select>
          </label>
          <label>Tiempo de preparación (meses)
            <input type="number" min="0" value={form.tiempo_de_preparacion_meses} onChange={(e) => set("tiempo_de_preparacion_meses", e.target.value)} />
          </label>
          <label className="registro-campo-ancho">Lugar de preparación
            <input maxLength={255} value={form.lugar_de_preparacion} onChange={(e) => set("lugar_de_preparacion", e.target.value)} />
          </label>
          <label className="registro-check"><input type="checkbox" checked={form.recalculo} onChange={(e) => set("recalculo", e.target.checked)} /> Recálculo</label>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="registro-ficha-actions">
          <button className="secondary-button" type="button" disabled={saving} onClick={handleDelete}>Eliminar inscripción</button>
          <button className="submit-button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </form>
    </div>
  )
}

FichaInscripcion.propTypes = {
  id: PropTypes.string.isRequired,
  paralelos: PropTypes.arrayOf(PropTypes.object).isRequired,
  administrativos: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChanged: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
  onLoaded: PropTypes.func.isRequired,
}

export default function RegistroView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get("id")
  const creating = searchParams.get("nuevo") === "1" && !selectedId
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [message, setMessage] = useState("")
  const [codigoConducta, setCodigoConducta] = useState(readCodigoConducta)
  const [reportRecord, setReportRecord] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const panelRef = useRef(null)
  const reportRef = useRef(null)
  const { carreras, capacitaciones, convocatorias, paralelos, administrativos, apoderados, isLoading } = useInscripcionCatalogos()

  useEffect(() => {
    let mounted = true
    const timer = window.setTimeout(() => {
      setListLoading(true)
      listResource("inscripciones/fichas", { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q: search.trim() })
        .then((result) => {
          if (!mounted) return
          setRows(result.items ?? [])
          setTotal(result.total ?? 0)
          setListError("")
          const lastPage = Math.max(1, Math.ceil((result.total ?? 0) / PAGE_SIZE))
          if (page > lastPage) setPage(lastPage)
        })
        .catch((err) => { if (mounted) setListError(err.userMessage ?? "No se pudieron cargar las inscripciones.") })
        .finally(() => { if (mounted) setListLoading(false) })
    }, search ? 250 : 0)
    return () => { mounted = false; window.clearTimeout(timer) }
  }, [page, search, reloadKey])

  useEffect(() => {
    if ((selectedId || creating) && window.matchMedia("(max-width: 900px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [selectedId, creating])

  useEffect(() => {
    try { window.localStorage.setItem(CONDUCTA_STORAGE_KEY, codigoConducta) } catch { /* El texto sigue editable en esta sesión. */ }
  }, [codigoConducta])

  useEffect(() => { setReportRecord(null); setShowReport(false) }, [selectedId])
  useEffect(() => {
    if (showReport) reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [showReport])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])
  const onReportLoaded = useCallback((record) => setReportRecord(record), [])
  const openNew = () => { setMessage(""); setSearchParams({ tab: "registro", nuevo: "1" }) }
  const openRecord = (id) => { setMessage(""); setSearchParams({ tab: "registro", id: String(id) }) }
  const onSaved = (saved) => {
    reload()
    setMessage("Inscripción creada correctamente.")
    const id = saved?.datos?.id_inscripcion
    setSearchParams(id ? { tab: "registro", id: String(id) } : { tab: "registro" })
  }
  const onDeleted = () => {
    reload()
    setMessage("Inscripción eliminada.")
    setSearchParams({ tab: "registro" })
  }

  const carreraOptions = useMemo(() => carreras.map((carrera) => ({
    value: carrera.id_carrera,
    label: carrera.nombre ?? `Carrera ${carrera.id_carrera}`,
  })), [carreras])
  const paralelosPorCarrera = useMemo(
    () => buildParalelosPorCarrera(carreras, convocatorias, capacitaciones, paralelos),
    [carreras, convocatorias, capacitaciones, paralelos],
  )

  return (
    <div className="registro-layout">
      <aside className="registro-lista" aria-label="Inscripciones">
        <div className="registro-lista-head">
          <div><h2>Inscripciones</h2><p>{total} registros</p></div>
          <button className="submit-button" type="button" onClick={openNew}>Nuevo</button>
        </div>
        <label className="registro-buscar">Buscar por nombre, CI o paralelo
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar inscripción" />
        </label>
        {listError && <p className="error-message" role="alert">{listError} <button type="button" onClick={reload}>Reintentar</button></p>}
        {listLoading ? <Skeleton lines={5} /> : (
          <div className="registro-tarjetas">
            {rows.length === 0 && !listError && <p className="registro-vacio">No hay inscripciones para mostrar.</p>}
            {rows.map((row) => (
              <button key={row.id_inscripcion} type="button" className={`registro-tarjeta${String(row.id_inscripcion) === selectedId ? " selected" : ""}`}
                aria-pressed={String(row.id_inscripcion) === selectedId} onClick={() => openRecord(row.id_inscripcion)}>
                <span className="registro-tarjeta-numero">Inscripción #{row.id_inscripcion}</span>
                <strong>{nombreCompleto(row) || `Estudiante #${row.id_estudiante}`}</strong>
                <span>CI {row.ci || "—"} · {row.nombre_paralelo || "Sin paralelo"}</span>
                <small>{fechaVisible(row.fecha_insc)}{row.num_credencial != null ? ` · Credencial ${row.num_credencial}` : ""}</small>
              </button>
            ))}
          </div>
        )}
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPageChange={setPage} />
      </aside>

      <section className="registro-panel" ref={panelRef} aria-label="Detalle de inscripción">
        {message && <p className="registro-mensaje" role="status">{message}</p>}
        {selectedId ? (
          <FichaInscripcion key={selectedId} id={selectedId} paralelos={paralelos} administrativos={administrativos}
            onChanged={() => { reload(); setMessage("Cambios guardados.") }} onDeleted={onDeleted} onLoaded={onReportLoaded} />
        ) : creating ? (
          isLoading ? <Skeleton lines={8} /> : <InscripcionRegistroForm key="nueva" carreraOptions={carreraOptions}
            paralelosPorCarrera={paralelosPorCarrera} administrativos={administrativos} apoderados={apoderados}
            syncSearchParams={false} onSaved={onSaved} />
        ) : (
          <div className="registro-panel-vacio"><h2>Selecciona una inscripción</h2><p>Consulta sus datos, actualiza el registro o crea uno nuevo.</p></div>
        )}
      </section>
      <section className="registro-conducta" aria-labelledby="registro-conducta-titulo">
        <div className="registro-conducta-head">
          <div><h2 id="registro-conducta-titulo">Código de conducta</h2><p>Este texto se añade al final del reporte. Puedes editarlo antes de generar o imprimir.</p></div>
          <button className="secondary-button" type="button" onClick={() => setCodigoConducta(CODIGO_CONDUCTA_INICIAL)}>Restablecer texto</button>
        </div>
        <textarea value={codigoConducta} onChange={(event) => setCodigoConducta(event.target.value)} rows={12} aria-label="Texto del código de conducta" />
        <p className="registro-conducta-nota">El texto editado se conserva en este navegador.</p>
        <div className="registro-report-actions">
          <button className="secondary-button" type="button" disabled={!reportRecord} onClick={() => setShowReport(true)}>Generar reporte</button>
          <button className="submit-button" type="button" disabled={!reportRecord} onClick={() => window.print()}>Imprimir reporte</button>
          {!reportRecord && <span>Selecciona una inscripción para generar su reporte.</span>}
        </div>
      </section>
      {reportRecord && <div ref={reportRef} className="registro-reporte-contenedor"><InscripcionReport
        record={{ ...reportRecord, carrera_nombre: carreras.find((item) => String(item.id_carrera) === String(reportRecord.id_carrera))?.nombre
          ?? (reportRecord.id_carrera ? `Carrera #${reportRecord.id_carrera}` : undefined) }}
        codigoConducta={codigoConducta} visible={showReport} /></div>}
    </div>
  )
}
