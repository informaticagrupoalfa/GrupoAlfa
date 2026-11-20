import { Suspense, lazy } from "react"
import Skeleton from "../../../components/ui/Skeleton"

const RegistroView = lazy(() => import("./RegistroView"))

export default function InscripcionesPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <RegistroView />
    </Suspense>
  )
}
