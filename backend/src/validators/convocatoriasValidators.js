import { z } from "zod";

const convocatoriaSchema = z.object({
  id_facultad: z.coerce
    .number({ invalid_type_error: "El id_facultad debe ser numérico" })
    .int("El id_facultad debe ser un entero")
    .positive("El id_facultad debe ser mayor a 0"),
  fecha_inicio: z
    .string({ required_error: "La fecha de inicio es obligatoria" })
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "La fecha de inicio debe ser una fecha válida",
    }),
  modalidad: z.string().trim().max(100, "La modalidad debe tener máximo 100 caracteres").optional(),
  vigencia: z.boolean({ invalid_type_error: "La vigencia debe ser un valor booleano" }).optional(),
});

export const createConvocatoriaSchema = convocatoriaSchema;
export const updateConvocatoriaSchema = convocatoriaSchema.partial();
