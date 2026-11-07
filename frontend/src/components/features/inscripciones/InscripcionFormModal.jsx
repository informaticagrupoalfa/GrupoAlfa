import { Suspense, lazy, useEffect, useState } from "react"
import PropTypes from "prop-types"
import Modal from "../../ui/Modal"
import TextField from "../../ui/TextField"
import Button from "../../ui/Button"
import Skeleton from "../../ui/Skeleton"

const PersonCombobox = lazy(() => import("../matriculaciones/PersonCombobox"))

const toNumberOrUndefined = (value) => {
  if (value === "" || value == null) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

export default function InscripcionFormModal({
  initial,
  estudianteOptions,
  administrativoOptions,
  saving,
  formError,
  onClose,
  onSubmit,
}) {
  const [idEstudiante, setIdEstudiante] = useState(initial?.id_estudiante ?? null)
  const [idAdministrativo, setIdAdministrativo] = useState(initial?.id_administrativo ?? null)
  const [comoSeEntero, setComoSeEntero] = useState(initial?.como_se_entero_de_nosotros ?? "")
  const [recalculo, setRecalculo] = useState(initial?.recalculo ?? false)
  const [preparacionPrevia, setPreparacionPrevia] = useState(initial?.preparacion_previa ?? false)
  const [tiempoPreparacion, setTiempoPreparacion] = useState(initial?.tiempo_de_preparacion_meses ?? "")
  const [lugarPreparacion, setLugarPreparacion] = useState(initial?.lugar_de_preparacion ?? "")
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
    if (comoSeEntero.length > 255) {
      setLocalError("El campo \"Cómo se enteró de nosotros\" supera 255 caracteres.")
      return
    }
    if (lugarPreparacion.length > 255) {
      setLocalError("El campo \"Lugar de preparación\" supera 255 caracteres.")
      return
    }
    if (tiempoPreparacion !== "" && (Number.isNaN(Number(tiempoPreparacion)) || Number(tiempoPreparacion) < 0)) {
      setLocalError("El tiempo de preparación debe ser un número mayor o igual a 0.")
      return
    }
    onSubmit({
      id_estudiante: toNumberOrUndefined(idEstudiante),
      id_administrativo: toNumberOrUndefined(idAdministrativo),
      como_se_entero_de_nosotros: comoSeEntero.trim() || undefined,
      recalculo: Boolean(recalculo),
      preparacion_previa: Boolean(preparacionPrevia),
      tiempo_de_preparacion_meses: toNumberOrUndefined(tiempoPreparacion),
      lugar_de_preparacion: lugarPreparacion.trim() || undefined,
    })
  }

  return (
    <Modal
      title={initial?.id_inscripcion != null ? "Editar inscripción" : "Nueva inscripción"}
      hint="Registra el origen y la preparación previa de un estudiante."
      onClose={onClose}
    >
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <Suspense fallback={<Skeleton lines={2} />}>
            <PersonCombobox
              id="i-estudiante"
              label="Estudiante (opcional)"
              options={estudianteOptions}
              value={idEstudiante}
              onSelect={setIdEstudiante}
              placeholder="Escribe el nombre del estudiante..."
              hint="Escribe y elige una sugerencia de la lista."
            />
          </Suspense>
          <Suspense fallback={<Skeleton lines={2} />}>
            <PersonCombobox
              id="i-administrativo"
              label="Administrativo (opcional)"
              options={administrativoOptions}
              value={idAdministrativo}
              onSelect={setIdAdministrativo}
              placeholder="Escribe el nombre del administrativo..."
              hint="Escribe y elige una sugerencia de la lista."
            />
          </Suspense>
          <TextField
            id="i-como-se-entero"
            label="Cómo se enteró de nosotros"
            type="text"
            value={comoSeEntero}
            onChange={(e) => setComoSeEntero(e.target.value)}
            maxLength={255}
          />
          <div className="form-row-inline" style={{ marginTop: 12 }}>
            <input
              id="i-recalculo"
              type="checkbox"
              checked={recalculo}
              onChange={(e) => setRecalculo(e.target.checked)}
            />
            <label htmlFor="i-recalculo">Recalculó</label>
          </div>
          <div className="form-row-inline" style={{ marginTop: 12 }}>
            <input
              id="i-preparacion"
              type="checkbox"
              checked={preparacionPrevia}
              onChange={(e) => setPreparacionPrevia(e.target.checked)}
            />
            <label htmlFor="i-preparacion">Preparación previa</label>
          </div>
          <TextField
            id="i-tiempo"
            label="Tiempo de preparación (meses)"
            type="number"
            value={tiempoPreparacion}
            onChange={(e) => setTiempoPreparacion(e.target.value)}
          />
          <TextField
            id="i-lugar"
            label="Lugar de preparación"
            type="text"
            value={lugarPreparacion}
            onChange={(e) => setLugarPreparacion(e.target.value)}
            maxLength={255}
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

InscripcionFormModal.propTypes = {
  initial: PropTypes.object,
  estudianteOptions: PropTypes.array.isRequired,
  administrativoOptions: PropTypes.array.isRequired,
  saving: PropTypes.bool.isRequired,
  formError: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}
