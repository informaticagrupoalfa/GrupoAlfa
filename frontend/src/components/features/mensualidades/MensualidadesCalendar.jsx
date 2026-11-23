import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import Pagination from "../../ui/Pagination"

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const MONTHLY_COLORS = ["#86efac", "#93c5fd", "#fca5a5", "#fcd34d", "#c4b5fd", "#f9a8d4", "#67e8f9", "#fdba74"]

function parseLocalDate(value) {
  const date = String(value ?? "").slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value) {
  const date = parseLocalDate(value)
  return date ? date.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
}

function generateCalendarMonths(year, mensualidades) {
  const periods = mensualidades
    .map((item, index) => ({
      start: parseLocalDate(item.fecha_inicio_mensualidad),
      end: parseLocalDate(item.fecha_fin_mensualidad),
      color: MONTHLY_COLORS[index % MONTHLY_COLORS.length],
    }))
    .filter((period) => period.start && period.end)

  return MONTHS_ES.map((monthName, monthIndex) => {
    const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const cells = Array(42).fill(null)

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day)
      const dateString = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const paymentPeriod = periods.find((period) => date >= period.start && date <= period.end)
      cells[firstWeekday + day - 1] = {
        date: dateString,
        day,
        isSelected: periods.some((period) => date.getTime() === period.start.getTime() || date.getTime() === period.end.getTime()),
        paymentColor: paymentPeriod?.color,
      }
    }

    return { key: `${year}-${monthIndex + 1}`, label: `${monthName} ${year}`, cells }
  })
}

export default function MensualidadesCalendar({ mensualidades, title, emptyMessage, renderActions }) {
  const [yearPage, setYearPage] = useState(1)
  const validMensualidades = useMemo(
    () => mensualidades.filter((item) => parseLocalDate(item.fecha_inicio_mensualidad) && parseLocalDate(item.fecha_fin_mensualidad)),
    [mensualidades],
  )
  const years = validMensualidades.flatMap((item) => [
    parseLocalDate(item.fecha_inicio_mensualidad).getFullYear(),
    parseLocalDate(item.fecha_fin_mensualidad).getFullYear(),
  ])
  const startYear = years.length ? Math.min(...years) : null
  const endYear = years.length ? Math.max(...years) : null
  const totalPages = startYear == null ? 1 : Math.max(1, endYear - startYear + 1)
  const year = startYear == null ? null : startYear + yearPage - 1

  useEffect(() => {
    setYearPage(1)
  }, [mensualidades])

  return (
    <div className="calendar-panel">
      {title && <h3>{title}</h3>}
      {validMensualidades.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        <>
          <div className="calendar">
            <div className="calendar-year-pagination">
              <h4>{year}</h4>
              <Pagination page={yearPage} totalPages={totalPages} onPageChange={setYearPage} />
            </div>
            <div className="calendar-heatmap">
              <div className="calendar-months">
                {generateCalendarMonths(year, validMensualidades).map((month) => (
                  <div className="calendar-month" key={month.key}>
                    <h4>{month.label}</h4>
                    <div className="calendar-month-layout">
                      <div className="calendar-weekdays" aria-hidden="true">
                        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
                      </div>
                      <div className="calendar-month-grid">
                        {month.cells.map((day, index) => (
                          <div
                            key={day?.date ?? `empty-${index}`}
                            className={`calendar-heat-day ${day?.paymentColor ? "calendar-payment-day" : ""} ${day?.isSelected ? "calendar-day-selected" : ""}`}
                            style={day?.paymentColor ? { "--payment-color": day.paymentColor } : undefined}
                            title={day ? `${day.date}${day.paymentColor || day.isSelected ? " · Dentro de la mensualidad" : ""}` : undefined}
                            aria-label={day ? `${day.day} de ${month.label}` : undefined}
                          >
                            {day?.day ?? ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="calendar-payment-list" aria-label="Mensualidades registradas">
            {validMensualidades.map((item, index) => (
              <div className="calendar-payment-item" key={item.id_mensualidad ?? `${item.fecha_inicio_mensualidad}-${item.fecha_fin_mensualidad}`}>
                <span className="calendar-payment-swatch" style={{ backgroundColor: MONTHLY_COLORS[index % MONTHLY_COLORS.length] }} aria-hidden="true" />
                <span><strong>{formatDate(item.fecha_inicio_mensualidad)} – {formatDate(item.fecha_fin_mensualidad)}</strong></span>
                {item.pago != null && <span>Bs. {item.pago}</span>}
                {item.codigo_comprobante != null && <span>Comprobante {item.codigo_comprobante}</span>}
                {renderActions && <div className="calendar-payment-actions">{renderActions(item)}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

MensualidadesCalendar.propTypes = {
  mensualidades: PropTypes.arrayOf(PropTypes.shape({
    id_mensualidad: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    fecha_inicio_mensualidad: PropTypes.string,
    fecha_fin_mensualidad: PropTypes.string,
    pago: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    codigo_comprobante: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  })).isRequired,
  title: PropTypes.string,
  emptyMessage: PropTypes.string,
  renderActions: PropTypes.func,
}

MensualidadesCalendar.defaultProps = {
  title: "Calendario de mensualidades",
  emptyMessage: "No hay mensualidades registradas.",
  renderActions: null,
}
