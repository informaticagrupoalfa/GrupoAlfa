import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import TextField from "../../ui/TextField"
import ReadOnlyField from "../../ui/ReadOnlyField"
import Button from "../../ui/Button"
import Skeleton from "../../ui/Skeleton"
import ErrorFallback from "../../ui/ErrorFallback"
import { useAuth } from "../../../hooks/useAuth"
import {
  createResource,
  getResourceById,
  updateResource,
} from "../../../services/academicService"

const MEDIOS = [
  "Recomendación",
  "Redes sociales",
  "Periódico",
  "Volantes",
  "Otros",
]

function fullName(user) {
  if (!user) return ""
  return [user.nombre, user.apellido_paterno, user.apellido_materno].filter(Boolean).join(" ")
}

function todayISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : ""
}

function formatDateDisplay(value) {
  const date = dateOnly(value)
  if (!date) return ""
  const [year, month, day] = date.split("-")
  if (!year || !month || !day) return date
  return `${day}/${month}/${year}`
}

function horarioCurso(curso) {
  const inicio = curso?.hora_inicio ? String(curso.hora_inicio).slice(0, 5) : ""
  const fin = curso?.hora_fin ? String(curso.hora_fin).slice(0, 5) : ""
  if (inicio && fin) return `${inicio} - ${fin}`
  return inicio || fin || ""
}

function toNumberOrUndefined(value) {
  if (value === "" || value == null) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

function textOrUndefined(value) {
  if (value == null) return undefined
  const trimmed = String(value).trim()
  return trimmed === "" ? undefined : trimmed
}

function buildEmptyForm(elaboradoPor, idAdministrativo) {
  return {
    id_carrera: "",
    id_administrativo: idAdministrativo ?? "",
    nro_comprobante: "",
    nro_credencial: "",
    recalculo: false,
    preparacion_previa: false,
    tiempo_de_preparacion_meses: "",
    lugar_de_preparacion: "",
    inicio_clases: "",
    modalidad: "",
    horario: "",
    grupo: "",
    apellido_paterno: "",
    apellido_materno: "",
    nombre: "",
    edad: "",
    correo_electronico: "",
    colegio_de_procedencia: "",
    direccion_de_domicilio: "",
    firma: "",
    apoderado_nombre_completo: "",
    apoderado_celular: "",
    apoderado_parentesco: "",
    como_se_entero_de_nosotros: "",
    como_se_entero_detalle: "",
    elaborado_por: elaboradoPor ?? "",
    sucursal: "",
    fecha_registro: todayISO(),
  }
}

function fromRecord(record) {
  return {
    id_carrera: record.id_carrera ?? "",
    id_administrativo: record.id_administrativo ?? "",
    nro_comprobante: record.nro_comprobante ?? "",
    nro_credencial: record.nro_credencial ?? "",
    recalculo: Boolean(record.recalculo),
    preparacion_previa: Boolean(record.preparacion_previa),
    tiempo_de_preparacion_meses: record.tiempo_de_preparacion_meses ?? "",
    lugar_de_preparacion: record.lugar_de_preparacion ?? "",
    inicio_clases: dateOnly(record.inicio_clases),
    modalidad: record.modalidad ?? "",
    horario: record.horario ?? "",
    grupo: record.grupo ?? "",
    apellido_paterno: record.apellido_paterno ?? "",
    apellido_materno: record.apellido_materno ?? "",
    nombre: record.nombre ?? "",
    edad: record.edad ?? "",
    correo_electronico: record.correo_electronico ?? "",
    colegio_de_procedencia: record.colegio_de_procedencia ?? "",
    direccion_de_domicilio: record.direccion_de_domicilio ?? "",
    firma: record.firma ?? "",
    apoderado_nombre_completo: record.apoderado_nombre_completo ?? "",
    apoderado_celular: record.apoderado_celular ?? "",
    apoderado_parentesco: record.apoderado_parentesco ?? "",
    como_se_entero_de_nosotros: record.como_se_entero_de_nosotros ?? "",
    como_se_entero_detalle: record.como_se_entero_detalle ?? "",
    elaborado_por: record.elaborado_por ?? "",
    sucursal: record.sucursal ?? "",
    fecha_registro: dateOnly(record.fecha_registro),
  }
}

export default function InscripcionRegistroForm({
  inscripcionId,
  carreraOptions,
  cursosPorCarrera,
  administrativos,
  apoderados,
  onSaved,
}) {
  const { loggedUser } = useAuth()
  const defaultAdministrativo = useMemo(
    () => administrativos.find((admin) => String(admin.id_usuario) === String(loggedUser?.id_usuario)) ?? null,
    [administrativos, loggedUser],
  )
  const defaultElaborado = useMemo(
    () => (defaultAdministrativo ? fullName(defaultAdministrativo) : fullName(loggedUser)),
    [defaultAdministrativo, loggedUser],
  )
  const [form, setForm] = useState(() => buildEmptyForm(defaultElaborado, defaultAdministrativo?.id_administrativo))
  const [loading, setLoading] = useState(Boolean(inscripcionId))
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [showCursos, setShowCursos] = useState(false)
  const [selectedCursoId, setSelectedCursoId] = useState("")
  const [selectedApoderadoId, setSelectedApoderadoId] = useState("")

  const cursosCarrera = useMemo(() => {
    if (!form.id_carrera) return []
    return cursosPorCarrera?.get(String(form.id_carrera)) ?? []
  }, [cursosPorCarrera, form.id_carrera])

  const selectedCurso = useMemo(
    () => cursosCarrera.find((curso) => String(curso.id_capacitacion) === selectedCursoId) ?? null,
    [cursosCarrera, selectedCursoId],
  )

  useEffect(() => {
    if (!inscripcionId) {
      setForm(buildEmptyForm(defaultElaborado, defaultAdministrativo?.id_administrativo))
      setShowCursos(false)
      setSelectedCursoId("")
      setSelectedApoderadoId("")
      setLoading(false)
      setLoadError("")
      return undefined
    }

    let mounted = true
    setLoading(true)
    setLoadError("")
    getResourceById("inscripciones", inscripcionId)
      .then((record) => {
        if (mounted) setForm(fromRecord(record))
      })
      .catch((error) => {
        if (mounted) setLoadError(error.userMessage ?? "No se pudo cargar la inscripción.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [inscripcionId, defaultElaborado, defaultAdministrativo?.id_administrativo])

  useEffect(() => {
    if (selectedCursoId || !form.grupo || cursosCarrera.length === 0) return
    const match = cursosCarrera.find((curso) => curso.nombre === form.grupo)
    if (match) setSelectedCursoId(String(match.id_capacitacion))
  }, [cursosCarrera, form.grupo, selectedCursoId])

  useEffect(() => {
    if (selectedApoderadoId || !form.apoderado_nombre_completo || apoderados.length === 0) return
    const match = apoderados.find((apoderado) =>
      fullName(apoderado) === form.apoderado_nombre_completo &&
      (!form.apoderado_celular || String(apoderado.celular ?? "") === String(form.apoderado_celular)),
    )
    if (match) setSelectedApoderadoId(String(match.id_apoderado))
  }, [apoderados, form.apoderado_nombre_completo, form.apoderado_celular, selectedApoderadoId])

  useEffect(() => {
    if (form.id_administrativo || !form.elaborado_por || administrativos.length === 0) return
    const match = administrativos.find((admin) => fullName(admin) === form.elaborado_por)
    if (match) setForm((prev) => ({ ...prev, id_administrativo: String(match.id_administrativo) }))
  }, [administrativos, form.id_administrativo, form.elaborado_por])

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const handleCarreraChange = (value) => {
    setForm((prev) => ({
      ...prev,
      id_carrera: value,
      inicio_clases: "",
      modalidad: "",
      horario: "",
      grupo: "",
    }))
    setSelectedCursoId("")
    setShowCursos(false)
  }

  const handleCursoSelect = (curso) => {
    setSelectedCursoId(String(curso.id_capacitacion))
    setForm((prev) => ({
      ...prev,
      inicio_clases: dateOnly(curso.fecha_inicio),
      modalidad: curso.modalidad ?? "",
      horario: horarioCurso(curso),
      grupo: curso.nombre ?? "",
    }))
  }

  const handleAdministrativoChange = (value) => {
    const admin = administrativos.find((item) => String(item.id_administrativo) === String(value)) ?? null
    setForm((prev) => ({
      ...prev,
      id_administrativo: value,
      elaborado_por: admin ? fullName(admin) : "",
    }))
  }

  const handleApoderadoChange = (value) => {
    const apoderado = apoderados.find((item) => String(item.id_apoderado) === String(value)) ?? null
    setSelectedApoderadoId(value)
    setForm((prev) => ({
      ...prev,
      apoderado_nombre_completo: apoderado ? fullName(apoderado) : "",
      apoderado_celular: apoderado?.celular ?? "",
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError("")

    if (!form.apellido_paterno.trim()) {
      setFormError("El apellido paterno es obligatorio.")
      return
    }
    if (!form.nombre.trim()) {
      setFormError("El nombre es obligatorio.")
      return
    }
    if (form.edad !== "" && (Number.isNaN(Number(form.edad)) || Number(form.edad) < 0)) {
      setFormError("La edad debe ser un número mayor o igual a 0.")
      return
    }
    if (form.nro_comprobante !== "" && (Number.isNaN(Number(form.nro_comprobante)) || Number(form.nro_comprobante) < 0)) {
      setFormError("El Nº de comprobante debe ser un número mayor o igual a 0.")
      return
    }
    if (form.nro_credencial !== "" && (Number.isNaN(Number(form.nro_credencial)) || Number(form.nro_credencial) < 0)) {
      setFormError("El Nº de credencial debe ser un número mayor o igual a 0.")
      return
    }
    if (form.tiempo_de_preparacion_meses !== "" && (Number.isNaN(Number(form.tiempo_de_preparacion_meses)) || Number(form.tiempo_de_preparacion_meses) < 0)) {
      setFormError("El tiempo de preparación debe ser un número mayor o igual a 0.")
      return
    }

    const payload = {
      id_carrera: toNumberOrUndefined(form.id_carrera),
      id_administrativo: toNumberOrUndefined(form.id_administrativo),
      nro_comprobante: toNumberOrUndefined(form.nro_comprobante),
      nro_credencial: toNumberOrUndefined(form.nro_credencial),
      recalculo: Boolean(form.recalculo),
      preparacion_previa: Boolean(form.preparacion_previa),
      tiempo_de_preparacion_meses: toNumberOrUndefined(form.tiempo_de_preparacion_meses),
      lugar_de_preparacion: textOrUndefined(form.lugar_de_preparacion),
      inicio_clases: textOrUndefined(form.inicio_clases),
      modalidad: textOrUndefined(form.modalidad),
      horario: textOrUndefined(form.horario),
      grupo: textOrUndefined(form.grupo),
      apellido_paterno: form.apellido_paterno.trim(),
      apellido_materno: textOrUndefined(form.apellido_materno),
      nombre: form.nombre.trim(),
      edad: toNumberOrUndefined(form.edad),
      correo_electronico: textOrUndefined(form.correo_electronico),
      colegio_de_procedencia: textOrUndefined(form.colegio_de_procedencia),
      direccion_de_domicilio: textOrUndefined(form.direccion_de_domicilio),
      firma: textOrUndefined(form.firma),
      apoderado_nombre_completo: textOrUndefined(form.apoderado_nombre_completo),
      apoderado_celular: textOrUndefined(form.apoderado_celular),
      apoderado_parentesco: textOrUndefined(form.apoderado_parentesco),
      como_se_entero_de_nosotros: textOrUndefined(form.como_se_entero_de_nosotros),
      como_se_entero_detalle: textOrUndefined(form.como_se_entero_detalle),
      elaborado_por: textOrUndefined(form.elaborado_por),
      sucursal: textOrUndefined(form.sucursal),
      fecha_registro: textOrUndefined(form.fecha_registro),
    }

    setSaving(true)
    try {
      const saved = inscripcionId
        ? await updateResource("inscripciones", inscripcionId, payload)
        : await createResource("inscripciones", payload)
      if (!inscripcionId) {
        setForm(buildEmptyForm(defaultElaborado, defaultAdministrativo?.id_administrativo))
        setShowCursos(false)
        setSelectedCursoId("")
        setSelectedApoderadoId("")
      }
      onSaved?.(saved)
    } catch (error) {
      setFormError(error.userMessage ?? error?.response?.data?.message ?? "No se pudo guardar la inscripción.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton lines={8} />
  if (loadError) {
    return <ErrorFallback message={loadError} onRetry={() => window.location.reload()} />
  }

  const needsDetalle =
    form.como_se_entero_de_nosotros === "Redes sociales" ||
    form.como_se_entero_de_nosotros === "Otros"

  return (
    <form className="inscripcion-form" onSubmit={handleSubmit}>
      <div className="inscripcion-form-header">
        <h2>CCTP Grupo alfa Malaver S.R.L.</h2>
        <p className="muted">
          {inscripcionId ? "Editando registro de usuario" : "Registro de usuario"}
        </p>
      </div>

      <section className="card">
        <h3>Datos académicos</h3>
        <div className="form-grid-two">
          <div className="form-row">
            <label htmlFor="ins-carrera">Carrera a la que postula</label>
            <select
              id="ins-carrera"
              value={form.id_carrera}
              onChange={(e) => handleCarreraChange(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {carreraOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <TextField
            id="ins-comprobante"
            label="Nº de comprobante"
            type="number"
            value={form.nro_comprobante}
            onChange={(e) => set("nro_comprobante", e.target.value)}
          />
        </div>

        {form.id_carrera && (
          <div className="inscripcion-course-section">
            <label className={`create-toggle inscripcion-course-toggle${showCursos ? " is-active" : ""}`} htmlFor="ins-mostrar-cursos">
              <span className="create-toggle-label">
                Cursos de capacitación disponibles
                {cursosCarrera.length > 0 ? ` (${cursosCarrera.length})` : ""}
              </span>
              <input
                id="ins-mostrar-cursos"
                type="checkbox"
                checked={showCursos}
                onChange={(e) => setShowCursos(e.target.checked)}
              />
              <span className="create-toggle-track" aria-hidden="true" />
            </label>

            {showCursos && (
              <div className="curso-picker">
                {cursosCarrera.length === 0 ? (
                  <p className="muted curso-empty">
                    No hay cursos de capacitación activos para esta carrera.
                  </p>
                ) : (
                  <div className="curso-grid">
                    {cursosCarrera.map((curso) => {
                      const selected = String(curso.id_capacitacion) === selectedCursoId
                      return (
                        <button
                          key={curso.id_capacitacion}
                          type="button"
                          className={`curso-card${selected ? " selected" : ""}`}
                          onClick={() => handleCursoSelect(curso)}
                          aria-pressed={selected}
                        >
                          <strong>{curso.nombre ?? `Curso ${curso.id_capacitacion}`}</strong>
                          <span>{curso.nivel ? `Nivel: ${curso.nivel}` : "Sin nivel"}</span>
                          <span>
                            {curso.modalidad ?? "Sin modalidad"} · {horarioCurso(curso) || "Sin horario"}
                          </span>
                          <span>Inicio: {formatDateDisplay(curso.fecha_inicio) || "Por definir"}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-grid-two" style={{ marginTop: 14 }}>
          <ReadOnlyField
            label="Curso / grupo"
            value={selectedCurso?.nombre ?? form.grupo}
            placeholder="Selecciona un curso"
          />
          <ReadOnlyField
            label="Nivel"
            value={selectedCurso?.nivel}
            placeholder="—"
          />
          <ReadOnlyField
            label="Inicio de clases"
            value={formatDateDisplay(form.inicio_clases)}
            placeholder="—"
          />
          <ReadOnlyField
            label="Modalidad"
            value={form.modalidad}
            placeholder="—"
          />
          <ReadOnlyField
            label="Horario"
            value={form.horario}
            placeholder="—"
          />
          <TextField
            id="ins-credencial"
            label="Nº de credencial"
            type="number"
            value={form.nro_credencial}
            onChange={(e) => set("nro_credencial", e.target.value)}
          />
        </div>
        <div className="form-row-inline" style={{ marginTop: 14 }}>
          <input
            id="ins-recalculo"
            type="checkbox"
            checked={form.recalculo}
            onChange={(e) => set("recalculo", e.target.checked)}
          />
          <label htmlFor="ins-recalculo">Recálculo</label>
        </div>
        <div className="form-row-inline" style={{ marginTop: 10 }}>
          <input
            id="ins-preparacion"
            type="checkbox"
            checked={form.preparacion_previa}
            onChange={(e) => set("preparacion_previa", e.target.checked)}
          />
          <label htmlFor="ins-preparacion">¿Tuviste preparación previa?</label>
        </div>
        <div className="form-grid-two" style={{ marginTop: 14 }}>
          <TextField
            id="ins-tiempo"
            label="¿Cuánto tiempo se estuvo preparando? (meses)"
            type="number"
            value={form.tiempo_de_preparacion_meses}
            onChange={(e) => set("tiempo_de_preparacion_meses", e.target.value)}
          />
          <TextField
            id="ins-lugar-preparacion"
            label="¿Dónde realizó su preparación?"
            type="text"
            value={form.lugar_de_preparacion}
            onChange={(e) => set("lugar_de_preparacion", e.target.value)}
            maxLength={255}
          />
        </div>
      </section>

      <section className="card">
        <h3>Datos personales</h3>
        <div className="form-grid-two">
          <TextField
            id="ins-apellido-paterno"
            label="Apellido paterno"
            type="text"
            value={form.apellido_paterno}
            onChange={(e) => set("apellido_paterno", e.target.value)}
            maxLength={100}
            required
          />
          <TextField
            id="ins-apellido-materno"
            label="Apellido materno"
            type="text"
            value={form.apellido_materno}
            onChange={(e) => set("apellido_materno", e.target.value)}
            maxLength={100}
          />
          <TextField
            id="ins-nombre"
            label="Nombre"
            type="text"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            maxLength={100}
            required
          />
          <TextField
            id="ins-edad"
            label="Edad"
            type="number"
            value={form.edad}
            onChange={(e) => set("edad", e.target.value)}
            min="0"
          />
          <TextField
            id="ins-correo"
            label="Correo electrónico"
            type="email"
            value={form.correo_electronico}
            onChange={(e) => set("correo_electronico", e.target.value)}
            maxLength={150}
          />
          <TextField
            id="ins-colegio"
            label="Colegio de procedencia"
            type="text"
            value={form.colegio_de_procedencia}
            onChange={(e) => set("colegio_de_procedencia", e.target.value)}
            maxLength={150}
          />
          <TextField
            id="ins-direccion"
            label="Dirección de domicilio"
            type="text"
            value={form.direccion_de_domicilio}
            onChange={(e) => set("direccion_de_domicilio", e.target.value)}
            maxLength={255}
          />
          <TextField
            id="ins-firma"
            label="Firma"
            type="text"
            value={form.firma}
            onChange={(e) => set("firma", e.target.value)}
            maxLength={255}
            placeholder="Nombre o referencia de la firma"
          />
        </div>
      </section>

      <section className="card">
        <h3>Datos del apoderado</h3>
        <div className="form-grid-two">
          <div className="form-row">
            <label htmlFor="ins-apoderado">Apoderado registrado</label>
            <select
              id="ins-apoderado"
              value={selectedApoderadoId}
              onChange={(e) => handleApoderadoChange(e.target.value)}
            >
              <option value="">Sin apoderado</option>
              {apoderados.map((apoderado) => (
                <option key={apoderado.id_apoderado} value={apoderado.id_apoderado}>
                  {fullName(apoderado)}
                  {apoderado.celular ? ` · ${apoderado.celular}` : ""}
                </option>
              ))}
            </select>
          </div>
          <ReadOnlyField
            id="ins-apoderado-nombre"
            label="Nombre completo"
            value={form.apoderado_nombre_completo}
            placeholder="Selecciona un apoderado"
          />
          <ReadOnlyField
            id="ins-apoderado-celular"
            label="Celular"
            value={form.apoderado_celular}
            placeholder="—"
          />
          <TextField
            id="ins-apoderado-parentesco"
            label="Parentesco"
            type="text"
            value={form.apoderado_parentesco}
            onChange={(e) => set("apoderado_parentesco", e.target.value)}
            maxLength={100}
          />
        </div>
      </section>

      <section className="card">
        <h3>¿Cómo se enteró de nosotros?</h3>
        <div className="radio-group">
          {MEDIOS.map((medio) => (
            <label key={medio} className="radio-option">
              <input
                type="radio"
                name="como-se-entero"
                value={medio}
                checked={form.como_se_entero_de_nosotros === medio}
                onChange={(e) => set("como_se_entero_de_nosotros", e.target.value)}
              />
              {medio}
            </label>
          ))}
        </div>
        {needsDetalle && (
          <TextField
            id="ins-como-detalle"
            label={form.como_se_entero_de_nosotros === "Redes sociales" ? "¿Cuál?" : "Menciónalo"}
            type="text"
            value={form.como_se_entero_detalle}
            onChange={(e) => set("como_se_entero_detalle", e.target.value)}
            maxLength={255}
          />
        )}
      </section>

      <section className="card">
        <h3>Datos administrativos</h3>
        <div className="form-grid-two">
          <div className="form-row">
            <label htmlFor="ins-elaborado-por">Elaborado por</label>
            <select
              id="ins-elaborado-por"
              value={form.id_administrativo || ""}
              onChange={(e) => handleAdministrativoChange(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {administrativos.map((admin) => (
                <option key={admin.id_administrativo} value={admin.id_administrativo}>
                  {fullName(admin)}
                </option>
              ))}
            </select>
          </div>
          <TextField
            id="ins-sucursal"
            label="Sucursal"
            type="text"
            value={form.sucursal}
            onChange={(e) => set("sucursal", e.target.value)}
            maxLength={100}
          />
          <TextField
            id="ins-fecha"
            label="Fecha"
            type="date"
            value={form.fecha_registro}
            onChange={(e) => set("fecha_registro", e.target.value)}
          />
        </div>
      </section>

      {formError && <p className="error-message" role="alert">{formError}</p>}

      <div className="inscripcion-form-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : inscripcionId ? "Guardar cambios" : "Registrar inscripción"}
        </Button>
      </div>
    </form>
  )
}

InscripcionRegistroForm.propTypes = {
  inscripcionId: PropTypes.string,
  carreraOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  cursosPorCarrera: PropTypes.instanceOf(Map).isRequired,
  administrativos: PropTypes.arrayOf(PropTypes.object).isRequired,
  apoderados: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSaved: PropTypes.func,
}
