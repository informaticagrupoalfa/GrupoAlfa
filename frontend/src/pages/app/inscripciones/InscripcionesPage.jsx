import { Suspense, lazy } from "react"
import { useSearchParams } from "react-router-dom"
import Skeleton from "../../../components/ui/Skeleton"
import { getModuleTabConfig, resolveModuleTab } from "../../../config/moduleTabs"
import { useAuth } from "../../../hooks/useAuth"

const RegistroView = lazy(() => import("./RegistroView"))
const ListadoView = lazy(() => import("./ListadoView"))

export default function InscripcionesPage() {
  const { activeRole } = useAuth()
  const [searchParams] = useSearchParams()
  const tab = resolveModuleTab(getModuleTabConfig("inscripciones", activeRole), searchParams.toString())
  const ActiveView = tab === "listado" ? ListadoView : RegistroView
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ActiveView />
    </Suspense>
  )
}
