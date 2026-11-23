import { normalizeWeekday, parseWeekdays } from "./weekdays.js";

export const ACADEMIC_TIME_ZONE = "America/La_Paz";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ACADEMIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "long",
  hourCycle: "h23",
});

const weekdayNames = {
  Monday: "lunes",
  Tuesday: "martes",
  Wednesday: "miercoles",
  Thursday: "jueves",
  Friday: "viernes",
  Saturday: "sabado",
  Sunday: "domingo",
};

export function academicClock(now = new Date()) {
  const parts = Object.fromEntries(
    formatter.formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    weekday: weekdayNames[parts.weekday],
  };
}

export function dateKey(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

const timeKey = (value) => {
  const raw = String(value ?? "");
  return raw.length >= 8 ? raw.slice(0, 8) : `${raw.slice(0, 5)}:00`;
};

export function scheduleProblem(context, clock) {
  const assignmentDay = normalizeWeekday(context?.dia_asignacion);
  const parallelDays = parseWeekdays(context?.dias_paralelo);
  if (!parallelDays.length) return "El paralelo no tiene días de clase configurados.";
  if (!parallelDays.includes(clock.weekday)) {
    return `Hoy no corresponde al horario del paralelo. Días permitidos: ${parallelDays.join(", ")}.`;
  }
  if (assignmentDay && assignmentDay !== clock.weekday) {
    return `La materia está asignada al día ${assignmentDay}.`;
  }

  if (!context?.hora_inicio || !context?.hora_fin) return "El paralelo no tiene un horario completo configurado.";
  const startsAt = timeKey(context.hora_inicio);
  const endsAt = timeKey(context.hora_fin);
  if (clock.time < startsAt || clock.time > endsAt) {
    return `La clase y sus asistencias solo pueden registrarse entre ${startsAt.slice(0, 5)} y ${endsAt.slice(0, 5)}.`;
  }
  return null;
}
