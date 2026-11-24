import { apiClient } from "../../../services/apiClient"

export const dateOf = value => String(value ?? "").slice(0, 10)

export async function fetchAllClasses(path, params) {
  const rows = []
  for (let offset = 0; ; offset += 100) {
    const { data } = await apiClient.get(path, { params: { ...params, limit: 100, offset } })
    if (!Array.isArray(data)) throw new Error("La respuesta del servidor no es válida.")
    rows.push(...data)
    if (data.length < 100) return rows
  }
}
