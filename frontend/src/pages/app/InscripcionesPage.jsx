import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useCrud } from "../../hooks/useCrud"
import { ENTITIES } from "../../config/entities"
import { getModuleTabConfig, resolveModuleTab } from "../../config/moduleTabs"
import { listResource } from "../../services/academicService"
import InscripcionRegistroForm from "../../components/features/inscripciones/InscripcionRegistroForm"
import DataTable from "../../components/dashboard/DataTable"
import Pagination from "../../components/ui/Pagination"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"

const PAGE_SIZE = 25

const CATALOGOS = ["carreras", "capacitaciones", "convocatorias", "administrativos", "apoderados"]

function useInscripcionCatalogos() {
  const [catalogos, setCatalogos] = useState({
    carreras: [],
    cursos: [],
    convocatorias: [],
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
          cursos: [],
          convocatorias: [],
          administrativos: [],
          apoderados: [],
        }
        results.forEach((result, index) => {
          const key = CATALOGOS[index] === "capacitaciones" ? "cursos" : CATALOGOS[index]
          next[key] = result.status === "fulfilled" && Array.isArray(result.value)
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

function buildCursosPorCarrera(carreras, convocatorias, cursos) {
  const convocatoriasPorFacultad = new Map()
  convocatorias.forEach((convocatoria) => {
    const key = String(convocatoria.id_facultad)
    if (!convocatoriasPorFacultad.has(key)) convocatoriasPorFacultad.set(key, new Set())
    convocatoriasPorFacultad.get(key).add(String(convocatoria.id_convocatoria))
  })

  const result = new Map()
  carreras.forEach((carrera) => {
    const ids = convocatoriasPorFacultad.get(String(carrera.id_facultad)) ?? new Set()
    const disponibles = cursos
      .filter((curso) => curso.activo !== false && ids.has(String(curso.id_convocatoria)))
      .sort((a, b) => {
        const fechaA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : Number.MAX_SAFE_INTEGER
        const fechaB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : Number.MAX_SAFE_INTEGER
        if (fechaA !== fechaB) return fechaA - fechaB
        return String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""))
      })
    result.set(String(carrera.id_carrera), disponibles)
  })

  return result
}

function InscripcionesLista({ carreraById }) {
  const navigate = useNavigate()
  const entity = ENTITIES.inscripciones
  const { items, isLoading, error, reload, remove } = useCrud(entity)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const rows = useMemo(() => items.map((row) => {
    const nombreCompleto = [row.nombre, row.apellido_paterno, row.apellido_materno]
      .filter(Boolean)
      .join(" ")
    const medio = row.como_se_entero_detalle
      ? `${row.como_se_entero_de_nosotros ?? ""} (${row.como_se_entero_detalle})`
      : row.como_se_entero_de_nosotros
    return {
      ...row,
      nombre_completo: nombreCompleto,
      carrera: row.id_carrera == null
        ? "—"
        : carreraById.get(String(row.id_carrera)) ?? row.id_carrera,
      como_se_entero_de_nosotros: medio,
    }
  }), [items, carreraById])

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

  const handleEdit = (row) => {
    navigate(`/app/inscripciones?tab=registro&id=${row.id_inscripcion}`)
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
      </div>
      <p className="muted">{filtered.length} registro(s)</p>
      <DataTable
        rows={visible}
        columns={entity.columns}
        pk={entity.pk}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  )
}

InscripcionesLista.propTypes = {
  carreraById: PropTypes.instanceOf(Map).isRequired,
}

export default function InscripcionesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabConfig = getModuleTabConfig("inscripciones")
  const activeTab = resolveModuleTab(tabConfig, searchParams.toString())
  const inscripcionId = searchParams.get("id")
  const {
    carreras,
    cursos,
    convocatorias,
    administrativos,
    apoderados,
    isLoading,
  } = useInscripcionCatalogos()

  const carreraOptions = useMemo(() => carreras.map((carrera) => ({
    value: carrera.id_carrera,
    label: carrera.nombre ?? `Carrera ${carrera.id_carrera}`,
  })), [carreras])

  const carreraById = useMemo(() => new Map(carreras.map((carrera) => [
    String(carrera.id_carrera),
    carrera.nombre ?? `Carrera ${carrera.id_carrera}`,
  ])), [carreras])

  const cursosPorCarrera = useMemo(
    () => buildCursosPorCarrera(carreras, convocatorias, cursos),
    [carreras, convocatorias, cursos],
  )

  if (isLoading) return <Skeleton lines={6} />

  if (activeTab === "registro") {
    return (
      <InscripcionRegistroForm
        key={inscripcionId ?? "nueva"}
        inscripcionId={inscripcionId}
        carreraOptions={carreraOptions}
        cursosPorCarrera={cursosPorCarrera}
        administrativos={administrativos}
        apoderados={apoderados}
        onSaved={() => navigate("/app/inscripciones?tab=lista")}
      />
    )
  }

  return <InscripcionesLista carreraById={carreraById} />
}
