import { Suspense, lazy, useCallback, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { useCrud } from "../../hooks/useCrud"
import DataTable from "./DataTable"
import Button from "../ui/Button"
import Pagination from "../ui/Pagination"
import Skeleton from "../ui/Skeleton"
import ErrorFallback from "../ui/ErrorFallback"

const EntityFormModal = lazy(() => import("./EntityFormModal.jsx"))

const PAGE_SIZE = 25

export default function CrudPage({ entity }) {
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity)
  const [search, setSearch] = useState("")
  const [filterMateria, setFilterMateria] = useState("")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

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
    setModalOpen(true)
  }, [setSelected])

  const openEdit = useCallback(
    (row) => {
      setSelected(row)
      setFormError("")
      setModalOpen(true)
    },
    [setSelected],
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
        await save(payload)
        setModalOpen(false)
        setSelected(null)
        await reload(entity.key === "temas" && filterMateria ? { id_materia: filterMateria } : undefined)
      } catch (err) {
        setFormError(err.userMessage ?? "No se pudo guardar.")
      } finally {
        setSaving(false)
      }
    },
    [entity, save, reload, filterMateria, setSelected],
  )

  const applyFilter = () => {
    setPage(1)
    reload(entity.key === "temas" && filterMateria ? { id_materia: filterMateria } : undefined)
  }

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
          />
        </Suspense>
      )}
    </section>
  )
}

CrudPage.propTypes = {
  entity: PropTypes.object.isRequired,
}
