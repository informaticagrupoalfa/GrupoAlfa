import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const fechaHora = (label, required = false) => {
  const schema = z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: `${label} debe ser una fecha/hora válida (ISO 8601)`,
    });
  return required
    ? z.string({ required_error: `${label} es obligatoria` }).trim().refine((v) => !Number.isNaN(new Date(v).getTime()), {
        message: `${label} debe ser una fecha/hora válida (ISO 8601)`,
      })
    : schema.optional();
};

const asistenciaSchema = z.object({
  id_clase: fk("id_clase"),
  id_estudiante: fk("id_estudiante"),
  hora_entrada: fechaHora("La hora de entrada"),
  salida_antes_de_tiempo: fechaHora("La salida antes de tiempo"),
  permiso: z.boolean().optional(),
  razon_permiso: z
    .string()
    .trim()
    .max(150, "La razón del permiso debe tener máximo 150 caracteres")
    .optional(),
});

export const createAsistenciaSchema = asistenciaSchema;
export const updateAsistenciaSchema = asistenciaSchema.partial().extend({
  permiso: z.boolean().nullable().optional(),
  razon_permiso: z.string().trim().max(150, "La razón del permiso debe tener máximo 150 caracteres").nullable().optional(),
});
