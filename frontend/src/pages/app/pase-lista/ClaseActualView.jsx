import { useEffect, useMemo, useState } from "react"
import { apiClient } from "../../../services/apiClient"
import { useRef } from "react"
import BrandLogo from "../../../components/ui/BrandLogo"
import FloatingAlert from "../../../components/ui/FloatingAlert"
import { coincideHorario, horarioActual } from "./horarioActual"
import { parseStudentQr } from "./llamarListaUtils"
import "./ClaseActualView.css"

const nameOf = student => [student.apellido_paterno, student.apellido_materno, student.nombre].filter(Boolean).join(" ")
const imageOf = data => {
  if (!data) return null
  const type = data.startsWith("/9j/") ? "jpeg" : data.startsWith("R0lGOD") ? "gif" : data.startsWith("UklGR") ? "webp" : "png"
  return "data:image/" + type + ";base64," + data
}
const errorOf = (error, fallback) => error?.userMessage || error?.response?.data?.message || error?.response?.data?.error || fallback

async function loadAttendances(classId) {
  const rows = []
  for (let offset = 0; ; offset += 100) {
    const response = await apiClient.get("/asistencias", { params: { id_clase: classId, limit: 100, offset } })
    rows.push(...response.data)
    if (response.data.length < 100) return rows
  }
}

export default function ClaseActualView() {
  const [clock, setClock] = useState(horarioActual)
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState([])
  const [photos, setPhotos] = useState({})
  const [attendances, setAttendances] = useState({})
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState("")
  const [tema, setTema] = useState("")
  const [message, setMessage] = useState("")
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [camera, setCamera] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const cameraRequestRef = useRef(0)
  const lastQrRef = useRef("")
  const scanRef = useRef(null)
  const registeringRef = useRef(false)
  const classRef = useRef(null)

  useEffect(() => {
    const interval = window.setInterval(() => setClock(horarioActual()), 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      apiClient.get("/llamar-lista/asignaciones", { params: { scope: "mine" } }),
      apiClient.get("/llamar-lista/clases", { params: { scope: "mine" } }),
    ]).then(([assignmentsResponse, classesResponse]) => {
      if (!active) return
      setAssignments(assignmentsResponse.data)
      setClasses(classesResponse.data)
    }).catch(() => { if (active) setMessage("No se pudieron cargar tus clases y asignaciones.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const matching = useMemo(() => assignments.filter(item => coincideHorario(item, clock, item.dias)), [assignments, clock])
  const assignment = matching.length === 1 ? matching[0] : null
  const currentClass = assignment && classes.find(item => String(item.fecha).slice(0, 10) === clock.fecha && String(item.id_asesor_paralelo_materia) === String(assignment.id_asesor_paralelo_materia))
  const parallelId = assignment?.id_paralelo
  const classId = currentClass?.id_clase
  classRef.current = classId

  useEffect(() => {
    setCamera(false)
    lastQrRef.current = ""
    return () => {
      cameraRequestRef.current += 1
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [classId, parallelId])

  useEffect(() => {
    setOpen(Boolean(classId))
    setTema(currentClass?.tema || "")
    setDialog(null)
    setMessage("")
  }, [classId, currentClass?.tema, assignment?.id_asesor_paralelo_materia, clock.fecha])

  useEffect(() => {
    let active = true
    setStudents([])
    setPhotos({})
    setAttendances({})
    setRosterError("")
    if (!open || !parallelId) return undefined
    setRosterLoading(true)
    Promise.all([
      apiClient.get("/llamar-lista/paralelos/" + parallelId + "/estudiantes"),
      classId ? loadAttendances(classId) : Promise.resolve([]),
    ]).then(([roster, records]) => {
      if (!active) return
      setStudents([...roster.data].sort((a, b) => nameOf(a).localeCompare(nameOf(b), "es")))
      setAttendances(Object.fromEntries(records.map(item => [String(item.id_estudiante), item])))
    }).catch(() => { if (active) setRosterError("No se pudo cargar la lista o las asistencias. Vuelve a abrir el formulario.") })
      .finally(() => { if (active) setRosterLoading(false) })
    apiClient.get("/llamar-lista/paralelos/" + parallelId + "/fotos")
      .then(({ data }) => { if (active) setPhotos(Object.fromEntries(data.map(item => [String(item.id_estudiante), item.foto_base64]))) })
      .catch(() => { if (active) setPhotos({}) })
    return () => { active = false }
  }, [open, parallelId, classId])

  const saveClass = async event => {
    event.preventDefault()
    if (busy || !assignment) return
    setBusy(true)
    setMessage("")
    try {
      if (classId) {
        const { data } = await apiClient.put("/clases/" + classId, { tema: tema.trim() })
        setClasses(current => current.map(item => item.id_clase === classId ? { ...item, tema: data.tema } : item))
        setMessage("Tema guardado.")
      } else {
        const { data } = await apiClient.post("/clases", {
          id_asesor_paralelo_materia: assignment.id_asesor_paralelo_materia,
          inicioclase: clock.fecha,
          tema: tema.trim(),
        })
        setClasses(current => [{ ...data, fecha: clock.fecha }, ...current])
        setMessage("Clase creada. Ya puedes registrar asistencias.")
      }
    } catch (error) { setMessage(errorOf(error, "No se pudo guardar la clase.")) }
    finally { setBusy(false) }
  }

  const register = async (student, scanned = false) => {
    if (busy || registeringRef.current || !classId) return
    registeringRef.current = true
    const targetClass = classId
    setBusy(true)
    try {
      const existing = attendances[String(student.id_estudiante)]
      const response = existing
        ? await apiClient.put("/asistencias/" + existing.id_asistencia, { permiso: null, razon_permiso: null })
        : await apiClient.post("/asistencias", { id_clase: classId, id_estudiante: student.id_estudiante, hora_entrada: new Date().toISOString() })
      if (classRef.current !== targetClass) return
      setAttendances(current => ({ ...current, [String(student.id_estudiante)]: response.data }))
      setDialog(scanned ? { student, status: "scanned", verification: response.data.verificacion } : null)
      setMessage("Asistencia registrada: " + nameOf(student) + ".")
    } catch (error) {
      if (classRef.current === targetClass) { setMessage(errorOf(error, "No se pudo registrar la asistencia.")); setDialog(null) }
    } finally { registeringRef.current = false; setBusy(false) }
  }

  scanRef.current = async raw => {
    const id = parseStudentQr(raw)
    const student = id && students.find(item => String(item.id_estudiante) === id)
    if (!student) {
      setMessage("QR no reconocido o estudiante no inscrito en este paralelo.")
      return
    }
    const existing = attendances[id]
    if (existing?.permiso === true) setDialog({ student, status: "permiso", record: existing })
    else if (existing && existing.permiso !== false) setMessage("La asistencia de " + nameOf(student) + " ya está registrada.")
    else await register(student, true)
  }

  const toggleCamera = async () => {
    if (streamRef.current) {
      cameraRequestRef.current += 1
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      lastQrRef.current = ""
      setCamera(false)
      return
    }
    if (!classId || rosterLoading || rosterError) return
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Escaneo QR no compatible con este navegador.")
      return
    }
    let detector
    try { detector = new window.BarcodeDetector({ formats: ["qr_code"] }) }
    catch { setMessage("El lector QR no está disponible en este navegador."); return }
    const requestId = ++cameraRequestRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (requestId !== cameraRequestRef.current || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      if (requestId !== cameraRequestRef.current) return
      setCamera(true)
      setMessage("Cámara activa. Apunta al QR del estudiante.")
      const scanFrame = async () => {
        if (streamRef.current !== stream) return
        try {
          await new Promise(resolve => window.setTimeout(resolve, 500))
          if (streamRef.current !== stream) return
          const codes = await detector.detect(videoRef.current)
          if (streamRef.current !== stream) return
          const raw = codes[0]?.rawValue ?? ""
          if (!raw) lastQrRef.current = ""
          else if (raw !== lastQrRef.current) {
            lastQrRef.current = raw
            await scanRef.current(raw)
          }
        } catch { /* Un fallo temporal de lectura no detiene la cámara. */ }
        if (streamRef.current === stream) requestAnimationFrame(scanFrame)
      }
      requestAnimationFrame(scanFrame)
    } catch {
      if (requestId !== cameraRequestRef.current) return
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCamera(false)
      setMessage("No se pudo abrir la cámara.")
    }
  }

  const fields = assignment && [
    ["Materia", assignment.nombre_materia],
    ["Asesor", assignment.nombre_asesor],
    ["Horario", String(assignment.hora_inicio || "").slice(0, 5) + " - " + String(assignment.hora_fin || "").slice(0, 5)],
    ["Capacitación", assignment.nombre_capacitacion || (assignment.id_capacitacion ? "Capacitación " + assignment.id_capacitacion : "No registrada")],
    ["Aula", assignment.aula_codigo],
    ["Nombre paralelo", assignment.nombre_paralelo],
  ]

  return <section className="clase-actual llamar-panel">
    <div className="clase-actual-heading">
      <div><h2>{assignment?.nombre_paralelo || "Clase actual"}</h2><p>Asignación correspondiente al día y horario actuales.</p></div>
      {assignment && !open && <button type="button" className="submit-button" onClick={() => setOpen(true)}>Crear clase</button>}
    </div>
    {loading && <p role="status">Cargando asignaciones…</p>}
    {!loading && !matching.length && <p>No tienes una asignación en este horario.</p>}
    {!loading && matching.length > 1 && <p role="alert">Tienes varias asignaciones en este horario. Solicita que se revise la programación antes de crear la clase.</p>}
    {message && <p className="clase-actual-message" role="status">{message}</p>}
    {open && assignment && <form onSubmit={saveClass}>
      <div className="clase-actual-header">
        <div className="clase-actual-logo"><BrandLogo size={90} /></div>
        <div className="clase-actual-fields">
          {fields.map(([label, value]) => <div className="clase-actual-field" key={label}><span>{label}</span><strong>{value || "No registrado"}</strong></div>)}
        </div>
      </div>
      <div className="clase-actual-scanner">
        <button type="button" className="secondary-button" disabled={!camera && (!classId || rosterLoading || Boolean(rosterError))} onClick={toggleCamera}>{camera ? "Cerrar cámara" : "Escanear QR de asistencia"}</button>
        <video ref={videoRef} className="llamar-video clase-actual-video" hidden={!camera} playsInline muted />
        {camera && <p>Apunta la cámara al QR del estudiante para registrar su asistencia.</p>}
      </div>
      <p className="clase-actual-legend"><span>■ Ausente</span><span>■ Presente</span><span>■ Permiso</span></p>
      {rosterLoading ? <p role="status">Cargando estudiantes…</p> : rosterError ? <p role="alert">{rosterError}</p> : <div className="clase-actual-table-wrap">
        <table className="clase-actual-table">
          <thead><tr><th>Nro</th><th>Apellidos y nombres</th><th>Nro carnet</th><th>Foto</th></tr></thead>
          <tbody>{students.map((student, index) => {
            const record = attendances[String(student.id_estudiante)]
            const status = record?.permiso === true ? "permiso" : record && record.permiso !== false ? "presente" : "ausente"
            const photo = imageOf(photos[String(student.id_estudiante)])
            const enabled = !busy && (Boolean(classId) || status === "permiso")
            return <tr key={student.id_estudiante} className={"clase-actual-" + status} onClick={() => { if (enabled) setDialog({ student, status, record }) }}>
              <td>{index + 1}</td><td><button type="button" className="clase-actual-student" disabled={!enabled} onClick={event => { event.stopPropagation(); setDialog({ student, status, record }) }}>{nameOf(student) || "Estudiante"} <small>({status})</small></button></td>
              <td>{student.nro_carnet || "—"}</td><td>{photo ? <img src={photo} alt={"Foto de " + nameOf(student)} loading="lazy" decoding="async" /> : <span className="clase-actual-avatar" aria-label="Sin foto">—</span>}</td>
            </tr>
          })}</tbody>
        </table>
        {!students.length && <p>No hay estudiantes registrados en este paralelo.</p>}
      </div>}
      {!classId && <p>Guarda la clase para habilitar el registro de asistencia.</p>}
      <div className="clase-actual-bottom">
        <label>Fecha<input type="date" value={clock.fecha} readOnly /></label>
        <label>Tema avanzado<input value={tema} onChange={event => setTema(event.target.value)} maxLength={100} required /></label>
        <button className="submit-button" type="submit" disabled={busy || rosterLoading || Boolean(rosterError)}>{busy ? "Guardando…" : classId ? "Guardar tema" : "Guardar clase"}</button>
      </div>
    </form>}
    {dialog && <FloatingAlert title={dialog.status === "permiso" ? "Motivo del permiso" : dialog.status === "presente" || dialog.status === "scanned" ? "Asistencia registrada" : "Confirmar asistencia"} onClose={() => setDialog(null)}>
      <p><strong>{nameOf(dialog.student)}</strong></p>
      {dialog.status === "permiso" ? <p>{dialog.record.razon_permiso || "No se registró un motivo."}</p> : dialog.status === "presente" ? <p>El estudiante ya tiene asistencia registrada.</p> : dialog.status === "scanned" ? <><p>Asistencia registrada correctamente.</p>{dialog.verification && <p>{dialog.verification.mensualidad_vigente ? "Mensualidad vigente." : "Sin mensualidad vigente."}</p>}</> : <><p>¿Registrar la asistencia de este estudiante?</p><button type="button" className="submit-button" disabled={busy} onClick={() => register(dialog.student)}>Confirmar asistencia</button></>}
    </FloatingAlert>}
  </section>
}
