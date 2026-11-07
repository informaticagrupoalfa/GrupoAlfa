import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import PropTypes from "prop-types"
import { useCrud } from "../../hooks/useCrud"
import { ENTITIES, getDisplayName } from "../../config/entities"
import { listResource } from "../../services/academicService"
import DataTable from "../../components/dashboard/DataTable"
import Button from "../../components/ui/Button"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"

// split-component-lazy: modales pesados fuera del chunk inicial.
// split-prefetch-hints: se precargan al pasar el cursor por "Nuevo".
const loadMatriculacionModal = () => import("../../components/features/matriculaciones/MatriculacionFormModal")
const loadMensualidadModal = () => import("../../components/features/matriculaciones/MensualidadFormModal")
const MatriculacionFormModal = lazy(loadMatriculacionModal)
const MensualidadFormModal = lazy(loadMensualidadModal)

const PAGE_SIZE = 25
const TABS = ["matriculaciones", "mensualidades"]

function userLabel(u) {
  if (!u) return ""
  return getDisplayName(u) || u.correo_electronico || `Usuario ${u.id_usuario ?? ""}`
}

function useCatalogs() {
  const [catalogs, setCatalogs] = useState({
    usuarios: [],
    estudiantes: [],
    administrativos: [],
    capacitaciones: [],
    paralelos: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    async function load() {
      const safe = (p) => listResource(p).catch(() => [])
      const [usuarios, estudiantes, administrativos, capacitaciones, paralelos] = await Promise.all([
        safe("usuarios/catalogo"),
        safe("estudiantes"),
        safe("administrativos"),
        safe("capacitaciones"),
        safe("paralelos"),
      ])
      if (mounted) {
        setCatalogs({ usuarios, estudiantes, administrativos, capacitaciones, paralelos })
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
    const capacitacionById = new Map(
      (catalogs.capacitaciones ?? []).map((c) => [String(c.id_capacitacion), c]),
    )
    const paraleloOptions = (catalogs.paralelos ?? []).map((p) => {
      const capacitacion = capacitacionById.get(String(p.id_capacitacion))
      const contexto = capacitacion?.nombre_facultad
        ? ` — ${capacitacion.nombre_facultad}`
        : ""
      const nivel = p.nivel ? ` (${p.nivel})` : ""
      return {
        value: p.id_paralelo,
        label: `${p.nombre_paralelo}${nivel}${contexto}`,
      }
    })
    const estudianteById = new Map((catalogs.estudiantes ?? []).map((e) => [String(e.id_estudiante), userLabel(usersById.get(String(e.id_usuario))) || `Estudiante ${e.id_estudiante}`]))
    const administrativoById = new Map((catalogs.administrativos ?? []).map((a) => [String(a.id_administrativo), userLabel(usersById.get(String(a.id_usuario))) || `Administrativo ${a.id_administrativo}`]))
    const paraleloById = new Map(
      (catalogs.paralelos ?? []).map((p) => [
        String(p.id_paralelo),
        `${p.nombre_paralelo}${p.nivel ? ` (${p.nivel})` : ""}`,
      ]),
    )
    return { estudianteOptions, administrativoOptions, paraleloOptions, estudianteById, administrativoById, paraleloById }
  }, [catalogs])
}

function MatriculacionesTab({ options }) {
  const entity = ENTITIES.matriculaciones
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const rows = useMemo(() => items.map((row) => ({
    ...row,
    estudiante: options.estudianteById.get(String(row.id_estudiante)) ?? row.id_estudiante,
    paralelo: options.paraleloById.get(String(row.id_paralelo)) ?? row.id_paralelo,
    vigente: row.esta_vigente ? "Sí" : "No",
  })), [items, options])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => entity.columns.some((col) => String(row[col.key] ?? "").toLowerCase().includes(term)))
  }, [rows, search, entity])
  const visible = useMemo(() => filtered.slice(0, PAGE_SIZE), [filtered])

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta matriculación?")) return
    try { await remove(id) } catch (err) { alert(err.userMessage ?? "No se pudo eliminar.") }
  }

  const fetchEstudiantes = async (term) => {
    const rows = await listResource("estudiantes", { q: term })
    return rows.map((e) => {
      const nombreCompleto = [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" ")
      const carnet = e.nro_carnet != null ? ` — Carnet: ${e.nro_carnet}` : ""
      return {
        value: e.id_estudiante,
        label: `${nombreCompleto}${carnet}`,
      }
    })
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
        <input type="search" placeholder="Buscar en Matriculaciones..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" />
        <Button size="sm" onClick={() => { setSelected(null); setFormError(""); setModalOpen(true) }} onMouseEnter={loadMatriculacionModal} onFocus={loadMatriculacionModal}>
          Nuevo
        </Button>
      </div>
      <p className="muted">{filtered.length} registro(s){filtered.length > PAGE_SIZE ? ` (mostrando ${PAGE_SIZE})` : ""}</p>
      <DataTable rows={visible} columns={entity.columns} pk={entity.pk} onEdit={(row) => { setSelected(row); setFormError(""); setModalOpen(true) }} onDelete={handleDelete} />
      {modalOpen && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <MatriculacionFormModal
            key={selected?.id_matriculacion ?? "new"}
            initial={selected}
            fetchEstudiantes={fetchEstudiantes}
            paraleloOptions={options.paraleloOptions}
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

function MensualidadesTab({ options }) {
  const entity = ENTITIES.mensualidades
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const rows = useMemo(() => items.map((row) => ({
    ...row,
    estudiante: options.estudianteById.get(String(row.id_estudiante)) ?? row.id_estudiante,
    administrativo: options.administrativoById.get(String(row.id_administrativo)) ?? row.id_administrativo,
  })), [items, options])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => entity.columns.some((col) => String(row[col.key] ?? "").toLowerCase().includes(term)))
  }, [rows, search, entity])
  const visible = useMemo(() => filtered.slice(0, PAGE_SIZE), [filtered])

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta mensualidad?")) return
    try { await remove(id) } catch (err) { alert(err.userMessage ?? "No se pudo eliminar.") }
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
        <input type="search" placeholder="Buscar en Mensualidades..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" />
        <Button size="sm" onClick={() => { setSelected(null); setFormError(""); setModalOpen(true) }} onMouseEnter={loadMensualidadModal} onFocus={loadMensualidadModal}>
          Nuevo
        </Button>
      </div>
      <p className="muted">{filtered.length} registro(s){filtered.length > PAGE_SIZE ? ` (mostrando ${PAGE_SIZE})` : ""}</p>
      <DataTable rows={visible} columns={entity.columns} pk={entity.pk} onEdit={(row) => { setSelected(row); setFormError(""); setModalOpen(true) }} onDelete={handleDelete} />
      {modalOpen && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <MensualidadFormModal
            key={selected?.id_mensualidad ?? "new"}
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
  paraleloOptions: PropTypes.arrayOf(OPTION_PROP).isRequired,
  estudianteById: PropTypes.instanceOf(Map).isRequired,
  administrativoById: PropTypes.instanceOf(Map).isRequired,
  paraleloById: PropTypes.instanceOf(Map).isRequired,
}).isRequired

MatriculacionesTab.propTypes = { options: OPTIONS_PROP }
MensualidadesTab.propTypes = { options: OPTIONS_PROP }

export default function MatriculacionesPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const active = TABS.includes(requestedTab) ? requestedTab : "matriculaciones"
  const { catalogs, isLoading } = useCatalogs()
  const options = useOptions(catalogs)

  if (isLoading) return <Skeleton lines={6} />

  return (
    <section>
      <p className="muted">
        {active === "matriculaciones"
          ? "Relaciona estudiantes con paralelos de capacitación."
          : "Registra los pagos mensuales de los estudiantes."}
      </p>
      {active === "matriculaciones"
        ? <MatriculacionesTab options={options} />
        : <MensualidadesTab options={options} />}
    </section>
  )
}
