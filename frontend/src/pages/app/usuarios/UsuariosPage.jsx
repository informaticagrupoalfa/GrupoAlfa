import { Suspense, lazy } from "react"
import { useSearchParams } from "react-router-dom"
import Skeleton from "../../../components/ui/Skeleton"

const VIEWS = {
  usuarios: lazy(() => import("./UsuariosView")),
  asesores: lazy(() => import("./AsesoresView")),
  administrativos: lazy(() => import("./AdministrativosView")),
  apoderados: lazy(() => import("./ApoderadosView")),
  estudiantes: lazy(() => import("./EstudiantesView")),
}

const USERS_TABS = Object.keys(VIEWS)

export default function UsuariosPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const activeTab = USERS_TABS.includes(requestedTab) ? requestedTab : "usuarios"
  const ActiveView = VIEWS[activeTab]

  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ActiveView />
    </Suspense>
  )
}
