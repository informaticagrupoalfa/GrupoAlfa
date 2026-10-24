import { Navigate } from "react-router-dom"
import PropTypes from "prop-types"
import { useAuth } from "../../hooks/useAuth"
import { canAccessModule } from "../../config/permissions"

export default function RequireModuleAccess({ moduleKey, children }) {
  const { loggedUser } = useAuth()

  if (!canAccessModule(loggedUser, moduleKey)) {
    return <Navigate to="/app/sin-acceso" replace />
  }

  return children
}

RequireModuleAccess.propTypes = {
  moduleKey: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}
