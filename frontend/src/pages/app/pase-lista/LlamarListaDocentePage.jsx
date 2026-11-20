import { useEffect, useRef, useState } from "react"
import { apiClient } from "../../../services/apiClient"
import { useAuth } from "../../../hooks/useAuth"
import "./LlamarListaDocentePage.css"

const studentName = (student) =>
  [student.nombre, student.apellido_paterno, student.apellido_materno].filter(Boolean).join(" ") ||
  `Estudiante ${student.id_estudiante}`

const localDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
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
  const [date, setDate] = useState(localDate)
  const [permit, setPermit] = useState(false)
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")
  const [camera, setCamera] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanRef = useRef(null)
  const scanBusyRef = useRef(false)
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
    if (!parallelId) {
      setStudents([])
      return undefined
    }
    apiClient.get(`/llamar-lista/paralelos/${parallelId}/estudiantes`)
      .then(({ data }) => { if (!cancelled) setStudents(data) })
      .catch(() => { if (!cancelled) setMessage("No se pudo cargar la lista.") })
    return () => { cancelled = true }
  }, [parallelId])

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), [])

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
    if (checked.some(item => item.id_estudiante === student.id_estudiante)) return
    if (permit && !reason.trim()) return setMessage("Indica el motivo del permiso.")
    try {
      await apiClient.post("/asistencias", {
        id_clase: classId,
        id_estudiante: student.id_estudiante,
        hora_entrada: new Date().toISOString(),
        permiso: permit,
        ...(permit ? { razon_permiso: reason.trim() } : {}),
      })
      setChecked(current => [{ ...student, permiso: permit, razon_permiso: reason.trim() }, ...current])
      setStudents(current => current.filter(item => item.id_estudiante !== student.id_estudiante))
      setMessage(`${studentName(student)} registrado.`)
    } catch (error) {
      setMessage(error.userMessage || "No se pudo registrar la asistencia.")
    }
  }

  scanRef.current = async (raw) => {
    const match = String(raw).trim().match(/^[1-9]\d*$/)
    if (!match) return setMessage("QR no reconocido.")
    const student = students.find(item => String(item.id_estudiante) === match[0])
    if (student) await mark(student)
    else setMessage("No pertenece a este paralelo o ya fue escaneado.")
  }

  const toggleCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setCamera(false)
      return
    }
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Escaneo QR no compatible con este navegador.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCamera(true)
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] })
      const scanFrame = async () => {
        if (!streamRef.current) return
        if (!scanBusyRef.current) {
          scanBusyRef.current = true
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes[0]) await scanRef.current(codes[0].rawValue)
          } catch {
            // A transient detection failure should not stop the camera.
          } finally {
            scanBusyRef.current = false
          }
        }
        if (streamRef.current) requestAnimationFrame(scanFrame)
      }
      requestAnimationFrame(scanFrame)
    } catch {
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setCamera(false)
      setMessage("No se pudo abrir la cámara.")
    }
  }

  return (
    <div className="llamar-lista">
      <div className="llamar-lista-grid">
        <section className="llamar-panel">
          <h2>Clase y asignaciones</h2>
          <label htmlFor="llamar-fecha">Fecha</label>
          <input id="llamar-fecha" type="date" value={date} onChange={event => setDate(event.target.value)} />
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
          <h2>Estudiantes <span>{students.length}</span></h2>
          <div className="llamar-list">
            {students.map(student => (
              <button className="llamar-choice" key={student.id_estudiante} type="button" onClick={() => mark(student)}>
                <strong>{studentName(student)}</strong><small>CI {student.nro_carnet || "—"} · Registrar manual</small>
              </button>
            ))}
          </div>
        </section>

        <section className="llamar-panel">
          <h2>Escanear y registrar</h2>
          <button className="secondary-button" type="button" onClick={toggleCamera}>{camera ? "Cerrar cámara" : "Abrir cámara"}</button>
          <video ref={videoRef} className="llamar-video" hidden={!camera} playsInline muted />
          <form onSubmit={event => { event.preventDefault(); scanRef.current(event.currentTarget.qr.value); event.currentTarget.reset() }}>
            <label htmlFor="llamar-qr">Código manual</label>
            <input id="llamar-qr" name="qr" placeholder="ID del estudiante" inputMode="numeric" />
            <button className="submit-button">Registrar</button>
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
                <span>{student.permiso ? `Permiso: ${student.razon_permiso}` : "Presente"}</span>
              </article>
            ))}
          </div>
          <p className="llamar-message" role="status">{message}</p>
        </section>
      </div>
    </div>
  )
}
