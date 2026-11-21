import { Suspense, lazy } from "react"
import { useSearchParams } from "react-router-dom"
import Skeleton from "../../../components/ui/Skeleton"
import { getModuleTabConfig, resolveModuleTab } from "../../../config/moduleTabs"
import { useAuth } from "../../../hooks/useAuth"

const VIEWS = {
  gestion: lazy(() => import("./GestionAcademicaView")),
  "asignacion-docente": lazy(() => import("./AsignacionDocentesView")),
  capacitaciones: lazy(() => import("./CapacitacionesView")),
  paralelos: lazy(() => import("./ParalelosView")),
  convocatorias: lazy(() => import("./ConvocatoriasView")),
  facultades: lazy(() => import("./FacultadesView")),
  aulas: lazy(() => import("./AulasView")),
  materias: lazy(() => import("./MateriasView")),
}

export default function CapacitacionesPage() {
  const { activeRole } = useAuth()
  const [searchParams] = useSearchParams()
  const active = resolveModuleTab(getModuleTabConfig("capacitaciones", activeRole), searchParams.toString())
  const ActiveView = VIEWS[active]

  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ActiveView />
    </Suspense>
  )
}
