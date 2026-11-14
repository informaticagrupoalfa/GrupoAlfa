import { z } from "zod";

const apoderadoSchema = z.object({
  id_usuario: z.coerce
    .number({ invalid_type_error: "El id_usuario debe ser numérico" })
    .int("El id_usuario debe ser un entero")
    .positive("El id_usuario debe ser mayor a 0"),
  parentesco: z
    .string()
    .trim()
    .max(50, "El parentesco debe tener máximo 50 caracteres")
    .optional(),
});

export const createApoderadoSchema = apoderadoSchema;
export const updateApoderadoSchema = apoderadoSchema.partial();
