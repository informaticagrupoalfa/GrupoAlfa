import { Suspense, lazy, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ENTITIES } from "../../config/entities"
import Skeleton from "../../components/ui/Skeleton"
import { getCapacitacionesActivas } from "../../services/academicService"

const loadCrud = () => import("../../components/dashboard/CrudPage.jsx")
const CrudPanel = lazy(loadCrud)

const TABS = ["capacitaciones", "paralelos", "convocatorias", "facultades", "aulas", "materias", "temas"]
const TAB_HINTS = {
  capacitaciones: "Capacitaciones asociadas a una convocatoria y a un rango de fechas.",
  paralelos: "Paralelos de una capacitación: aula, nivel, modalidad, horario y días.",
  convocatorias: "Convocatorias de preuniversitario. Requieren facultad existente.",
  facultades: "Facultades a las que pertenecen carreras y convocatorias.",
  aulas: "Aulas donde se dictan los paralelos.",
  materias: "Materias que conforman las capacitaciones.",
  temas: "Temas asociados a una materia.",
}

export default function CapacitacionesPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const active = TABS.includes(requestedTab) ? requestedTab : "capacitaciones"
  const entity = ENTITIES[active]
  const [capacitacionActiva, setCapacitacionActiva] = useState(null)

  useEffect(() => {
    if (active === "materias" || active === "paralelos") {
      getCapacitacionesActivas().then((rows) => {
        if (rows.length > 0) setCapacitacionActiva(rows[0])
        else setCapacitacionActiva(null)
      })
    } else {
      setCapacitacionActiva(null)
    }
  }, [active])

  const defaultParams = active === "materias" ? { activas: "true" } : undefined

  return (
    <section>
      {capacitacionActiva && (active === "materias" || active === "paralelos") && (
        <div className="curso-activo">
          <strong>Capacitación activa:</strong>{" "}
          {capacitacionActiva.nombre_facultad
            ? `${capacitacionActiva.nombre_facultad} - ${String(capacitacionActiva.fecha_inicio ?? "").slice(0, 10)}`
            : `Capacitación ${capacitacionActiva.id_capacitacion}`}
          &nbsp;|&nbsp;
          {String(capacitacionActiva.fecha_inicio ?? "").slice(0, 10)} &rarr;{" "}
          {capacitacionActiva.fecha_fin ? String(capacitacionActiva.fecha_fin).slice(0, 10) : "sin fecha fin"}
        </div>
      )}
      <p className="muted">{TAB_HINTS[active]}</p>
      <Suspense fallback={<Skeleton lines={6} />}>
        <CrudPanel key={entity.key} entity={entity} defaultParams={defaultParams} />
      </Suspense>
    </section>
  )
}
