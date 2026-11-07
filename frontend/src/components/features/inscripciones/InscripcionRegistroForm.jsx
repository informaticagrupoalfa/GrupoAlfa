import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import TextField from "../../ui/TextField"
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

function buildEmptyForm(elaboradoPor) {
  return {
    id_carrera: "",
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
  const dateOnly = (value) => (value ? String(value).slice(0, 10) : "")
  return {
    id_carrera: record.id_carrera ?? "",
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

export default function InscripcionRegistroForm({ inscripcionId, carreraOptions, onSaved }) {
  const { loggedUser } = useAuth()
  const defaultElaborado = useMemo(() => fullName(loggedUser), [loggedUser])
  const [form, setForm] = useState(() => buildEmptyForm(defaultElaborado))
  const [loading, setLoading] = useState(Boolean(inscripcionId))
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (!inscripcionId) {
      setForm(buildEmptyForm(defaultElaborado))
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
  }, [inscripcionId, defaultElaborado])

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

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
        setForm(buildEmptyForm(defaultElaborado))
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
              onChange={(e) => set("id_carrera", e.target.value)}
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
          <TextField
            id="ins-credencial"
            label="Nº de credencial"
            type="number"
            value={form.nro_credencial}
            onChange={(e) => set("nro_credencial", e.target.value)}
          />
          <TextField
            id="ins-inicio-clases"
            label="Inicio de clases"
            type="date"
            value={form.inicio_clases}
            onChange={(e) => set("inicio_clases", e.target.value)}
          />
          <TextField
            id="ins-modalidad"
            label="Modalidad"
            type="text"
            value={form.modalidad}
            onChange={(e) => set("modalidad", e.target.value)}
            maxLength={50}
          />
          <TextField
            id="ins-horario"
            label="Horario"
            type="text"
            value={form.horario}
            onChange={(e) => set("horario", e.target.value)}
            maxLength={100}
          />
          <TextField
            id="ins-grupo"
            label="Grupo"
            type="text"
            value={form.grupo}
            onChange={(e) => set("grupo", e.target.value)}
            maxLength={50}
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
          <TextField
            id="ins-apoderado-nombre"
            label="Nombre completo"
            type="text"
            value={form.apoderado_nombre_completo}
            onChange={(e) => set("apoderado_nombre_completo", e.target.value)}
            maxLength={200}
          />
          <TextField
            id="ins-apoderado-celular"
            label="Celular"
            type="text"
            value={form.apoderado_celular}
            onChange={(e) => set("apoderado_celular", e.target.value)}
            maxLength={20}
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
          <TextField
            id="ins-elaborado-por"
            label="Elaborado por"
            type="text"
            value={form.elaborado_por}
            onChange={(e) => set("elaborado_por", e.target.value)}
            maxLength={150}
          />
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
  onSaved: PropTypes.func,
}
