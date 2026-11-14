import { useEffect, useMemo, useRef, useState } from "react"
import { listResource, getResourceById } from "../../services/academicService"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"
import Pagination from "../../components/ui/Pagination"

// Cantidad de estudiantes mostrados por página en el panel izquierdo.
const STUDENTS_PER_PAGE = 15
// Cantidad de inscripciones mostradas por página en el panel derecho.
const INSCRIPCIONES_PER_PAGE = 6

// Formatea una fecha ISO al formato dd/mm/yyyy.
function formatDate(value) {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// Devuelve el primer campo existente entre varios nombres posibles de un objeto.
function getField(s, ...names) {
  for (const n of names) {
    if (s && typeof s === "object" && s[n] !== undefined && s[n] !== null && s[n] !== "") {
      return s[n]
    }
  }
  return null
}

// Extrae el ID del estudiante de un objeto usando varios nombres de campo posibles.
function getStudentId(s) {
  const nomEst = getField(s, "id_estudiante", "idEstudiante", "id", "IdEstudiante", "ID_ESTUDIANTE", "estudiante_id", "student_id") ?? null
  return nomEst
}

// Construye el nombre completo del estudiante a partir de nombre y apellidos.
function getStudentName(s) {
  const nombre = getField(s, "nombre", "nombres", "nombre_completo", "name", "full_name", "fullName", "estudiante")
  const apellidoPaterno = getField(s, "apellido_paterno", "apellidoPaterno", "apellido1") ?? ""
  const apellidoMaterno = getField(s, "apellido_materno", "apellidoMaterno", "apellido2") ?? ""
  const parts = [nombre, apellidoPaterno, apellidoMaterno].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : `Estudiante ${getStudentId(s) ?? "?"}`
}

// Extrae el número de carnet del estudiante.
function getStudentCarnet(s) {
  return getField(s, "nro_carnet", "carnet", "numero_carnet", "carnet_estudiante") ?? ""
}

// Llama a listResource y normaliza la respuesta (array, .rows o .filas).
async function safeList(endpoint, params) {
  const data = await listResource(endpoint, params)
  return Array.isArray(data) ? data : data.rows || data.filas || []
}

export default function MensualidadesView() {
  // Estado de la lista de estudiantes (panel izquierdo).
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError] = useState("")
  const [studentPage, setStudentPage] = useState(1)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState(null)

  // Estado de mensualidades e inscripciones (panel derecho, del estudiante seleccionado).
  const [mensualidades, setMensualidades] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [inscripcionPage, setInscripcionPage] = useState(1)
  const [selectedInscripcion, setSelectedInscripcion] = useState(null)

  // Carga los estudiantes paginados cuando cambia studentPage.
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setStudentsLoading(true)
        const data = await safeList("estudiantes", { page: studentPage, limit: STUDENTS_PER_PAGE })
        if (mounted) {
          setStudents(data)
          setStudentsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setStudentsError(err.message || "No se pudieron cargar los estudiantes.")
          setStudentsLoading(false)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [studentPage])

  // Selecciona un estudiante: guarda su info, carga sus inscripciones y sus mensualidades.
  const handleSelectStudent = async (student) => {
    const id = getStudentId(student)
    setSelectedStudent(student)
    setSelectedStudentId(id)
    setSelectedInscripcion(null)
    setInscripcionPage(1)
    try {
      const [inscrList, mensList] = await Promise.all([
        safeList("inscripciones", { id_estudiante: id }),
        safeList("mensualidades"),
      ])
      const inscrIds = new Set(inscrList.map((i) => String(i.id_inscripcion)))
      const studentMensualidades = mensList.filter((m) => inscrIds.has(String(m.id_inscripcion)))
      studentMensualidades.sort((a, b) => new Date(b.fecha_insc || b.fecha_inicio_mensualidad) - new Date(a.fecha_insc || a.fecha_inicio_mensualidad))
      setInscripciones(inscrList)
      setMensualidades(studentMensualidades)
    } catch (err) {
      // error handled by outer boundary
    }
  }

  // Selecciona una mensualidad: obtiene el id_estudiante vía la inscripción, resuelve
  // el usuario asociado para obtener el nombre y muestra los datos del estudiante.
  const handleSelectMensualidad = async (m) => {
    console.log("handleSelectMensualidad", m)
    if (!m?.id_inscripcion) return
    const insc = inscripciones.find((i) => String(i.id_inscripcion) === String(m.id_inscripcion))
    const idEstudiante = insc?.id_estudiante
    
    if (!idEstudiante) return
    setSelectedInscripcion(null)
    setInscripcionPage(1)
    try {
      let estudiante = await getResourceById("estudiantes", idEstudiante)
      // Unwrap si la respuesta viene envuelta en un objeto ({ data, estudiante, etc. })
      if (estudiante && typeof estudiante === "object" && !Array.isArray(estudiante)) {
        const unwrapped = estudiante.estudiante ?? estudiante.data ?? estudiante
        if (unwrapped !== estudiante) estudiante = unwrapped
      }
      // Los nombres están en usuarios, no en estudiantes (solo tiene id_usuario).
      let user = null
      if (estudiante?.id_usuario) {
        user = await getResourceById("usuarios", estudiante.id_usuario).catch(() => null)
        if (user && typeof user === "object" && !Array.isArray(user)) {
          user = user.usuario ?? user.data ?? user
        }
      }
      // Mezcla los campos de nombre del usuario en el estudiante para que
      // getStudentName() los encuentre al renderizar el detalle.
      if (user) {
        estudiante = {
          ...estudiante,
          nombre: user.nombre,
          apellido_paterno: user.apellido_paterno,
          apellido_materno: user.apellido_materno,
          nro_carnet: user.nro_carnet,
          correo_electronico: user.correo_electronico,
        }
      }
      setSelectedStudent(estudiante)
      setSelectedStudentId(idEstudiante)
      const [inscrList, mensList] = await Promise.all([
        safeList("inscripciones", { id_estudiante: idEstudiante }),
        safeList("mensualidades"),
      ])
      const inscrIds = new Set(inscrList.map((i) => String(i.id_inscripcion)))
      const studentMensualidades = mensList.filter((m) => inscrIds.has(String(m.id_inscripcion)))
      studentMensualidades.sort((a, b) => new Date(b.fecha_insc || b.fecha_inicio_mensualidad) - new Date(a.fecha_insc || a.fecha_inicio_mensualidad))
      setInscripciones(inscrList)
      setMensualidades(studentMensualidades)
    } catch (err) {
      // error handled by outer boundary
    }
  }

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Inscripciones ordenadas por fecha descendente.
  const inscripcionesSorted = useMemo(() => {
    return [...inscripciones].sort((a, b) => new Date(b.fecha_insc || b.fecha_inicio_mensualidad) - new Date(a.fecha_insc || a.fecha_inicio_mensualidad))
  }, [inscripciones])

  const totalInscriptionPages = Math.ceil(inscripcionesSorted.length / INSCRIPCIONES_PER_PAGE) || 1
  const visibleInscripciones = inscripcionesSorted.slice((inscripcionPage - 1) * INSCRIPCIONES_PER_PAGE, inscripcionPage * INSCRIPCIONES_PER_PAGE)

  // Primera mensualidad de la lista (se usa para mostrar sus datos principales).
  const mensualidad = mensualidades[0]

  const adminName = mensualidad?.administrativo || mensualidad?.id_administrativo || "—"

  const studentName = selectedStudent ? getStudentName(selectedStudent) : ""

  if (studentsLoading) return <Skeleton lines={15} />
  if (studentsError) return <ErrorFallback message={studentsError} onRetry={() => setStudentPage(1)} />

  const studentTotalPages = Math.ceil(students.length / STUDENTS_PER_PAGE) || 1

  return (
    <section className="mensualidades-view">
      <div className="mensualidades-header">
        
      </div>

      <div className="mensualidades-layout">
        {/* Panel izquierdo: lista de estudiantes paginada. */}
        <div className="students-panel">
          <h2>Estudiantes</h2>
          <div className="students-grid">
            {students.map((s, idx) => {
              const id = getStudentId(s)
              const name = getStudentName(s)
              const carnet = getStudentCarnet(s) ? `Carnet: ${getStudentCarnet(s)}` : ""
              const isSelected = selectedStudentId === id
              return (
                <div
                  key={id || `student-${idx}`}
                  className={`student-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectStudent(s)}
                >
                  <div className="student-name">{name}</div>
                  <div className="student-carnet">{carnet}</div>
                </div>
              )
            })}
          </div>
          <div className="students-pagination">
            <Pagination page={studentPage} totalPages={studentTotalPages} onPageChange={setStudentPage} />
          </div>
        </div>

        {/* Panel derecho: detalle del estudiante seleccionado. */}
        <div className="details-panel">
          {!selectedStudent ? (
            <div className="empty-state">
              <p className="muted">Selecciona un estudiante de la lista para ver sus inscripciones y mensualidades.</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <h2>{studentName}</h2>
                <button
                  className="secondary-button small"
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null)
                    setSelectedInscripcion(null)
                    setInscripciones([])
                    setMensualidades([])
                  }}
                >
                  Volver
                </button>
              </div>

              <div className="info-card">
                <h3>Mensualidad</h3>
                <div className="info-row">
                  <span className="info-label">Administrativo</span>
                  <span className="info-value">{adminName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha inicio</span>
                  <span className="info-value">{formatDate(mensualidad?.fecha_inicio_mensualidad)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha fin</span>
                  <span className="info-value">{formatDate(mensualidad?.fecha_fin_mensualidad)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Pago</span>
                  <span className="info-value">{mensualidad?.pago != null ? `Bs. ${mensualidad.pago}` : "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Comprobante</span>
                  <span className="info-value">{mensualidad?.codigo_comprobante != null ? mensualidad.codigo_comprobante : "—"}</span>
                </div>
              </div>

              <div className="inscripciones-panel">
                <h3>Inscripciones</h3>
                <div className="inscripciones-grid">
                  {visibleInscripciones.map((insc) => {
                    const isSelected = selectedInscripcion?.id_inscripcion === insc.id_inscripcion
                    const m = mensualidades.find((m) => m.id_inscripcion === insc.id_inscripcion)
                    return (
                      <div
                        key={insc.id_inscripcion}
                        className={`inscripcion-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedInscripcion(insc)}
                      >
                        <div className="inscripcion-carrera">{insc.carrera || "—"}</div>
                        <div className="inscripcion-grupo">{insc.grupo || "—"}</div>
                        <div className="inscripcion-modalidad">{insc.modalidad || "—"}</div>
                        <div className="inscripcion-fecha">{formatDate(insc.fecha_insc)}</div>
                        {/* Clic en la mensualidad de una inscripción muestra los datos de su estudiante. */}
                        {m && (
                          <div className="inscripcion-mensualidad" onClick={(e) => { e.stopPropagation(); handleSelectMensualidad(m) }}>
                            <span className="label-small">Mensualidad:</span>
                            <span className="value-small">Bs. {m.pago}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {totalInscriptionPages > 1 && (
                  <div className="inscripciones-pagination">
                    <Pagination page={inscripcionPage} totalPages={totalInscriptionPages} onPageChange={setInscripcionPage} />
                  </div>
                )}
              </div>

              {mensualidad?.fecha_inicio_mensualidad && mensualidad?.fecha_fin_mensualidad && (
                <div className="calendar-panel">
                  <h3>Calendario de Mensualidad</h3>
                  <div className="calendar">
                    <div className="calendar-header">
                      <span className="calendar-label">Inicio:</span>
                      <span className="calendar-date">{formatDate(mensualidad.fecha_inicio_mensualidad)}</span>
                    </div>
                    <div className="calendar-header">
                      <span className="calendar-label">Fin:</span>
                      <span className="calendar-date">{formatDate(mensualidad.fecha_fin_mensualidad)}</span>
                    </div>
                    <div className="calendar-grid">
                      {generateCalendarDays(mensualidad.fecha_inicio_mensualidad, mensualidad.fecha_fin_mensualidad).map((day) => (
                        <div
                          key={day.date}
                          className={`calendar-day ${day.isSelected ? "calendar-day-selected" : ""} ${day.isRange ? "calendar-day-range" : ""}`}
                        >
                          {day.day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// Genera los días del calendario entre la fecha de inicio y fin de la mensualidad.
function generateCalendarDays(startDateStr, endDateStr) {
  const days = []
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  end.setHours(23, 59, 59, 999)
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  while (current <= end) {
    days.push({
      date: current.toISOString().split("T")[0],
      day: current.getDate(),
      isSelected: current.getTime() === start.getTime() || current.getTime() === end.getTime(),
      isRange: current.getTime() > start.getTime() && current.getTime() < end.getTime(),
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}
