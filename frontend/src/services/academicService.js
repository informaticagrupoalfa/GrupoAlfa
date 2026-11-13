import { apiClient } from "./apiClient"

export async function listResource(endpoint, params) {
  const response = await apiClient.get(`/${endpoint}`, { params })
  return response.data
}

export async function getResourceById(endpoint, id) {
  const response = await apiClient.get(`/${endpoint}/${id}`)
  return response.data
}

export async function createResource(endpoint, payload) {
  const response = await apiClient.post(`/${endpoint}`, payload)
  return response.data
}

export async function updateResource(endpoint, id, payload) {
  const response = await apiClient.put(`/${endpoint}/${id}`, payload)
  return response.data
}

export async function deleteResource(endpoint, id) {
  await apiClient.delete(`/${endpoint}/${id}`)
}

export async function getCapacitacionesActivas() {
  const response = await apiClient.get("/capacitaciones/activas")
  return Array.isArray(response.data) ? response.data : []
}

export async function registrarEstudiante(payload) {
  const response = await apiClient.post("/inscripciones/registrar-estudiante", payload)
  return response.data
}
