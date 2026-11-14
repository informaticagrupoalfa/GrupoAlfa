import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts"
import { ENTITIES, ENTITY_ORDER } from "../../config/entities"
import { canAccessModule } from "../../config/permissions"
import { useAuth } from "../../hooks/useAuth"
import { listResource } from "../../services/academicService"
import Card from "../ui/Card"
import Skeleton from "../ui/Skeleton"

function safeRows(data) {
  return Array.isArray(data) ? data : []
}

function shortenLabel(value, max = 22) {
  const text = String(value ?? "")
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function OccupancyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{point.capacitacion ?? point.curso}</p>
      <p>{point.aula}</p>
      <p>
        <strong>{point.ocupados}</strong> de {point.capacidad} estudiantes ({point.porcentaje}%)
      </p>
    </div>
  )
}

OccupancyTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
}

export default function DashboardHome({ onNavigate }) {
  const { loggedUser } = useAuth()
  const visibleKeys = useMemo(
    () => ENTITY_ORDER.filter((key) => canAccessModule(loggedUser, key)),
    [loggedUser],
  )

  const [resources, setResources] = useState({})
  const [counts, setCounts] = useState({})
  const [rolesData, setRolesData] = useState([])
  const [asignacionesRolData, setAsignacionesRolData] = useState([])
  const [aulasData, setAulasData] = useState([])
  const [paralelosData, setParalelosData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      setError("")
      try {
        const [
          usuariosResult,
          materiasResult,
          asesoresResult,
          capacitacionesResult,
          inscripcionesResult,
          temasResult,
          estudiantesResult,
          rolesResult,
          asignacionesRolResult,
          aulasResult,
          paralelosResult,
        ] = await Promise.allSettled([
          listResource(ENTITIES.usuarios.endpoint),
          listResource(ENTITIES.materias.endpoint),
          listResource(ENTITIES.asesores.endpoint),
          listResource(ENTITIES.capacitaciones.endpoint),
          listResource(ENTITIES.inscripciones.endpoint),
          listResource(ENTITIES.temas.endpoint),
          listResource(ENTITIES.estudiantes.endpoint),
          listResource("roles"),
          listResource("asignaciones-rol"),
          listResource("aulas"),
          listResource(ENTITIES.paralelos.endpoint),
        ])

        const safe = (result) =>
          result.status === "fulfilled" ? safeRows(result.value) : []

        const recursos = {
          usuarios: safe(usuariosResult),
          materias: safe(materiasResult),
          asesores: safe(asesoresResult),
          capacitaciones: safe(capacitacionesResult),
          inscripciones: safe(inscripcionesResult),
          temas: safe(temasResult),
          estudiantes: safe(estudiantesResult),
        }

        const rolesData = safe(rolesResult)
        const asignacionesRolData = safe(asignacionesRolResult)
        const aulasData = safe(aulasResult)
        const paralelosData = safe(paralelosResult)

        if (mounted) {
          setResources(recursos)
          setRolesData(rolesData)
          setAsignacionesRolData(asignacionesRolData)
          setAulasData(aulasData)
          setParalelosData(paralelosData)
          setCounts(
            Object.fromEntries(
              Object.entries(recursos).map(([k, v]) => [k, v.length]),
            ),
          )
        }
      } catch {
        if (mounted) setError("No se pudo cargar los datos del dashboard.")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const rolesPorUsuario = useMemo(() => {
    const conteo = {}
    asignacionesRolData.forEach((asig) => {
      const rolId = asig.id_rol
      const rol = rolesData.find((r) => r.id_rol === rolId)
      const nombre = rol ? rol.nombre : `Rol ${rolId}`
      conteo[nombre] = (conteo[nombre] ?? 0) + 1
    })
    return Object.entries(conteo).map(([nombre, cantidad]) => ({ nombre, cantidad }))
  }, [rolesData, asignacionesRolData])

  const ocupacionPorCapacitacion = useMemo(() => {
    const capacitaciones = resources.capacitaciones ?? []
    const aulas = aulasData ?? []
    const inscripciones = resources.inscripciones ?? []
    const paralelos = paralelosData ?? []

    const mapaAulas = new Map(aulas.map((a) => [String(a.id_aula), a]))
    const mapaParalelos = new Map(paralelos.map((p) => [String(p.id_paralelo), p]))

    const estudiantesPorCurso = new Map()
    inscripciones.forEach((i) => {
      const paralelo = mapaParalelos.get(String(i.id_paralelo))
      if (!paralelo) return
      const cursoId = String(paralelo.id_capacitacion)
      if (!estudiantesPorCurso.has(cursoId)) estudiantesPorCurso.set(cursoId, new Set())
      estudiantesPorCurso.get(cursoId).add(String(i.id_estudiante))
    })

    return capacitaciones.map((c) => {
      const paralelo = paralelos.find((p) => String(p.id_capacitacion) === String(c.id_capacitacion))
      const aula = mapaAulas.get(String(paralelo?.id_aula))
      const capacidad = Number(aula?.capacidad) || 0
      const ocupados = estudiantesPorCurso.get(String(c.id_capacitacion))?.size ?? 0
      const porcentaje = capacidad > 0 ? Math.min((ocupados / capacidad) * 100, 100) : 0
      const aulaLabel = aula ? `Aula ${aula.id_aula}` : "Sin aula"
      const capacitacionLabel = c.nombre || `Capacitación ${c.id_capacitacion}`
      return {
        curso: capacitacionLabel,
        capacitacion: capacitacionLabel,
        aula: aulaLabel,
        capacidad,
        ocupados,
        porcentaje: Math.round(porcentaje),
      }
    })
  }, [resources, aulasData, paralelosData])

  if (isLoading) return <Skeleton lines={5} />
  if (error) return <p className="error-message">{error}</p>

  return (
    <section>
      <h2>Resumen académico</h2>
      <p className="muted">Datos reales de la base de datos: usuarios, materias, asesores, capacitaciones, inscripciones, temas y estudiantes.</p>

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

      <div className="dashboard-grid">
        <section className="chart-panel">
          <h3>Usuarios por rol (Barras)</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rolesPorUsuario}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#2196f3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="chart-panel chart-panel-wide">
          <h3>Ocupación en aula por curso (Dispersión)</h3>
          <p className="muted chart-panel-hint">
            Eje Y: cursos. Eje X: porcentaje de ocupación del aula. Cada punto representa un curso.
          </p>
          {ocupacionPorCapacitacion.length === 0 ? (
            <p className="muted">No hay capacitaciones registradas para mostrar la ocupación.</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={340}>
                <ScatterChart margin={{ top: 12, right: 24, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="porcentaje"
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                    label={{ value: "Ocupación en aula (%)", position: "insideBottom", offset: -14 }}
                  />
                  <YAxis
                    dataKey="curso"
                    type="category"
                    allowDuplicatedCategory={false}
                    interval={0}
                    width={180}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => shortenLabel(value, 24)}
                    label={{ value: "Curso", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip content={<OccupancyTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name="Ocupación" data={ocupacionPorCapacitacion} fill="#2196f3" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

DashboardHome.propTypes = {
  onNavigate: PropTypes.func.isRequired,
}
