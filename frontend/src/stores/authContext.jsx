import { createContext, useCallback, useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { fetchCurrentUser } from "../services/usersService"

const TOKEN_KEY = "ga_token"
const USER_KEY = "ga_user"
const ACTIVE_ROLE_KEY = "ga_active_role"

export const AuthContext = createContext(null)

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function readActiveRole() {
  try {
    return localStorage.getItem(ACTIVE_ROLE_KEY) || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const storedUser = readUser()
  const [loggedUser, setLoggedUser] = useState(storedUser)
  const [activeRole, setActiveRoleState] = useState(readActiveRole)
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  })

  const signIn = useCallback((user, nextToken = null) => {
    setLoggedUser(user)
    setActiveRoleState(user?.roles?.[0] || null)
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      if (nextToken) {
        localStorage.setItem(TOKEN_KEY, nextToken)
        setToken(nextToken)
      }
    } catch {
      // almacenamiento no disponible
    }
  }, [])

  const switchRole = useCallback((role) => {
    if (!loggedUser) return
    const roles = Array.isArray(loggedUser.roles) ? loggedUser.roles : []
    if (!roles.includes(role)) return
    setActiveRoleState(role)
    try {
      localStorage.setItem(ACTIVE_ROLE_KEY, role)
    } catch {
      // almacenamiento no disponible
    }
  }, [loggedUser])

  const signOut = useCallback(() => {
    setLoggedUser(null)
    setActiveRoleState(null)
    setToken(null)
    try {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ACTIVE_ROLE_KEY)
    } catch {
      // almacenamiento no disponible
    }
  }, [])

  // Refresca los roles y datos del usuario autenticado (también sesiones antiguas
  // guardadas antes de que el login incluyera los roles).
  useEffect(() => {
    if (!token) return undefined
    let active = true

    fetchCurrentUser()
      .then((user) => {
        if (active && user) signIn(user)
      })
      .catch((error) => {
        if (active && error?.response?.status === 401) signOut()
      })

    return () => {
      active = false
    }
  }, [token, signIn, signOut])

  const effectiveRole = activeRole || (loggedUser?.roles?.[0] || null)

  const value = useMemo(
    () => ({ loggedUser, token, activeRole: effectiveRole, signIn, switchRole, signOut }),
    [loggedUser, token, activeRole, effectiveRole, signIn, switchRole, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
