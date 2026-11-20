import { parseWeekdays, WEEKDAYS } from "./weekdays.js"

export const WEEKDAY_LABELS = WEEKDAYS.map((day) => day.label)

function timeOf(value) {
  const match = String(value ?? "").match(/^(\d{2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour < 24 && minute < 60 ? `${match[1]}:${match[2]}` : null
}

export function buildSchedule(paralelos = [], aulas = []) {
  const rooms = aulas.map((aula) => ({
    id: String(aula.id_aula),
    codigo: aula.codigo || `Aula ${aula.id_aula}`,
    capacidad: Math.max(0, Number(aula.capacidad) || 0),
  }))
  const roomIds = new Set(rooms.map((room) => room.id))
  const validParallels = paralelos.map((paralelo) => ({
    ...paralelo,
    roomId: String(paralelo.id_aula),
    start: timeOf(paralelo.hora_inicio),
    end: timeOf(paralelo.hora_fin),
    weekdays: parseWeekdays(paralelo.dias),
    ocupados: Math.max(0, Number(paralelo.ocupados) || 0),
  })).filter((paralelo) => roomIds.has(paralelo.roomId) && paralelo.start && paralelo.end
    && paralelo.start < paralelo.end && paralelo.weekdays.length)

  const boundaries = [...new Set(validParallels.flatMap((paralelo) => [paralelo.start, paralelo.end]))].sort()
  const slots = boundaries.slice(0, -1).map((start, index) => ({ start, end: boundaries[index + 1] }))
    .filter(({ start, end }) => validParallels.some((paralelo) => paralelo.start < end && paralelo.end > start))
    .map(({ start, end }) => ({
      label: `${start}–${end}`,
      days: WEEKDAYS.map(({ key: day }) => {
        const roomSlots = rooms.map((room) => {
          const matches = validParallels.filter((paralelo) =>
            paralelo.roomId === room.id && paralelo.weekdays.includes(day)
            && paralelo.start < end && paralelo.end > start)
          return {
            ...room,
            ocupados: matches.reduce((total, paralelo) => total + paralelo.ocupados, 0),
            paralelos: matches.map((paralelo) => paralelo.nombre_paralelo || `Paralelo ${paralelo.id_paralelo}`),
          }
        })
        return {
          day,
          rooms: roomSlots,
          capacidad: roomSlots.reduce((total, room) => total + room.capacidad, 0),
          disponibles: roomSlots.reduce((total, room) => total + Math.max(room.capacidad - room.ocupados, 0), 0),
          conflictos: roomSlots.filter((room) => room.paralelos.length > 1).length,
        }
      }),
    }))

  return { slots, rooms, sinHorario: paralelos.length - validParallels.length }
}
