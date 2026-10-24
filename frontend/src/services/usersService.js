import { apiClient } from "./apiClient"

const LEGACY_USERS_URL = "http://localhost:4000/api/usuarios"

function toUserMessage(error, fallback) {
  return (
    error?.userMessage ??
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    fallback
  )
}

export async function fetchUsers() {
  try {
    const response = await apiClient.get("/usuarios")
    return response.data
  } catch {
    const response = await apiClient.get(LEGACY_USERS_URL)
    return response.data
  }
}

export async function fetchCurrentUser() {
  const response = await apiClient.get("/usuarios/me")
  return response.data
}

export async function fetchRoleCatalog() {
  const response = await apiClient.get("/roles")
  return Array.isArray(response.data) ? response.data : []
}

export async function updateUsuarioRoles(idUsuario, roles) {
  const response = await apiClient.put(`/usuarios/${idUsuario}/roles`, { roles })
  return Array.isArray(response.data?.roles) ? response.data.roles : []
}

export async function registerUsuario(payload) {
  try {
    const response = await apiClient.post("/usuarios", payload)
    const { datos, token } = response.data ?? {}
    return { user: datos ?? response.data, token: token ?? null }
  } catch (error) {
    error.userMessage = toUserMessage(error, "No se pudo crear la cuenta. Intenta nuevamente.")
    throw error
  }
}

export async function loginUsuario({ correo_electronico, contraseña }) {
  try {
    const response = await apiClient.post("/usuarios/login", {
      correo_electronico,
      contraseña,
    })
    const { datos, token } = response.data ?? {}
    return { user: datos ?? response.data, token: token ?? null }
  } catch (error) {
    const status = error?.response?.status
    error.userMessage = toUserMessage(
      error,
      status === 401 ? "El correo o la contraseña no son correctos." : "No se pudo iniciar sesión.",
    )
    throw error
  }
}
