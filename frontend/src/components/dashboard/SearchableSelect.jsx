import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"

function defaultOptionLabel(opt) {
  if (!opt) return ""
  if (opt.nombre_facultad && opt.fecha_inicio) {
    const fecha = new Date(opt.fecha_inicio)
    if (!isNaN(fecha.getTime())) {
      const dia = String(fecha.getDate()).padStart(2, "0")
      const mes = String(fecha.getMonth() + 1).padStart(2, "0")
      const anio = fecha.getFullYear()
      return `${opt.nombre_facultad} - ${dia}/${mes}/${anio}`
    }
  }
  return opt.codigo ?? opt.nombre ?? opt.nombre_completo ?? opt.id ?? ""
}

export default function SearchableSelect({
  label,
  name,
  value,
  onChange,
  options,
  optionsValue,
  required,
  optionLabel = defaultOptionLabel,
}) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState("")
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  // Sincronizar label mostrado cuando cambia el valor externo (edición)
  useEffect(() => {
    if (options && value != null && value !== "") {
      const found = options.find((opt) => String(opt[optionsValue]) === String(value))
      if (found) {
        setSelectedLabel(optionLabel(found))
      } else {
        setSelectedLabel("")
      }
    } else {
      setSelectedLabel("")
    }
  }, [value, options, optionsValue, optionLabel])

  const filtered = options.filter((opt) => {
    const lbl = optionLabel(opt).toLowerCase()
    const val = String(opt[optionsValue] ?? "")
    return lbl.includes(search.toLowerCase()) || val.includes(search)
  })

  const handleSelect = (opt) => {
    const id = opt[optionsValue]
    onChange(id)
    setSelectedLabel(optionLabel(opt))
    setSearch(String(id))
    setIsOpen(false)
  }

  const handleInputChange = (event) => {
    const val = event.target.value
    setSearch(val)
    // Si el usuario borra todo, limpiar selección
    if (val === "") {
      onChange("")
      setSelectedLabel("")
    }
    setIsOpen(true)
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (filtered.length > 0) {
        handleSelect(filtered[0])
      } else {
        // Permitir ID manual si es numérico
        const manual = parseInt(search, 10)
        if (!isNaN(manual)) {
          onChange(manual)
          setSelectedLabel("")
          setIsOpen(false)
        }
      }
    }
    if (event.key === "Escape") {
      setIsOpen(false)
    }
  }

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150)
  }

  return (
    <div className="form-row searchable-select">
      <label htmlFor={`f-${name}`}>{label}</label>
      {selectedLabel && (
        <div className="searchable-hint">{selectedLabel}</div>
      )}
      <div className="searchable-wrapper" ref={wrapperRef} onClick={() => setIsOpen(!isOpen)}>
        <input
          ref={inputRef}
          id={`f-${name}`}
          type="text"
          value={search}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          required={required}
          autoComplete="off"
          placeholder="Escriba el ID o busque..."
        />
        {isOpen && (
          <ul className="searchable-list">
            {filtered.map((opt) => {
              const id = opt[optionsValue]
              const lbl = optionLabel(opt)
              return (
                <li
                  key={id}
                  role="option"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSelect(opt)
                  }}
                >
                  {lbl}
                  <span className="searchable-id">({id})</span>
                </li>
              )
            })}
            {filtered.length === 0 && search && (
              <li className="searchable-empty">No se encontraron coincidencias</li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

SearchableSelect.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  optionsValue: PropTypes.string.isRequired,
  required: PropTypes.bool,
  optionLabel: PropTypes.func,
}

SearchableSelect.defaultProps = {
  options: [],
  required: false,
}
