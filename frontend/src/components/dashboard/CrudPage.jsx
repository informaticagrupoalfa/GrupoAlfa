import { Suspense, lazy, useCallback, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { useCrud } from "../../hooks/useCrud"
import DataTable from "./DataTable"
import Button from "../ui/Button"
import Pagination from "../ui/Pagination"
import Skeleton from "../ui/Skeleton"
import ErrorFallback from "../ui/ErrorFallback"
import MateriaMultiSelector from "./MateriaMultiSelector"
import { apiClient } from "../../services/apiClient"

const EntityFormModal = lazy(() => import("./EntityFormModal.jsx"))

const PAGE_SIZE = 25

export default function CrudPage({ entity, defaultParams }) {
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
      setFormError("")
      setMateriasSeleccionadas([])
      setMateriaAsignaciones({})
      setModalOpen(true)
      if (entity.key === "capacitaciones" && row?.[entity.pk] != null) {
        try {
          const { data } = await apiClient.get("/materias-capacitacion", {
            params: { id_curso_capacitacion: row[entity.pk] },
          })
          const rows = Array.isArray(data) ? data : []
          const ids = rows.map((r) => r.id_materia)
          setMateriasSeleccionadas(ids)
          const map = {}
          for (const r of rows) map[r.id_materia] = r.id_asignacion_materia_convocatoria
          setMateriaAsignaciones(map)
        } catch {
          setMateriasSeleccionadas([])
          setMateriaAsignaciones({})
        }
      }
    },
    [entity, setSelected],
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
          if (payload[field.name] === "") delete payload[field.name]
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
                id_curso_capacitacion: savedId,
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
      <DataTable rows={visible} columns={entity.columns} pk={entity.pk} onEdit={openEdit} onDelete={handleDelete} />
      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      {modalOpen && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <EntityFormModal
            entity={entity}
            initial={selected}
            saving={saving}
            formError={formError}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            extra={extraComponent}
          />
        </Suspense>
      )}
    </section>
  )
}

CrudPage.propTypes = {
  entity: PropTypes.object.isRequired,
  defaultParams: PropTypes.object,
}
