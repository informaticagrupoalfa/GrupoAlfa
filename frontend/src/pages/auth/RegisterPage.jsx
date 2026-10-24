import { Navigate, useNavigate } from "react-router-dom"
import RegisterScreen from "../../components/features/auth/RegisterScreen"
import { useAuth } from "../../hooks/useAuth"
import { getDefaultAppPath } from "../../config/permissions"

export default function RegisterPage() {
  const { loggedUser, signIn } = useAuth()
  const navigate = useNavigate()

  if (loggedUser) {
    return <Navigate to={getDefaultAppPath(loggedUser)} replace />
  }

  return (
    <RegisterScreen
      onRegistered={(user, token) => {
        signIn(user, token)
        navigate(getDefaultAppPath(user), { replace: true })
      }}
      onGoLogin={() => navigate("/login")}
    />
  )
}
