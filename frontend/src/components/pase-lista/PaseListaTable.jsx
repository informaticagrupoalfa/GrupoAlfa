import PropTypes from "prop-types"
import Button from "../ui/Button"

function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "—"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function PaseListaTable({ alumnos, nombreDe, asistencia, onToggle, onMarcarTodos, resumen, nota }) {
  return (
    <div className="tc-roster">
      {nota && <p className="warning-message">{nota}</p>}
      <div className="tc-roster-bar">
        <span className="muted">
          {alumnos.length} estudiante(s) · {resumen.presentes} presente(s) · {resumen.ausentes} ausente(s) · {resumen.sinMarcar} sin marcar
        </span>
        <div className="tc-actions">
          <Button size="sm" variant="secondary" onClick={() => onMarcarTodos(true)}>Todos presentes</Button>
          <Button size="sm" variant="secondary" onClick={() => onMarcarTodos(false)}>Todos ausentes</Button>
        </div>
      </div>
      <ul className="tc-list">
        {alumnos.map((a, i) => {
          const id = a.id_estudiante ?? a.id ?? i
          const estado = asistencia[id]
          const name = nombreDe(a)
          const stateClass = estado === true ? "is-p" : estado === false ? "is-a" : "is-u"
          return (
            <li key={id} className={`tc-row ${stateClass}`}>
              <span className="tc-avatar" aria-hidden="true">{initials(name)}</span>
              <div className="tc-who">
                <div className="tc-name">{i + 1}. {name}</div>
                <div className="tc-meta">{a.colegio_de_procedencia ?? "Sin colegio registrado"}</div>
              </div>
              <div className="tc-switch" role="group" aria-label={`Asistencia de ${name}`}>
                <button
                  type="button"
                  className={estado === true ? "on-p" : ""}
                  aria-pressed={estado === true}
                  onClick={() => onToggle(id, true)}
                >
                  Presente
                </button>
                <button
                  type="button"
                  className={estado === false ? "on-a" : ""}
                  aria-pressed={estado === false}
                  onClick={() => onToggle(id, false)}
                >
                  Ausente
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

PaseListaTable.propTypes = {
  alumnos: PropTypes.array.isRequired,
  nombreDe: PropTypes.func.isRequired,
  asistencia: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onMarcarTodos: PropTypes.func.isRequired,
  resumen: PropTypes.object.isRequired,
  nota: PropTypes.string,
}
