import { useEffect, useMemo, useState } from "react"
import { apiClient } from "../../../services/apiClient"
import { useRef } from "react"
import ClaseInfoHeader from "./ClaseInfoHeader"
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
  const [editing, setEditing] = useState(false)
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
  const [scanPermit, setScanPermit] = useState(false)
  const [permitReason, setPermitReason] = useState("")
  const [cameraAvailability, setCameraAvailability] = useState("unknown")
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
    const media = navigator.mediaDevices
    if (!media?.enumerateDevices || !media?.getUserMedia) return undefined
    let active = true
    const checkCameras = async () => {
      try {
        const cameras = (await media.enumerateDevices()).filter(device => device.kind === "videoinput")
        if (!active) return
        if (!cameras.length) setCameraAvailability("missing")
        else if (cameras.some(device => /back|rear|environment|trasera|posterior/i.test(device.label))) setCameraAvailability("available")
        else if (cameras.every(device => device.label && /front|user|frontal|facetime/i.test(device.label))) setCameraAvailability("missing")
        else setCameraAvailability("unknown")
      } catch {
        if (active) setCameraAvailability("unknown")
      }
    }
    checkCameras()
    media.addEventListener?.("devicechange", checkCameras)
    return () => { active = false; media.removeEventListener?.("devicechange", checkCameras) }
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
  const open = Boolean(classId)
  classRef.current = classId

  useEffect(() => {
    setCamera(false)
    lastQrRef.current = ""
    setScanPermit(false)
    setPermitReason("")
    return () => {
      cameraRequestRef.current += 1
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [classId, parallelId])

  useEffect(() => {
    setTema(currentClass?.tema || "")
    setEditing(false)
    setDialog(null)
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
    if (busy || !assignment || !tema.trim() || (classId && !editing)) return
    setBusy(true)
    setMessage("")
    try {
      if (classId) {
        const { data } = await apiClient.put("/clases/" + classId, { tema: tema.trim() })
        setClasses(current => current.map(item => item.id_clase === classId ? { ...item, tema: data.tema } : item))
        setEditing(false)
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

  const register = async (student, scanned = false, permit = false, reason = "") => {
    if (busy || registeringRef.current || !classId) return
    if (permit && !reason.trim()) {
      setMessage("Escribe la razón del permiso antes de escanear al estudiante.")
      return
    }
    registeringRef.current = true
    const targetClass = classId
    setBusy(true)
    try {
      const existing = attendances[String(student.id_estudiante)]
      const status = { permiso: permit ? true : null, razon_permiso: permit ? reason.trim() : null }
      const response = existing
        ? await apiClient.put("/asistencias/" + existing.id_asistencia, status)
        : await apiClient.post("/asistencias", { id_clase: classId, id_estudiante: student.id_estudiante, hora_entrada: new Date().toISOString(), ...(permit ? { permiso: true, razon_permiso: reason.trim() } : {}) })
      if (classRef.current !== targetClass) return
      setAttendances(current => ({ ...current, [String(student.id_estudiante)]: response.data }))
      if (scanned && permit) { setScanPermit(false); setPermitReason("") }
      const request = Symbol("ficha")
      setDialog({ student, status: "registered", request, verification: response.data.verificacion, loading: true })
      setMessage((permit ? "Permiso registrado: " : "Asistencia registrada: ") + nameOf(student) + ".")
      apiClient.get(`/llamar-lista/clases/${targetClass}/estudiantes/${student.id_estudiante}/ficha`, { params: { scope: "mine" } })
        .then(({ data }) => {
          if (classRef.current === targetClass) setDialog(current => current?.request === request ? { ...current, detail: data, loading: false } : current)
        })
        .catch(() => {
          if (classRef.current === targetClass) setDialog(current => current?.request === request ? { ...current, loading: false, detailError: true } : current)
        })
    } catch (error) {
      if (classRef.current === targetClass) { setMessage(errorOf(error, "No se pudo registrar la asistencia.")); setDialog(null) }
    } finally { registeringRef.current = false; setBusy(false) }
  }

  scanRef.current = async raw => {
    if (dialog || busy) return
    const id = parseStudentQr(raw)
    const student = id && students.find(item => String(item.id_estudiante) === id)
    if (!student) {
      setMessage("QR no reconocido o estudiante no inscrito en este paralelo.")
      return
    }
    const existing = attendances[id]
    if (existing?.permiso === true) setDialog({ student, status: "permiso", record: existing })
    else if (existing && existing.permiso !== false) setMessage("La asistencia de " + nameOf(student) + " ya está registrada.")
    else await register(student, true, scanPermit, permitReason)
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } })
      if (requestId !== cameraRequestRef.current || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      setCameraAvailability("available")
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
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCamera(false)
      if (error.name === "NotFoundError" || error.name === "OverconstrainedError" || error.name === "DevicesNotFoundError") {
        setCameraAvailability("missing")
        setMessage("No se encontró una cámara trasera.")
      } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setMessage("No se permitió el acceso a la cámara. Revisa los permisos del navegador.")
      } else {
        setMessage("No se pudo abrir la cámara.")
      }
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
    </div>
    {loading && <p role="status">Cargando asignaciones…</p>}
    {!loading && !matching.length && <p>No tienes una asignación en este horario.</p>}
    {!loading && matching.length > 1 && <p role="alert">Tienes varias asignaciones en este horario. Solicita que se revise la programación antes de crear la clase.</p>}
    {message && <p className="clase-actual-message" role="status">{message}</p>}
    {assignment && <form className="clase-actual-controls" onSubmit={saveClass}>
      <label htmlFor="clase-actual-tema">Tema a avanzar
        <input id="clase-actual-tema" value={tema} onChange={event => setTema(event.target.value)} maxLength={100} readOnly={Boolean(classId) && !editing} required />
      </label>
      {classId && !editing
        ? <button type="button" className="submit-button" disabled={busy} onClick={() => setEditing(true)}>Modificar clase</button>
        : <>
          {classId && <button type="button" className="secondary-button" disabled={busy} onClick={() => { setTema(currentClass?.tema || ""); setEditing(false) }}>Cancelar</button>}
          <button type="submit" className="submit-button" disabled={busy || !tema.trim()}>{busy ? "Guardando…" : classId ? "Guardar cambios" : "Crear clase"}</button>
        </>}
    </form>}
    {open && assignment && <div>
      <ClaseInfoHeader fields={fields} />
      <div className="clase-actual-scanner">
        <div className="clase-actual-scan-options">
          <button type="button" className="secondary-button clase-actual-camera-button" disabled={!camera && (cameraAvailability === "missing" || !classId || rosterLoading || Boolean(rosterError))} onClick={toggleCamera}>{camera ? "Cerrar cámara" : cameraAvailability === "missing" ? "Cámara no encontrada" : "Escanear QR de asistencia"}</button>
          <label className="clase-actual-scan-permit"><input type="checkbox" checked={scanPermit} disabled={busy} onChange={event => { setScanPermit(event.target.checked); if (!event.target.checked) setPermitReason("") }} /> Escanear con permiso</label>
          {scanPermit && <label className="clase-actual-permit-reason">Razón del permiso<input type="text" value={permitReason} disabled={busy} maxLength={150} onChange={event => setPermitReason(event.target.value)} /></label>}
        </div>
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
      <div className="clase-actual-bottom">
        <label>Fecha<input type="date" value={clock.fecha} readOnly /></label>
      </div>
    </div>}
    {dialog && <FloatingAlert title={dialog.status === "permiso" ? "Motivo del permiso" : dialog.status === "presente" || dialog.status === "registered" ? "Asistencia registrada" : "Confirmar asistencia"} onClose={() => setDialog(null)}>
      {dialog.status === "registered" ? <div className="clase-actual-registration">
        {imageOf(dialog.detail?.foto_base64 || photos[String(dialog.student.id_estudiante)])
          ? <img className="clase-actual-registration-photo" src={imageOf(dialog.detail?.foto_base64 || photos[String(dialog.student.id_estudiante)])} alt={"Foto de " + nameOf(dialog.student)} />
          : <div className="clase-actual-registration-photo clase-actual-registration-placeholder" aria-label="Sin foto">—</div>}
        <p><strong>Curso:</strong> {(() => {
          const paid = dialog.detail?.verificacion?.mensualidad_vigente ?? dialog.verification?.mensualidad_vigente
          return typeof paid === "boolean" ? <span className={paid ? "clase-actual-payment is-paid" : "clase-actual-payment is-unpaid"}>{paid ? "Pagado" : "Sin pagar"}</span> : dialog.loading ? "Consultando…" : "No disponible"
        })()}</p>
        <p><strong>Nombre:</strong> {nameOf(dialog.detail || dialog.student)}</p>
        <p><strong>Carrera:</strong> {dialog.detail?.carrera_nombre || (dialog.loading ? "Consultando…" : dialog.detailError ? "No disponible" : "No registrada")}</p>
      </div> : <><p><strong>{nameOf(dialog.student)}</strong></p>
        {dialog.status === "permiso" ? <p>{dialog.record.razon_permiso || "No se registró un motivo."}</p> : dialog.status === "presente" ? <p>El estudiante ya tiene asistencia registrada.</p> : <><p>¿Registrar la asistencia de este estudiante?</p><div className="clase-actual-confirm-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => setDialog(null)}>Cancelar</button><button type="button" className="submit-button" disabled={busy} onClick={() => register(dialog.student)}>{busy ? "Registrando…" : "Confirmar asistencia"}</button></div></>}
      </>}
    </FloatingAlert>}
  </section>
}
