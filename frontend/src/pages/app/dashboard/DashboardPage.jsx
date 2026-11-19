import { useNavigate } from "react-router-dom"
import DashboardHome from "../../../components/dashboard/DashboardHome"
import Card from "../../../components/ui/Card"
import { ENTITIES } from "../../../config/entities"

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <>
      <DashboardHome
        onNavigate={(key) => navigate(ENTITIES[key]?.path ?? "/app/dashboard")}
      />
      <section style={{ marginTop: 24 }}>
        <h2>Asistencia</h2>
        <p className="muted">Pasa lista por curso de capacitación.</p>
        <div className="cards">
          <Card label="Llamar lista" onClick={() => navigate("/app/pase-lista")}>
            <Card.Header>
              <span className="card-label">Llamar lista</span>
            </Card.Header>
            <Card.Body>
              <span className="card-count">✓</span>
            </Card.Body>
            <Card.Footer>
              <span className="card-link">Abrir pase de lista →</span>
            </Card.Footer>
          </Card>
        </div>
      </section>
    </>
  )
}
