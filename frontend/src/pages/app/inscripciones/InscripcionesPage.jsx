import { Suspense, lazy } from "react"
import { useSearchParams } from "react-router-dom"
import Skeleton from "../../../components/ui/Skeleton"

const RegistroView = lazy(() => import("./RegistroView"))
const ListaView = lazy(() => import("./ListaView"))

export default function InscripcionesPage() {
  const [searchParams] = useSearchParams()
  const active = searchParams.get("tab") === "lista" ? "lista" : "registro"
  const ActiveView = active === "lista" ? ListaView : RegistroView

  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ActiveView />
    </Suspense>
  )
}
