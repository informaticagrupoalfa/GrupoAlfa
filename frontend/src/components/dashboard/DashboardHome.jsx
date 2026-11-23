import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { ENTITIES, ENTITY_ORDER } from "../../config/entities"
import { canAccessModule } from "../../config/permissions"
import { useAuth } from "../../hooks/useAuth"
import { apiClient } from "../../services/apiClient"
import Card from "../ui/Card"
import Skeleton from "../ui/Skeleton"
import ScheduleMatrix from "./ScheduleMatrix"
import "./DashboardHome.css"

function shortenLabel(value, max = 24) {
  const text = String(value ?? "")
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function OccupancyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{point.nombre_paralelo}</p>
      <p>{point.aula}</p>
      <p><strong>{point.ocupados}</strong> ocupados de {point.capacidad} plazas</p>
      {point.ocupados > point.capacidad && <p>Exceso: {point.ocupados - point.capacidad}</p>}
    </div>
  )
}

OccupancyTooltip.propTypes = { active: PropTypes.bool, payload: PropTypes.array }

export default function DashboardHome({ onNavigate }) {
  const { loggedUser } = useAuth()
  const visibleKeys = useMemo(() => ENTITY_ORDER.filter((key) => canAccessModule(loggedUser, key)), [loggedUser])
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    apiClient.get("/dashboard/resumen")
      .then(({ data }) => { if (mounted) setSummary(data) })
      .catch((requestError) => {
        if (mounted) setError(requestError.userMessage || "No se pudieron cargar los datos del dashboard.")
      })
      .finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [])

  const occupancy = useMemo(() => {
    const rooms = new Map((summary?.aulas ?? []).map((room) => [String(room.id_aula), room]))
    return (summary?.paralelos ?? []).map((paralelo) => {
      const room = rooms.get(String(paralelo.id_aula))
      const capacidad = Number(room?.capacidad) || 0
      const ocupados = Number(paralelo.ocupados) || 0
      const aula = room?.codigo || (room ? `Aula ${room.id_aula}` : "Sin aula")
      return {
        nombre_paralelo: paralelo.nombre_paralelo,
        etiqueta: `${paralelo.nombre_paralelo} · ${aula}`,
        aula, capacidad, ocupados,
        libres: Math.max(capacidad - ocupados, 0),
      }
    })
  }, [summary])

  if (isLoading) return <Skeleton lines={5} />
  if (error) return <p className="error-message" role="alert">{error}</p>

  return (
    <section className="dashboard-overview">
      <h2>Resumen académico</h2>
      <p className="muted">Cifras actuales de usuarios, cursos, aulas e inscripciones.</p>

      <div className="cards">
        {visibleKeys.map((key) => (
          <Card key={key} onClick={() => onNavigate(key)} label={ENTITIES[key].label}>
            <Card.Header><span className="card-label">{ENTITIES[key].label}</span></Card.Header>
            <Card.Body><span className="card-count">{summary?.counts?.[key] ?? "—"}</span></Card.Body>
            <Card.Footer><span className="card-link">Abrir módulo</span></Card.Footer>
          </Card>
        ))}
      </div>

      <div className="dashboard-charts">
        <section className="chart-panel">
          <h3>Usuarios por rol</h3>
          {!summary?.roles?.length ? <p className="muted">No hay roles registrados.</p> : (
            <div className="chart-wrap" style={{ height: Math.max(300, summary.roles.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.roles} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" width={138} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [value, "Usuarios"]} />
                  <Bar dataKey="cantidad" name="Usuarios" fill="#146b85" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="chart-panel">
          <h3>Cupos por paralelo</h3>
          <p className="muted chart-panel-hint">Cada barra compara estudiantes inscritos con la capacidad de su aula.</p>
          {!occupancy.length ? <p className="muted">No hay paralelos registrados.</p> : (
            <div className="chart-wrap" style={{ height: Math.max(340, occupancy.length * 38) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancy} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="etiqueta" width={132} tick={{ fontSize: 12 }} tickFormatter={(value) => shortenLabel(value, 20)} />
                  <Tooltip content={<OccupancyTooltip />} />
                  <Legend />
                  <Bar dataKey="ocupados" name="Inscritos" stackId="cupos" fill="#146b85" maxBarSize={22} />
                  <Bar dataKey="libres" name="Libres" stackId="cupos" fill="#cfdee2" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <ScheduleMatrix aulas={summary?.aulas ?? []} paralelos={summary?.paralelos ?? []} />
    </section>
  )
}

DashboardHome.propTypes = { onNavigate: PropTypes.func.isRequired }
