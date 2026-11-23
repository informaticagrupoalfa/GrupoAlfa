import { useEffect, useRef, useState } from "react"
import { apiClient } from "../../../services/apiClient"
import { useAuth } from "../../../hooks/useAuth"
import FloatingAlert from "../../../components/ui/FloatingAlert"
import { parseStudentQr, partitionRoster } from "./llamarListaUtils"
import "./LlamarListaDocentePage.css"

const studentName = (student) =>
  [student.nombre, student.apellido_paterno, student.apellido_materno].filter(Boolean).join(" ") ||
  `Estudiante ${student.id_estudiante}`

const photoSrc = (base64) => {
  if (!base64) return null
  const type = base64.startsWith("/9j/") ? "jpeg" : base64.startsWith("R0lGOD") ? "gif" : base64.startsWith("UklGR") ? "webp" : "png"
  return `data:image/${type};base64,${base64}`
}

const localDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

async function loadData(setAssignments, setClasses, scope) {
  const [assignments, classes] = await Promise.all([
    apiClient.get("/llamar-lista/asignaciones", { params: { scope } }),
    apiClient.get("/llamar-lista/clases", { params: { scope } }),
  ])
  setAssignments(assignments.data)
  setClasses(classes.data)
}

export default function LlamarListaDocentePage() {
  const { activeRole } = useAuth()
  const isSysAdmin = activeRole === "SysAdmin"
  const scope = isSysAdmin ? "all" : "mine"
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [checked, setChecked] = useState([])
  const [selected, setSelected] = useState(null)
  const [classId, setClassId] = useState(null)
  const [date] = useState(localDate)
  const [permit, setPermit] = useState(false)
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")
  const [camera, setCamera] = useState(false)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterReady, setRosterReady] = useState(false)
  const [studentPopup, setStudentPopup] = useState(null)
  const [scanAlert, setScanAlert] = useState("")
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanRef = useRef(null)
  const scanBusyRef = useRef(false)
  const cameraRequestRef = useRef(0)
  const lastQrRef = useRef("")
  const registeredIdsRef = useRef(new Set())
  const registeringIdsRef = useRef(new Set())
  const classIdRef = useRef(classId)
  const popupRequestRef = useRef(0)
  classIdRef.current = classId
  const parallelId = selected?.id_paralelo

  useEffect(() => {
    let active = true
    setSelected(null)
    setClassId(null)
    setChecked([])
    setAssignments([])
    setClasses([])
    loadData(
      (data) => { if (active) setAssignments(data) },
      (data) => { if (active) setClasses(data) },
      scope,
    ).catch(() => { if (active) setMessage("No se pudieron cargar las asignaciones.") })
    return () => { active = false }
  }, [scope])

  useEffect(() => {
    let cancelled = false
    registeredIdsRef.current = new Set()
    registeringIdsRef.current = new Set()
    setChecked([])
    setStudents([])
    setRosterReady(false)
    if (!parallelId) {
      setRosterLoading(false)
      return undefined
    }
    setRosterLoading(true)
    Promise.all([
      apiClient.get(`/llamar-lista/paralelos/${parallelId}/estudiantes`),
      classId ? apiClient.get("/asistencias", { params: { id_clase: classId } }) : Promise.resolve({ data: [] }),
    ])
      .then(([{ data: roster }, { data: attendances }]) => {
        if (cancelled) return
        const { pending, registered, registeredIds } = partitionRoster(roster, attendances)
        registeredIdsRef.current = registeredIds
        setStudents(pending)
        setChecked(registered)
        setRosterReady(true)
      })
      .catch(() => { if (!cancelled) setMessage("No se pudo cargar la lista de estudiantes y registrados.") })
      .finally(() => { if (!cancelled) setRosterLoading(false) })
    return () => { cancelled = true }
  }, [parallelId, classId])

  useEffect(() => {
    cameraRequestRef.current += 1
    popupRequestRef.current += 1
    setStudentPopup(null)
    setScanAlert("")
    if (!streamRef.current) return
    streamRef.current.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamera(false)
  }, [parallelId, classId])

  useEffect(() => () => {
    cameraRequestRef.current += 1
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const createClass = async () => {
    if (!selected) return
    try {
      const { data } = await apiClient.post("/clases", {
        id_asesor_paralelo_materia: selected.id_asesor_paralelo_materia,
        inicioclase: date,
      })
      setClassId(data.id_clase)
      setChecked([])
      await loadData(setAssignments, setClasses, scope)
      setMessage("Clase creada.")
    } catch (error) {
      setMessage(error.userMessage || "No se pudo crear la clase.")
    }
  }

  const mark = async (student) => {
    if (!classId) return setMessage("Crea o selecciona una clase primero.")
    const studentId = String(student.id_estudiante)
    if (!rosterReady || rosterLoading || registeredIdsRef.current.has(studentId) || registeringIdsRef.current.has(studentId)) return
    if (permit && !reason.trim()) return setMessage("Indica el motivo del permiso.")
    registeringIdsRef.current.add(studentId)
    const targetClassId = classId
    try {
      const { data: attendance } = await apiClient.post("/asistencias", {
        id_clase: targetClassId,
        id_estudiante: student.id_estudiante,
        hora_entrada: new Date().toISOString(),
        ...(permit ? { permiso: true } : {}),
        ...(permit ? { razon_permiso: reason.trim() } : {}),
      })
      if (classIdRef.current !== targetClassId) return
      registeredIdsRef.current.add(studentId)
      setChecked(current => [{ ...student, permiso: permit, razon_permiso: reason.trim() }, ...current])
      setStudents(current => current.filter(item => String(item.id_estudiante) !== studentId))
      setMessage("")
      const popupRequest = ++popupRequestRef.current
      setStudentPopup({
        student,
        paralelo: selected?.nombre_paralelo,
        verification: attendance.verificacion,
        loading: true,
      })
      apiClient.get(`/llamar-lista/clases/${targetClassId}/estudiantes/${studentId}/ficha`, { params: { scope } })
        .then(({ data }) => {
          if (popupRequest === popupRequestRef.current && classIdRef.current === targetClassId) {
            setStudentPopup({
              student,
              data,
              verification: data.verificacion ?? attendance.verificacion,
              loading: false,
            })
          }
        })
        .catch(() => {
          if (popupRequest === popupRequestRef.current && classIdRef.current === targetClassId) {
            setStudentPopup({
              student,
              paralelo: selected?.nombre_paralelo,
              verification: attendance.verificacion,
              loading: false,
              error: true,
            })
          }
        })
    } catch (error) {
      setMessage(error.userMessage || "No se pudo registrar la asistencia.")
      if (error?.response?.data?.verificacion) {
        setStudentPopup({
          student,
          paralelo: selected?.nombre_paralelo,
          verification: error.response.data.verificacion,
          registrationFailed: true,
          loading: false,
        })
      }
    } finally {
      registeringIdsRef.current.delete(studentId)
    }
  }

  scanRef.current = async (raw) => {
    const studentId = parseStudentQr(raw)
    if (!studentId) {
      setScanAlert("QR no reconocido. Verifica el código e intenta nuevamente.")
      return
    }
    if (registeredIdsRef.current.has(studentId)) return
    const student = students.find(item => String(item.id_estudiante) === studentId)
    if (student) await mark(student)
    else setScanAlert("No se reconoció al estudiante en la lista de este paralelo.")
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
    if (!classId || !rosterReady || rosterLoading) {
      setMessage("Crea o selecciona una clase para escanear asistencias.")
      return
    }
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Escaneo QR no compatible con este navegador.")
      return
    }
    let detector
    try {
      detector = new window.BarcodeDetector({ formats: ["qr_code"] })
    } catch {
      setMessage("El lector QR no está disponible en este navegador.")
      return
    }
    const requestId = ++cameraRequestRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.hidden = false
      await videoRef.current.play()
      if (requestId !== cameraRequestRef.current) return
      setCamera(true)
      setMessage("Cámara activa. Apunta al QR del estudiante.")
      const scanFrame = async () => {
        if (streamRef.current !== stream) return
        if (!scanBusyRef.current) {
          scanBusyRef.current = true
          try {
            const codes = await detector.detect(videoRef.current)
            if (streamRef.current !== stream) return
            const raw = codes[0]?.rawValue ?? ""
            if (!raw) lastQrRef.current = ""
            else if (raw !== lastQrRef.current) {
              lastQrRef.current = raw
              await scanRef.current(raw)
            }
          } catch {
            // A transient detection failure should not stop the camera.
          } finally {
            scanBusyRef.current = false
          }
        }
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

  return (
    <div className="llamar-lista">
      {scanAlert && (
        <FloatingAlert title="Estudiante no reconocido" onClose={() => setScanAlert("")}>
          <p role="alert">{scanAlert}</p>
        </FloatingAlert>
      )}
      {studentPopup && (() => {
        const detail = studentPopup.data || studentPopup.student
        const verification = studentPopup.verification || detail.verificacion
        const guardian = [detail.apoderado_nombre, detail.apoderado_apellido_paterno, detail.apoderado_apellido_materno].filter(Boolean).join(" ")
        const image = photoSrc(detail.foto_base64)
        return (
          <FloatingAlert
            title={studentPopup.registrationFailed ? "Asistencia no registrada" : "Asistencia registrada"}
            className="llamar-student-popup"
            onClose={() => { popupRequestRef.current += 1; setStudentPopup(null) }}
            hero={image
              ? <img className="llamar-student-popup-photo" src={image} alt={`Foto de ${studentName(detail)}`} />
              : <div className="llamar-student-popup-photo llamar-student-popup-avatar" aria-hidden="true">{String(detail.nombre || "E").charAt(0).toUpperCase()}</div>}
          >
            <div className="llamar-student-popup-identity">
              <div><strong>{studentName(detail)}</strong><small>CI {detail.nro_carnet || "—"}</small></div>
            </div>
            {studentPopup.loading ? <p className="llamar-student-popup-note">Cargando datos del estudiante…</p> : (
              <div className="llamar-student-popup-fields">
                {studentPopup.error && <p className="llamar-student-popup-note">No se pudieron cargar los datos adicionales.</p>}
                {verification && <>
                  <div><span>Materia</span><strong className={verification.pertenece_materia ? "is-valid" : "is-invalid"}>{verification.nombre_materia || "Materia"}: {verification.pertenece_materia ? "Sí pertenece" : "No pertenece"}</strong></div>
                  <div><span>Mensualidad</span><strong className={verification.mensualidad_vigente ? "is-valid" : "is-warning"}>{verification.mensualidad_vigente ? `Registrada para ${String(verification.fecha_registro).slice(0, 10)}` : `Sin mensualidad registrada para ${String(verification.fecha_registro).slice(0, 10)}`}</strong></div>
                </>}
                <div><span>Carrera</span><strong>{detail.carrera_nombre || "No registrada"}</strong></div>
                <div><span>Paralelo</span><strong>{detail.nombre_paralelo || studentPopup.paralelo || "—"}</strong></div>
                <div><span>Apoderado</span><strong>{guardian || "No registrado"}</strong></div>
                {detail.apoderado_parentesco && <div><span>Parentesco</span><strong>{detail.apoderado_parentesco}</strong></div>}
                {detail.apoderado_ci && <div><span>CI apoderado</span><strong>{detail.apoderado_ci}</strong></div>}
                {detail.apoderado_telefono && <div><span>Teléfono</span><strong>{detail.apoderado_telefono}</strong></div>}
                {detail.apoderado_correo && <div><span>Correo</span><strong>{detail.apoderado_correo}</strong></div>}
              </div>
            )}
          </FloatingAlert>
        )
      })()}
      <div className="llamar-lista-grid">
        <section className="llamar-panel">
          <h2>Clase y asignaciones</h2>
          <label htmlFor="llamar-fecha">Fecha</label>
          <input id="llamar-fecha" type="date" value={date} min={localDate()} max={localDate()} readOnly />
          <p className="llamar-scan-hint">La clase se registra con la fecha actual y dentro del horario configurado.</p>
          <button className="submit-button" disabled={!selected} onClick={createClass}>Crear clase</button>
          <div className="llamar-list">
            {assignments.map(item => (
              <button className="llamar-choice" key={item.id_asesor_paralelo_materia} type="button"
                aria-pressed={selected?.id_asesor_paralelo_materia === item.id_asesor_paralelo_materia}
                onClick={() => { setSelected(item); setClassId(null); setChecked([]) }}>
                <strong>{item.nombre_paralelo}</strong><span>{item.nombre_materia}</span>
                <small>{isSysAdmin && item.nombre_asesor ? `${item.nombre_asesor} · ` : ""}{item.nivel} · {item.dias || "Día sin definir"}</small>
              </button>
            ))}
          </div>
          <h3>{isSysAdmin ? "Clases" : "Mis clases"}</h3>
          <div className="llamar-list">
            {classes.map(item => (
              <button className="llamar-choice" key={item.id_clase} type="button"
                aria-pressed={classId === item.id_clase}
                onClick={() => {
                  setClassId(item.id_clase)
                  setSelected(assignments.find(assignment => assignment.id_asesor_paralelo_materia === item.id_asesor_paralelo_materia) || null)
                  setChecked([])
                }}>
                {String(item.fecha).slice(0, 10)} · {item.nombre_paralelo} / {item.nombre_materia}
                {isSysAdmin && item.nombre_asesor ? ` · ${item.nombre_asesor}` : ""}
              </button>
            ))}
          </div>
        </section>
        
        <section className="llamar-panel">
          <h2>Escanear y registrar</h2>
          {!classId && <p className="llamar-scan-hint">Selecciona o crea una clase para activar el escáner.</p>}
          <button className="secondary-button" type="button" disabled={!camera && (!classId || !rosterReady || rosterLoading)} onClick={toggleCamera}>{camera ? "Cerrar cámara" : "Abrir cámara"}</button>
          <video ref={videoRef} className="llamar-video" hidden={!camera} playsInline muted />
          {camera && <p className="llamar-scan-hint">Apunta la cámara al QR del estudiante. Se registrará automáticamente.</p>}
          <p className="llamar-message" role="status">{message}</p>
          <form onSubmit={event => { event.preventDefault(); scanRef.current(event.currentTarget.elements.namedItem("qr")?.value ?? ""); event.currentTarget.reset() }}>
            <label htmlFor="llamar-qr">Código manual</label>
            <input id="llamar-qr" name="qr" placeholder="ID del estudiante" inputMode="numeric" disabled={!classId || !rosterReady || rosterLoading} />
            <button className="submit-button" disabled={!classId || !rosterReady || rosterLoading}>Registrar</button>
          </form>
          <label className="llamar-permit">
            <input type="checkbox" checked={permit} onChange={event => setPermit(event.target.checked)} />
            Registrar próximo escaneo con permiso
          </label>
          {permit && <label>Motivo<input value={reason} maxLength={150} onChange={event => setReason(event.target.value)} /></label>}
          <h3>Registrados ({checked.length})</h3>
          <div className="llamar-list">
            {checked.map(student => (
              <article className="llamar-checked" key={student.id_estudiante}>
                <strong>{studentName(student)}</strong>
                <span>{student.permiso === false ? "Ausente" : student.razon_permiso ? `Permiso: ${student.razon_permiso}` : "Presente"}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="llamar-panel">
          <h2>Estudiantes <span>{students.length}</span></h2>
          <div className="llamar-list">
            {students.map(student => (
              <button className="llamar-choice" key={student.id_estudiante} type="button" disabled={!classId || !rosterReady || rosterLoading} onClick={() => mark(student)}>
                <strong>{studentName(student)}</strong><small>CI {student.nro_carnet || "—"} · Registrar manual</small>
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
