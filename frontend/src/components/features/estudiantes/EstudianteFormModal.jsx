import { useCallback, useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import Modal from "../../ui/Modal"
import TextField from "../../ui/TextField"
import Button from "../../ui/Button"

const EMAIL_RE = /^\S+@\S+\.\S+$/
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

function fotoSrc(base64) {
  if (!base64) return null
  if (base64.startsWith("data:")) return base64
  if (base64.startsWith("/9j/")) return `data:image/jpeg;base64,${base64}`
  if (base64.startsWith("R0lGOD")) return `data:image/gif;base64,${base64}`
  if (base64.startsWith("UklGR")) return `data:image/webp;base64,${base64}`
  return `data:image/png;base64,${base64}`
}

function iniciales(values) {
  const result = `${values.nombre?.[0] ?? ""}${values.apellido_paterno?.[0] ?? ""}`.toUpperCase()
  return result || "?"
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = String(reader.result ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function compressImage(image, maxSize = 640) {
  const canvas = document.createElement("canvas")
  let { width, height } = image
  if (width > maxSize || height > maxSize) {
    const scale = Math.min(maxSize / width, maxSize / height)
    width *= scale
    height *= scale
  }
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  context.drawImage(image, 0, 0, width, height)
  const dataUrl = canvas.toDataURL("image/webp", 0.82)
  return dataUrl.split(",")[1] ?? null
}

export default function EstudianteFormModal({
  mode,
  initial,
  saving,
  formError,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit" && initial?.id_estudiante != null
  const [values, setValues] = useState(() => ({
    nro_carnet: initial?.nro_carnet ?? "",
    nombre: initial?.nombre ?? "",
    apellido_paterno: initial?.apellido_paterno ?? "",
    apellido_materno: initial?.apellido_materno ?? "",
    fecha_nacimiento: initial?.fecha_nacimiento ? String(initial.fecha_nacimiento).slice(0, 10) : "",
    correo_electronico: initial?.correo_electronico ?? "",
    nro_telefono: initial?.nro_telefono ?? "",
    contraseña: "",
    usuario_vigente: initial?.usuario_vigente ?? true,
    colegio_de_procedencia: initial?.colegio_de_procedencia ?? "",
    direccion_de_domicilio: initial?.direccion_de_domicilio ?? "",
    id_apoderado: initial?.id_apoderado ?? "",
  }))
  const [fotoBase64, setFotoBase64] = useState(initial?.foto_base64 ?? null)
  const [fotoTouched, setFotoTouched] = useState(false)
  const [localError, setLocalError] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraFacing, setCameraFacing] = useState("environment")
  const [cameraError, setCameraError] = useState("")
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const cameraRequestRef = useRef(0)

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  useEffect(() => {
    if (!cameraOpen) return
    const video = videoRef.current
    if (video && streamRef.current) {
      video.srcObject = streamRef.current
      video.play().catch(() => {})
    }
  }, [cameraOpen, cameraFacing])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }))

  const abrirCamara = async (facingMode = "environment") => {
    setCameraError("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador no permite usar la cámara. Puedes subir una imagen.")
      return
    }
    stopCamera()
    const requestId = ++cameraRequestRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      setCameraFacing(facingMode)
      setCameraOpen(true)
    } catch (error) {
      if (requestId === cameraRequestRef.current) {
        const tipo = facingMode === "environment" ? "trasera" : "frontal"
        setCameraError(
          error?.name === "OverconstrainedError" || error?.name === "NotFoundError"
            ? `No se encontró una cámara ${tipo} disponible. Puedes elegir la otra cámara o subir una imagen.`
            : `No se pudo acceder a la cámara ${tipo}. Revisa los permisos del navegador o sube una imagen.`,
        )
      }
    }
  }

  const capturarFoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setCameraError("La cámara todavía se está iniciando. Intenta nuevamente.")
      return
    }
    const maxSize = 640
    let width = video.videoWidth
    let height = video.videoHeight
    if (width > maxSize || height > maxSize) {
      const scale = Math.min(maxSize / width, maxSize / height)
      width *= scale
      height *= scale
    }
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    context.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL("image/webp", 0.82)
    setFotoBase64(dataUrl.split(",")[1] ?? null)
    setFotoTouched(true)
    setCameraError("")
    stopCamera()
  }

  const handleFotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setLocalError("El archivo debe ser una imagen.")
      return
    }
    try {
      const image = await readImage(file)
      setFotoBase64(compressImage(image))
      setFotoTouched(true)
      setLocalError("")
    } catch {
      setLocalError("No se pudo leer la imagen seleccionada.")
    }
  }

  const quitarFoto = () => {
    setFotoBase64(null)
    setFotoTouched(true)
    setLocalError("")
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError("")

    const required = [
      ["nro_carnet", "Nro de carnet"],
      ["nombre", "Nombre"],
      ["apellido_paterno", "Apellido paterno"],
      ["apellido_materno", "Apellido materno"],
      ["fecha_nacimiento", "Fecha de nacimiento"],
      ["correo_electronico", "Correo electrónico"],
    ]
    if (!isEdit) required.push(["contraseña", "Contraseña"])

    for (const [name, label] of required) {
      if (values[name] === "" || values[name] == null) {
        setLocalError(`El campo "${label}" es obligatorio.`)
        return
      }
    }

    if (!EMAIL_RE.test(String(values.correo_electronico).trim())) {
      setLocalError("Debe ingresar un correo electrónico válido.")
      return
    }

    if (Number.isNaN(new Date(values.fecha_nacimiento).getTime())) {
      setLocalError("La fecha de nacimiento debe ser una fecha válida.")
      return
    }

    if (values.contraseña && String(values.contraseña).length < 8) {
      setLocalError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (values.id_apoderado !== "" && values.id_apoderado != null) {
      const idApoderado = Number(values.id_apoderado)
      if (!Number.isInteger(idApoderado) || idApoderado <= 0) {
        setLocalError("El ID del apoderado debe ser un número entero mayor a 0.")
        return
      }
    }

    if (fotoBase64 && fotoBase64.length > MAX_PHOTO_BYTES) {
      setLocalError("La foto es demasiado grande. Intenta con otra imagen.")
      return
    }

    const usuario = {
      nro_carnet: Number(values.nro_carnet),
      nombre: values.nombre.trim(),
      apellido_paterno: values.apellido_paterno.trim(),
      apellido_materno: values.apellido_materno.trim(),
      fecha_nacimiento: values.fecha_nacimiento,
      correo_electronico: values.correo_electronico.trim(),
      nro_telefono: values.nro_telefono.trim() || null,
      usuario_vigente: Boolean(values.usuario_vigente),
    }
    if (values.contraseña) usuario.contraseña = values.contraseña

    const payload = {
      usuario,
      colegio_de_procedencia: values.colegio_de_procedencia.trim() || null,
      direccion_de_domicilio: values.direccion_de_domicilio.trim() || null,
      id_apoderado: values.id_apoderado === "" ? null : Number(values.id_apoderado),
    }
    if (!isEdit || fotoTouched) payload.foto_base64 = fotoBase64

    onSubmit(payload)
  }

  const preview = fotoSrc(fotoBase64)

  return (
    <Modal
      title={isEdit ? "Editar estudiante" : "Nuevo estudiante"}
      hint={
        isEdit
          ? "Actualiza los datos personales, la ficha académica y la foto del estudiante."
          : "Crea la cuenta de acceso y la ficha del estudiante. La cuenta tendrá el rol Estudiante."
      }
      onClose={onClose}
    >
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <div className="estudiante-form-section">
            <h4>Foto del estudiante</h4>
            <div className="estudiante-foto-editor">
              <div className="estudiante-foto-preview">
                {preview ? (
                  <img src={preview} alt="Vista previa de la foto del estudiante" />
                ) : (
                  <span>{iniciales(values)}</span>
                )}
              </div>
              <div className="estudiante-foto-actions">
                <Button
                  variant="secondary"
                  onClick={() => abrirCamara("environment")}
                  disabled={cameraOpen && cameraFacing === "environment"}
                >
                  Usar cámara trasera
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => abrirCamara("user")}
                  disabled={cameraOpen && cameraFacing === "user"}
                >
                  Usar cámara frontal
                </Button>
                <label className="estudiante-foto-upload">
                  Subir imagen
                  <input type="file" accept="image/*" onChange={handleFotoChange} />
                </label>
                {preview && (
                  <Button variant="secondary" onClick={quitarFoto}>
                    Quitar foto
                  </Button>
                )}
              </div>
            </div>

            {cameraOpen && (
              <div className="estudiante-camera">
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="estudiante-camera-actions">
                  <Button onClick={capturarFoto}>Capturar foto</Button>
                  <Button variant="secondary" onClick={stopCamera}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            {cameraError && (
              <p className="error-message" role="alert">
                {cameraError}
              </p>
            )}
          </div>

          <div className="form-grid-two">
            <TextField
              id="e-nro_carnet"
              label="Nro de carnet"
              type="number"
              value={values.nro_carnet}
              onChange={(event) => set("nro_carnet", event.target.value)}
              required
            />
            <TextField
              id="e-nombre"
              label="Nombre"
              value={values.nombre}
              onChange={(event) => set("nombre", event.target.value)}
              maxLength={100}
              required
            />
            <TextField
              id="e-apellido_paterno"
              label="Apellido paterno"
              value={values.apellido_paterno}
              onChange={(event) => set("apellido_paterno", event.target.value)}
              maxLength={100}
              required
            />
            <TextField
              id="e-apellido_materno"
              label="Apellido materno"
              value={values.apellido_materno}
              onChange={(event) => set("apellido_materno", event.target.value)}
              maxLength={100}
              required
            />
            <TextField
              id="e-fecha_nacimiento"
              label="Fecha de nacimiento"
              type="date"
              value={values.fecha_nacimiento}
              onChange={(event) => set("fecha_nacimiento", event.target.value)}
              required
            />
            <TextField
              id="e-correo_electronico"
              label="Correo electrónico"
              type="email"
              value={values.correo_electronico}
              onChange={(event) => set("correo_electronico", event.target.value)}
              maxLength={150}
              autoComplete="email"
              required
            />
            <TextField
              id="e-nro_telefono"
              label="Teléfono"
              value={values.nro_telefono}
              onChange={(event) => set("nro_telefono", event.target.value)}
              maxLength={20}
            />
            <TextField
              id="e-contraseña"
              label={isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
              type="password"
              value={values.contraseña}
              onChange={(event) => set("contraseña", event.target.value)}
              autoComplete="new-password"
              required={!isEdit}
            />
          </div>

          <div className="form-row form-row-inline">
            <input
              id="e-vigente"
              type="checkbox"
              checked={Boolean(values.usuario_vigente)}
              onChange={(event) => set("usuario_vigente", event.target.checked)}
            />
            <label htmlFor="e-vigente">Usuario vigente</label>
          </div>

          <div className="estudiante-form-section">
            <h4>Datos académicos</h4>
            <div className="form-grid-two">
              <TextField
                id="e-colegio_de_procedencia"
                label="Colegio de procedencia"
                value={values.colegio_de_procedencia}
                onChange={(event) => set("colegio_de_procedencia", event.target.value)}
                maxLength={150}
              />
              <TextField
                id="e-id_apoderado"
                label="ID apoderado (opcional)"
                type="number"
                min="1"
                value={values.id_apoderado}
                onChange={(event) => set("id_apoderado", event.target.value)}
              />
              <div className="form-grid-span">
                <TextField
                  id="e-direccion_de_domicilio"
                  label="Dirección de domicilio"
                  value={values.direccion_de_domicilio}
                  onChange={(event) => set("direccion_de_domicilio", event.target.value)}
                  maxLength={255}
                />
              </div>
            </div>
          </div>

          {(localError || formError) && (
            <p className="error-message" role="alert">
              {localError || formError}
            </p>
          )}

          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear estudiante"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Body>
    </Modal>
  )
}

EstudianteFormModal.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]).isRequired,
  initial: PropTypes.object,
  saving: PropTypes.bool.isRequired,
  formError: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}
