import { useMemo } from "react"
import PropTypes from "prop-types"
import { buildSchedule, WEEKDAY_LABELS } from "../../utils/dashboardSchedule"
import "./ScheduleMatrix.css"

export default function ScheduleMatrix({ aulas, paralelos }) {
  const schedule = useMemo(() => buildSchedule(paralelos, aulas), [paralelos, aulas])

  return (
    <section className="chart-panel schedule-panel" aria-labelledby="schedule-title">
      <div className="schedule-heading">
        <div>
          <h3 id="schedule-title">Capacidad de aulas por día y horario</h3>
          <p className="muted">Cada casilla contiene todas las aulas. Los números indican estudiantes inscritos / capacidad.</p>
        </div>
        <div className="schedule-legend" aria-label="Leyenda de ocupación">
          <span><i className="legend-dot legend-free" /> Libre</span>
          <span><i className="legend-dot legend-used" /> Con cupos</span>
          <span><i className="legend-dot legend-full" /> Llena</span>
          <span><i className="legend-dot legend-over" /> Exceso</span>
        </div>
      </div>
      {schedule.sinHorario > 0 && (
        <p className="schedule-note">{schedule.sinHorario} paralelo(s) sin aula, día u horario completo no aparecen en la matriz.</p>
      )}
      {!schedule.rooms.length ? (
        <p className="muted">Registra aulas para ver su capacidad semanal.</p>
      ) : !schedule.slots.length ? (
        <p className="muted">Registra los días y horarios de los paralelos para construir la matriz.</p>
      ) : (
        <div className="schedule-scroll" role="region" aria-label="Matriz semanal de aulas" tabIndex={0}>
          <table className="schedule-table">
            <thead>
              <tr>
                <th scope="col">Horario</th>
                {WEEKDAY_LABELS.map((day) => <th scope="col" key={day}>{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {schedule.slots.map((slot) => (
                <tr key={slot.label}>
                  <th scope="row">{slot.label}</th>
                  {slot.days.map((cell) => (
                    <td key={cell.day}>
                      <div className="schedule-cell-total">
                        <strong>{cell.disponibles}</strong> libres <span>de {cell.capacidad}</span>
                      </div>
                      <div className="schedule-rooms">
                        {cell.rooms.map((room) => {
                          const state = room.paralelos.length === 0 ? "free"
                            : room.ocupados > room.capacidad ? "over"
                              : room.ocupados >= room.capacidad ? "full" : "used"
                          return (
                            <div
                              className={`schedule-room schedule-room-${state}`}
                              key={room.id}
                              title={`${room.codigo}: ${room.ocupados} de ${room.capacidad} plazas ocupadas. ${room.paralelos.join(", ") || "Sin paralelo"}`}
                            >
                              <span>{room.codigo}</span><strong>{room.ocupados}/{room.capacidad}</strong>
                            </div>
                          )
                        })}
                      </div>
                      {cell.conflictos > 0 && <small className="schedule-conflict">{cell.conflictos} aula(s) con horarios cruzados</small>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

ScheduleMatrix.propTypes = { aulas: PropTypes.array.isRequired, paralelos: PropTypes.array.isRequired }
