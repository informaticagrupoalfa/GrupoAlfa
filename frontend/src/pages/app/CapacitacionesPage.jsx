import { Suspense, lazy, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ENTITIES } from "../../config/entities"
import Skeleton from "../../components/ui/Skeleton"
import { getCapacitacionesActivas } from "../../services/academicService"

const loadCrud = () => import("../../components/dashboard/CrudPage.jsx")
const CrudPanel = lazy(loadCrud)

const TABS = ["capacitaciones", "convocatorias", "facultades", "aulas", "materias", "temas"]
const TAB_HINTS = {
  capacitaciones: "Cursos de capacitación. Requieren convocatoria y aula existentes.",
  convocatorias: "Convocatorias de preuniversitario. Requieren facultad existente.",
  facultades: "Facultades a las que pertenecen carreras y convocatorias.",
  aulas: "Aulas donde se dictan los cursos.",
  materias: "Materias que conforman los cursos.",
  temas: "Temas asociados a una materia.",
}

export default function CapacitacionesPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const active = TABS.includes(requestedTab) ? requestedTab : "capacitaciones"
  const entity = ENTITIES[active]
  const [capacitacionActiva, setCapacitacionActiva] = useState(null)

  useEffect(() => {
    if (active === "materias") {
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
      {capacitacionActiva && active === "materias" && (
        <div className="curso-activo">
          <strong>Curso de capacitación activo:</strong> {capacitacionActiva.nombre}
          &nbsp;|&nbsp;
          {capacitacionActiva.fecha_inicio} &rarr; {capacitacionActiva.fecha_fin || "sin fecha fin"}
        </div>
      )}
      <p className="muted">{TAB_HINTS[active]}</p>
      <Suspense fallback={<Skeleton lines={6} />}>
        <CrudPanel key={entity.key} entity={entity} defaultParams={defaultParams} />
      </Suspense>
    </section>
  )
}
