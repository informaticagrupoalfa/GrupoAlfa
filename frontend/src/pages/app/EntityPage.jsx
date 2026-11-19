import { Suspense, lazy } from "react"
import { Navigate, useParams } from "react-router-dom"
import CrudPanel from "../../components/dashboard/CrudPanel"
import ErrorFallback from "../../components/ui/ErrorFallback"
import Skeleton from "../../components/ui/Skeleton"
import { ENTITIES } from "../../config/entities"
import { useAuth } from "../../hooks/useAuth"
import { canAccessModule } from "../../config/permissions"

const UsuariosPage = lazy(() => import("./usuarios/UsuariosPage"))
const CapacitacionesPage = lazy(() => import("./capacitaciones/CapacitacionesPage"))
const MatriculacionesPage = lazy(() => import("./matriculaciones/MatriculacionesPage"))

export default function EntityPage() {
  const { entityKey } = useParams()
  const { loggedUser } = useAuth()
  const entity = ENTITIES[entityKey]

  if (!entity || !entity.endpoint) {
    return <ErrorFallback message="Módulo no encontrado." />
  }
  if (!canAccessModule(loggedUser, entityKey)) {
    return <Navigate to="/app/sin-acceso" replace />
  }
  if (entity.key === "usuarios") {
    return (
      <Suspense fallback={<Skeleton lines={6} />}>
        <UsuariosPage />
      </Suspense>
    )
  }
  if (entity.key === "capacitaciones") {
    return (
      <Suspense fallback={<Skeleton lines={6} />}>
        <CapacitacionesPage />
      </Suspense>
    )
  }
  if (entity.key === "matriculaciones") {
    return (
      <Suspense fallback={<Skeleton lines={6} />}>
        <MatriculacionesPage />
      </Suspense>
    )
  }
  return <CrudPanel key={entity.key} entity={entity} />
}
