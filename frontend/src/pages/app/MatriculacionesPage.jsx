import { Suspense, lazy, useEffect, useMemo, useState } from "react"
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
  const [catalogs, setCatalogs] = useState({ usuarios: [], estudiantes: [], administrativos: [], capacitaciones: [] })
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    async function load() {
      const safe = (p) => listResource(p).catch(() => [])
      const [usuarios, estudiantes, administrativos, capacitaciones] = await Promise.all([
        safe("usuarios/catalogo"), safe("estudiantes"), safe("administrativos"), safe("capacitaciones"),
      ])
      if (mounted) {
        setCatalogs({ usuarios, estudiantes, administrativos, capacitaciones })
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
    const cursoOptions = (catalogs.capacitaciones ?? []).map((c) => ({
      value: c.id_capacitacion,
      label: `${c.nombre}${c.nivel ? ` (${c.nivel})` : ""}`,
    }))
    const estudianteById = new Map((catalogs.estudiantes ?? []).map((e) => [String(e.id_estudiante), userLabel(usersById.get(String(e.id_usuario))) || `Estudiante ${e.id_estudiante}`]))
    const administrativoById = new Map((catalogs.administrativos ?? []).map((a) => [String(a.id_administrativo), userLabel(usersById.get(String(a.id_usuario))) || `Administrativo ${a.id_administrativo}`]))
    const cursoById = new Map((catalogs.capacitaciones ?? []).map((c) => [String(c.id_capacitacion), c.nombre ?? `Curso ${c.id_capacitacion}`]))
    return { estudianteOptions, administrativoOptions, cursoOptions, estudianteById, administrativoById, cursoById }
  }, [catalogs])
}

function MatriculacionesTab({ catalogs, options }) {
  const entity = ENTITIES.matriculaciones
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const rows = useMemo(() => items.map((row) => ({
    ...row,
    estudiante: options.estudianteById.get(String(row.id_estudiante)) ?? row.id_estudiante,
    curso: options.cursoById.get(String(row.id_curso_capacitacion)) ?? row.id_curso_capacitacion,
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
            estudianteOptions={options.estudianteOptions}
            cursoOptions={options.cursoOptions}
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

function MensualidadesTab({ catalogs, options }) {
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

export default function MatriculacionesPage() {
  const [active, setActive] = useState("matriculaciones")
  const { catalogs, isLoading } = useCatalogs()
  const options = useOptions(catalogs)

  if (isLoading) return <Skeleton lines={6} />

  return (
    <section>
      <div className="toggle-group" role="tablist" aria-label="Módulos de matriculaciones">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={active === key}
            type="button"
            className={active === key ? "toggle-chip active" : "toggle-chip"}
            onClick={() => setActive(key)}
          >
            {ENTITIES[key].label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        {active === "matriculaciones"
          ? "Relaciona estudiantes con cursos de capacitación."
          : "Registra los pagos mensuales de los estudiantes."}
      </p>
      {active === "matriculaciones"
        ? <MatriculacionesTab catalogs={catalogs} options={options} />
        : <MensualidadesTab catalogs={catalogs} options={options} />}
    </section>
  )
}
