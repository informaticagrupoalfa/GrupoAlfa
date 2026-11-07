import { z } from "zod";

const fechaRegex = /^\d{4}-\d{2}-\d{2}/;

const fecha = (label) =>
  z
    .string({ required_error: `La ${label} es obligatoria` })
    .trim()
    .regex(fechaRegex, `La ${label} debe tener formato AAAA-MM-DD`)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: `La ${label} debe ser una fecha válida`,
    });

const capacitacionSchema = z.object({
  id_convocatoria: z.coerce
    .number({ invalid_type_error: "El id_convocatoria debe ser numérico" })
    .int("El id_convocatoria debe ser un entero")
    .positive("El id_convocatoria debe ser mayor a 0"),
  fecha_inicio: fecha("fecha de inicio"),
  fecha_fin: fecha("fecha de fin").nullable().optional(),
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
