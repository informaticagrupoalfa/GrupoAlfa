import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { ENTITIES, ENTITY_ORDER } from "../../config/entities"
import { canAccessModule } from "../../config/permissions"
import { useAuth } from "../../hooks/useAuth"
import { listResource } from "../../services/academicService"
import Card from "../ui/Card"
import Skeleton from "../ui/Skeleton"

export default function DashboardHome({ onNavigate }) {
  const { loggedUser } = useAuth()
  const visibleKeys = useMemo(
    () => ENTITY_ORDER.filter((key) => canAccessModule(loggedUser, key)),
    [loggedUser],
  )
  const [counts, setCounts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      setError("")
      try {
        const entries = await Promise.all(
          visibleKeys.map(async (key) => {
            try {
              const rows = await listResource(ENTITIES[key].endpoint)
              return [key, Array.isArray(rows) ? rows.length : 0]
            } catch {
              return [key, null]
            }
          }),
        )
        if (mounted) setCounts(Object.fromEntries(entries))
      } catch {
        if (mounted) setError("No se pudo cargar el resumen.")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [visibleKeys])

  if (isLoading) return <Skeleton lines={5} />
  if (error) return <p className="error-message">{error}</p>

  return (
    <section>
      <h2>Resumen académico</h2>
      <p className="muted">Primera pantalla del panel lateral. Elige un módulo para gestionar.</p>
      <div className="cards">
        {visibleKeys.map((key) => (
          <Card key={key} onClick={() => onNavigate(key)} label={ENTITIES[key].label}>
            <Card.Header>
              <span className="card-label">{ENTITIES[key].label}</span>
            </Card.Header>
            <Card.Body>
              <span className="card-count">{counts[key] ?? "—"}</span>
            </Card.Body>
            <Card.Footer>
              <span className="card-link">Abrir CRUD →</span>
            </Card.Footer>
          </Card>
        ))}
      </div>
    </section>
  )
}

DashboardHome.propTypes = {
  onNavigate: PropTypes.func.isRequired,
}
