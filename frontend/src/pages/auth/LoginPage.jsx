import { useEffect, useRef, useState } from "react"
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { LoginScreen } from "../../components/features/auth/LoginScreen"
import { useAuth } from "../../hooks/useAuth"
import { canAccessPath, getDefaultAppPath } from "../../config/permissions"
import { loginUsuario } from "../../services/usersService"

// Acceso directo para demostraciones:
// /login?correo=cuenta@example.com&clave=contraseña
// Las credenciales viajan en la URL, por lo que solo debe usarse con cuentas ficticias.
export default function LoginPage() {
  const { loggedUser, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const autoEmail = searchParams.get("correo")?.trim() ?? ""
  const autoPassword = searchParams.get("clave") ?? ""
  const hasAutoLogin = Boolean(autoEmail && autoPassword)
  const sessionMatchesAutoLogin = Boolean(loggedUser && loggedUser.correo_electronico === autoEmail)
  const shouldAutoLogin = hasAutoLogin && !sessionMatchesAutoLogin
  const [autoLoginPending, setAutoLoginPending] = useState(shouldAutoLogin)
  const [autoLoginError, setAutoLoginError] = useState("")
  const attemptedAutoLogin = useRef(false)
  const from = location.state?.from
  const target = from && canAccessPath(loggedUser, from) ? from : getDefaultAppPath(loggedUser)

  useEffect(() => {
    if (!shouldAutoLogin || attemptedAutoLogin.current) return undefined
    attemptedAutoLogin.current = true
    setAutoLoginPending(true)
    setAutoLoginError("")

    loginUsuario({ correo_electronico: autoEmail, contraseña: autoPassword })
      .then(({ user, token }) => {
        signIn(user, token)
        const nextPath = from && canAccessPath(user, from) ? from : getDefaultAppPath(user)
        navigate(nextPath, { replace: true })
      })
      .catch((error) => {
        setAutoLoginPending(false)
        setAutoLoginError(error.userMessage ?? "No se pudo iniciar sesión automáticamente.")
      })

    return undefined
  }, [shouldAutoLogin, autoEmail, autoPassword, signIn, navigate, from])

  if (loggedUser && !shouldAutoLogin) {
    return <Navigate to={target} replace />
  }

  return (
    <LoginScreen
      isLoading={autoLoginPending}
      serverError={autoLoginError}
      onSignIn={(user, token) => {
        signIn(user, token)
        const nextPath = from && canAccessPath(user, from) ? from : getDefaultAppPath(user)
        navigate(nextPath, { replace: true })
      }}
      onGoRegister={() => navigate("/registro")}
    />
  )
}
