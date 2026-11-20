import PropTypes from "prop-types"
import { parseWeekdays, WEEKDAYS } from "../../../utils/weekdays"

export default function ParallelSetupFields({ capacitacionId, links, materias, selectedMaterias, dias, onSubjectsChange, onDaysChange }) {
  const available = links
    .filter(link => String(link.id_capacitacion) === String(capacitacionId))
    .map(link => materias.find(materia => Number(materia.id_materia) === Number(link.id_materia)))
    .filter(Boolean)
  const selectedDays = parseWeekdays(dias)

  return <>
    <fieldset className="parallel-days">
      <legend>Días de clase</legend>
      <p>El paralelo aparecerá una vez en cada día seleccionado.</p>
      <div className="parallel-day-options">
        {WEEKDAYS.map(day => (
          <label className={`parallel-day${selectedDays.includes(day.key) ? " selected" : ""}`} key={day.key}>
            <input type="checkbox" checked={selectedDays.includes(day.key)} onChange={event => {
              const next = event.target.checked
                ? [...selectedDays, day.key]
                : selectedDays.filter(item => item !== day.key)
              onDaysChange(WEEKDAYS.filter(item => next.includes(item.key)).map(item => item.key).join(", "))
            }} />
            {day.label}
          </label>
        ))}
      </div>
    </fieldset>

    <fieldset className="parallel-subjects">
      <legend>Materias del paralelo</legend>
      <p>Selecciona las materias de esta capacitación. Asignarás un asesor por día en el horario.</p>
      {available.length ? <div className="parallel-subject-options">
        {available.map(materia => {
          const id = Number(materia.id_materia)
          const selected = selectedMaterias.includes(id)
          return <label className={`parallel-subject${selected ? " selected" : ""}`} key={id}>
            <input type="checkbox" checked={selected} onChange={event => onSubjectsChange(event.target.checked
              ? [...selectedMaterias, id]
              : selectedMaterias.filter(item => item !== id))} />
            <span>{materia.nombre_materia}</span>
            <small>{selected ? "Incluida" : "Disponible"}</small>
          </label>
        })}
      </div> : <p className="parallel-subject-empty">{capacitacionId
        ? "Esta capacitación todavía no tiene materias vinculadas."
        : "Selecciona primero una capacitación para ver sus materias."}</p>}
    </fieldset>
  </>
}

ParallelSetupFields.propTypes = {
  capacitacionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  links: PropTypes.array.isRequired,
  materias: PropTypes.array.isRequired,
  selectedMaterias: PropTypes.array.isRequired,
  dias: PropTypes.string,
  onSubjectsChange: PropTypes.func.isRequired,
  onDaysChange: PropTypes.func.isRequired,
}
