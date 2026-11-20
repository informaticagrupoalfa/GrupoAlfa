export const WEEKDAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
]

const aliases = {
  l: "lunes", lun: "lunes", lunes: "lunes",
  m: "martes", mar: "martes", martes: "martes",
  x: "miercoles", mie: "miercoles", miercoles: "miercoles",
  j: "jueves", jue: "jueves", jueves: "jueves",
  v: "viernes", vie: "viernes", viernes: "viernes",
  s: "sabado", sab: "sabado", sabado: "sabado",
  d: "domingo", dom: "domingo", domingo: "domingo",
}

const plain = value => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

export const normalizeWeekday = value => aliases[plain(value).trim()] ?? null

export function parseWeekdays(value) {
  const text = plain(value)
  const found = (text.match(/[a-z]+/g) ?? []).map(token => aliases[token]).filter(Boolean)
  if (found.length === 2 && /\b(?:a|hasta)\b/.test(text)) {
    const first = WEEKDAYS.findIndex(item => item.key === found[0])
    const last = WEEKDAYS.findIndex(item => item.key === found[1])
    if (first <= last) return WEEKDAYS.slice(first, last + 1).map(item => item.key)
  }
  return WEEKDAYS.filter(item => found.includes(item.key)).map(item => item.key)
}

export const weekdayLabel = value => WEEKDAYS.find(item => item.key === normalizeWeekday(value))?.label ?? String(value ?? "")
