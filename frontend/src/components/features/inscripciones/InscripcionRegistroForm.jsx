import { useEffect, useMemo, useRef, useState } from "react"
import PropTypes from "prop-types"
import { useSearchParams } from "react-router-dom"
import Button from "../../ui/Button"
import Skeleton from "../../ui/Skeleton"
import ErrorFallback from "../../ui/ErrorFallback"
import { useAuth } from "../../../hooks/useAuth"
import {
  getResourceById,
  registrarEstudiante,
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

function horarioParalelo(paralelo) {
  const inicio = paralelo?.hora_inicio ? String(paralelo.hora_inicio).slice(0, 5) : ""
  const fin = paralelo?.hora_fin ? String(paralelo.hora_fin).slice(0, 5) : ""
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
    id_paralelo: "",
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
    fecha_nacimiento: "",
    contraseña: "",
    ci: "",
    celular: "",
    correo_electronico: "",
    colegio_de_procedencia: "",
    direccion_de_domicilio: "",
    firma: "",
    foto: null,
    apoderado_nombre_completo: "",
    apoderado_ci: "",
    apoderado_parentesco: "",
    apoderado_apellido_paterno: "",
    apoderado_apellido_materno: "",
    apoderado_nombre: "",
    apoderado_telefono: "",
    apoderado_contraseña: "",
    como_se_entero_de_nosotros: "",
    como_se_entero_detalle: "",
    elaborado_por: elaboradoPor ?? "",
    sucursal: "",
    fecha_registro: todayISO(),
    fecha_inscripcion: todayISO(),
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
    fecha_nacimiento: dateOnly(record.fecha_nacimiento),
    contraseña: record.contraseña ?? "",
    ci: record.ci ?? "",
    celular: record.celular ?? "",
    correo_electronico: record.correo_electronico ?? "",
    colegio_de_procedencia: record.colegio_de_procedencia ?? "",
    direccion_de_domicilio: record.direccion_de_domicilio ?? "",
    firma: record.firma ?? "",
    foto: record.foto ?? null,
    apoderado_nombre_completo: record.apoderado_nombre_completo ?? "",
    apoderado_ci: record.apoderado_ci ?? "",
    apoderado_parentesco: record.apoderado_parentesco ?? "",
    apoderado_apellido_paterno: record.apoderado_apellido_paterno ?? "",
    apoderado_apellido_materno: record.apoderado_apellido_materno ?? "",
    apoderado_nombre: record.apoderado_nombre ?? "",
    apoderado_telefono: record.apoderado_telefono ?? "",
    apoderado_contraseña: record.apoderado_contraseña ?? "",
    como_se_entero_de_nosotros: record.como_se_entero_de_nosotros ?? "",
    como_se_entero_detalle: record.como_se_entero_detalle ?? "",
    elaborado_por: record.elaborado_por ?? "",
    sucursal: record.sucursal ?? "",
    fecha_registro: dateOnly(record.fecha_registro),
    fecha_inscripcion: dateOnly(record.fecha_inscripcion),
  }
}

export default function InscripcionRegistroForm({
  inscripcionId,
  carreraOptions,
  paralelosPorCarrera,
  administrativos,
  apoderados,
  onSaved,
}) {
  const { loggedUser, activeRole } = useAuth()
  const defaultAdministrativo = useMemo(
    () => administrativos.find((admin) => String(admin.id_usuario) === String(loggedUser?.id_usuario)) ?? null,
    [administrativos, loggedUser],
  )
  const defaultElaborado = useMemo(
    () => (defaultAdministrativo ? fullName(defaultAdministrativo) : fullName(loggedUser)),
    [defaultAdministrativo, loggedUser],
  )
  const [form, setForm] = useState(() => buildEmptyForm(defaultElaborado, defaultAdministrativo?.id_administrativo))
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(Boolean(inscripcionId))
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [showParalelos, setShowParalelos] = useState(false)
  const [selectedParaleloId, setSelectedParaleloId] = useState("")
  const [selectedApoderadoId, setSelectedApoderadoId] = useState("")
  const [fotoBase64, setFotoBase64] = useState(null)

  const paralelosCarrera = useMemo(() => {
    if (!form.id_carrera) return []
    return paralelosPorCarrera?.get(String(form.id_carrera)) ?? []
  }, [paralelosPorCarrera, form.id_carrera])

  const selectedParalelo = useMemo(
    () => paralelosCarrera.find((paralelo) => String(paralelo.id_paralelo) === selectedParaleloId) ?? null,
    [paralelosCarrera, selectedParaleloId],
  )

  useEffect(() => {
    if (!inscripcionId) {
      setForm(buildEmptyForm(defaultElaborado, defaultAdministrativo?.id_administrativo))
      setShowParalelos(false)
      setSelectedParaleloId("")
      setSelectedApoderadoId("")
      setFotoBase64(null)
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
    if (selectedParaleloId || !form.grupo || paralelosCarrera.length === 0) return
    const match = paralelosCarrera.find((paralelo) => {
      if (paralelo.nombre_paralelo !== form.grupo) return false
      if (!form.inicio_clases) return true
      return dateOnly(paralelo.capacitacion?.fecha_inicio) === form.inicio_clases
    })
    if (match) setSelectedParaleloId(String(match.id_paralelo))
  }, [paralelosCarrera, form.grupo, form.inicio_clases, selectedParaleloId])

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

  const isRestoring = useRef(false)

  useEffect(() => {
    if (inscripcionId) return
    const params = {}
    for (const [key, value] of searchParams.entries()) {
      params[key] = value
    }
    if (Object.keys(params).length === 0) return
    isRestoring.current = true
    setForm((prev) => ({
      ...prev,
      ci: params.ci ?? prev.ci,
      apellido_paterno: params.apellido_paterno ?? prev.apellido_paterno,
      apellido_materno: params.apellido_materno ?? prev.apellido_materno,
      nombre: params.nombre ?? prev.nombre,
      fecha_nacimiento: params.fecha_nacimiento ?? prev.fecha_nacimiento,
      contraseña: params.contraseña ?? prev.contraseña,
      celular: params.celular ?? prev.celular,
      correo_electronico: params.correo_electronico ?? prev.correo_electronico,
      colegio_de_procedencia: params.colegio_de_procedencia ?? prev.colegio_de_procedencia,
      direccion_de_domicilio: params.direccion_de_domicilio ?? prev.direccion_de_domicilio,
      apoderado_ci: params.apoderado_ci ?? prev.apoderado_ci,
      apoderado_nombre: params.apoderado_nombre ?? prev.apoderado_nombre,
      apoderado_apellido_paterno: params.apoderado_apellido_paterno ?? prev.apoderado_apellido_paterno,
      apoderado_apellido_materno: params.apoderado_apellido_materno ?? prev.apoderado_apellido_materno,
      apoderado_telefono: params.apoderado_telefono ?? prev.apoderado_telefono,
      apoderado_contraseña: params.apoderado_contraseña ?? prev.apoderado_contraseña,
      apoderado_parentesco: params.apoderado_parentesco ?? prev.apoderado_parentesco,
      id_carrera: params.id_carrera ?? prev.id_carrera,
      nro_comprobante: params.nro_comprobante ?? prev.nro_comprobante,
      nro_credencial: params.nro_credencial ?? prev.nro_credencial,
      recalculo: params.recalculo === "true",
      preparacion_previa: params.preparacion_previa === "true",
      tiempo_de_preparacion_meses: params.tiempo_de_preparacion_meses ?? prev.tiempo_de_preparacion_meses,
      lugar_de_preparacion: params.lugar_de_preparacion ?? prev.lugar_de_preparacion,
      id_paralelo: params.id_paralelo ?? prev.id_paralelo,
      id_administrativo: params.id_administrativo ?? prev.id_administrativo,
      sucursal: params.sucursal ?? prev.sucursal,
      fecha_inscripcion: params.fecha_inscripcion ?? prev.fecha_inscripcion,
      como_se_entero_de_nosotros: params.como_se_entero_de_nosotros ?? prev.como_se_entero_de_nosotros,
    }))
    setSelectedParaleloId(params.id_paralelo ?? "")
    setShowParalelos(!!params.id_paralelo)
    setSelectedApoderadoId("")
    setFotoBase64(null)
    isRestoring.current = false
  }, [searchParams, inscripcionId, defaultElaborado, defaultAdministrativo?.id_administrativo])

  useEffect(() => {
    if (isRestoring.current || inscripcionId) return
    const next = {}
    const setParam = (key, value) => {
      if (value === null || value === undefined || value === "") return
      next[key] = String(value)
    }
    setParam("ci", form.ci)
    setParam("apellido_paterno", form.apellido_paterno)
    setParam("apellido_materno", form.apellido_materno)
    setParam("nombre", form.nombre)
    setParam("fecha_nacimiento", form.fecha_nacimiento)
    setParam("contraseña", form.contraseña)
    setParam("celular", form.celular)
    setParam("correo_electronico", form.correo_electronico)
    setParam("colegio_de_procedencia", form.colegio_de_procedencia)
    setParam("direccion_de_domicilio", form.direccion_de_domicilio)
    setParam("apoderado_ci", form.apoderado_ci)
    setParam("apoderado_nombre", form.apoderado_nombre)
    setParam("apoderado_apellido_paterno", form.apoderado_apellido_paterno)
    setParam("apoderado_apellido_materno", form.apoderado_apellido_materno)
    setParam("apoderado_telefono", form.apoderado_telefono)
    setParam("apoderado_contraseña", form.apoderado_contraseña)
    setParam("apoderado_parentesco", form.apoderado_parentesco)
    setParam("id_carrera", form.id_carrera)
    setParam("nro_comprobante", form.nro_comprobante)
    setParam("nro_credencial", form.nro_credencial)
    setParam("recalculo", form.recalculo)
    setParam("preparacion_previa", form.preparacion_previa)
    setParam("tiempo_de_preparacion_meses", form.tiempo_de_preparacion_meses)
    setParam("lugar_de_preparacion", form.lugar_de_preparacion)
    setParam("id_paralelo", form.id_paralelo)
    setParam("id_administrativo", form.id_administrativo)
    setParam("sucursal", form.sucursal)
    setParam("fecha_inscripcion", form.fecha_inscripcion)
    setParam("como_se_entero_de_nosotros", form.como_se_entero_de_nosotros)
    setSearchParams(next, { replace: true })
  }, [form, setSearchParams, inscripcionId])

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
    setSelectedParaleloId("")
    setShowParalelos(false)
  }

  const handleParaleloSelect = (paralelo) => {
    const id = String(paralelo.id_paralelo);
    if (selectedParaleloId === id) {
      setSelectedParaleloId("")
      setForm((prev) => ({
        ...prev,
        id_paralelo: "",
        inicio_clases: "",
        modalidad: "",
        horario: "",
        grupo: "",
      }))
      return
    }
    setSelectedParaleloId(id)
    setForm((prev) => ({
      ...prev,
      id_paralelo: id,
      inicio_clases: dateOnly(paralelo.capacitacion?.fecha_inicio),
      modalidad: paralelo.modalidad ?? "",
      horario: horarioParalelo(paralelo),
      grupo: paralelo.nombre_paralelo ?? "",
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
      apoderado_ci: apoderado ? apoderado.ci ?? "" : "",
      apoderado_apellido_paterno: apoderado ? apoderado.apellido_paterno ?? "" : "",
      apoderado_apellido_materno: apoderado ? apoderado.apellido_materno ?? "" : "",
      apoderado_nombre: apoderado ? apoderado.nombre ?? "" : "",
      apoderado_telefono: apoderado ? apoderado.nro_telefono ?? "" : "",
      apoderado_parentesco: apoderado ? apoderado.parentesco ?? "" : "",
      apoderado_contraseña: "",
    }))
  }

  const handleFotoChange = (event) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const reader = new FileReader()
      reader.onload = () => {
        setFotoBase64(reader.result?.toString().split(",")[1] ?? null)
      }
      reader.readAsDataURL(files[0])
    } else {
      setFotoBase64(null)
    }
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
    if (!form.ci.trim()) {
      setFormError("El CI es obligatorio.")
      return
    }
    if (!form.apoderado_ci.trim()) {
      setFormError("El CI del apoderado es obligatorio.")
      return
    }
    if (!form.apoderado_nombre.trim()) {
      setFormError("El nombre del apoderado es obligatorio.")
      return
    }
    if (!form.apoderado_apellido_paterno.trim()) {
      setFormError("El apellido paterno del apoderado es obligatorio.")
      return
    }
    if (!form.apoderado_apellido_materno.trim()) {
      setFormError("El apellido materno del apoderado es obligatorio.")
      return
    }
    if (!form.apoderado_telefono.trim()) {
      setFormError("El teléfono del apoderado es obligatorio.")
      return
    }
    if (!form.apoderado_contraseña) {
      setFormError("La contraseña del apoderado es obligatoria.")
      return
    }
    if (!form.contraseña) {
      setFormError("La contraseña del estudiante es obligatoria.")
      return
    }

    const payload = {
      ci: form.ci,
      apellido_paterno: form.apellido_paterno.trim(),
      apellido_materno: textOrUndefined(form.apellido_materno),
      nombre: form.nombre.trim(),
      fecha_nacimiento: textOrUndefined(form.fecha_nacimiento),
      correo_electronico: textOrUndefined(form.correo_electronico),
      contraseña: form.contraseña,
      apoderado_ci: form.apoderado_ci,
      apoderado_nombre: form.apoderado_nombre.trim(),
      apoderado_apellido_paterno: form.apoderado_apellido_paterno.trim(),
      apoderado_apellido_materno: form.apoderado_apellido_materno.trim(),
      apoderado_telefono: form.apoderado_telefono,
      apoderado_contraseña: form.apoderado_contraseña,
      apoderado_parentesco: textOrUndefined(form.apoderado_parentesco),
      colegio_de_procedencia: textOrUndefined(form.colegio_de_procedencia),
      direccion_de_domicilio: textOrUndefined(form.direccion_de_domicilio),
      id_administrativo: activeRole === "administrativo"
        ? defaultAdministrativo?.id_administrativo
        : toNumberOrUndefined(form.id_administrativo),
      id_paralelo: toNumberOrUndefined(form.id_paralelo),
      nro_comprobante: toNumberOrUndefined(form.nro_comprobante),
      como_se_entero_de_nosotros: textOrUndefined(form.como_se_entero_de_nosotros),
      recalculo: Boolean(form.recalculo),
      preparacion_previa: Boolean(form.preparacion_previa),
      tiempo_de_preparacion_meses: toNumberOrUndefined(form.tiempo_de_preparacion_meses),
      lugar_de_preparacion: textOrUndefined(form.lugar_de_preparacion),
      nro_credencial: toNumberOrUndefined(form.nro_credencial),
      fecha_inscripcion: textOrUndefined(form.fecha_inscripcion),
      foto: fotoBase64,
    }

    setSaving(true)
    try {
      const saved = await registrarEstudiante(payload)
      setForm(buildEmptyForm(defaultElaborado, defaultAdministrativo?.id_administrativo))
      setShowParalelos(false)
      setSelectedParaleloId("")
      setSelectedApoderadoId("")
      setFotoBase64(null)
      onSaved?.(saved)
    } catch (error) {
      setFormError(error.userMessage ?? error?.response?.data?.message ?? "No se pudo registrar el estudiante.")
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
        <table className="registro-table">
          <tbody>
            <tr>
              <td><label htmlFor="ins-carrera">Carrera a la que postula</label></td>
              <td>
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
              </td>
              <td><label htmlFor="ins-comprobante">Nº de comprobante</label></td>
              <td>
                <input
                  id="ins-comprobante"
                  type="number"
                  value={form.nro_comprobante}
                  onChange={(e) => set("nro_comprobante", e.target.value)}
                />
              </td>
            </tr>
            
            <tr>
              <td><label htmlFor="ins-credencial">Nº de credencial</label></td>
              <td>
                <input
                  id="ins-credencial"
                  type="number"
                  value={form.nro_credencial}
                  onChange={(e) => set("nro_credencial", e.target.value)}
                />
              </td>
              <td><label>Recálculo</label></td>
              <td>
                <input
                  id="ins-recalculo"
                  type="checkbox"
                  checked={Boolean(form.recalculo)}
                  onChange={(e) => set("recalculo", e.target.checked)}
                />
              </td>
            </tr>
            <tr>
              <td><label>¿Tuviste preparación previa?</label></td>
              <td>
                <input
                  id="ins-preparacion"
                  type="checkbox"
                  checked={Boolean(form.preparacion_previa)}
                  onChange={(e) => set("preparacion_previa", e.target.checked)}
                />
              </td>
              <td><label htmlFor="ins-tiempo">Preparación (meses)</label></td>
              <td>
                <input
                  id="ins-tiempo"
                  type="number"
                  value={form.tiempo_de_preparacion_meses}
                  onChange={(e) => set("tiempo_de_preparacion_meses", e.target.value)}
                  min="0"
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-lugar-preparacion">¿Dónde realizó su preparación?</label></td>
              <td colSpan={3}>
                <input
                  id="ins-lugar-preparacion"
                  type="text"
                  value={form.lugar_de_preparacion}
                  onChange={(e) => set("lugar_de_preparacion", e.target.value)}
                  maxLength={255}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-fecha-inscripcion">Fecha inscripción</label></td>
              <td>
                <input
                  id="ins-fecha-inscripcion"
                  type="date"
                  value={form.fecha_inscripcion}
                  onChange={(e) => set("fecha_inscripcion", e.target.value)}
                />
              </td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td><label>¿Cómo se enteró de nosotros?</label></td>
              <td colSpan={3}>
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
              </td>
            </tr>
            {needsDetalle && (
              <tr>
                <td>
                  <label htmlFor="ins-como-detalle">
                    {form.como_se_entero_de_nosotros === "Redes sociales" ? "¿Cuál?" : "Menciónalo"}
                  </label>
                </td>
                <td colSpan={3}>
                  <input
                    id="ins-como-detalle"
                    type="text"
                    value={form.como_se_entero_detalle}
                    onChange={(e) => set("como_se_entero_detalle", e.target.value)}
                    maxLength={255}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {form.id_carrera && (
        <table className="registro-table">
          <tbody>
            <tr>
              <td colSpan={2}>
                <label className={`create-toggle inscripcion-course-toggle${showParalelos ? " is-active" : ""}`} htmlFor="ins-mostrar-paralelos">
                  <span className="create-toggle-label">
                    Paralelos disponibles{paralelosCarrera.length > 0 ? ` (${paralelosCarrera.length})` : ""}
                  </span>
                  <input
                    id="ins-mostrar-paralelos"
                    type="checkbox"
                    checked={showParalelos}
                    onChange={(e) => setShowParalelos(e.target.checked)}
                  />
                  <span className="create-toggle-track" aria-hidden="true" />
                </label>
              </td>
              <td colSpan={2} />
            </tr>
            <tr >
              <td colSpan={4}>
                {showParalelos && (
                  <div className="curso-picker">
                    {paralelosCarrera.length === 0 ? (
                      <p className="muted curso-empty">No hay paralelos activos para esta carrera.</p>
                    ) : (
                      <div className="curso-grid">
                        {paralelosCarrera.map((paralelo) => {
                          const selected = String(paralelo.id_paralelo) === selectedParaleloId
                          return (
                            <button
                              key={paralelo.id_paralelo}
                              type="button"
                              className={`curso-card${selected ? " selected" : ""}`}
                              onClick={() => handleParaleloSelect(paralelo)}
                              aria-pressed={selected}
                            >
                              <strong>{paralelo.nombre_paralelo ?? `Paralelo ${paralelo.id_paralelo}`}</strong>
                              <span>{paralelo.nivel ? `Nivel: ${paralelo.nivel}` : "Sin nivel"}</span>
                              <span>{paralelo.modalidad ?? "Sin modalidad"} · {horarioParalelo(paralelo) || "Sin horario"}</span>
                              <span>{paralelo.dias ? `Días: ${paralelo.dias}` : "Días por definir"}</span>
                              <span>Inicio: {formatDateDisplay(paralelo.capacitacion?.fecha_inicio) || "Por definir"}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

              </td>
            </tr>
            <tr>
              <td><label>Paralelo</label></td>
              <td>{selectedParalelo?.nombre_paralelo ?? form.grupo ?? "—"}</td>
              <td><label>Nivel</label></td>
              <td>{selectedParalelo?.nivel ?? "—"}</td>
            </tr>
            <tr>
              <td><label>Inicio de clases</label></td>
              <td>{formatDateDisplay(form.inicio_clases) ?? "—"}</td>
              <td><label>Modalidad</label></td>
              <td>{form.modalidad ?? "—"}</td>
            </tr>
            <tr>
              <td><label>Horario</label></td>
              <td>{form.horario ?? "—"}</td>
              <td><label>Días</label></td>
              <td>{selectedParalelo?.dias ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      )}       
      <section className="card">
        <h3>Datos personales</h3>
        <table className="registro-table">
          <tbody>
            <tr>
              <td><label htmlFor="ins-ci">CI</label></td>
              <td>
                <input
                  id="ins-ci"
                  type="text"
                  value={form.ci}
                  onChange={(e) => set("ci", e.target.value)}
                  maxLength={20}
                />
              </td>
              <td><label htmlFor="ins-apellido-paterno">Apellido paterno</label></td>
              <td>
                <input
                  id="ins-apellido-paterno"
                  type="text"
                  value={form.apellido_paterno}
                  onChange={(e) => set("apellido_paterno", e.target.value)}
                  maxLength={100}
                  required
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-apellido-materno">Apellido materno</label></td>
              <td>
                <input
                  id="ins-apellido-materno"
                  type="text"
                  value={form.apellido_materno}
                  onChange={(e) => set("apellido_materno", e.target.value)}
                  maxLength={100}
                />
              </td>
              <td><label htmlFor="ins-nombre">Nombre</label></td>
              <td>
                <input
                  id="ins-nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  maxLength={100}
                  required
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-fecha-nacimiento">Fecha de nacimiento</label></td>
              <td>
                <input
                  id="ins-fecha-nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) => set("fecha_nacimiento", e.target.value)}
                />
              </td>
              <td><label htmlFor="ins-celular">Celular</label></td>
              <td>
                <input
                  id="ins-celular"
                  type="text"
                  value={form.celular}
                  onChange={(e) => set("celular", e.target.value)}
                  maxLength={30}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-correo">Correo electrónico</label></td>
              <td>
                <input
                  id="ins-correo"
                  type="email"
                  value={form.correo_electronico}
                  onChange={(e) => set("correo_electronico", e.target.value)}
                  maxLength={150}
                />
              </td>
              <td><label htmlFor="ins-contraseña">Contraseña Grupo alfa</label></td>
              <td>
                <input
                  id="ins-contraseña"
                  type="password"
                  value={form.contraseña}
                  onChange={(e) => set("contraseña", e.target.value)}
                  maxLength={255}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-colegio">Colegio de procedencia</label></td>
              <td>
                <input
                  id="ins-colegio"
                  type="text"
                  value={form.colegio_de_procedencia}
                  onChange={(e) => set("colegio_de_procedencia", e.target.value)}
                  maxLength={150}
                />
              </td>
              <td><label htmlFor="ins-direccion">Dirección de domicilio</label></td>
              <td>
                <input
                  id="ins-direccion"
                  type="text"
                  value={form.direccion_de_domicilio}
                  onChange={(e) => set("direccion_de_domicilio", e.target.value)}
                  maxLength={255}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-foto">Foto (PNG)</label></td>
              <td colSpan={3}>
                <input
                  id="ins-foto"
                  type="file"
                  accept="image/png"
                  onChange={handleFotoChange}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Datos del apoderado</h3>
        <table className="registro-table">
          <tbody>
            <tr>
              <td><label htmlFor="ins-apoderado">Apoderado registrado</label></td>
              <td>
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
              </td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td><label htmlFor="ins-apoderado-ci">CI Apoderado</label></td>
              <td>
                <input
                  id="ins-apoderado-ci"
                  type="text"
                  value={form.apoderado_ci}
                  onChange={(e) => set("apoderado_ci", e.target.value)}
                  maxLength={20}
                />
              </td>
              <td><label htmlFor="ins-apoderado-parentesco">Parentesco</label></td>
              <td>
                <input
                  id="ins-apoderado-parentesco"
                  type="text"
                  value={form.apoderado_parentesco}
                  onChange={(e) => set("apoderado_parentesco", e.target.value)}
                  maxLength={100}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-apoderado-apellido-paterno">Apellido paterno</label></td>
              <td>
                <input
                  id="ins-apoderado-apellido-paterno"
                  type="text"
                  value={form.apoderado_apellido_paterno}
                  onChange={(e) => set("apoderado_apellido_paterno", e.target.value)}
                  maxLength={100}
                />
              </td>
              <td><label htmlFor="ins-apoderado-apellido-materno">Apellido materno</label></td>
              <td>
                <input
                  id="ins-apoderado-apellido-materno"
                  type="text"
                  value={form.apoderado_apellido_materno}
                  onChange={(e) => set("apoderado_apellido_materno", e.target.value)}
                  maxLength={100}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-apoderado-nombre">Nombre</label></td>
              <td>
                <input
                  id="ins-apoderado-nombre"
                  type="text"
                  value={form.apoderado_nombre}
                  onChange={(e) => set("apoderado_nombre", e.target.value)}
                  maxLength={100}
                />
              </td>
              <td><label htmlFor="ins-apoderado-telefono">Teléfono</label></td>
              <td>
                <input
                  id="ins-apoderado-telefono"
                  type="text"
                  value={form.apoderado_telefono}
                  onChange={(e) => set("apoderado_telefono", e.target.value)}
                  maxLength={30}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-apoderado-contraseña">Contraseña</label></td>
              <td colSpan={3}>
                <input
                  id="ins-apoderado-contraseña"
                  type="password"
                  value={form.apoderado_contraseña}
                  onChange={(e) => set("apoderado_contraseña", e.target.value)}
                  maxLength={255}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Datos administrativos</h3>
        <table className="registro-table">
          <tbody>
            <tr>
              <td><label htmlFor="ins-elaborado-por">Elaborado por</label></td>
              <td colSpan={3}>
                {activeRole === "administrativo" ? (
                  <input
                    id="ins-elaborado-por"
                    type="text"
                    value={loggedUser?.nombre ?? ""}
                    readOnly
                  />
                ) : (
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
                )}
              </td>
            </tr>
            <tr>
              <td><label htmlFor="ins-sucursal">Sucursal</label></td>
              <td>
                <input
                  id="ins-sucursal"
                  type="text"
                  value={form.sucursal}
                  onChange={(e) => set("sucursal", e.target.value)}
                  maxLength={100}
                />
              </td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
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
  paralelosPorCarrera: PropTypes.instanceOf(Map).isRequired,
  administrativos: PropTypes.arrayOf(PropTypes.object).isRequired,
  apoderados: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSaved: PropTypes.func,
}
