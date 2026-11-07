import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { useCrud } from "../../hooks/useCrud"
import { ENTITIES, getDisplayName } from "../../config/entities"
import { listResource } from "../../services/academicService"
import DataTable from "../../components/dashboard/DataTable"
import Pagination from "../../components/ui/Pagination"
import Button from "../../components/ui/Button"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"

const loadInscripcionModal = () => import("../../components/features/inscripciones/InscripcionFormModal")
const InscripcionFormModal = lazy(loadInscripcionModal)

const PAGE_SIZE = 25

function userLabel(u) {
  if (!u) return ""
  return getDisplayName(u) || u.correo_electronico || `Usuario ${u.id_usuario ?? ""}`
}

function useCatalogs() {
  const [catalogs, setCatalogs] = useState({ usuarios: [], estudiantes: [], administrativos: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const safe = (p) => listResource(p).catch(() => [])
      const [usuarios, estudiantes, administrativos] = await Promise.all([
        safe("usuarios/catalogo"), safe("estudiantes"), safe("administrativos"),
      ])
      if (mounted) {
        setCatalogs({ usuarios, estudiantes, administrativos })
        setIsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return { catalogs, isLoading }
}

function useOptions(catalogs) {
  return useMemo(() => {
    const usersById = new Map((catalogs.usuarios ?? []).map((u) => [String(u.id_usuario), u]))
    const estudianteOptions = (catalogs.estudiantes ?? []).map((e) => {
      const user = usersById.get(String(e.id_usuario))
      const carnet = user?.nro_carnet != null ? ` — Carnet: ${user.nro_carnet}` : ""
      return { value: e.id_estudiante, label: `${userLabel(user)}${carnet}` }
    })
    const administrativoOptions = (catalogs.administrativos ?? []).map((a) => ({
      value: a.id_administrativo,
      label: userLabel(usersById.get(String(a.id_usuario))) || `Administrativo ${a.id_administrativo}`,
    }))
    const estudianteById = new Map((catalogs.estudiantes ?? []).map((e) => [
      String(e.id_estudiante),
      userLabel(usersById.get(String(e.id_usuario))) || `Estudiante ${e.id_estudiante}`,
    ]))
    const administrativoById = new Map((catalogs.administrativos ?? []).map((a) => [
      String(a.id_administrativo),
      userLabel(usersById.get(String(a.id_usuario))) || `Administrativo ${a.id_administrativo}`,
    ]))
    return { estudianteOptions, administrativoOptions, estudianteById, administrativoById }
  }, [catalogs])
}

function InscripcionesTab({ options }) {
  const entity = ENTITIES.inscripciones
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const rows = useMemo(() => items.map((row) => ({
    ...row,
    estudiante: row.id_estudiante == null
      ? "—"
      : options.estudianteById.get(String(row.id_estudiante)) ?? row.id_estudiante,
    administrativo: row.id_administrativo == null
      ? "—"
      : options.administrativoById.get(String(row.id_administrativo)) ?? row.id_administrativo,
    recalculo: row.recalculo ? "Sí" : "No",
    preparacion_previa: row.preparacion_previa ? "Sí" : "No",
  })), [items, options])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => entity.columns.some((col) =>
      String(row[col.key] ?? "").toLowerCase().includes(term),
    ))
  }, [rows, search, entity])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta inscripción?")) return
    try {
      await remove(id)
    } catch (err) {
      alert(err.userMessage ?? "No se pudo eliminar.")
    }
  }

  const handleSubmit = async (payload) => {
    setSaving(true)
    setFormError("")
    try {
      await save(payload)
      setModalOpen(false)
      setSelected(null)
      await reload()
    } catch (err) {
      setFormError(err.userMessage ?? err?.response?.data?.error ?? "No se pudo guardar.")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <Skeleton lines={6} />
  if (error) return <ErrorFallback message={error} onRetry={() => reload()} />

  return (
    <section>
      <div className="crud-toolbar">
        <input
          type="search"
          placeholder="Buscar en Inscripciones..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          aria-label="Buscar"
        />
        <Button
          size="sm"
          onClick={() => { setSelected(null); setFormError(""); setModalOpen(true) }}
          onMouseEnter={loadInscripcionModal}
          onFocus={loadInscripcionModal}
        >
          Nuevo
        </Button>
      </div>
      <p className="muted">{filtered.length} registro(s)</p>
      <DataTable
        rows={visible}
        columns={entity.columns}
        pk={entity.pk}
        onEdit={(row) => { setSelected(row); setFormError(""); setModalOpen(true) }}
        onDelete={handleDelete}
      />
      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      {modalOpen && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <InscripcionFormModal
            key={selected?.id_inscripcion ?? "new"}
            initial={selected}
            estudianteOptions={options.estudianteOptions}
            administrativoOptions={options.administrativoOptions}
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

const OPTION_PROP = PropTypes.shape({
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
})

const OPTIONS_PROP = PropTypes.shape({
  estudianteOptions: PropTypes.arrayOf(OPTION_PROP).isRequired,
  administrativoOptions: PropTypes.arrayOf(OPTION_PROP).isRequired,
  estudianteById: PropTypes.instanceOf(Map).isRequired,
  administrativoById: PropTypes.instanceOf(Map).isRequired,
}).isRequired

InscripcionesTab.propTypes = { options: OPTIONS_PROP }

export default function InscripcionesPage() {
  const { catalogs, isLoading } = useCatalogs()
  const options = useOptions(catalogs)

  if (isLoading) return <Skeleton lines={6} />

  return (
    <section>
      <p className="muted">
        Registra el origen y la preparación previa de los estudiantes que se inscriben.
      </p>
      <InscripcionesTab options={options} />
    </section>
  )
}
