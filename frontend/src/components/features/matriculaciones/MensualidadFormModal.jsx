import { Suspense, lazy, useEffect, useState } from "react"
import PropTypes from "prop-types"
import Modal from "../../ui/Modal"
import TextField from "../../ui/TextField"
import Button from "../../ui/Button"
import Skeleton from "../../ui/Skeleton"

const PersonCombobox = lazy(() => import("./PersonCombobox"))

export default function MensualidadFormModal({
  initial,
  inscripcionOptions,
  administrativoOptions,
  saving,
  formError,
  onClose,
  onSubmit,
}) {
  const [idInscripcion, setIdInscripcion] = useState(initial?.id_inscripcion ?? null)
  const [idAdministrativo, setIdAdministrativo] = useState(initial?.id_administrativo ?? null)
  const [inicio, setInicio] = useState(initial?.fecha_inicio_mensualidad ? String(initial.fecha_inicio_mensualidad).slice(0, 10) : "")
  const [fin, setFin] = useState(initial?.fecha_fin_mensualidad ? String(initial.fecha_fin_mensualidad).slice(0, 10) : "")
  const [pago, setPago] = useState(initial?.pago ?? "")
  const [codigoComprobante, setCodigoComprobante] = useState(initial?.codigo_comprobante ?? "")
  const [localError, setLocalError] = useState("")

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError("")
    if (idInscripcion == null) {
      setLocalError("Debes elegir una inscripción de las sugerencias.")
      return
    }
    if (idAdministrativo == null) {
      setLocalError("Debes elegir un administrativo de las sugerencias.")
      return
    }
    if (!inicio || !fin) {
      setLocalError("Las fechas de inicio y fin son obligatorias.")
      return
    }
    if (fin < inicio) {
      setLocalError("La fecha de fin debe ser mayor o igual que la de inicio.")
      return
    }
    if (pago === "" || Number.isNaN(Number(pago)) || Number(pago) < 0) {
      setLocalError("El pago debe ser un número mayor o igual a 0.")
      return
    }
    onSubmit({
      id_inscripcion: Number(idInscripcion),
      id_administrativo: Number(idAdministrativo),
      fecha_inicio_mensualidad: inicio,
      fecha_fin_mensualidad: fin,
      pago: Number(pago),
      ...(codigoComprobante !== "" ? { codigo_comprobante: Number(codigoComprobante) } : {}),
    })
  }

  return (
    <Modal
      title={initial?.id_mensualidad != null ? "Editar mensualidad" : "Nueva mensualidad"}
      hint="Registra el pago mensual asociado a una inscripción."
      onClose={onClose}
    >
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <Suspense fallback={<Skeleton lines={2} />}>
            <PersonCombobox
              id="p-inscripcion"
              label="Inscripción"
              options={inscripcionOptions}
              value={idInscripcion}
              onSelect={setIdInscripcion}
              placeholder="Escribe el nombre del estudiante o paralelo..."
              hint="Cada mensualidad se asocia a una inscripción."
            />
          </Suspense>
          <Suspense fallback={<Skeleton lines={2} />}>
            <PersonCombobox
              id="p-administrativo"
              label="Administrativo"
              options={administrativoOptions}
              value={idAdministrativo}
              onSelect={setIdAdministrativo}
              placeholder="Escribe el nombre del administrativo..."
              hint="Escribe y elige una sugerencia de la lista."
            />
          </Suspense>
          <TextField
            id="p-inicio"
            label="Fecha de inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />
          <TextField
            id="p-fin"
            label="Fecha de fin"
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            required
          />
          <TextField
            id="p-pago"
            label="Pago"
            type="number"
            value={pago}
            onChange={(e) => setPago(e.target.value)}
            required
          />
          <TextField
            id="p-comprobante"
            label="Código de comprobante"
            type="number"
            value={codigoComprobante}
            onChange={(e) => setCodigoComprobante(e.target.value)}
          />
          {(localError || formError) && (
            <p className="error-message" role="alert">{localError || formError}</p>
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Body>
    </Modal>
  )
}

MensualidadFormModal.propTypes = {
  initial: PropTypes.object,
  inscripcionOptions: PropTypes.array.isRequired,
  administrativoOptions: PropTypes.array.isRequired,
  saving: PropTypes.bool.isRequired,
  formError: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}
