import { Suspense, lazy, useEffect, useState } from "react"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"
import { loadPaseListaCatalogs } from "../../services/paseListaService"

// split-component-lazy: cada pestaña en su propio chunk.
// split-prefetch-hints: se precargan al pasar el cursor/foco por la pestaña.
const loadTomarClase = () => import("../../components/pase-lista/TomarClaseTab.jsx")
const loadAsistencias = () => import("../../components/pase-lista/AsistenciasTab.jsx")
const TomarClaseTab = lazy(loadTomarClase)
const AsistenciasTab = lazy(loadAsistencias)

const TABS = ["asistencias", "tomar-clase"]
const TAB_LABELS = { asistencias: "Asistencias", "tomar-clase": "Tomar clase" }
const TAB_PRELOAD = { asistencias: loadAsistencias, "tomar-clase": loadTomarClase }

export default function PaseListaPage() {
  const [active, setActive] = useState("asistencias")
  const [catalogs, setCatalogs] = useState({ materias: [], asesores: [], capacitaciones: [], temas: [], estudiantes: [], usuarios: [], aulas: [] })
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
      <h2>Llamar lista</h2>
      <div className="toggle-group" role="tablist" aria-label="Módulos de llamar lista" style={{ marginTop: 12 }}>
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={active === key}
            type="button"
            className={active === key ? "toggle-chip active" : "toggle-chip"}
            onClick={() => setActive(key)}
            onMouseEnter={TAB_PRELOAD[key]}
            onFocus={TAB_PRELOAD[key]}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }} hidden={active !== "tomar-clase"}>
        <Suspense fallback={<Skeleton lines={6} />}>
          <TomarClaseTab catalogs={catalogs} onSaved={() => setListVersion((v) => v + 1)} />
        </Suspense>
      </div>

      {active === "asistencias" && (
        <div style={{ marginTop: 16 }}>
          <Suspense fallback={<Skeleton lines={5} />}>
            <AsistenciasTab catalogs={catalogs} version={listVersion} />
          </Suspense>
        </div>
      )}
    </section>
  )
}
