import { useEffect, useMemo, useRef, useState } from "react"
import { listResource, getResourceById, createResource, updateResource, deleteResource } from "../../../services/academicService"
import Skeleton from "../../../components/ui/Skeleton"
import ErrorFallback from "../../../components/ui/ErrorFallback"
import Pagination from "../../../components/ui/Pagination"
import Button from "../../../components/ui/Button"
import Modal from "../../../components/ui/Modal"
import { useAuth } from "../../../hooks/useAuth"

// Cantidad de estudiantes mostrados por página en el panel izquierdo.
const STUDENTS_PER_PAGE = 12
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

function todayISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addMonthISO(dateStr, months) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
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

function getStudentPhoto(s) {
  const photo = getField(s, "foto_base64", "foto", "photo", "imagen")
  if (!photo) return null
  if (/^(data:image\/|https?:\/\/|blob:)/i.test(photo)) return photo
  if (photo.startsWith("/9j/")) return `data:image/jpeg;base64,${photo}`
  if (photo.startsWith("R0lGOD")) return `data:image/gif;base64,${photo}`
  if (photo.startsWith("UklGR")) return `data:image/webp;base64,${photo}`
  return `data:image/png;base64,${photo}`
}

// Llama a listResource y normaliza la respuesta (array, .rows o .filas).
async function safeList(endpoint, params) {
  const data = await listResource(endpoint, params)
  return Array.isArray(data) ? data : data.rows || data.filas || []
}

function unwrapResource(value, key) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  return value[key] ?? value.data ?? value
}

async function enrichInscripciones(inscripciones) {
  return Promise.all(inscripciones.map(async (inscripcion) => {
    if (!inscripcion.id_paralelo) return { ...inscripcion, paraleloInfo: null, capacitacionInfo: null }
    const paralelo = unwrapResource(
      await getResourceById("paralelos", inscripcion.id_paralelo).catch(() => null),
      "paralelo",
    )
    const capacitacion = paralelo?.id_capacitacion
      ? unwrapResource(
        await getResourceById("capacitaciones", paralelo.id_capacitacion).catch(() => null),
        "capacitacion",
      )
      : null
    return { ...inscripcion, paraleloInfo: paralelo, capacitacionInfo: capacitacion }
  }))
}

export default function MensualidadesEstudiantesView() {
  const { loggedUser } = useAuth()
  // Estado de la lista de estudiantes (panel izquierdo).
  const [students, setStudents] = useState([])
  const [studentPhotos, setStudentPhotos] = useState({})
  const [studentTotalPages, setStudentTotalPages] = useState(1)
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
  const [mensualidadForm, setMensualidadForm] = useState(null)
  const [mensualidadSaving, setMensualidadSaving] = useState(false)
  const [mensualidadFormError, setMensualidadFormError] = useState("")
  const [editingMensualidad, setEditingMensualidad] = useState(null)
  const [editMensualidadForm, setEditMensualidadForm] = useState(null)
  const [editMensualidadError, setEditMensualidadError] = useState("")
  const [editMensualidadSaving, setEditMensualidadSaving] = useState(false)
  const [monthlyListError, setMonthlyListError] = useState("")
  const [calendarYearPage, setCalendarYearPage] = useState(1)

  // Carga primero los datos livianos de las cards y luego sus fotos en una
  // solicitud independiente para que el listado aparezca sin esperar imágenes.
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setStudentsLoading(true)
        setStudentsError("")
        const response = await listResource("estudiantes/resumen", { page: studentPage, limit: STUDENTS_PER_PAGE })
        if (mounted) {
          const rows = Array.isArray(response?.filas) ? response.filas : []
          setStudents(rows)
          setStudentPhotos({})
          setStudentTotalPages(Math.max(1, Number(response?.totalPaginas) || 1))
          setStudentsLoading(false)

          const ids = rows.map(getStudentId).filter((id) => id != null)
          if (ids.length) {
            listResource("estudiantes/fotos", { ids: ids.join(",") })
              .then((photoResponse) => {
                if (!mounted) return
                const fotos = Array.isArray(photoResponse?.filas) ? photoResponse.filas : []
                setStudentPhotos(Object.fromEntries(fotos.map((item) => [String(item.id_estudiante), item.foto_base64])))
              })
              .catch(() => {
                // La información de las cards permanece disponible si fallan las fotos.
              })
          }
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
    const hoy = todayISO()
    const unMesDespues = addMonthISO(hoy, 1)
    setSelectedStudent(student)
    setSelectedStudentId(id)
    setSelectedInscripcion(null)
    setInscripcionPage(1)
    setMensualidadForm({
      fecha_inicio_mensualidad: hoy,
      fecha_fin_mensualidad: unMesDespues,
      pago: "",
      codigo_comprobante: "",
    })
    setMensualidadFormError("")
    try {
      const [inscrListRaw, mensList] = await Promise.all([
        safeList("inscripciones", { id_estudiante: id }),
        safeList("mensualidades"),
      ])
      const inscrList = await enrichInscripciones(inscrListRaw)
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
    setSelectedInscripcion(insc)
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
      const [inscrListRaw, mensList] = await Promise.all([
        safeList("inscripciones", { id_estudiante: idEstudiante }),
        safeList("mensualidades"),
      ])
      const inscrList = await enrichInscripciones(inscrListRaw)
      const inscrIds = new Set(inscrList.map((i) => String(i.id_inscripcion)))
      const studentMensualidades = mensList.filter((m) => inscrIds.has(String(m.id_inscripcion)))
      studentMensualidades.sort((a, b) => new Date(b.fecha_insc || b.fecha_inicio_mensualidad) - new Date(a.fecha_insc || a.fecha_inicio_mensualidad))
      setInscripciones(inscrList)
      setMensualidades(studentMensualidades)
    } catch (err) {
      // error handled by outer boundary
    }
  }

  // Guarda o crea la mensualidad del estudiante seleccionado.
  const handleSaveMensualidad = async () => {
    if (!selectedStudentId) {
      setMensualidadFormError("Selecciona un estudiante primero.")
      return
    }
    if (!selectedInscripcion) {
      setMensualidadFormError("Selecciona una inscripción de la lista de abajo.")
      return
    }
    if (!mensualidadForm) return
    const hoy = todayISO()
    const unMesDespues = addMonthISO(hoy, 1)
    const fechaInicio = mensualidadForm.fecha_inicio_mensualidad || hoy
    const fechaFin = mensualidadForm.fecha_fin_mensualidad || unMesDespues
    const pago = mensualidadForm.pago === "" ? 0 : Number(mensualidadForm.pago)
    if (!Number.isFinite(pago) || pago < 0) {
      setMensualidadFormError("El pago no puede ser negativo.")
      return
    }
    if (fechaInicio > fechaFin) {
      setMensualidadFormError("La fecha de inicio no puede ser posterior a la fecha de fin.")
      return
    }
    setMensualidadSaving(true)
    setMensualidadFormError("")
    try {
      const payload = {
        id_inscripcion: Number(selectedInscripcion.id_inscripcion),
        fecha_inicio_mensualidad: fechaInicio,
        fecha_fin_mensualidad: fechaFin,
        pago,
        codigo_comprobante: mensualidadForm.codigo_comprobante || undefined,
      }
      console.log("[MensualidadesEstudiantesView] Creando mensualidad del estudiante:", payload)
      await createResource("mensualidades", payload)
      // Recargar mensualidades del estudiante
      const inscrList = await enrichInscripciones(await safeList("inscripciones", { id_estudiante: selectedStudentId }))
      const mensList = await safeList("mensualidades")
      const inscrIds = new Set(inscrList.map((i) => String(i.id_inscripcion)))
      const studentMensualidades = mensList.filter((m) => inscrIds.has(String(m.id_inscripcion)))
      studentMensualidades.sort((a, b) => new Date(b.fecha_insc || b.fecha_inicio_mensualidad) - new Date(a.fecha_insc || a.fecha_inicio_mensualidad))
      setInscripciones(inscrList)
      setMensualidades(studentMensualidades)
      // Limpiar formulario con valores por defecto
      setMensualidadForm({
        fecha_inicio_mensualidad: hoy,
        fecha_fin_mensualidad: unMesDespues,
        pago: "",
        codigo_comprobante: "",
      })
    } catch (err) {
      setMensualidadFormError(err.userMessage ?? err?.response?.data?.error ?? "No se pudo guardar la mensualidad.")
    } finally {
      setMensualidadSaving(false)
    }
  }

  const openEditMensualidad = (mensualidad) => {
    setEditingMensualidad(mensualidad)
    setEditMensualidadForm({
      fecha_inicio_mensualidad: mensualidad.fecha_inicio_mensualidad?.slice(0, 10) ?? "",
      fecha_fin_mensualidad: mensualidad.fecha_fin_mensualidad?.slice(0, 10) ?? "",
      pago: mensualidad.pago ?? "",
      codigo_comprobante: mensualidad.codigo_comprobante ?? "",
    })
    setEditMensualidadError("")
  }

  const handleUpdateMensualidad = async (event) => {
    event.preventDefault()
    if (!editingMensualidad || !editMensualidadForm) return
    const pago = editMensualidadForm.pago === "" ? 0 : Number(editMensualidadForm.pago)
    if (!Number.isFinite(pago) || pago < 0) {
      setEditMensualidadError("El pago no puede ser negativo.")
      return
    }
    if (editMensualidadForm.fecha_inicio_mensualidad > editMensualidadForm.fecha_fin_mensualidad) {
      setEditMensualidadError("La fecha de inicio no puede ser posterior a la fecha de fin.")
      return
    }

    setEditMensualidadSaving(true)
    setEditMensualidadError("")
    try {
      const payload = {
        fecha_inicio_mensualidad: editMensualidadForm.fecha_inicio_mensualidad,
        fecha_fin_mensualidad: editMensualidadForm.fecha_fin_mensualidad,
        pago,
        codigo_comprobante: editMensualidadForm.codigo_comprobante || undefined,
      }
      const updated = await updateResource("mensualidades", editingMensualidad.id_mensualidad, payload)
      setMensualidades((current) => current.map((item) => (
        String(item.id_mensualidad) === String(editingMensualidad.id_mensualidad)
          ? { ...item, ...payload, ...updated }
          : item
      )))
      setEditingMensualidad(null)
      setEditMensualidadForm(null)
    } catch (err) {
      setEditMensualidadError(err.userMessage ?? err?.response?.data?.error ?? "No se pudo actualizar la mensualidad.")
    } finally {
      setEditMensualidadSaving(false)
    }
  }

  const handleDeleteMensualidad = async (mensualidad) => {
    if (!window.confirm("¿Eliminar esta mensualidad?")) return
    setMonthlyListError("")
    try {
      await deleteResource("mensualidades", mensualidad.id_mensualidad)
      setMensualidades((current) => current.filter((item) => String(item.id_mensualidad) !== String(mensualidad.id_mensualidad)))
    } catch (err) {
      setMonthlyListError(err.userMessage ?? err?.response?.data?.error ?? "No se pudo eliminar la mensualidad.")
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

  const inscripcionMensualidades = selectedInscripcion
    ? mensualidades.filter((item) => String(item.id_inscripcion) === String(selectedInscripcion.id_inscripcion))
    : []
  const calendarYears = inscripcionMensualidades.flatMap((item) => [
    new Date(`${item.fecha_inicio_mensualidad.slice(0, 10)}T00:00:00`).getFullYear(),
    new Date(`${item.fecha_fin_mensualidad.slice(0, 10)}T00:00:00`).getFullYear(),
  ])
  const calendarStartYear = calendarYears.length ? Math.min(...calendarYears) : null
  const calendarEndYear = calendarYears.length ? Math.max(...calendarYears) : null
  const calendarTotalPages = calendarStartYear != null && calendarEndYear != null
    ? Math.max(1, calendarEndYear - calendarStartYear + 1)
    : 1
  const calendarYear = calendarStartYear == null ? null : calendarStartYear + calendarYearPage - 1

  useEffect(() => {
    setCalendarYearPage(1)
  }, [selectedInscripcion?.id_inscripcion, mensualidades])

  // Inicializa el formulario de creación de mensualidad con valores por defecto.
  useEffect(() => {
    const hoy = todayISO()
    const unMesDespues = addMonthISO(hoy, 1)
    setMensualidadForm({
      fecha_inicio_mensualidad: hoy,
      fecha_fin_mensualidad: unMesDespues,
      pago: "",
      codigo_comprobante: "",
    })
  }, [loggedUser?.id_usuario])

  const adminName = loggedUser?.nombre ? `${loggedUser.nombre} ${loggedUser.apellido_paterno ?? ""} ${loggedUser.apellido_materno ?? ""}`.trim() : "—"

  const studentName = selectedStudent ? getStudentName(selectedStudent) : ""

  if (studentsLoading) return <Skeleton lines={15} />
  if (studentsError) return <ErrorFallback message={studentsError} onRetry={() => setStudentPage(1)} />

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
              const photo = getStudentPhoto({ ...s, foto_base64: studentPhotos[String(id)] })
              const isSelected = selectedStudentId === id
              return (
                <div
                  key={id || `student-${idx}`}
                  className={`student-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectStudent(s)}
                >
                  {photo ? (
                    <img className="student-card-photo" src={photo} alt={`Foto de ${name}`} />
                  ) : (
                    <div className="student-card-photo-placeholder" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
                  )}
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
                  <input
                    type="date"
                    value={mensualidadForm?.fecha_inicio_mensualidad ?? ""}
                    onChange={(e) => setMensualidadForm((prev) => ({ ...prev, fecha_inicio_mensualidad: e.target.value }))}
                  />
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha fin</span>
                  <input
                    type="date"
                    value={mensualidadForm?.fecha_fin_mensualidad ?? ""}
                    onChange={(e) => setMensualidadForm((prev) => ({ ...prev, fecha_fin_mensualidad: e.target.value }))}
                  />
                </div>
                <div className="info-row">
                  <span className="info-label">Pago</span>
                  <input
                    type="number"
                    step="0.01"
                    value={mensualidadForm?.pago ?? ""}
                    onChange={(e) => setMensualidadForm((prev) => ({ ...prev, pago: e.target.value }))}
                  />
                </div>
                <div className="info-row">
                  <span className="info-label">Comprobante</span>
                  <input
                    type="text"
                    value={mensualidadForm?.codigo_comprobante ?? ""}
                    onChange={(e) => setMensualidadForm((prev) => ({ ...prev, codigo_comprobante: e.target.value }))}
                  />
                </div>
                <div className="info-row">
                  <span className="info-label">Inscripción</span>
                  {selectedInscripcion ? (
                    <span className="info-value">{selectedInscripcion.carrera || "Sin carrera"} · {selectedInscripcion.grupo || "Sin grupo"}</span>
                  ) : (
                    <span className="info-value">Selecciona una inscripción de abajo</span>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleSaveMensualidad}
                  disabled={mensualidadSaving || !selectedInscripcion}
                  variant="primary"
                >
                  {mensualidadSaving ? "Guardando..." : "Agregar mensualidad"}
                </Button>
                {mensualidadFormError && <p className="error-message" role="alert">{mensualidadFormError}</p>}
              </div>

              <div className="inscripciones-panel">
                <h3>Inscripciones</h3>
                <div className="inscripciones-grid">
                  {visibleInscripciones.map((insc) => {
                    const isSelected = String(selectedInscripcion?.id_inscripcion) === String(insc.id_inscripcion)
                    const m = mensualidades.find((item) => String(item.id_inscripcion) === String(insc.id_inscripcion))
                    const paralelo = insc.paraleloInfo
                    const capacitacion = insc.capacitacionInfo
                    const horario = paralelo?.hora_inicio || paralelo?.hora_fin
                      ? `${paralelo?.hora_inicio ? String(paralelo.hora_inicio).slice(0, 5) : "—"} - ${paralelo?.hora_fin ? String(paralelo.hora_fin).slice(0, 5) : "—"}`
                      : "—"
                    const nombreCapacitacion = capacitacion?.nombre_facultad
                      ? `Facultad de ${capacitacion.nombre_facultad}`
                      : (capacitacion?.id_capacitacion ? `Capacitación #${capacitacion.id_capacitacion}` : "—")
                    return (
                      <div
                        key={insc.id_inscripcion}
                        className={`inscripcion-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedInscripcion(insc)}
                      >
                        <div className="inscripcion-paralelo">{paralelo?.nombre_paralelo || insc.grupo || "—"}</div>
                        <div className="inscripcion-fecha">Inscripción: {formatDate(insc.fecha_insc)}</div>
                        <div className="inscripcion-credencial">Credencial: {insc.num_credencial != null ? insc.num_credencial : "—"}</div>
                        <div className="inscripcion-fecha">Nivel: {paralelo?.nivel || "—"}</div>
                        <div className="inscripcion-fecha">Modalidad: {paralelo?.modalidad || "—"}</div>
                        <div className="inscripcion-fecha">Horario: {horario}</div>
                        <div className="inscripcion-fecha">Capacitación: {nombreCapacitacion}</div>
                        <div className="inscripcion-fecha">
                          Fechas: {capacitacion?.fecha_inicio
                            ? `${formatDate(capacitacion.fecha_inicio)} - ${capacitacion?.fecha_fin ? formatDate(capacitacion.fecha_fin) : "Sin fecha fin"}`
                            : "—"}
                        </div>
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

            </>
          )}
        </div>
      </div>
      {selectedStudent && selectedInscripcion && (
        <div className="calendar-panel">
          <h3>Calendario de Mensualidades · {selectedInscripcion.carrera || selectedInscripcion.grupo || `Inscripción ${selectedInscripcion.id_inscripcion}`}</h3>
          {inscripcionMensualidades.length === 0 ? (
            <p className="muted">Esta inscripción no tiene mensualidades registradas.</p>
          ) : (
            <>
              {monthlyListError && <p className="error-message" role="alert">{monthlyListError}</p>}
              <div className="calendar">
                <div className="calendar-year-pagination">
                  <h4>{calendarYear}</h4>
                  <Pagination page={calendarYearPage} totalPages={calendarTotalPages} onPageChange={setCalendarYearPage} />
                </div>
                <div className="calendar-heatmap">
                  <div className="calendar-months">
                    {generateCalendarMonths(calendarYear, inscripcionMensualidades).map((month) => (
                      <div className="calendar-month" key={month.key}>
                        <h4>{month.label}</h4>
                        <div className="calendar-month-layout">
                          <div className="calendar-weekdays" aria-hidden="true">
                            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
                          </div>
                          <div className="calendar-month-grid">
                            {month.cells.map((day, index) => (
                              <div
                                key={day?.date ?? "empty-" + index}
                                className={`calendar-heat-day ${day?.paymentColor ? "calendar-payment-day" : ""} ${day?.isSelected ? "calendar-day-selected" : ""}`}
                                style={day?.paymentColor ? { "--payment-color": day.paymentColor } : undefined}
                                title={day ? day.date + ((day.paymentColor || day.isSelected) ? " · Dentro de la mensualidad" : "") : undefined}
                                aria-label={day ? day.day + " de " + month.label : undefined}
                              >
                                {day?.day ?? ""}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="calendar-payment-list" aria-label="Mensualidades de la inscripción">
                {inscripcionMensualidades.map((item, index) => (
                  <div className="calendar-payment-item" key={item.id_mensualidad ?? `${item.fecha_inicio_mensualidad}-${item.fecha_fin_mensualidad}`}>
                    <span className="calendar-payment-swatch" style={{ backgroundColor: MONTHLY_COLORS[index % MONTHLY_COLORS.length] }} aria-hidden="true" />
                    <span><strong>{formatDate(item.fecha_inicio_mensualidad)} – {formatDate(item.fecha_fin_mensualidad)}</strong></span>
                    {item.pago != null && <span>Bs. {item.pago}</span>}
                    <div className="calendar-payment-actions">
                      <Button variant="secondary" size="sm" onClick={() => openEditMensualidad(item)}>Editar</Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDeleteMensualidad(item)}>Eliminar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {editingMensualidad && editMensualidadForm && (
        <Modal
          title="Editar mensualidad"
          hint="Modifica las fechas, el pago y el código de comprobante."
          onClose={() => {
            if (!editMensualidadSaving) {
              setEditingMensualidad(null)
              setEditMensualidadForm(null)
            }
          }}
        >
          <form onSubmit={handleUpdateMensualidad}>
            <Modal.Body>
              <label className="form-row">
                <span>Fecha de inicio</span>
                <input
                  type="date"
                  required
                  value={editMensualidadForm.fecha_inicio_mensualidad}
                  onChange={(event) => setEditMensualidadForm((current) => ({ ...current, fecha_inicio_mensualidad: event.target.value }))}
                />
              </label>
              <label className="form-row">
                <span>Fecha de fin</span>
                <input
                  type="date"
                  required
                  value={editMensualidadForm.fecha_fin_mensualidad}
                  onChange={(event) => setEditMensualidadForm((current) => ({ ...current, fecha_fin_mensualidad: event.target.value }))}
                />
              </label>
              <label className="form-row">
                <span>Pago</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editMensualidadForm.pago}
                  onChange={(event) => setEditMensualidadForm((current) => ({ ...current, pago: event.target.value }))}
                />
              </label>
              <label className="form-row">
                <span>Código de comprobante</span>
                <input
                  type="number"
                  step="1"
                  value={editMensualidadForm.codigo_comprobante}
                  onChange={(event) => setEditMensualidadForm((current) => ({ ...current, codigo_comprobante: event.target.value }))}
                />
              </label>
              {editMensualidadError && <p className="error-message" role="alert">{editMensualidadError}</p>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" disabled={editMensualidadSaving} onClick={() => {
                setEditingMensualidad(null)
                setEditMensualidadForm(null)
              }}>Cancelar</Button>
              <Button type="submit" disabled={editMensualidadSaving}>
                {editMensualidadSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      )}
    </section>
  )
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const MONTHLY_COLORS = ["#86efac", "#93c5fd", "#fca5a5", "#fcd34d", "#c4b5fd", "#f9a8d4", "#67e8f9", "#fdba74"]

// Los doce meses del año en cuatro columnas, con la semana de lunes a domingo
// en el eje horizontal.
function generateCalendarMonths(year, mensualidades) {
  const periods = mensualidades.map((item) => ({
    start: new Date(`${item.fecha_inicio_mensualidad.slice(0, 10)}T00:00:00`),
    end: new Date(`${item.fecha_fin_mensualidad.slice(0, 10)}T00:00:00`),
  })).map((period, index) => ({ ...period, color: MONTHLY_COLORS[index % MONTHLY_COLORS.length] }))
  const months = []

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthDate = new Date(year, monthIndex, 1)
    const firstWeekday = (monthDate.getDay() + 6) % 7
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const cells = Array(42).fill(null)

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day)
      const dateString = year + "-" + String(monthIndex + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0")
      const paymentPeriod = periods.find((period) => date >= period.start && date <= period.end)
      cells[firstWeekday + day - 1] = {
        date: dateString,
        day,
        isSelected: periods.some((period) => date.getTime() === period.start.getTime() || date.getTime() === period.end.getTime()),
        paymentColor: paymentPeriod?.color,
      }
    }

    months.push({ key: year + "-" + (monthIndex + 1), label: MONTHS_ES[monthIndex] + " " + year, cells })
  }
  return months
}
