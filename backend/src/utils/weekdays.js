export const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const aliases = {
  l: "lunes", lun: "lunes", lunes: "lunes",
  m: "martes", mar: "martes", martes: "martes",
  x: "miercoles", mie: "miercoles", miercoles: "miercoles",
  j: "jueves", jue: "jueves", jueves: "jueves",
  v: "viernes", vie: "viernes", viernes: "viernes",
  s: "sabado", sab: "sabado", sabado: "sabado",
  d: "domingo", dom: "domingo", domingo: "domingo",
};

const plain = (value) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function normalizeWeekday(value) {
  return aliases[plain(value).trim()] ?? null;
}

export function parseWeekdays(value) {
  const text = plain(value);
  const tokens = text.match(/[a-z]+/g) ?? [];
  const found = tokens.map((token) => aliases[token]).filter(Boolean);
  if (found.length === 2 && /\b(?:a|hasta)\b/.test(text)) {
    const first = WEEKDAYS.indexOf(found[0]);
    const last = WEEKDAYS.indexOf(found[1]);
    if (first <= last) return WEEKDAYS.slice(first, last + 1);
  }
  return WEEKDAYS.filter((day) => found.includes(day));
}
