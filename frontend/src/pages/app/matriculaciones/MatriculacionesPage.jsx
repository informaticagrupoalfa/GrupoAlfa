import { Suspense, lazy } from "react"
import { useSearchParams } from "react-router-dom"
import Skeleton from "../../../components/ui/Skeleton"

const VIEWS = {
  "mensualidades-tabla": lazy(() => import("./MensualidadesTablaView")),
  "mensualidades-estudiantes": lazy(() => import("./MensualidadesEstudiantesView")),
  mensualidades: lazy(() => import("./MensualidadesListadoView")),
}

const TABS = Object.keys(VIEWS)
const DEFAULT_TAB = "mensualidades-tabla"

export default function MatriculacionesPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const active = TABS.includes(requestedTab) ? requestedTab : DEFAULT_TAB
  const ActiveView = VIEWS[active]

  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ActiveView />
    </Suspense>
  )
}
