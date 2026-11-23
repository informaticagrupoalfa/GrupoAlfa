import { Suspense, lazy, useCallback, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { useCrud } from "../../hooks/useCrud"
import Button from "../ui/Button"
import Pagination from "../ui/Pagination"
import Skeleton from "../ui/Skeleton"
import ErrorFallback from "../ui/ErrorFallback"
import MateriaMultiSelector from "./MateriaMultiSelector"
import { apiClient } from "../../services/apiClient"

const EntityFormModal = lazy(() => import("./EntityFormModal.jsx"))

const PAGE_SIZE = 25

export default function CrudPanel({ entity, defaultParams, onRecordSelect }) {
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity, defaultParams)
  const [search, setSearch] = useState("")
  const [filterMateria, setFilterMateria] = useState("")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [materiasSeleccionadas, setMateriasSeleccionadas] = useState([])
  const [materiaAsignaciones, setMateriaAsignaciones] = useState({})

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((row) => {
      if (entity.key === "temas" && filterMateria && String(row.id_materia ?? "") !== filterMateria) {
        return false
      }
      if (!term) return true
      return entity.columns.some((col) =>
        String(row[col.key] ?? "").toLowerCase().includes(term),
      )
    })
  }, [items, search, filterMateria, entity])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const visible = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const openCreate = useCallback(() => {
    setSelected(null)
    setFormError("")
    setMateriasSeleccionadas([])
    setMateriaAsignaciones({})
    setModalOpen(true)
  }, [setSelected])

  const openEdit = useCallback(
    async (row) => {
      setSelected(row)
      onRecordSelect?.(row)
      setFormError("")
      setMateriasSeleccionadas([])
      setMateriaAsignaciones({})
      setModalOpen(true)
      if (entity.key === "capacitaciones" && row?.[entity.pk] != null) {
        try {
          const { data } = await apiClient.get("/materias-capacitacion", {
            params: { id_capacitacion: row[entity.pk] },
          })
          const rows = Array.isArray(data) ? data : []
          const ids = rows.map((r) => r.id_materia)
          setMateriasSeleccionadas(ids)
          const map = {}
          for (const r of rows) map[r.id_materia] = r.id_asignacion_materia
          setMateriaAsignaciones(map)
        } catch {
          setMateriasSeleccionadas([])
          setMateriaAsignaciones({})
        }
      }
    },
    [entity, onRecordSelect, setSelected],
  )

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("¿Eliminar este registro?")) return
      try {
        await remove(id)
      } catch (err) {
        alert(err.userMessage ?? "No se pudo eliminar.")
      }
    },
    [remove],
  )

  const handleSubmit = useCallback(
    async (values) => {
      setSaving(true)
      setFormError("")
      try {
        const payload = { ...values }
        for (const field of entity.fields) {
          if (field.type === "number" || field.type === "select") {
            payload[field.name] =
              payload[field.name] === "" || payload[field.name] == null
                ? field.required ? Number(payload[field.name]) : undefined
                : Number(payload[field.name])
            if (payload[field.name] === undefined) delete payload[field.name]
          }
          if (payload[field.name] === "" && !field.allowEmpty) delete payload[field.name]
        }
        const saved = await save(payload)
        if (entity.key === "capacitaciones") {
          const savedId = saved.id_capacitacion
          const seleccionadas = new Set(Array.isArray(materiasSeleccionadas) ? materiasSeleccionadas : [])
          for (const [idMateria, idAsignacion] of Object.entries(materiaAsignaciones)) {
            if (!seleccionadas.has(Number(idMateria))) {
              await apiClient.delete(`/materias-capacitacion/${idAsignacion}`)
            }
          }
          for (const idMateria of materiasSeleccionadas) {
            if (!(idMateria in materiaAsignaciones)) {
              await apiClient.post("/materias-capacitacion", {
                id_materia: idMateria,
                id_capacitacion: savedId,
              })
            }
          }
        }
        setModalOpen(false)
        setSelected(null)
        setMateriasSeleccionadas([])
        await reload(entity.key === "temas" && filterMateria ? { id_materia: filterMateria } : undefined)
      } catch (err) {
        setFormError(err.userMessage ?? "No se pudo guardar.")
      } finally {
        setSaving(false)
      }
    },
    [entity, materiasSeleccionadas, materiaAsignaciones, reload, filterMateria, setSelected, save],
  )

  const applyFilter = () => {
    setPage(1)
    reload(entity.key === "temas" && filterMateria ? { id_materia: filterMateria } : undefined)
  }

  const extraComponent =
    entity.key === "capacitaciones" ? (
      <MateriaMultiSelector
        value={materiasSeleccionadas}
        onChange={setMateriasSeleccionadas}
      />
    ) : null

  if (isLoading) return <Skeleton lines={6} />
  if (error) {
    return <ErrorFallback message={error} onRetry={() => reload()} />
  }

  return (
    <section>
      <div className="crud-toolbar">
        <input
          type="search"
          placeholder={`Buscar en ${entity.label}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          aria-label="Buscar"
        />
        {entity.filterable && (
          <>
            <input
              type="number"
              placeholder="ID materia"
              value={filterMateria}
              onChange={(e) => {
                setFilterMateria(e.target.value)
                setPage(1)
              }}
              aria-label="Filtrar por materia"
            />
            <Button variant="secondary" size="sm" onClick={applyFilter}>
              Filtrar
            </Button>
          </>
        )}
        <Button size="sm" onClick={openCreate}>
          Nuevo
        </Button>
      </div>
      <p className="muted">
        {filtered.length} registro(s)
      </p>
      <div className="crud-card-workspace">
        <div className="crud-form-column">
          {modalOpen ? (
            <Suspense fallback={<Skeleton lines={4} />}>
              <EntityFormModal entity={entity} initial={selected} saving={saving} formError={formError}
                onClose={() => { setModalOpen(false); setSelected(null) }} onSubmit={handleSubmit} extra={extraComponent} inline />
            </Suspense>
          ) : <div className="crud-form-prompt"><span>✦</span><h2>Selecciona un registro</h2><p>Elige una tarjeta para modificarla o crea un nuevo registro desde aquí.</p><Button onClick={openCreate}>＋ Nuevo {entity.label.slice(0, -1).toLowerCase()}</Button></div>}
        </div>
        <div className="crud-cards-column">
          <div className="crud-cards-heading"><div><h2>{entity.label}</h2><p className="muted">{filtered.length} registro(s)</p></div><Button size="sm" onClick={openCreate}>＋ Nuevo</Button></div>
          {visible.length ? <div className="crud-record-cards">{visible.map(row => {
            const id = row[entity.pk]
            const titleCol = entity.columns.find(c => ![entity.pk].includes(c.key))
            const title = row[titleCol?.key] ?? `${entity.label.slice(0, -1)} ${id}`
            return <article key={id} className={`crud-record-card ${selected?.[entity.pk] === id ? "is-selected" : ""}`}>
              <button type="button" className="crud-record-select" onClick={() => openEdit(row)}><span className="crud-record-title">{title}</span><span className="crud-record-id">#{id}</span>
                <span className="crud-record-details">{entity.columns.filter(c => c.key !== entity.pk && c.key !== titleCol?.key).slice(0, 4).map(c => <span key={c.key}><small>{c.label}</small>{String(row[c.key] ?? "—")}</span>)}</span>
              </button><div className="crud-record-actions"><Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Editar</Button><Button size="sm" variant="secondary" onClick={() => handleDelete(id)}>Eliminar</Button></div>
            </article>
          })}</div> : <div className="crud-form-prompt"><p>No hay registros que coincidan con la búsqueda.</p></div>}
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
      <style>{`.crud-card-workspace{display:grid;grid-template-columns:minmax(300px,390px) minmax(0,1fr);gap:18px;align-items:start}.crud-form-column{position:sticky;top:16px}.crud-inline-form,.crud-form-prompt,.crud-cards-column{background:#fff;border:1px solid #dbe3ed;border-radius:16px;padding:18px}.crud-inline-form h2,.crud-cards-heading h2{margin:0 0 8px;font-size:20px}.crud-inline-form form{display:grid;gap:12px}.crud-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}.crud-form-prompt{min-height:250px;display:grid;align-content:center;justify-items:start;gap:10px;color:#24415f}.crud-form-prompt>span{font-size:30px;color:#4f7cac}.crud-cards-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.crud-cards-heading p{margin:0}.crud-record-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.crud-record-card{border:1px solid #dbe3ed;border-radius:13px;padding:12px;background:#fbfdff;transition:border-color .15s,box-shadow .15s}.crud-record-card.is-selected{border-color:#3478c6;box-shadow:0 0 0 2px #d8eaff}.crud-record-select{display:grid;width:100%;border:0;background:none;text-align:left;cursor:pointer;padding:0;gap:8px}.crud-record-title{font-weight:700;font-size:16px;color:#173956}.crud-record-id{color:#718096;font-size:12px}.crud-record-details{display:grid;gap:5px;color:#334e68}.crud-record-details>span{display:grid;font-size:13px}.crud-record-details small{color:#8292a6}.crud-record-actions{display:flex;gap:7px;justify-content:flex-end;margin-top:12px}@media(max-width:900px){.crud-card-workspace{grid-template-columns:1fr}.crud-form-column{position:static;grid-row:1}}`}</style>
    </section>
  )
}

CrudPanel.propTypes = {
  entity: PropTypes.object.isRequired,
  defaultParams: PropTypes.object,
  onRecordSelect: PropTypes.func,
}
