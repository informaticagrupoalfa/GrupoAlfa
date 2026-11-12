import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import Sidebar from "../components/dashboard/Sidebar"
import ModuleNavbar from "../components/dashboard/ModuleNavbar"
import RoleSelector from "../components/dashboard/RoleSelector"
import { ENTITIES } from "../config/entities"
import { getModuleTabConfig } from "../config/moduleTabs"
import { useAuth } from "../hooks/useAuth"

export default function DashboardLayout() {
  const { loggedUser, signOut, activeRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const key = location.pathname.split("/")[2] ?? "dashboard"
  const tabConfig = getModuleTabConfig(key)
  const title =
    key === "dashboard"
      ? "Dashboard"
      : key === "pase-lista"
        ? "Llamar lista"
        : key === "perfil"
          ? "Mi perfil"
          : key === "datos"
            ? "Explorador de datos"
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
            <div>
              <span className="muted">{loggedUser?.nombre ?? "Usuario"}</span>
              {activeRole && <span className="muted"> ({activeRole})</span>}
            </div>
            <div>
              <RoleSelector />
            </div>
            <div>
              <Link className="header-profile-link" to="/app/perfil">
                Mi perfil
              </Link>
            </div>
            <div>
              <button className="secondary-button small" type="button" onClick={handleSignOut}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>
        <ModuleNavbar config={tabConfig} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
