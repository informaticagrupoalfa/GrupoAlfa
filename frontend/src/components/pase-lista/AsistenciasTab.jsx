import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import Modal from "../ui/Modal"
import Button from "../ui/Button"
import Skeleton from "../ui/Skeleton"
import {
  deleteClase,
  fetchAsistenciasPorClase,
  fetchClasesFiltradas,
} from "../../services/paseListaService"

const STORAGE_KEY = "ga_pase_lista"
const PAGE_SIZE = 10

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

function estadoLabel(presente) {
  if (presente === true) return "Presente"
  if (presente === false) return "Ausente"
  return "Sin marcar"
}

function ListaDetalleModal({ detalle, onClose, onDelete }) {
  const presentes = detalle.lista.filter((e) => e.presente === true).length
  const ausentes = detalle.lista.filter((e) => e.presente === false).length

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <Modal
      title={`Asistencia — ${detalle.curso || "Curso"} (${detalle.fecha || "s/fecha"})`}
      hint={`${detalle.guardadoEn ? `Guardada el ${new Date(detalle.guardadoEn).toLocaleString()}. ` : ""}${presentes} presente(s), ${ausentes} ausente(s).`}
      onClose={onClose}
    >
      <Modal.Body>
        <p className="muted" style={{ marginTop: 0 }}>
          Materia: <strong>{detalle.materia}</strong> · Asesor: <strong>{detalle.asesor}</strong> · Horario: <strong>{detalle.horario || "—"}</strong>
          {" · "}Aula: <strong>{detalle.aula || "—"}</strong> · Tema: <strong>{detalle.tema || "—"}</strong>
        </p>
        {detalle.lista.length === 0 ? (
          <p className="muted">Esta clase no tiene asistencias registradas.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estudiante</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {detalle.lista.map((est, i) => (
                  <tr key={est.id_estudiante ?? i}>
                    <td>{i + 1}</td>
                    <td>{est.nombre}</td>
                    <td>{estadoLabel(est.presente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={onDelete}>
            Eliminar lista
          </Button>
          <Button type="button" onClick={onClose}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal.Body>
    </Modal>
  )
}

const FILTER_TABS = [
  { key: "fecha", label: "Fecha" },
  { key: "curso", label: "Curso" },
  { key: "materia", label: "Materia" },
  { key: "tema", label: "Tema" },
]

export default function AsistenciasTab({ catalogs, version }) {
  const [activeFilters, setActiveFilters] = useState([])
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [idCurso, setIdCurso] = useState("")
  const [idMateria, setIdMateria] = useState("")
  const [idTema, setIdTema] = useState("")
  const [offset, setOffset] = useState(0)
  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(null)
  const [local, setLocal] = useState(null)

  const nombres = useMemo(() => {
    const usersById = new Map((catalogs.usuarios ?? []).map((u) => [String(u.id_usuario ?? u.nro_carnet), u]))
    const userName = (u) => {
      if (!u) return ""
      const full = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ")
      return full || u.nombre_completo || u.correo_electronico || ""
    }
    const materiaById = new Map((catalogs.materias ?? []).map((m) => [String(m.id_materia), m.nombre_materia]))
    const temaById = new Map((catalogs.temas ?? []).map((t) => [String(t.id_tema), t.nombre_tema]))
    const cursoById = new Map((catalogs.capacitaciones ?? []).map((c) => [String(c.id_capacitacion), c]))
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
    const materiasPorCurso = new Map()
    for (const am of catalogs.asignacionesMaterias ?? []) {
      const key = String(am.id_curso_capacitacion)
      if (!materiasPorCurso.has(key)) materiasPorCurso.set(key, [])
      materiasPorCurso.get(key).push(materiaById.get(String(am.id_materia)) ?? `Materia ${am.id_materia}`)
    }
    return { materiaById, temaById, cursoById, asesorById, estudianteById, materiasPorCurso }
  }, [catalogs])

  const toggleFilter = (key) => {
    setActiveFilters((prev) => {
      const has = prev.includes(key)
      if (has) {
        if (key === "fecha") { setDesde(""); setHasta("") }
        if (key === "curso") setIdCurso("")
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

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      setError("")
      setSelected(null)
      try {
        const clases = await fetchClasesFiltradas({
          desde: activeFilters.includes("fecha") ? desde : "",
          hasta: activeFilters.includes("fecha") ? hasta : "",
          idCurso: activeFilters.includes("curso") ? idCurso : "",
          idMateria: activeFilters.includes("materia") ? idMateria : "",
          idTema: activeFilters.includes("tema") ? idTema : "",
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
  }, [activeFilters, desde, hasta, idCurso, idMateria, idTema, offset, version])

  useEffect(() => {
    setLocal(readLocal())
  }, [version])

  const detalleDe = (clase, asistencias) => {
    const curso = nombres.cursoById.get(String(clase.id_curso_capacitacion))
    const materias = nombres.materiasPorCurso.get(String(clase.id_curso_capacitacion)) ?? []
    return {
      fecha: String(clase.inicioClase ?? "").slice(0, 10),
      curso: curso?.nombre ?? `Curso ${clase.id_curso_capacitacion}`,
      materia: materias.length > 0 ? materias.join(", ") : "—",
      asesor: nombres.asesorById.get(String(clase.id_asesor)) ?? "—",
      horario: [curso?.hora_inicio, curso?.hora_fin].filter(Boolean).join(" - "),
      aula: curso?.id_aula != null ? String(curso.id_aula) : "—",
      tema: nombres.temaById.get(String(clase.id_tema)) ?? "—",
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
        curso: local.curso,
        materia: nombres.materiaById.get(String(local.idMateria)) ?? "—",
        asesor: nombres.asesorById.get(String(local.idAsesor)) ?? "—",
        horario: local.horario,
        aula: local.aula,
        tema: local.temaAvanzado,
        guardadoEn: local.guardadoEn,
        lista: local.lista,
      }
    : null

  const localEnPagina = detalleLocal && rows.some((r) => local.id_clase != null && r.clase.id_clase === local.id_clase)

  const handleDeleteBD = async (idClase) => {
    if (!window.confirm("¿Eliminar esta lista de asistencia de la base de datos?")) return
    try {
      await deleteClase(idClase)
      setRows((prev) => prev.filter((r) => r.clase.id_clase !== idClase))
      setSelected(null)
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
    setSelected(null)
  }

  return (
    <section>
      <div className="toggle-group" role="tablist" aria-label="Filtros de asistencias">
        {FILTER_TABS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={activeFilters.includes(f.key)}
            type="button"
            className={activeFilters.includes(f.key) ? "toggle-chip active" : "toggle-chip"}
            onClick={() => toggleFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {activeFilters.length > 0 && (
        <div className="card" style={{ marginTop: 12, display: "grid", gap: 4, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {activeFilters.includes("fecha") && (
            <>
              <div className="form-row">
                <label htmlFor="as-desde">Desde</label>
                <input id="as-desde" type="date" value={desde} onChange={(e) => setFilterValue(setDesde)(e.target.value)} />
              </div>
              <div className="form-row">
                <label htmlFor="as-hasta">Hasta</label>
                <input id="as-hasta" type="date" value={hasta} onChange={(e) => setFilterValue(setHasta)(e.target.value)} />
              </div>
            </>
          )}
          {activeFilters.includes("curso") && (
            <div className="form-row">
              <label htmlFor="as-curso">Curso</label>
              <select id="as-curso" value={idCurso} onChange={(e) => setFilterValue(setIdCurso)(e.target.value)}>
                <option value="">Todos</option>
                {(catalogs.capacitaciones ?? []).map((c) => (
                  <option key={c.id_capacitacion} value={c.id_capacitacion}>{c.nombre}{c.nivel ? ` (${c.nivel})` : ""}</option>
                ))}
              </select>
            </div>
          )}
          {activeFilters.includes("materia") && (
            <div className="form-row">
              <label htmlFor="as-materia">Materia</label>
              <select id="as-materia" value={idMateria} onChange={(e) => setFilterValue(setIdMateria)(e.target.value)}>
                <option value="">Todas</option>
                {(catalogs.materias ?? []).map((m) => (
                  <option key={m.id_materia} value={m.id_materia}>{m.nombre_materia}</option>
                ))}
              </select>
            </div>
          )}
          {activeFilters.includes("tema") && (
            <div className="form-row">
              <label htmlFor="as-tema">Tema avanzado</label>
              <select id="as-tema" value={idTema} onChange={(e) => setFilterValue(setIdTema)(e.target.value)}>
                <option value="">Todos</option>
                {(catalogs.temas ?? []).map((t) => (
                  <option key={t.id_tema} value={t.id_tema}>{t.nombre_tema}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {isLoading ? (
          <Skeleton lines={5} />
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : rows.length === 0 && offset === 0 ? (
          <p className="muted">No hay listas registradas con esos filtros. Ve a la pestaña Tomar clase para registrar la primera.</p>
        ) : rows.length === 0 ? (
          <p className="muted">No hay más resultados.</p>
        ) : (
          <>
            <p className="muted">Haz clic en una fila para ver su contenido.</p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Curso</th>
                    <th>Materia</th>
                    <th>Tema avanzado</th>
                    <th>Presentes</th>
                    <th>Ausentes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ clase, asistencias }) => (
                    <tr key={clase.id_clase} onClick={() => setSelected({ tipo: "bd", detalle: detalleDe(clase, asistencias), id: clase.id_clase })} style={{ cursor: "pointer" }}>
                      <td>{clase.id_clase}</td>
                      <td>{String(clase.inicioclase ?? "No Hay").slice(0, 10)}</td>
                      <td>{nombres.cursoById.get(String(clase.id_curso_capacitacion))?.nombre ?? "—"}</td>
                      <td>{(nombres.materiasPorCurso.get(String(clase.id_curso_capacitacion)) ?? []).join(", ") || "—"}</td>
                      <td>{nombres.temaById.get(String(clase.id_tema)) ?? "—"}</td>
                      <td>{asistencias.filter((a) => a.permiso !== false).length}</td>
                      <td>{asistencias.filter((a) => a.permiso === false).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
                ← Anterior
              </Button>
              <span className="muted">Página {offset / PAGE_SIZE + 1}</span>
              <Button size="sm" variant="secondary" disabled={!hasMore} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
                Siguiente →
              </Button>
            </div>
          </>
        )}
      </div>

      {detalleLocal && !localEnPagina && (
        <div style={{ marginTop: 24 }}>
          <h3>En este dispositivo</h3>
          <p className="muted">Última lista guardada localmente.</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Curso</th>
                  <th>Materia</th>
                  <th>Tema avanzado</th>
                  <th>Presentes</th>
                  <th>Ausentes</th>
                </tr>
              </thead>
              <tbody>
                <tr onClick={() => setSelected({ tipo: "local", detalle: detalleLocal })} style={{ cursor: "pointer" }}>
                  <td>{local?.id_clase ?? "—"}</td>
                  <td>{detalleLocal.fecha || "—"}</td>
                  <td>{detalleLocal.curso || "—"}</td>
                  <td>{detalleLocal.materia}</td>
                  <td>{detalleLocal.tema || "—"}</td>
                  <td>{detalleLocal.lista.filter((e) => e.presente === true).length}</td>
                  <td>{detalleLocal.lista.filter((e) => e.presente === false).length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <ListaDetalleModal
          detalle={selected.detalle}
          onClose={() => setSelected(null)}
          onDelete={() => (selected.tipo === "bd" ? handleDeleteBD(selected.id) : handleDeleteLocal())}
        />
      )}
    </section>
  )
}

AsistenciasTab.propTypes = {
  catalogs: PropTypes.object.isRequired,
  version: PropTypes.number.isRequired,
}