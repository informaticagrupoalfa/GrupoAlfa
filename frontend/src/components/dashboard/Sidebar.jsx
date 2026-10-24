import { NavLink } from "react-router-dom"
import BrandLogo from "../ui/BrandLogo"
import { ENTITIES, ENTITY_ORDER } from "../../config/entities"
import { canAccessModule } from "../../config/permissions"
import { useAuth } from "../../hooks/useAuth"

const lazyCrud = () => import("./CrudPage.jsx")
const lazyHome = () => import("./DashboardHome.jsx")
const lazyPaseLista = () => import("../../pages/app/PaseListaPage.jsx")

export default function Sidebar() {
  const { loggedUser } = useAuth()
  const visibleEntities = ENTITY_ORDER.filter(
    (key) => !ENTITIES[key].hideFromNav && canAccessModule(loggedUser, key),
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandLogo size={44} withName />
      </div>
      <nav aria-label="Navegación principal">
        {canAccessModule(loggedUser, "dashboard") && (
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            onMouseEnter={lazyHome}
            onFocus={lazyHome}
          >
            Dashboard
          </NavLink>
        )}
        {visibleEntities.map((key) => (
          <NavLink
            key={key}
            to={ENTITIES[key].path}
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            onMouseEnter={lazyCrud}
            onFocus={lazyCrud}
          >
            {ENTITIES[key].label}
          </NavLink>
        ))}
        {canAccessModule(loggedUser, "pase-lista") && (
          <NavLink
            to="/app/pase-lista"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            onMouseEnter={lazyPaseLista}
            onFocus={lazyPaseLista}
          >
            Llamar lista
          </NavLink>
        )}
      </nav>
    </aside>
  )
}
