/* global Buffer */
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

function RegistroCampo({ id, label, children, wide = false }) {
  return (
    <div className={`inscripcion-field${wide ? " inscripcion-field--wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

RegistroCampo.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  wide: PropTypes.bool,
}

function buildEmptyForm(elaboradoPor, idAdministrativo) {
  return {
    id_carrera: "",
    id_administrativo: idAdministrativo ?? "",
    id_paralelo: "",
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
    fotoBase64: null,
    apoderado_nombre_completo: "",
    apoderado_ci: "",
    apoderado_correo_electronico: "",
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
    id_paralelo: record.id_paralelo ?? "",
    nro_credencial: record.num_credencial ?? record.nro_credencial ?? "",
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
    fotoBase64: record.foto ? `data:image/jpeg;base64,${Buffer.from(record.foto).toString("base64")}` : null,
    apoderado_nombre_completo: record.apoderado_nombre_completo ?? "",
    apoderado_ci: record.apoderado_ci ?? "",
    apoderado_correo_electronico: record.apoderado_correo_electronico ?? "",
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
    fecha_inscripcion: dateOnly(record.fecha_insc ?? record.fecha_inscripcion),
  }
}

export default function InscripcionRegistroForm({
  inscripcionId,
  carreraOptions,
  paralelosPorCarrera,
  administrativos,
  apoderados,
  onSaved,
  syncSearchParams = true,
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
  const [fotoPreview, setFotoPreview] = useState(null)
  const [existingUser, setExistingUser] = useState(null)
  const [userLookupStatus, setUserLookupStatus] = useState("")
  const [existingGuardian, setExistingGuardian] = useState(null)
  const [guardianLookupStatus, setGuardianLookupStatus] = useState("")

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
      setFotoPreview(null)
      setLoading(false)
      setLoadError("")
      return undefined
    }

    let mounted = true
    setLoading(true)
    setLoadError("")
    getResourceById("inscripciones", inscripcionId)
      .then((record) => {
        if (mounted) {
          setForm(fromRecord(record))
          if (record.id_paralelo != null) setSelectedParaleloId(String(record.id_paralelo))
        }
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
      (!form.apoderado_telefono || String(apoderado.telefono ?? "") === String(form.apoderado_telefono)),
    )
    if (match) setSelectedApoderadoId(String(match.id_apoderado))
  }, [apoderados, form.apoderado_nombre_completo, form.apoderado_telefono, selectedApoderadoId])

  useEffect(() => {
    if (inscripcionId) return undefined
    const ci = form.ci.trim()
    if (!ci) {
      setExistingUser(null)
      setUserLookupStatus("")
      return undefined
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setUserLookupStatus("Buscando usuario…")
      try {
        const user = await getResourceById("usuarios/ci", encodeURIComponent(ci))
        if (!active) return
        setExistingUser(user)
        setFotoPreview(user.foto_base64 ? `data:image/jpeg;base64,${user.foto_base64}` : null)
        setForm((prev) => ({
          ...prev,
          ci: String(user.nro_carnet ?? ci),
          apellido_paterno: user.apellido_paterno ?? "",
          apellido_materno: user.apellido_materno ?? "",
          nombre: user.nombre ?? "",
          fecha_nacimiento: dateOnly(user.fecha_nacimiento),
          celular: user.nro_telefono ?? "",
          correo_electronico: user.correo_electronico ?? "",
          colegio_de_procedencia: user.colegio_de_procedencia ?? "",
          direccion_de_domicilio: user.direccion_de_domicilio ?? "",
          fotoBase64: user.foto_base64 ?? null,
          contraseña: "",
        }))
        setUserLookupStatus("Usuario encontrado. Los datos personales se completaron y quedaron bloqueados.")
      } catch (error) {
        if (!active) return
        if (error?.response?.status === 404) {
          setExistingUser(null)
          setUserLookupStatus("No existe un usuario con ese CI.")
        } else {
          setUserLookupStatus("No se pudo verificar el CI. Intenta nuevamente.")
        }
      }
    }, 1000)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [form.ci, inscripcionId])

  useEffect(() => {
    if (inscripcionId) return undefined
    const ci = form.apoderado_ci.trim()
    if (!ci) {
      setExistingGuardian(null)
      setGuardianLookupStatus("")
      return undefined
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setGuardianLookupStatus("Buscando apoderado…")
      try {
        const guardian = await getResourceById("usuarios/ci", encodeURIComponent(ci))
        if (!active) return
        setExistingGuardian(guardian)
        const idApoderado = guardian.id_apoderado == null ? "" : String(guardian.id_apoderado)
        setSelectedApoderadoId(idApoderado)
        setForm((prev) => ({
          ...prev,
          apoderado_ci: String(guardian.nro_carnet ?? ci),
          apoderado_nombre: guardian.nombre ?? "",
          apoderado_apellido_paterno: guardian.apellido_paterno ?? "",
          apoderado_apellido_materno: guardian.apellido_materno ?? "",
          apoderado_telefono: guardian.nro_telefono ?? "",
          apoderado_correo_electronico: guardian.correo_electronico ?? "",
          apoderado_parentesco: guardian.apoderado_parentesco ?? "",
          apoderado_contraseña: "",
        }))
        setGuardianLookupStatus("Usuario encontrado. Los datos del apoderado se completaron y quedaron bloqueados.")
      } catch (error) {
        if (!active) return
        if (error?.response?.status === 404) {
          setExistingGuardian(null)
          setGuardianLookupStatus("No existe un usuario con ese CI.")
        } else {
          setGuardianLookupStatus("No se pudo verificar el CI. Intenta nuevamente.")
        }
      }
    }, 1000)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [form.apoderado_ci, inscripcionId])

  useEffect(() => {
    if (form.id_administrativo || !form.elaborado_por || administrativos.length === 0) return
    const match = administrativos.find((admin) => fullName(admin) === form.elaborado_por)
    if (match) setForm((prev) => ({ ...prev, id_administrativo: String(match.id_administrativo) }))
  }, [administrativos, form.id_administrativo, form.elaborado_por])

  const isRestoring = useRef(false)

  useEffect(() => {
    if (inscripcionId || !syncSearchParams) return
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
    isRestoring.current = false
  }, [searchParams, inscripcionId, defaultElaborado, defaultAdministrativo?.id_administrativo, syncSearchParams])

  useEffect(() => {
    if (isRestoring.current || inscripcionId || !syncSearchParams) return
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
  }, [form, setSearchParams, inscripcionId, syncSearchParams])

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))
  const handleStudentCiChange = (value) => {
    setExistingUser(null)
    setUserLookupStatus("")
    setFotoPreview(null)
    setForm((prev) => ({
      ...prev,
      ci: value,
      apellido_paterno: "",
      apellido_materno: "",
      nombre: "",
      fecha_nacimiento: "",
      celular: "",
      correo_electronico: "",
      colegio_de_procedencia: "",
      direccion_de_domicilio: "",
      fotoBase64: null,
      contraseña: "",
    }))
  }
  const handleGuardianCiChange = (value) => {
    setExistingGuardian(null)
    setGuardianLookupStatus("")
    setSelectedApoderadoId("")
    setForm((prev) => ({
      ...prev,
      apoderado_ci: value,
      apoderado_nombre: "",
      apoderado_apellido_paterno: "",
      apoderado_apellido_materno: "",
      apoderado_telefono: "",
      apoderado_correo_electronico: "",
      apoderado_parentesco: "",
      apoderado_contraseña: "",
    }))
  }

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
      apoderado_correo_electronico: apoderado ? apoderado.correo_electronico ?? "" : "",
      apoderado_apellido_paterno: apoderado ? apoderado.apellido_paterno ?? "" : "",
      apoderado_apellido_materno: apoderado ? apoderado.apellido_materno ?? "" : "",
      apoderado_nombre: apoderado ? apoderado.nombre ?? "" : "",
      apoderado_telefono: apoderado ? apoderado.telefono ?? apoderado.nro_telefono ?? "" : "",
      apoderado_parentesco: apoderado ? apoderado.parentesco ?? "" : "",
      apoderado_contraseña: "",
    }))
  }

  const handleFotoChange = (event) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const maxWidth = 500
          const maxHeight = 500
          let width = img.width
          let height = img.height
          if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height)
            width = width * scale
            height = height * scale
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL("image/webp", 0.75)
          setFotoPreview(compressed)
          setForm((prev) => ({ ...prev, fotoBase64: compressed.split(",")[1] ?? null }))
        }
        img.src = e.target.result?.toString() ?? ""
      }
      reader.readAsDataURL(file)
    } else {
      setFotoPreview(null)
      setForm((prev) => ({ ...prev, fotoBase64: null }))
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
    if (!existingGuardian?.id_apoderado && !form.apoderado_contraseña) {
      setFormError("La contraseña del apoderado es obligatoria.")
      return
    }
    
      console.log(existingUser?.id_estudiante)
      console.log(!form.contraseña)
    if (!existingUser?.id_usuario && !form.contraseña) {
      console.log(existingUser)
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
      apoderado_correo_electronico: textOrUndefined(form.apoderado_correo_electronico),
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
      id_carrera: toNumberOrUndefined(form.id_carrera),
      como_se_entero_de_nosotros: textOrUndefined(form.como_se_entero_de_nosotros),
      como_se_entero_detalle: textOrUndefined(form.como_se_entero_detalle),
      recalculo: Boolean(form.recalculo),
      preparacion_previa: Boolean(form.preparacion_previa),
      tiempo_de_preparacion_meses: toNumberOrUndefined(form.tiempo_de_preparacion_meses),
      lugar_de_preparacion: textOrUndefined(form.lugar_de_preparacion),
      nro_credencial: toNumberOrUndefined(form.nro_credencial),
      fecha_inscripcion: textOrUndefined(form.fecha_inscripcion),
      fecha_registro: textOrUndefined(form.fecha_registro),
      inicio_clases: textOrUndefined(form.inicio_clases),
      modalidad: textOrUndefined(form.modalidad),
      horario: textOrUndefined(form.horario),
      grupo: textOrUndefined(form.grupo),
      elaborado_por: textOrUndefined(form.elaborado_por),
      sucursal: textOrUndefined(form.sucursal),
      foto: form.fotoBase64,
    }

    const fotoPesoBytes = form.fotoBase64 ? Math.round((form.fotoBase64.length * 3) / 4) : 0
    if (form.fotoBase64) {
      console.log(`[InscripcionRegistroForm] Tamaño de imagen a enviar: ${(fotoPesoBytes / 1024).toFixed(2)} KB (${fotoPesoBytes} bytes)`)
    }
    const payloadStr = JSON.stringify(payload)
    const partes = {
      ci: form.ci ? new Blob([form.ci]).size : 0,
      apellido_paterno: form.apellido_paterno ? new Blob([form.apellido_paterno]).size : 0,
      apellido_materno: form.apellido_materno ? new Blob([form.apellido_materno]).size : 0,
      nombre: form.nombre ? new Blob([form.nombre]).size : 0,
      fecha_nacimiento: form.fecha_nacimiento ? new Blob([form.fecha_nacimiento]).size : 0,
      correo_electronico: form.correo_electronico ? new Blob([form.correo_electronico]).size : 0,
      contraseña: form.contraseña ? new Blob([form.contraseña]).size : 0,
      apoderado_ci: form.apoderado_ci ? new Blob([form.apoderado_ci]).size : 0,
      apoderado_correo_electronico: form.apoderado_correo_electronico ? new Blob([form.apoderado_correo_electronico]).size : 0,
      apoderado_nombre: form.apoderado_nombre ? new Blob([form.apoderado_nombre]).size : 0,
      apoderado_apellido_paterno: form.apoderado_apellido_paterno ? new Blob([form.apoderado_apellido_paterno]).size : 0,
      apoderado_apellido_materno: form.apoderado_apellido_materno ? new Blob([form.apoderado_apellido_materno]).size : 0,
      apoderado_telefono: form.apoderado_telefono ? new Blob([form.apoderado_telefono]).size : 0,
      apoderado_contraseña: form.apoderado_contraseña ? new Blob([form.apoderado_contraseña]).size : 0,
      apoderado_parentesco: form.apoderado_parentesco ? new Blob([form.apoderado_parentesco]).size : 0,
      colegio_de_procedencia: form.colegio_de_procedencia ? new Blob([form.colegio_de_procedencia]).size : 0,
      direccion_de_domicilio: form.direccion_de_domicilio ? new Blob([form.direccion_de_domicilio]).size : 0,
      id_administrativo: form.id_administrativo ? new Blob([String(form.id_administrativo)]).size : 0,
      id_paralelo: form.id_paralelo ? new Blob([String(form.id_paralelo)]).size : 0,
      como_se_entero_de_nosotros: form.como_se_entero_de_nosotros ? new Blob([form.como_se_entero_de_nosotros]).size : 0,
      foto: fotoPesoBytes,
    }
    const totalSinFoto = Object.values(partes).reduce((a, b) => a + b, 0) - fotoPesoBytes
    console.log("[InscripcionRegistroForm] Peso del payload por parte (bytes):", partes)
    console.log(`[InscripcionRegistroForm] Tamaño total del payload JSON: ${(new Blob([payloadStr]).size / 1024).toFixed(2)} KB (${new Blob([payloadStr]).size} bytes). Partes sin foto: ${(totalSinFoto / 1024).toFixed(2)} KB, Foto: ${(fotoPesoBytes / 1024).toFixed(2)} KB`)

    setSaving(true)
    try {
      const saved = await registrarEstudiante(payload)
      setForm(buildEmptyForm(defaultElaborado, defaultAdministrativo?.id_administrativo))
      setShowParalelos(false)
      setSelectedParaleloId("")
      setSelectedApoderadoId("")
      setFotoPreview(null)
      onSaved?.(saved)
    } catch (error) {
      const data = error?.response?.data
      let mensaje = "No se pudo registrar el estudiante."
      if (data?.campo) {
        const campoLabel = data.campo === "ci" ? "CI del estudiante"
          : data.campo === "apoderado_ci" ? "CI del apoderado"
          : data.campo === "correo_electronico" ? "correo electrónico"
          : data.campo
        mensaje = `El ${campoLabel} (${data.valor ?? ""}) ya está registrado.`
      }
      console.log(error)
      setFormError(data?.campo ? mensaje : (error.userMessage ?? data?.error ?? mensaje))
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
        <p className="muted">{inscripcionId ? "Editando registro de usuario" : "Registro de usuario"}</p>
      </div>

      <section className="card" aria-labelledby="ins-datos-academicos">
        <h3 id="ins-datos-academicos">Datos académicos</h3>
        <div className="inscripcion-fields">
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-carrera" label="Carrera a la que postula">
              <select id="ins-carrera" value={form.id_carrera} onChange={(e) => handleCarreraChange(e.target.value)}>
                <option value="">Selecciona…</option>
                {carreraOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </RegistroCampo>
            <RegistroCampo id="ins-credencial" label="Nº de credencial">
              <input id="ins-credencial" type="number" value={form.nro_credencial}
                onChange={(e) => set("nro_credencial", e.target.value)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <label className="inscripcion-check-field" htmlFor="ins-recalculo">
              <input id="ins-recalculo" type="checkbox" checked={Boolean(form.recalculo)}
                onChange={(e) => set("recalculo", e.target.checked)} />
              <span>Recálculo</span>
            </label>
            <label className="inscripcion-check-field" htmlFor="ins-preparacion">
              <input id="ins-preparacion" type="checkbox" checked={Boolean(form.preparacion_previa)}
                onChange={(e) => set("preparacion_previa", e.target.checked)} />
              <span>¿Tuviste preparación previa?</span>
            </label>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-tiempo" label="Preparación (meses)">
              <input id="ins-tiempo" type="number" min="0" value={form.tiempo_de_preparacion_meses}
                onChange={(e) => set("tiempo_de_preparacion_meses", e.target.value)} />
            </RegistroCampo>
            <RegistroCampo id="ins-fecha-inscripcion" label="Fecha inscripción">
              <input id="ins-fecha-inscripcion" type="date" value={form.fecha_inscripcion}
                onChange={(e) => set("fecha_inscripcion", e.target.value)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-lugar-preparacion" label="¿Dónde realizó su preparación?" wide>
              <input id="ins-lugar-preparacion" type="text" maxLength={255} value={form.lugar_de_preparacion}
                onChange={(e) => set("lugar_de_preparacion", e.target.value)} />
            </RegistroCampo>
          </div>
          <fieldset className="inscripcion-radio-field">
            <legend>¿Cómo se enteró de nosotros?</legend>
            <div className="radio-group">
              {MEDIOS.map((medio) => (
                <label key={medio} className="radio-option">
                  <input type="radio" name="como-se-entero" value={medio}
                    checked={form.como_se_entero_de_nosotros === medio}
                    onChange={(e) => set("como_se_entero_de_nosotros", e.target.value)} />
                  {medio}
                </label>
              ))}
            </div>
          </fieldset>
          {needsDetalle && (
            <div className="inscripcion-form-row">
              <RegistroCampo id="ins-como-detalle"
                label={form.como_se_entero_de_nosotros === "Redes sociales" ? "¿Cuál?" : "Menciónalo"} wide>
                <input id="ins-como-detalle" type="text" maxLength={255} value={form.como_se_entero_detalle}
                  onChange={(e) => set("como_se_entero_detalle", e.target.value)} />
              </RegistroCampo>
            </div>
          )}
        </div>
      </section>

      {form.id_carrera && (
        <section className="card inscripcion-course-section" aria-label="Paralelos de la carrera">
          <label className={"create-toggle inscripcion-course-toggle" + (showParalelos ? " is-active" : "")}
            htmlFor="ins-mostrar-paralelos">
            <span className="create-toggle-label">
              Paralelos disponibles{paralelosCarrera.length > 0 ? " (" + paralelosCarrera.length + ")" : ""}
            </span>
            <input id="ins-mostrar-paralelos" type="checkbox" checked={showParalelos}
              onChange={(e) => setShowParalelos(e.target.checked)} />
            <span className="create-toggle-track" aria-hidden="true" />
          </label>
          {showParalelos && (
            <div className="curso-picker">
              {paralelosCarrera.length === 0 ? (
                <p className="muted curso-empty">No hay paralelos activos para esta carrera.</p>
              ) : (
                <div className="curso-grid">
                  {paralelosCarrera.map((paralelo) => {
                    const selected = String(paralelo.id_paralelo) === selectedParaleloId
                    return (
                      <button key={paralelo.id_paralelo} type="button"
                        className={"curso-card" + (selected ? " selected" : "")}
                        onClick={() => handleParaleloSelect(paralelo)} aria-pressed={selected}>
                        <strong>{paralelo.nombre_paralelo ?? "Paralelo " + paralelo.id_paralelo}</strong>
                        <span>{paralelo.nivel ? "Nivel: " + paralelo.nivel : "Sin nivel"}</span>
                        <span>{paralelo.modalidad ?? "Sin modalidad"} · {horarioParalelo(paralelo) || "Sin horario"}</span>
                        <span>{paralelo.dias ? "Días: " + paralelo.dias : "Días por definir"}</span>
                        <span>Inicio: {formatDateDisplay(paralelo.capacitacion?.fecha_inicio) || "Por definir"}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          <dl className="inscripcion-paralelo-resumen">
            <div><dt>Paralelo</dt><dd>{selectedParalelo?.nombre_paralelo ?? form.grupo ?? "—"}</dd></div>
            <div><dt>Nivel</dt><dd>{selectedParalelo?.nivel ?? "—"}</dd></div>
            <div><dt>Inicio de clases</dt><dd>{formatDateDisplay(form.inicio_clases) || "—"}</dd></div>
            <div><dt>Modalidad</dt><dd>{form.modalidad || "—"}</dd></div>
            <div><dt>Horario</dt><dd>{form.horario || "—"}</dd></div>
            <div><dt>Días</dt><dd>{selectedParalelo?.dias || "—"}</dd></div>
          </dl>
        </section>
      )}

      <section className="card" aria-labelledby="ins-datos-personales">
        <h3 id="ins-datos-personales">Datos personales</h3>
        <div className="inscripcion-fields">
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-ci" label="CI">
              <>
                <input id="ins-ci" type="text" maxLength={20} value={form.ci}
                  onChange={(e) => handleStudentCiChange(e.target.value)} />
                {userLookupStatus && <small role="status">{userLookupStatus}</small>}
              </>
            </RegistroCampo>
            <RegistroCampo id="ins-apellido-paterno" label="Apellido paterno">
              <input id="ins-apellido-paterno" type="text" maxLength={100} required value={form.apellido_paterno}
                onChange={(e) => set("apellido_paterno", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-apellido-materno" label="Apellido materno">
              <input id="ins-apellido-materno" type="text" maxLength={100} value={form.apellido_materno}
                onChange={(e) => set("apellido_materno", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
            <RegistroCampo id="ins-nombre" label="Nombre">
              <input id="ins-nombre" type="text" maxLength={100} required value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-fecha-nacimiento" label="Fecha de nacimiento">
              <input id="ins-fecha-nacimiento" type="date" value={form.fecha_nacimiento}
                onChange={(e) => set("fecha_nacimiento", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
            <RegistroCampo id="ins-celular" label="Celular">
              <input id="ins-celular" type="text" maxLength={30} value={form.celular}
                onChange={(e) => set("celular", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-correo" label="Correo electrónico">
              <input id="ins-correo" type="email" maxLength={150} value={form.correo_electronico}
                onChange={(e) => set("correo_electronico", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
            <RegistroCampo id="ins-contraseña" label="Contraseña Grupo alfa">
              <input id="ins-contraseña" type="password" maxLength={255} value={form.contraseña}
                onChange={(e) => set("contraseña", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-colegio" label="Colegio de procedencia">
              <input id="ins-colegio" type="text" maxLength={150} value={form.colegio_de_procedencia}
                onChange={(e) => set("colegio_de_procedencia", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-direccion" label="Dirección de domicilio" wide>
              <input id="ins-direccion" type="text" maxLength={255} value={form.direccion_de_domicilio}
                onChange={(e) => set("direccion_de_domicilio", e.target.value)} disabled={Boolean(existingUser)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-foto" label="Foto (PNG)" wide>
              <>
                <input id="ins-foto" type="file" accept="image/png" onChange={handleFotoChange}
                  disabled={Boolean(existingUser)} />
                {fotoPreview && <img className="inscripcion-foto-preview" src={fotoPreview} alt="Vista previa de la foto" />}
              </>
            </RegistroCampo>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="ins-datos-apoderado">
        <h3 id="ins-datos-apoderado">Datos del apoderado</h3>
        <div className="inscripcion-fields">
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-apoderado" label="Apoderado registrado" wide>
              <select id="ins-apoderado" value={selectedApoderadoId}
                onChange={(e) => handleApoderadoChange(e.target.value)} disabled={Boolean(existingGuardian)}>
                <option value="">Sin apoderado</option>
                {apoderados.map((apoderado) => (
                  <option key={apoderado.id_apoderado} value={apoderado.id_apoderado}>
                    {fullName(apoderado)}{apoderado.telefono ? " · " + apoderado.telefono : ""}
                  </option>
                ))}
              </select>
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-apoderado-ci" label="CI Apoderado">
              <>
                <input id="ins-apoderado-ci" type="text" maxLength={20} value={form.apoderado_ci}
                  onChange={(e) => handleGuardianCiChange(e.target.value)} />
                {guardianLookupStatus && <small role="status">{guardianLookupStatus}</small>}
              </>
            </RegistroCampo>
            <RegistroCampo id="ins-apoderado-parentesco" label="Parentesco">
              <input id="ins-apoderado-parentesco" type="text" maxLength={100} value={form.apoderado_parentesco}
                onChange={(e) => set("apoderado_parentesco", e.target.value)} disabled={Boolean(existingGuardian)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-apoderado-apellido-paterno" label="Apellido paterno">
              <input id="ins-apoderado-apellido-paterno" type="text" maxLength={100}
                value={form.apoderado_apellido_paterno} onChange={(e) => set("apoderado_apellido_paterno", e.target.value)}
                disabled={Boolean(existingGuardian)} />
            </RegistroCampo>
            <RegistroCampo id="ins-apoderado-apellido-materno" label="Apellido materno">
              <input id="ins-apoderado-apellido-materno" type="text" maxLength={100}
                value={form.apoderado_apellido_materno} onChange={(e) => set("apoderado_apellido_materno", e.target.value)}
                disabled={Boolean(existingGuardian)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-apoderado-nombre" label="Nombre">
              <input id="ins-apoderado-nombre" type="text" maxLength={100} value={form.apoderado_nombre}
                onChange={(e) => set("apoderado_nombre", e.target.value)} disabled={Boolean(existingGuardian)} />
            </RegistroCampo>
            <RegistroCampo id="ins-apoderado-telefono" label="Teléfono">
              <input id="ins-apoderado-telefono" type="text" maxLength={30} value={form.apoderado_telefono}
                onChange={(e) => set("apoderado_telefono", e.target.value)} disabled={Boolean(existingGuardian)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-apoderado-correo" label="Correo electrónico apoderado" wide>
              <input id="ins-apoderado-correo" type="email" maxLength={150}
                value={form.apoderado_correo_electronico} onChange={(e) => set("apoderado_correo_electronico", e.target.value)}
                disabled={Boolean(existingGuardian)} />
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-apoderado-contraseña" label="Contraseña" wide>
              <input id="ins-apoderado-contraseña" type="password" maxLength={255}
                value={form.apoderado_contraseña} onChange={(e) => set("apoderado_contraseña", e.target.value)}
                disabled={Boolean(existingGuardian)} />
            </RegistroCampo>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="ins-datos-administrativos">
        <h3 id="ins-datos-administrativos">Datos administrativos</h3>
        <div className="inscripcion-fields">
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-elaborado-por" label="Elaborado por" wide>
              {activeRole === "administrativo" ? (
                <input id="ins-elaborado-por" type="text" value={loggedUser?.nombre ?? ""} readOnly />
              ) : (
                <select id="ins-elaborado-por" value={form.id_administrativo || ""}
                  onChange={(e) => handleAdministrativoChange(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {administrativos.map((admin) => (
                    <option key={admin.id_administrativo} value={admin.id_administrativo}>{fullName(admin)}</option>
                  ))}
                </select>
              )}
            </RegistroCampo>
          </div>
          <div className="inscripcion-form-row">
            <RegistroCampo id="ins-sucursal" label="Sucursal">
              <input id="ins-sucursal" type="text" maxLength={100} value={form.sucursal}
                onChange={(e) => set("sucursal", e.target.value)} />
            </RegistroCampo>
          </div>
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
  paralelosPorCarrera: PropTypes.instanceOf(Map).isRequired,
  administrativos: PropTypes.arrayOf(PropTypes.object).isRequired,
  apoderados: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSaved: PropTypes.func,
  syncSearchParams: PropTypes.bool,
}
