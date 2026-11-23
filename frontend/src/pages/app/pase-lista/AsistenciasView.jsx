import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import Button from "../../../components/ui/Button"
import Skeleton from "../../../components/ui/Skeleton"
import { useAuth } from "../../../hooks/useAuth"
import {
  deleteClase,
  fetchAsistenciasPorClase,
  fetchClasesFiltradas,
  updateAsistencia,
  updateClase,
} from "../../../services/paseListaService"
import "./AsistenciasView.css"

const TomarClaseView = lazy(() => import("./TomarClaseView.jsx"))

const STORAGE_KEY = "ga_pase_lista"
const PAGE_SIZE = 10
const todayInLaPaz = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date())

function readLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    if (Array.isArray(raw)) return raw[raw.length - 1] ?? null
    if (raw && Array.isArray(raw.lista)) return raw
    return null
  } catch {
    return null
  }
}

const FILTER_TABS = [
  { key: "fecha", label: "Fecha" },
  { key: "paralelo", label: "Paralelo" },
  { key: "materia", label: "Materia" },
  { key: "tema", label: "Tema" },
]

const calendarTitle = new Intl.DateTimeFormat("es-BO", { month: "long", year: "numeric" })
const calendarDate = new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "long", year: "numeric" })
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function readableDate(value) {
  const [year, month, day] = value.split("-").map(Number)
  return calendarDate.format(new Date(year, month - 1, day))
}

function DateRangeCalendar({ desde, hasta, awaitingEnd, onSelect, onClear }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const leadingDays = (visibleMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const selection = !desde
    ? "Selecciona una fecha. Puedes elegir una segunda para formar un rango."
    : desde === hasta
      ? `${readableDate(desde)}. ${awaitingEnd ? "Selecciona otra fecha para ampliar el rango." : ""}`
      : `${readableDate(desde)} al ${readableDate(hasta)}`

  const changeMonth = (step) => {
    setVisibleMonth(new Date(year, month + step, 1))
  }

  return (
    <div className="asistencias-calendar" aria-label="Calendario de fechas">
      <div className="asistencias-calendar-heading">
        <button type="button" aria-label="Mes anterior" onClick={() => changeMonth(-1)}>‹</button>
        <strong>{calendarTitle.format(visibleMonth)}</strong>
        <button type="button" aria-label="Mes siguiente" onClick={() => changeMonth(1)}>›</button>
      </div>
      <div className="asistencias-calendar-grid">
        {WEEKDAYS.map((day, index) => <span className="asistencias-calendar-weekday" key={index}>{day}</span>)}
        {Array.from({ length: leadingDays }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const value = dateKey(year, month, day)
          const isEndpoint = value === desde || value === hasta
          const inRange = Boolean(desde && hasta && value > desde && value < hasta)
          return (
            <button
              key={value}
              type="button"
              className={["asistencias-calendar-day", isEndpoint && "is-selected", inRange && "is-in-range", value === todayKey && "is-today"].filter(Boolean).join(" ")}
              aria-label={readableDate(value)}
              aria-pressed={isEndpoint}
              onClick={() => onSelect(value)}
            >
              {day}
            </button>
          )
        })}
      </div>
      <div className="asistencias-calendar-footer">
        <span role="status" aria-live="polite">{selection}</span>
        {desde && <button type="button" onClick={onClear}>Limpiar</button>}
      </div>
    </div>
  )
}

DateRangeCalendar.propTypes = {
  desde: PropTypes.string.isRequired,
  hasta: PropTypes.string.isRequired,
  awaitingEnd: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
}

export default function AsistenciasView({ catalogs, version, onSaved }) {
  const { activeRole } = useAuth()
  const isAdministracion = activeRole === "Administración"
  const [activeFilters, setActiveFilters] = useState([])
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [awaitingRangeEnd, setAwaitingRangeEnd] = useState(false)
  const [idParalelo, setIdParalelo] = useState("")
  const [idMateria, setIdMateria] = useState("")
  const [idTema, setIdTema] = useState("")
  const [offset, setOffset] = useState(0)
  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(null)
  const [local, setLocal] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorNotice, setEditorNotice] = useState("")

  const nombres = useMemo(() => {
    const usersById = new Map((catalogs.usuarios ?? []).map((u) => [String(u.id_usuario ?? u.nro_carnet), u]))
    const userName = (u) => {
      if (!u) return ""
      const full = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ")
      return full || u.nombre_completo || u.correo_electronico || ""
    }
    const materiaById = new Map((catalogs.materias ?? []).map((m) => [String(m.id_materia), m.nombre_materia]))
    const capacitacionById = new Map((catalogs.capacitaciones ?? []).map((c) => [String(c.id_capacitacion), c]))
    const paraleloById = new Map((catalogs.paralelos ?? []).map((p) => [String(p.id_paralelo), p]))
    const paraleloByAsignacion = new Map()
    for (const asignacion of catalogs.asignacionesDocentes ?? []) {
      for (const id of asignacion.ids_asignacion ?? []) {
        paraleloByAsignacion.set(String(id), asignacion.id_paralelo)
      }
    }
    const aulaById = new Map((catalogs.aulas ?? []).map((a) => [String(a.id_aula), a.codigo ?? `Aula ${a.id_aula}`]))
    const asesorById = new Map(
      (catalogs.asesores ?? []).map((a) => [
        String(a.id_asesor),
        a.nombre_completo ?? userName(usersById.get(String(a.id_usuario))) ?? `Asesor ${a.id_asesor}`,
      ]),
    )
    const estudianteById = new Map(
      (catalogs.estudiantes ?? []).map((e) => [
        String(e.id_estudiante),
        userName(usersById.get(String(e.id_usuario))) || `Estudiante ${e.id_estudiante}`,
      ]),
    )
    const materiasPorCapacitacion = new Map()
    for (const mc of catalogs.materiasCapacitacion ?? []) {
      const key = String(mc.id_capacitacion)
      if (!materiasPorCapacitacion.has(key)) materiasPorCapacitacion.set(key, [])
      materiasPorCapacitacion.get(key).push(materiaById.get(String(mc.id_materia)) ?? `Materia ${mc.id_materia}`)
    }
    const materiasPorParalelo = new Map()
    for (const p of catalogs.paralelos ?? []) {
      materiasPorParalelo.set(
        String(p.id_paralelo),
        materiasPorCapacitacion.get(String(p.id_capacitacion)) ?? [],
      )
    }
    return {
      materiaById,
      capacitacionById,
      paraleloById,
      paraleloByAsignacion,
      aulaById,
      asesorById,
      estudianteById,
      materiasPorParalelo,
    }
  }, [catalogs])

  const toggleFilter = (key) => {
    setActiveFilters((prev) => {
      const has = prev.includes(key)
      if (has) {
        if (key === "fecha") { setDesde(""); setHasta(""); setAwaitingRangeEnd(false) }
        if (key === "paralelo") setIdParalelo("")
        if (key === "materia") setIdMateria("")
        if (key === "tema") setIdTema("")
      }
      return has ? prev.filter((k) => k !== key) : [...prev, key]
    })
    setOffset(0)
  }

  const setFilterValue = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const selectCalendarDate = (value) => {
    if (!awaitingRangeEnd || !desde) {
      setDesde(value)
      setHasta(value)
      setAwaitingRangeEnd(true)
    } else {
      setDesde(value < desde ? value : desde)
      setHasta(value > desde ? value : desde)
      setAwaitingRangeEnd(false)
    }
    setOffset(0)
  }

  const clearCalendarDate = () => {
    setDesde("")
    setHasta("")
    setAwaitingRangeEnd(false)
    setOffset(0)
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      setError("")
      try {
        const clases = await fetchClasesFiltradas({
          desde: activeFilters.includes("fecha") ? desde : "",
          hasta: activeFilters.includes("fecha") ? hasta : "",
          idParalelo: activeFilters.includes("paralelo") ? idParalelo : "",
          idMateria: activeFilters.includes("materia") ? idMateria : "",
          tema: activeFilters.includes("tema") ? idTema.trim() : "",
          limit: PAGE_SIZE + 1,
          offset,
        })
        const page = clases.slice(0, PAGE_SIZE)
        const withLists = await Promise.all(
          page.map(async (c) => ({ clase: c, asistencias: await fetchAsistenciasPorClase(c.id_clase) })),
        )
        if (mounted) {
          setRows(withLists)
          setHasMore(clases.length > PAGE_SIZE)
        }
      } catch (err) {
        if (mounted) setError(err?.userMessage ?? err?.response?.data?.message ?? "No se pudieron cargar las asistencias.")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [activeFilters, desde, hasta, idParalelo, idMateria, idTema, offset, version])

  useEffect(() => {
    setLocal(readLocal())
  }, [version])

  const paraleloIdDeClase = (clase) => clase.id_paralelo ?? nombres.paraleloByAsignacion.get(String(clase.id_asesor_paralelo_materia))

  const detalleDe = (clase, asistencias) => {
    const paraleloId = paraleloIdDeClase(clase)
    const paralelo = nombres.paraleloById.get(String(paraleloId))
    const materias = nombres.materiasPorParalelo.get(String(paraleloId)) ?? []
    return {
      fecha: String(clase.inicioclase ?? "").slice(0, 10),
      curso: paralelo?.nombre_paralelo ?? (paraleloId != null ? `Paralelo ${paraleloId}` : "Paralelo sin definir"),
      materia: clase.materia || (materias.length > 0 ? materias.join(", ") : "—"),
      asesor: clase.asesor || nombres.asesorById.get(String(clase.id_asesor)) || "—",
      horario: [paralelo?.hora_inicio, paralelo?.hora_fin].filter(Boolean).join(" - "),
      aula: clase.aula || (paralelo?.id_aula != null
        ? nombres.aulaById.get(String(paralelo.id_aula)) ?? String(paralelo.id_aula)
        : "—"),
      tema: clase.tema || "—",
      guardadoEn: null,
      lista: asistencias.map((a) => ({
        id_estudiante: a.id_estudiante,
        nombre: nombres.estudianteById.get(String(a.id_estudiante)) ?? `Estudiante ${a.id_estudiante}`,
        presente: a.permiso === false ? false : true,
      })),
    }
  }

  const detalleLocal = local
    ? {
        fecha: local.fecha,
        curso: local.curso ?? local.paralelo,
        materia: nombres.materiaById.get(String(local.idMateria)) ?? "—",
        asesor: nombres.asesorById.get(String(local.idAsesor)) ?? "—",
        horario: local.horario,
        aula: local.aula != null
          ? nombres.aulaById.get(String(local.aula)) ?? String(local.aula)
          : "—",
        tema: local.temaAvanzado,
        guardadoEn: local.guardadoEn,
        lista: local.lista,
      }
    : null

  const localEnPagina = detalleLocal && rows.some((r) => local.id_clase != null && String(r.clase.id_clase) === String(local.id_clase))
  const localMatchesFilters = detalleLocal && (
    (!activeFilters.includes("fecha") || !desde || (detalleLocal.fecha >= desde && detalleLocal.fecha <= hasta)) &&
    (!activeFilters.includes("paralelo") || !idParalelo || String(local.idParalelo) === String(idParalelo)) &&
    (!activeFilters.includes("materia") || !idMateria || String(local.idMateria) === String(idMateria)) &&
    (!activeFilters.includes("tema") || !idTema.trim() || detalleLocal.tema?.trim().toLowerCase() === idTema.trim().toLowerCase())
  )

  const groupsByCapacitacion = new Map()
  const addToGroup = (tipo, row) => {
    const paraleloId = tipo === "local" ? local.idParalelo : paraleloIdDeClase(row.clase)
    const paralelo = nombres.paraleloById.get(String(paraleloId))
    const capacitacionId = paralelo?.id_capacitacion
    const capacitacion = nombres.capacitacionById.get(String(capacitacionId))
    const key = capacitacionId == null ? "sin-capacitacion" : String(capacitacionId)
    if (!groupsByCapacitacion.has(key)) {
      groupsByCapacitacion.set(key, {
        key,
        facultad: capacitacion?.nombre_facultad || "Facultad sin definir",
        capacitacion: capacitacionId == null
          ? "Sin capacitación asignada"
          : `Capacitación ${capacitacionId}${capacitacion?.fecha_inicio ? ` · Inicio ${String(capacitacion.fecha_inicio).slice(0, 10)}` : ""}`,
        items: [],
      })
    }
    groupsByCapacitacion.get(key).items.push({ tipo, row })
  }
  rows.forEach((row) => addToGroup("bd", row))
  if (localMatchesFilters && !localEnPagina) addToGroup("local", local)
  const groupedLists = [...groupsByCapacitacion.values()]

  const clearMatchingLocal = (idClase) => {
    if (!local || String(local.id_clase) !== String(idClase)) return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // La lista en BD ya se modificó; se oculta la copia local obsoleta.
    }
    setLocal(null)
  }

  const selectedRow = selected?.tipo === "bd"
    ? rows.find((row) => String(row.clase.id_clase) === String(selected.id))
    : null
  const canEditSelected = Boolean(
    selectedRow && String(selectedRow.clase.inicioclase ?? "").slice(0, 10) === todayInLaPaz(),
  )

  const selectRow = (row) => {
    setSelected({ tipo: "bd", id: row.clase.id_clase })
    const asesorPorNombre = (catalogs.asesores ?? []).find(
      (a) => row.clase.asesor && nombres.asesorById.get(String(a.id_asesor)) === row.clase.asesor,
    )
    setDraft({
      fecha: String(row.clase.inicioclase ?? "").slice(0, 10),
      tema: row.clase.tema ?? "",
      idAsesor: String(row.clase.id_asesor ?? asesorPorNombre?.id_asesor ?? ""),
      estados: Object.fromEntries(row.asistencias.map((a) => [a.id_asistencia, a.permiso !== false])),
    })
    setEditorError("")
    setEditorNotice("")
  }

  const selectLocal = () => {
    setSelected({ tipo: "local" })
    setDraft(null)
    setEditorError("")
    setEditorNotice("")
  }

  const startCreate = () => {
    setSelected(null)
    setDraft(null)
    setEditorError("")
    setEditorNotice("")
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!selectedRow || !draft || saving) return
    if (!draft.fecha || (!isAdministracion && (!draft.tema.trim() || !draft.idAsesor))) {
      setEditorError(isAdministracion ? "Completa la fecha." : "Completa la fecha, el tema y el asesor.")
      return
    }
    setSaving(true)
    setEditorError("")
    setEditorNotice("")
    try {
      await updateClase(selectedRow.clase.id_clase, {
        inicioclase: draft.fecha,
        tema: draft.tema.trim(),
        ...(draft.idAsesor ? { id_asesor: Number(draft.idAsesor) } : {}),
      })
      const changed = selectedRow.asistencias.filter((a) => draft.estados[a.id_asistencia] !== (a.permiso !== false))
      const updates = await Promise.allSettled(changed.map((a) =>
        updateAsistencia(a.id_asistencia, { permiso: draft.estados[a.id_asistencia] }),
      ))
      const failed = updates.filter((result) => result.status === "rejected").length
      clearMatchingLocal(selectedRow.clase.id_clase)
      onSaved()
      if (failed) {
        setEditorError(`La clase se actualizó, pero ${failed} asistencia(s) no se guardaron. Revisa los estados e intenta de nuevo.`)
      } else {
        setEditorNotice("Cambios guardados.")
      }
    } catch (err) {
      setEditorError(err?.userMessage ?? err?.response?.data?.error ?? "No se pudieron guardar los cambios.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBD = async (idClase) => {
    if (!window.confirm("¿Eliminar esta lista de asistencia de la base de datos?")) return
    try {
      await deleteClase(idClase)
      setRows((prev) => prev.filter((r) => r.clase.id_clase !== idClase))
      clearMatchingLocal(idClase)
      startCreate()
      onSaved()
    } catch (err) {
      alert(err?.response?.data?.error ?? err?.userMessage ?? "No se pudo eliminar.")
    }
  }

  const handleDeleteLocal = () => {
    if (!window.confirm("¿Eliminar la lista guardada en este dispositivo?")) return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // sin storage: igual se limpia la vista
    }
    setLocal(null)
    startCreate()
  }

  return (
    <section className="asistencias-layout">
      <div className="asistencias-list-panel">
        <div className="asistencias-panel-head">
          <div><h2>Listas de asistencia</h2><p className="muted">Filtra y selecciona una lista para gestionarla.</p></div>
          <Button size="sm" onClick={startCreate}>Nueva lista</Button>
        </div>
        <div className="asistencias-filters">
          <div className="toggle-group" aria-label="Filtros de asistencias">
            {FILTER_TABS.map((f) => (
              <button key={f.key} type="button" aria-pressed={activeFilters.includes(f.key)}
                className={activeFilters.includes(f.key) ? "toggle-chip active" : "toggle-chip"}
                onClick={() => toggleFilter(f.key)}>{f.label}</button>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <div className="asistencias-filter-fields">
              {activeFilters.includes("fecha") && (
                <DateRangeCalendar
                  desde={desde}
                  hasta={hasta}
                  awaitingEnd={awaitingRangeEnd}
                  onSelect={selectCalendarDate}
                  onClear={clearCalendarDate}
                />
              )}
              {activeFilters.includes("paralelo") && (
                <div className="form-row"><label htmlFor="as-paralelo">Paralelo</label>
                  <select id="as-paralelo" value={idParalelo} onChange={(e) => setFilterValue(setIdParalelo)(e.target.value)}>
                    <option value="">Todos</option>
                    {(catalogs.paralelos ?? []).map((p) => <option key={p.id_paralelo} value={p.id_paralelo}>{p.nombre_paralelo}{p.nivel ? " (" + p.nivel + ")" : ""}</option>)}
                  </select>
                </div>
              )}
              {activeFilters.includes("materia") && (
                <div className="form-row"><label htmlFor="as-materia">Materia</label>
                  <select id="as-materia" value={idMateria} onChange={(e) => setFilterValue(setIdMateria)(e.target.value)}>
                    <option value="">Todas</option>
                    {(catalogs.materias ?? []).map((m) => <option key={m.id_materia} value={m.id_materia}>{m.nombre_materia}</option>)}
                  </select>
                </div>
              )}
              {activeFilters.includes("tema") && (
                <div className="form-row"><label htmlFor="as-tema">Tema avanzado</label>
                  <input id="as-tema" type="search" value={idTema} onChange={(e) => setFilterValue(setIdTema)(e.target.value)} placeholder="Buscar tema" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="asistencias-cards" aria-label="Listas registradas">
          {isLoading ? <Skeleton lines={5} /> : error ? <p className="error-message">{error}</p> : groupedLists.length === 0 ? (
            <p className="asistencias-empty">{offset === 0 ? "No hay listas con estos filtros. Puedes crear una en el panel derecho." : "No hay más resultados."}</p>
          ) : groupedLists.map((group) => (
            <section className="asistencias-group" key={group.key} aria-label={group.facultad + ", " + group.capacitacion}>
              <div className="asistencias-group-heading">
                <h3>{group.facultad}</h3>
                <span>{group.items.length} {group.items.length === 1 ? "lista" : "listas"} en esta página</span>
              </div>
              <p className="asistencias-group-caption">{group.capacitacion}</p>
              <div className="asistencias-group-items">
                {group.items.map(({ tipo, row }) => {
                  const detalle = tipo === "local" ? detalleLocal : detalleDe(row.clase, row.asistencias)
                  const isSelected = tipo === "local"
                    ? selected?.tipo === "local"
                    : selected?.tipo === "bd" && String(selected.id) === String(row.clase.id_clase)
                  const presentes = tipo === "local"
                    ? detalle.lista.filter((est) => est.presente === true).length
                    : row.asistencias.filter((asistencia) => asistencia.permiso !== false).length
                  const ausentes = tipo === "local"
                    ? detalle.lista.filter((est) => est.presente === false).length
                    : row.asistencias.filter((asistencia) => asistencia.permiso === false).length
                  return (
                    <button
                      key={tipo === "local" ? "local" : row.clase.id_clase}
                      type="button"
                      aria-pressed={isSelected}
                      className={["asistencias-card", tipo === "local" && "asistencias-card-local", isSelected && "is-selected"].filter(Boolean).join(" ")}
                      onClick={() => tipo === "local" ? selectLocal() : selectRow(row)}
                    >
                      <span className="asistencias-card-top"><strong>{detalle.curso || "Lista local"}</strong><time dateTime={detalle.fecha}>{detalle.fecha || "Sin fecha"}</time></span>
                      <span className="asistencias-card-tema">{detalle.tema || "Sin tema"}</span>
                      <span className="asistencias-card-meta">{tipo === "local" ? "Guardada en este dispositivo" : `${detalle.materia} · ${detalle.asesor}`}</span>
                      <span className="asistencias-card-counts"><span>{presentes} presentes</span><span>{ausentes} ausentes</span></span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="asistencias-pagination">
          <Button size="sm" variant="secondary" disabled={offset === 0 || isLoading} onClick={() => { setOffset((o) => Math.max(0, o - PAGE_SIZE)); startCreate() }}>← Anterior</Button>
          <span className="muted">Página {offset / PAGE_SIZE + 1}</span>
          <Button size="sm" variant="secondary" disabled={!hasMore || isLoading} onClick={() => { setOffset((o) => o + PAGE_SIZE); startCreate() }}>Siguiente →</Button>
        </div>
      </div>

      <div className="asistencias-editor-panel">
        {selected?.tipo === "local" && localMatchesFilters && !localEnPagina ? (
          <>
            <div className="asistencias-panel-head"><div><h2>Lista local</h2><p className="muted">Copia guardada en este dispositivo.</p></div></div>
            <p className="asistencias-editor-summary">{detalleLocal.curso} · {detalleLocal.fecha} · {detalleLocal.tema}</p>
            <div className="asistencias-roster">
              {detalleLocal.lista.map((est, index) => (
                <div className="asistencias-student" key={est.id_estudiante ?? index}>
                  <span>{est.nombre}</span><strong>{est.presente === true ? "Presente" : est.presente === false ? "Ausente" : "Sin marcar"}</strong>
                </div>
              ))}
            </div>
            <div className="asistencias-editor-actions"><Button variant="secondary" onClick={handleDeleteLocal}>Eliminar copia local</Button></div>
          </>
        ) : selectedRow && draft ? (
          <>
            <div className="asistencias-panel-head">
              <div><h2>{canEditSelected ? "Editar lista" : "Detalle de lista"}</h2><p className="muted">{detalleDe(selectedRow.clase, selectedRow.asistencias).curso} · Lista #{selectedRow.clase.id_clase}</p></div>
              <Button size="sm" variant="secondary" onClick={startCreate}>Nueva lista</Button>
            </div>
            <form className="asistencias-editor-form" onSubmit={handleUpdate}>
              <div className="asistencias-form-grid">
                <div className="form-row"><label htmlFor="as-edit-fecha">Fecha</label>
                  <input id="as-edit-fecha" type="date" value={draft.fecha} readOnly required />
                </div>
                <div className="form-row"><label htmlFor="as-edit-asesor">Asesor</label>
                  <select id="as-edit-asesor" value={draft.idAsesor} onChange={(e) => setDraft((prev) => ({ ...prev, idAsesor: e.target.value }))} required={!isAdministracion} disabled={!canEditSelected}>
                    <option value="" disabled={Boolean(selectedRow.clase.id_asesor)}>{isAdministracion ? "Sin asesor" : "Selecciona un asesor"}</option>
                    {(catalogs.asesores ?? []).map((a) => <option key={a.id_asesor} value={a.id_asesor}>{nombres.asesorById.get(String(a.id_asesor))}</option>)}
                  </select>
                </div>
                <div className="form-row asistencias-form-wide"><label htmlFor="as-edit-tema">Tema avanzado</label>
                  <input id="as-edit-tema" type="text" maxLength={100} value={draft.tema} onChange={(e) => setDraft((prev) => ({ ...prev, tema: e.target.value }))} required={!isAdministracion} disabled={!canEditSelected} />
                </div>
              </div>
              <div className="asistencias-roster-head"><h3>Estudiantes</h3><p className="muted">Actualiza las marcas de esta lista.</p></div>
              {selectedRow.asistencias.length === 0 ? <p className="muted">Esta clase no tiene asistencias registradas.</p> : (
                <div className="asistencias-roster">
                  {selectedRow.asistencias.map((a) => {
                    const nombre = nombres.estudianteById.get(String(a.id_estudiante)) ?? "Estudiante " + a.id_estudiante
                    return (
                      <div className="asistencias-student" key={a.id_asistencia}>
                        <span>{nombre}</span>
                        <div className="asistencias-status-options" role="group" aria-label={"Asistencia de " + nombre}>
                          <button type="button" disabled={!canEditSelected} className={draft.estados[a.id_asistencia] === true ? "is-present" : ""} aria-pressed={draft.estados[a.id_asistencia] === true} onClick={() => setDraft((prev) => ({ ...prev, estados: { ...prev.estados, [a.id_asistencia]: true } }))}>Presente</button>
                          <button type="button" disabled={!canEditSelected} className={draft.estados[a.id_asistencia] === false ? "is-absent" : ""} aria-pressed={draft.estados[a.id_asistencia] === false} onClick={() => setDraft((prev) => ({ ...prev, estados: { ...prev.estados, [a.id_asistencia]: false } }))}>Ausente</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {editorError && <p className="error-message" role="alert">{editorError}</p>}
              {editorNotice && <p className="asistencias-notice" role="status">{editorNotice}</p>}
              {!canEditSelected && <p className="asistencias-notice" role="status">Esta clase está cerrada. Solo puede modificarse el mismo día en que fue creada.</p>}
              <div className="asistencias-editor-actions">
                <Button type="submit" disabled={saving || !canEditSelected}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
                <Button type="button" variant="secondary" disabled={saving || !canEditSelected} onClick={() => handleDeleteBD(selectedRow.clase.id_clase)}>Eliminar lista</Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="asistencias-panel-head"><div><h2>Nueva lista</h2><p className="muted">Registra una clase y marca a sus estudiantes.</p></div></div>
            <Suspense fallback={<Skeleton lines={6} />}>
              <TomarClaseView catalogs={catalogs} onSaved={onSaved} />
            </Suspense>
          </>
        )}
      </div>
    </section>
  )
}

AsistenciasView.propTypes = {
  catalogs: PropTypes.object.isRequired,
  version: PropTypes.number.isRequired,
  onSaved: PropTypes.func.isRequired,
}
