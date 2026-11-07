import { z } from "zod";

const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const paraleloSchema = z.object({
  id_capacitacion: fk("id_capacitacion"),
  id_aula: fk("id_aula"),
  nivel: z.string().trim().max(100, "El nivel debe tener máximo 100 caracteres").optional(),
  nombre_paralelo: z
    .string({ required_error: "El nombre del paralelo es obligatorio" })
    .trim()
    .min(1, "El nombre del paralelo es obligatorio")
    .max(150, "El nombre del paralelo debe tener máximo 150 caracteres"),
  modalidad: z.string().trim().max(50, "La modalidad debe tener máximo 50 caracteres").optional(),
  hora_inicio: z.string().trim().regex(horaRegex, "La hora de inicio debe tener formato HH:MM").optional(),
  hora_fin: z.string().trim().regex(horaRegex, "La hora de fin debe tener formato HH:MM").optional(),
  dias: z.string().trim().max(100, "Los días deben tener máximo 100 caracteres").optional(),
  activo: z.boolean().optional(),
});

const validarHoras = (data) =>
  !data.hora_inicio || !data.hora_fin || data.hora_fin > data.hora_inicio;

const createParaleloSchema = paraleloSchema.refine(validarHoras, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["hora_fin"],
});

const updateParaleloSchema = paraleloSchema.partial().refine(validarHoras, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["hora_fin"],
});

export { createParaleloSchema, updateParaleloSchema };
