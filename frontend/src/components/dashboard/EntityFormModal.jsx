import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import Modal from "../ui/Modal"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import SearchableSelect from "./SearchableSelect"
import { apiClient } from "../../services/apiClient"

function normalizeInitialValues(entity, initial) {
  const values = { ...(initial ?? {}) }
  for (const field of entity.fields) {
    const value = values[field.name]
    if (value == null) continue
    if (field.type === "date") values[field.name] = String(value).slice(0, 10)
    if (field.type === "time") values[field.name] = String(value).slice(0, 5)
  }
  return values
}

export default function EntityFormModal({ entity, initial, saving, formError, onClose, onSubmit, extra }) {
  const [values, setValues] = useState(() => normalizeInitialValues(entity, initial))
  const [localError, setLocalError] = useState("")
  const [selectOptions, setSelectOptions] = useState({})

  const inlineFields = useMemo(() => entity.fields.filter((f) => f.inline), [entity.fields])
  const normalFields = useMemo(() => entity.fields.filter((f) => !f.inline), [entity.fields])

  useEffect(() => {
    setValues(normalizeInitialValues(entity, initial))
  }, [entity, initial])

  useEffect(() => {
    const fetchSelectOptions = async () => {
      const opts = {}
      for (const field of normalFields) {
        if (field.type === "select" && field.optionsEndpoint) {
          try {
            const { data } = await apiClient.get(`/${field.optionsEndpoint}`)
            const rows = Array.isArray(data) ? data : data.datos ?? data.rows ?? []
            opts[field.name] = rows
          } catch {
            opts[field.name] = []
          }
        }
      }
      setSelectOptions(opts)
    }
    fetchSelectOptions()
  }, [entity, normalFields])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError("")
    for (const field of normalFields) {
      const value = values[field.name]
      if (field.required && (value === "" || value == null)) {
        setLocalError(`El campo "${field.label}" es obligatorio.`)
        return
      }
      if (field.maxLength && String(value ?? "").length > field.maxLength) {
        setLocalError(`"${field.label}" supera ${field.maxLength} caracteres.`)
        return
      }
    }
    for (const field of inlineFields) {
      const value = values[field.name]
      if (field.required && (value === "" || value == null)) {
        setLocalError(`El campo "${field.label}" es obligatorio.`)
        return
      }
    }
    if (entity.key === "capacitaciones" && values.hora_inicio && values.hora_fin) {
      if (values.hora_fin <= values.hora_inicio) {
        setLocalError("La hora de fin debe ser mayor que la de inicio.")
        return
      }
    }
    if (entity.key === "capacitaciones" && values.fecha_inicio && values.fecha_fin) {
      if (values.fecha_fin < values.fecha_inicio) {
        setLocalError("La fecha de fin no puede ser anterior a la fecha de inicio.")
        return
      }
    }
    onSubmit(values)
  }

  return (
    <Modal
      title={initial?.[entity.pk] != null ? `Editar ${entity.label}` : `Nuevo ${entity.label}`}
      hint={entity.hint}
      onClose={onClose}
    >
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          {inlineFields.length > 0 && (
            <div className="inline-row">
              {inlineFields.map((field) => {
                if (field.type === "checkbox") {
                  return (
                    <div key={field.name} className="inline-field checkbox-field">
                      <input
                        id={`f-${field.name}`}
                        type="checkbox"
                        checked={values[field.name] === true || values[field.name] === "true"}
                        onChange={(event) => set(field.name, event.target.checked)}
                      />
                      <label htmlFor={`f-${field.name}`}>{field.label}</label>
                    </div>
                  )
                }
                return (
                  <TextField
                    key={field.name}
                    id={`f-${field.name}`}
                    label={field.label}
                    type={field.type}
                    value={values[field.name] ?? ""}
                    onChange={(event) => set(field.name, event.target.value)}
                    maxLength={field.maxLength}
                    required={field.required}
                    inline
                  />
                )
              })}
            </div>
          )}
          {normalFields.map((field) => {
            if (field.type === "select") {
              const options = selectOptions[field.name] ?? []
              return (
                <SearchableSelect
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  value={values[field.name] ?? ""}
                  onChange={(val) => set(field.name, val)}
                  options={options}
                  optionsValue={field.optionsValue}
                  required={field.required}
                />
              )
            }
            return (
              <TextField
                key={field.name}
                id={`f-${field.name}`}
                label={field.label}
                type={field.type}
                value={values[field.name] ?? ""}
                onChange={(event) => set(field.name, event.target.value)}
                maxLength={field.maxLength}
                required={field.required}
              />
            )
          })}
          {extra}
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

EntityFormModal.propTypes = {
  entity: PropTypes.object.isRequired,
  initial: PropTypes.object,
  saving: PropTypes.bool.isRequired,
  formError: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  extra: PropTypes.element,
}
