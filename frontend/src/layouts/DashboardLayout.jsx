import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Sidebar from "../components/dashboard/Sidebar"
import { ENTITIES } from "../config/entities"
import { useAuth } from "../hooks/useAuth"

export default function DashboardLayout() {
  const { loggedUser, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const key = location.pathname.split("/")[2] ?? "dashboard"
  const title =
    key === "dashboard"
      ? "Dashboard"
      : key === "pase-lista"
        ? "Llamar lista"
        : key === "sin-acceso"
          ? "Acceso denegado"
          : (ENTITIES[key]?.label ?? "Dashboard")

  const handleSignOut = () => {
    signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Grupo Alfa</p>
            <h1>{title}</h1>
          </div>
          <div className="header-user">
            <span className="muted">{loggedUser?.nombre ?? "Usuario"}</span>
            <button className="secondary-button small" type="button" onClick={handleSignOut}>
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
