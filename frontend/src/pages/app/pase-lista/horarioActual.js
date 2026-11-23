import { normalizeWeekday, parseWeekdays } from "../../../utils/weekdays"

const clockFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", weekday: "long", hourCycle: "h23",
})

const weekdays = {
  Monday: "lunes", Tuesday: "martes", Wednesday: "miercoles",
  Thursday: "jueves", Friday: "viernes", Saturday: "sabado", Sunday: "domingo",
}

export function horarioActual(now = new Date()) {
  const parts = Object.fromEntries(clockFormatter.formatToParts(now).filter(part => part.type !== "literal").map(part => [part.type, part.value]))
  return {
    fecha: `${parts.year}-${parts.month}-${parts.day}`,
    hora: `${parts.hour}:${parts.minute}`,
    dia: weekdays[parts.weekday],
  }
}

export function coincideHorario(paralelo, clock, diaAsignacion) {
  if (!paralelo?.hora_inicio || !paralelo?.hora_fin) return false
  if (!parseWeekdays(paralelo.dias_paralelo ?? paralelo.dias).includes(clock.dia)) return false
  if (diaAsignacion && normalizeWeekday(diaAsignacion) !== clock.dia) return false
  return clock.hora >= String(paralelo.hora_inicio).slice(0, 5)
    && clock.hora <= String(paralelo.hora_fin).slice(0, 5)
}
