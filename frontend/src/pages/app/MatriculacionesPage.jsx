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
import MensualidadesView from "./MensualidadesView"
import MensualidadesDetalleView from "./MensualidadesDetalleView"

// split-component-lazy: modales pesados fuera del chunk inicial.
// split-prefetch-hints: se precargan al pasar el cursor por "Nuevo".
// Modal de formulario de mensualidad, cargado de forma lazy para no incluirlo en el bundle principal.
const loadMensualidadModal = () => import("../../components/features/matriculaciones/MensualidadFormModal")
const MensualidadFormModal = lazy(loadMensualidadModal)

const PAGE_SIZE = 25
// Pestañas disponibles del módulo de matrículas/mensualidades.
const TABS = ["mensualidades-tabla", "mensualidades-estudiantes", "mensualidades"]

// Devuelve una etiqueta legible para un usuario (nombre, correo o fallback por ID).
function userLabel(u) {
  if (!u) return ""
  return getDisplayName(u) || u.correo_electronico || `Usuario ${u.id_usuario ?? ""}`
}

// Carga los catálogos necesarios para poblar los selectores y mostrar etiquetas legibles:
// usuarios, estudiantes, administrativos, inscripciones y paralelos.
function useCatalogs() {
  const [catalogs, setCatalogs] = useState({
    usuarios: [],
    estudiantes: [],
    administrativos: [],
    inscripciones: [],
    paralelos: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    async function load() {
      // Cada petición falla en silencio devolviendo [] para no bloquear el resto.
      const safe = (p) => listResource(p).catch(() => [])
      const [usuarios, estudiantes, administrativos, inscripciones, paralelos] = await Promise.all([
        safe("usuarios/catalogo"),
        safe("estudiantes"),
        safe("administrativos"),
        safe("inscripciones"),
        safe("paralelos"),
      ])
      if (mounted) {
        setCatalogs({ usuarios, estudiantes, administrativos, inscripciones, paralelos })
        setIsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])
  return { catalogs, isLoading }
}

// Construye mapas y opciones de selección a partir de los catálogos cargados.
// Se usa para mostrar nombres legibles en lugar de IDs crudos en la tabla de mensualidades.
function useOptions(catalogs) {
  return useMemo(() => {
    // Mapa id_usuario -> objeto usuario completo.
    const usersById = new Map((catalogs.usuarios ?? []).map((u) => [String(u.id_usuario), u]))
    // Mapa id_estudiante -> nombre legible del estudiante.
    const estudianteById = new Map(
      (catalogs.estudiantes ?? []).map((e) => [
        String(e.id_estudiante),
        userLabel(usersById.get(String(e.id_usuario))) || `Estudiante ${e.id_estudiante}`,
      ]),
    )
    // Opciones de administrativos para el selector del formulario.
    const administrativoOptions = (catalogs.administrativos ?? []).map((a) => ({
      value: a.id_administrativo,
      label: userLabel(usersById.get(String(a.id_usuario))) || `Administrativo ${a.id_administrativo}`,
    }))
    const administrativoById = new Map(administrativoOptions.map((a) => [String(a.value), a.label]))
    // Mapa id_paralelo -> etiqueta "Nombre (Nivel)".
    const paraleloById = new Map(
      (catalogs.paralelos ?? []).map((p) => [
        String(p.id_paralelo),
        `${p.nombre_paralelo}${p.nivel ? ` (${p.nivel})` : ""}`,
      ]),
    )
    // Opciones de inscripciones, con etiqueta que combina estudiante, paralelo y fecha.
    const inscripcionOptions = (catalogs.inscripciones ?? []).map((i) => {
      const estudiante = estudianteById.get(String(i.id_estudiante)) || `Estudiante ${i.id_estudiante}`
      const paralelo = paraleloById.get(String(i.id_paralelo)) || "Sin paralelo"
      const fecha = i.fecha_insc ? ` — ${String(i.fecha_insc).slice(0, 10)}` : ""
      return {
        value: i.id_inscripcion,
        label: `${estudiante} · ${paralelo}${fecha}`,
      }
    })
    const inscripcionById = new Map(inscripcionOptions.map((i) => [String(i.value), i.label]))
    // Mapa id_inscripcion -> nombre del estudiante asociado.
    const estudianteByInscripcion = new Map(
      (catalogs.inscripciones ?? []).map((i) => [
        String(i.id_inscripcion),
        estudianteById.get(String(i.id_estudiante)) || `Estudiante ${i.id_estudiante}`,
      ]),
    )
    return {
      administrativoOptions,
      inscripcionOptions,
      administrativoById,
      inscripcionById,
      estudianteByInscripcion,
    }
  }, [catalogs])
}

// Pestaña de tabla de mensualidades: CRUD de pagos mensuales asociados a inscripciones.
function MensualidadesTab({ options }) {
  const entity = ENTITIES.mensualidades
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // Enriquece cada fila con etiquetas legibles (estudiante, inscripción, administrativo).
  const rows = useMemo(() => items.map((row) => ({
    ...row,
    estudiante: options.estudianteByInscripcion.get(String(row.id_inscripcion)) ?? row.id_inscripcion,
    inscripcion: options.inscripcionById.get(String(row.id_inscripcion)) ?? row.id_inscripcion,
    administrativo: options.administrativoById.get(String(row.id_administrativo)) ?? row.id_administrativo,
  })), [items, options])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => entity.columns.some((col) => String(row[col.key] ?? "").toLowerCase().includes(term)))
  }, [rows, search, entity])
  // Solo se muestran los primeros PAGE_SIZE registros.
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
        {/*
          Botón "Nuevo": abre el modal vacío para crear una mensualidad y precarga el componente lazy.
        */}
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
            inscripcionOptions={options.inscripcionOptions}
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
  administrativoOptions: PropTypes.arrayOf(OPTION_PROP).isRequired,
  inscripcionOptions: PropTypes.arrayOf(OPTION_PROP).isRequired,
  administrativoById: PropTypes.instanceOf(Map).isRequired,
  inscripcionById: PropTypes.instanceOf(Map).isRequired,
  estudianteByInscripcion: PropTypes.instanceOf(Map).isRequired,
}).isRequired

MensualidadesTab.propTypes = { options: OPTIONS_PROP }

// Página principal de Matrículas. Según el parámetro ?tab en la URL muestra:
// - "mensualidades-tabla": tabla CRUD de mensualidades.
// - "mensualidades-estudiantes": lista de estudiantes con sus inscripciones y mensualidades.
// - "mensualidades": detalle de una mensualidad seleccionada.
export default function MatriculacionesPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const active = TABS.includes(requestedTab) ? requestedTab : "mensualidades-tabla"
  const { catalogs, isLoading } = useCatalogs()
  const options = useOptions(catalogs)

  if (isLoading) return <Skeleton lines={6} />

  return (
    <section>
      <p className="muted">
        {active === "mensualidades-tabla"
          ? "Registra los pagos mensuales de los estudiantes (tabla)."
          : active === "mensualidades-estudiantes"
            ? "Selecciona un estudiante para ver sus inscripciones y mensualidades."
            : "Selecciona una mensualidad para ver su detalle."}
      </p>
      {active === "mensualidades-tabla"
        ? <MensualidadesTab options={options} />
        : active === "mensualidades-estudiantes"
          ? <MensualidadesView />
          : <MensualidadesDetalleView />}
    </section>
  )
}
