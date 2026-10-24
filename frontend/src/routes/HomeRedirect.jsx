import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { getDefaultAppPath } from "../config/permissions"

export default function HomeRedirect() {
  const { loggedUser } = useAuth()

  if (!loggedUser) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getDefaultAppPath(loggedUser)} replace />
}
