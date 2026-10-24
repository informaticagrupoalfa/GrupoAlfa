import { Link } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { getDefaultAppPath } from "../../config/permissions"

export default function ForbiddenPage() {
  const { loggedUser } = useAuth()
  const defaultPath = getDefaultAppPath(loggedUser)
  const roles = Array.isArray(loggedUser?.roles) ? loggedUser.roles : []

  return (
    <section className="error-panel">
      <h2>Acceso denegado</h2>
      <p className="muted">
        Tu usuario no tiene permisos para abrir esta sección.
      </p>
      <p className="muted">
        {roles.length > 0
          ? `Roles asignados: ${roles.join(", ")}.`
          : "Tu usuario no tiene roles asignados. Solicita acceso a un administrador."}
      </p>
      {defaultPath !== "/app/sin-acceso" && (
        <Link to={defaultPath}>Ir a una sección disponible</Link>
      )}
    </section>
  )
}
