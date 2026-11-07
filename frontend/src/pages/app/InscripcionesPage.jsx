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

function useCarreras() {
  const [carreras, setCarreras] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    listResource("carreras")
      .then((rows) => {
        if (mounted) setCarreras(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (mounted) setCarreras([])
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => { mounted = false }
  }, [])

  return { carreras, isLoading }
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
  const { carreras, isLoading } = useCarreras()

  const carreraOptions = useMemo(() => carreras.map((carrera) => ({
    value: carrera.id_carrera,
    label: carrera.nombre ?? `Carrera ${carrera.id_carrera}`,
  })), [carreras])

  const carreraById = useMemo(() => new Map(carreras.map((carrera) => [
    String(carrera.id_carrera),
    carrera.nombre ?? `Carrera ${carrera.id_carrera}`,
  ])), [carreras])

  if (isLoading) return <Skeleton lines={6} />

  if (activeTab === "registro") {
    return (
      <InscripcionRegistroForm
        key={inscripcionId ?? "nueva"}
        inscripcionId={inscripcionId}
        carreraOptions={carreraOptions}
        onSaved={() => navigate("/app/inscripciones?tab=lista")}
      />
    )
  }

  return <InscripcionesLista carreraById={carreraById} />
}
