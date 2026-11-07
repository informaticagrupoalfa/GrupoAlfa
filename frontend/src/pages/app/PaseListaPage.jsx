import { Suspense, lazy, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"
import { loadPaseListaCatalogs } from "../../services/paseListaService"

// split-component-lazy: cada pestaña en su propio chunk.
const TomarClaseTab = lazy(() => import("../../components/pase-lista/TomarClaseTab.jsx"))
const AsistenciasTab = lazy(() => import("../../components/pase-lista/AsistenciasTab.jsx"))

const TABS = ["asistencias", "tomar-clase"]

export default function PaseListaPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const active = TABS.includes(requestedTab) ? requestedTab : "asistencias"
  const [catalogs, setCatalogs] = useState({
    materias: [],
    asesores: [],
    capacitaciones: [],
    paralelos: [],
    temas: [],
    estudiantes: [],
    usuarios: [],
    aulas: [],
    materiasCapacitacion: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [listVersion, setListVersion] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      setError("")
      try {
        const data = await loadPaseListaCatalogs()
        if (mounted) setCatalogs(data)
      } catch {
        if (mounted) setError("No se pudieron cargar los catálogos.")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (isLoading) return <Skeleton lines={6} />
  if (error) return <ErrorFallback message={error} onRetry={() => window.location.reload()} />

  return (
    <section>
      {active === "tomar-clase" && (
        <Suspense fallback={<Skeleton lines={6} />}>
          <TomarClaseTab catalogs={catalogs} onSaved={() => setListVersion((v) => v + 1)} />
        </Suspense>
      )}

      {active === "asistencias" && (
        <Suspense fallback={<Skeleton lines={5} />}>
          <AsistenciasTab catalogs={catalogs} version={listVersion} />
        </Suspense>
      )}
    </section>
  )
}
