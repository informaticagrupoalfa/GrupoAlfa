import { useEffect, useState } from "react"
import TeacherAssignmentMatrix from "../../../components/features/capacitaciones/TeacherAssignmentMatrix"
import { apiClient } from "../../../services/apiClient"

const initialData = {
  capacitaciones: [],
  paralelos: [],
  asesores: [],
  asignacionesDocentes: [],
}

export default function AsignacionDocentesView() {
  const [data, setData] = useState(initialData)
  const [assignment, setAssignment] = useState(null)
  const [assignmentSlot, setAssignmentSlot] = useState(null)
  const [pickedAdvisor, setPickedAdvisor] = useState(null)
  const [pickedSubjectId, setPickedSubjectId] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    const endpoints = ["capacitaciones", "configuracion-paralelos", "asesores", "asignaciones-docentes-paralelo"]
    const values = await Promise.all(endpoints.map(path => apiClient.get(`/${path}`).then(response => response.data)))
    setData({
      capacitaciones: values[0],
      paralelos: values[1],
      asesores: values[2],
      asignacionesDocentes: values[3],
    })
  }

  useEffect(() => {
    reload()
      .catch(error => setMessage(error.userMessage || "No se pudieron cargar las asignaciones."))
      .finally(() => setLoading(false))
  }, [])

  const clearSelection = () => {
    setAssignment(null)
    setAssignmentSlot(null)
    setPickedAdvisor(null)
    setPickedSubjectId("")
  }

  const prepareAssignment = (parallel, day) => {
    if (busy) return
    clearSelection()
    setAssignmentSlot({ parallel, day })
    setMessage("")
  }

  const editAssignment = row => {
    setAssignment(row)
    setAssignmentSlot({
      parallel: data.paralelos.find(item => Number(item.id_paralelo) === Number(row.id_paralelo)),
      day: row.dias,
    })
    setPickedAdvisor(data.asesores.find(item => Number(item.id_asesor) === Number(row.id_asesor)) || null)
    setPickedSubjectId(String(row.id_materia))
    setMessage("")
  }

  const saveAssignment = async () => {
    if (!assignmentSlot || !pickedAdvisor || !pickedSubjectId || busy) return
    setBusy(true)
    setMessage("")
    const wasEditing = Boolean(assignment)
    try {
      const payload = {
        ...(assignment && { id_asesor_paralelo_materia: assignment.id_asesor_paralelo_materia }),
        id_asesor: pickedAdvisor.id_asesor,
        id_paralelo: assignmentSlot.parallel.id_paralelo,
        id_materia: Number(pickedSubjectId),
        dias: assignmentSlot.day,
      }
      if (assignment) await apiClient.put("/asignaciones-docentes-paralelo", payload)
      else await apiClient.post("/asignaciones-docentes-paralelo", payload)
      await reload()
      clearSelection()
      setMessage(wasEditing ? "Asignación actualizada." : "Asignación guardada.")
    } catch (error) {
      setMessage(error.userMessage || "No se pudo guardar la asignación.")
    } finally {
      setBusy(false)
    }
  }

  const deleteAssignment = async () => {
    if (!assignment || !window.confirm("¿Eliminar esta asignación docente?")) return
    setBusy(true)
    setMessage("")
    try {
      await apiClient.delete("/asignaciones-docentes-paralelo", {
        data: { id_asesor_paralelo_materia: assignment.id_asesor_paralelo_materia },
      })
      await reload()
      clearSelection()
      setMessage("Asignación eliminada.")
    } catch (error) {
      setMessage(error.userMessage || "No se pudo eliminar la asignación.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="muted">Cargando asignaciones docentes…</p>

  return <TeacherAssignmentMatrix
    data={data}
    assignment={assignment}
    assignmentSlot={assignmentSlot}
    pickedAdvisor={pickedAdvisor}
    pickedSubjectId={pickedSubjectId}
    busy={busy}
    message={message}
    onSelectAdvisor={advisor => { setPickedAdvisor(advisor); setMessage("") }}
    onSelectSubject={setPickedSubjectId}
    onEdit={editAssignment}
    onAssign={prepareAssignment}
    onSave={saveAssignment}
    onDelete={deleteAssignment}
    onCancel={() => { clearSelection(); setMessage("") }}
  />
}
