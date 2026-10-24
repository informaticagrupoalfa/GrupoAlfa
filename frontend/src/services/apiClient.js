import axios from "axios"

export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: import.meta.env.VITE_APP_NAME ?? "GrupoAlfa",
  mode: import.meta.env.MODE,
}

export const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 10000,
})

apiClient.interceptors.request.use((request) => {
  const token = localStorage.getItem("ga_token")
  if (token) {
    request.headers.Authorization = `Bearer ${token}`
  }
  return request
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      localStorage.removeItem("ga_token")
      localStorage.removeItem("ga_user")
    }
    if (status === 409) {
      error.userMessage =
        error?.response?.data?.message ??
        "Conflicto: referencia duplicada o registro en uso."
    } else if (status === 400) {
      error.userMessage =
        error?.response?.data?.message ?? "Datos inválidos. Revisa el formulario."
    } else if (status === 403) {
      error.userMessage =
        error?.response?.data?.error ?? "No tienes permisos para realizar esta acción."
    } else if (status === 404) {
      error.userMessage = "Registro no encontrado."
    } else if (!error?.response) {
      error.userMessage = "No se pudo conectar con el servidor. Intenta nuevamente."
    }
    return Promise.reject(error)
  },
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    apiClient.interceptors.request.clear()
    apiClient.interceptors.response.clear()
  })
}
