import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { listResource } from "../../../services/academicService"
import InscripcionRegistroForm from "../../../components/features/inscripciones/InscripcionRegistroForm"
import Skeleton from "../../../components/ui/Skeleton"

const CATALOGOS = ["carreras", "capacitaciones", "convocatorias", "paralelos", "administrativos", "apoderados"]

function useInscripcionCatalogos() {
  const [catalogos, setCatalogos] = useState({
    carreras: [],
    capacitaciones: [],
    convocatorias: [],
    paralelos: [],
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
          capacitaciones: [],
          convocatorias: [],
          paralelos: [],
          administrativos: [],
          apoderados: [],
        }
        results.forEach((result, index) => {
          next[CATALOGOS[index]] = result.status === "fulfilled" && Array.isArray(result.value)
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

function buildParalelosPorCarrera(carreras, convocatorias, capacitaciones, paralelos) {
  const convocatoriasPorFacultad = new Map()
  convocatorias.forEach((convocatoria) => {
    const key = String(convocatoria.id_facultad)
    if (!convocatoriasPorFacultad.has(key)) convocatoriasPorFacultad.set(key, new Set())
    convocatoriasPorFacultad.get(key).add(String(convocatoria.id_convocatoria))
  })

  const capacitacionesPorConvocatoria = new Map()
  capacitaciones
    .filter((capacitacion) => capacitacion.activo !== false)
    .forEach((capacitacion) => {
      const key = String(capacitacion.id_convocatoria)
      if (!capacitacionesPorConvocatoria.has(key)) capacitacionesPorConvocatoria.set(key, [])
      capacitacionesPorConvocatoria.get(key).push(capacitacion)
    })

  const paralelosPorCapacitacion = new Map()
  paralelos
    .filter((paralelo) => paralelo.activo !== false)
    .forEach((paralelo) => {
      const key = String(paralelo.id_capacitacion)
      if (!paralelosPorCapacitacion.has(key)) paralelosPorCapacitacion.set(key, [])
      paralelosPorCapacitacion.get(key).push(paralelo)
    })

  const result = new Map()
  carreras.forEach((carrera) => {
    const convocatoriaIds = convocatoriasPorFacultad.get(String(carrera.id_facultad)) ?? new Set()
    const disponibles = []
    convocatoriaIds.forEach((idConvocatoria) => {
      for (const capacitacion of capacitacionesPorConvocatoria.get(idConvocatoria) ?? []) {
        for (const paralelo of paralelosPorCapacitacion.get(String(capacitacion.id_capacitacion)) ?? []) {
          disponibles.push({ ...paralelo, capacitacion })
        }
      }
    })
    disponibles.sort((a, b) => {
      const fechaA = a.capacitacion?.fecha_inicio
        ? new Date(a.capacitacion.fecha_inicio).getTime()
        : Number.MAX_SAFE_INTEGER
      const fechaB = b.capacitacion?.fecha_inicio
        ? new Date(b.capacitacion.fecha_inicio).getTime()
        : Number.MAX_SAFE_INTEGER
      if (fechaA !== fechaB) return fechaA - fechaB
      return String(a.nombre_paralelo ?? "").localeCompare(String(b.nombre_paralelo ?? ""))
    })
    result.set(String(carrera.id_carrera), disponibles)
  })

  return result
}

export default function RegistroView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inscripcionId = searchParams.get("id")
  const {
    carreras,
    capacitaciones,
    convocatorias,
    paralelos,
    administrativos,
    apoderados,
    isLoading,
  } = useInscripcionCatalogos()

  const carreraOptions = useMemo(() => carreras.map((carrera) => ({
    value: carrera.id_carrera,
    label: carrera.nombre ?? `Carrera ${carrera.id_carrera}`,
  })), [carreras])

  const paralelosPorCarrera = useMemo(
    () => buildParalelosPorCarrera(carreras, convocatorias, capacitaciones, paralelos),
    [carreras, convocatorias, capacitaciones, paralelos],
  )

  if (isLoading) return <Skeleton lines={6} />

  return (
    <InscripcionRegistroForm
      key={inscripcionId ?? "nueva"}
      inscripcionId={inscripcionId}
      carreraOptions={carreraOptions}
      paralelosPorCarrera={paralelosPorCarrera}
      administrativos={administrativos}
      apoderados={apoderados}
      onSaved={() => navigate("/app/inscripciones?tab=lista")}
    />
  )
}
