import { Suspense, lazy, useEffect, useState } from "react"
import { useAuth } from "../../../hooks/useAuth"
import Skeleton from "../../../components/ui/Skeleton"
import ErrorFallback from "../../../components/ui/ErrorFallback"
import { loadPaseListaCatalogs } from "../../../services/paseListaService"

const TomarClaseView = lazy(() => import("./TomarClaseView.jsx"))

export default function LlamarListaDocentePage() {
  const { loggedUser } = useAuth()
  const [catalogs, setCatalogs] = useState(null)
  const [asesorId, setAsesorId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError("")
      try {
        const data = await loadPaseListaCatalogs()
        const asesor = (data.asesores ?? []).find(
          (item) => String(item.id_usuario) === String(loggedUser?.id_usuario),
        )
        if (!asesor) {
          throw new Error("Tu usuario no tiene un perfil de asesor asignado.")
        }
        if (mounted) {
          setCatalogs({ ...data, asesores: [asesor] })
          setAsesorId(asesor.id_asesor)
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message || "No se pudieron cargar los datos de la clase.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [loggedUser?.id_usuario])

  if (loading) return <Skeleton lines={6} />
  if (error) return <ErrorFallback message={error} onRetry={() => window.location.reload()} />

  return (
    <section>
      <Suspense fallback={<Skeleton lines={6} />}>
        <TomarClaseView catalogs={catalogs} initialAsesorId={asesorId} onSaved={() => {}} />
      </Suspense>
    </section>
  )
}
