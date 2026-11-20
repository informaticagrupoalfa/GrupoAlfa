import { Suspense, lazy } from "react"
import { useSearchParams } from "react-router-dom"
import Skeleton from "../../../components/ui/Skeleton"

const VIEWS = {
  gestion: lazy(() => import("./GestionAcademicaView")),
  capacitaciones: lazy(() => import("./CapacitacionesView")),
  paralelos: lazy(() => import("./ParalelosView")),
  convocatorias: lazy(() => import("./ConvocatoriasView")),
  facultades: lazy(() => import("./FacultadesView")),
  aulas: lazy(() => import("./AulasView")),
  materias: lazy(() => import("./MateriasView")),
  temas: lazy(() => import("./TemasView")),
}

const TABS = Object.keys(VIEWS)

export default function CapacitacionesPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const active = TABS.includes(requestedTab) ? requestedTab : "gestion"
  const ActiveView = VIEWS[active]

  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ActiveView />
    </Suspense>
  )
}
