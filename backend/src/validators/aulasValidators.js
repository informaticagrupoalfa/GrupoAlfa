import { z } from "zod";

const aulaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(20, "El código debe tener máximo 20 caracteres")
    .optional(),
  capacidad: z.coerce
    .number({ invalid_type_error: "La capacidad debe ser numérica" })
    .int("La capacidad debe ser un entero")
    .positive("La capacidad debe ser mayor a 0"),
});

export const createAulaSchema = aulaSchema;
export const updateAulaSchema = aulaSchema.partial();
