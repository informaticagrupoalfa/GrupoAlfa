import { z } from "zod";

const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

const capacitacionSchema = z.object({
  id_convocatoria: z.coerce
    .number({ invalid_type_error: "El id_convocatoria debe ser numérico" })
    .int("El id_convocatoria debe ser un entero")
    .positive("El id_convocatoria debe ser mayor a 0"),
  id_aula: z.coerce
    .number({ invalid_type_error: "El id_aula debe ser numérico" })
    .int("El id_aula debe ser un entero")
    .positive("El id_aula debe ser mayor a 0"),
  nivel: z.string().trim().max(100, "El nivel debe tener máximo 100 caracteres").optional(),
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(150, "El nombre debe tener máximo 150 caracteres"),
  modalidad: z.string().trim().max(50, "La modalidad debe tener máximo 50 caracteres").optional(),
  fecha_inicio: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "La fecha de inicio debe ser una fecha válida",
    })
    .optional(),
  fecha_fin: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "La fecha de fin debe ser una fecha válida",
    })
    .optional(),
  hora_inicio: z.string().trim().regex(horaRegex, "La hora de inicio debe tener formato HH:MM").optional(),
  hora_fin: z.string().trim().regex(horaRegex, "La hora de fin debe tener formato HH:MM").optional(),
  activo: z.boolean().optional(),
});

const validarFechas = (data) =>
  !data.fecha_inicio ||
  !data.fecha_fin ||
  new Date(data.fecha_fin).getTime() >= new Date(data.fecha_inicio).getTime();

const createCapacitacionSchema = capacitacionSchema.refine(validarFechas, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio",
  path: ["fecha_fin"],
});

const updateCapacitacionSchema = capacitacionSchema.partial().refine(validarFechas, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio",
  path: ["fecha_fin"],
});

export { createCapacitacionSchema, updateCapacitacionSchema };
