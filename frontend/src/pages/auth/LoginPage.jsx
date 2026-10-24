import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { LoginScreen } from "../../components/features/auth/LoginScreen"
import { useAuth } from "../../hooks/useAuth"
import { canAccessPath, getDefaultAppPath } from "../../config/permissions"

export default function LoginPage() {
  const { loggedUser, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const target = from && canAccessPath(loggedUser, from) ? from : getDefaultAppPath(loggedUser)

  if (loggedUser) {
    return <Navigate to={target} replace />
  }

  return (
    <LoginScreen
      isLoading={false}
      serverError=""
      onSignIn={(user, token) => {
        signIn(user, token)
        const nextPath = from && canAccessPath(user, from) ? from : getDefaultAppPath(user)
        navigate(nextPath, { replace: true })
      }}
      onGoRegister={() => navigate("/registro")}
    />
  )
}
