import { z } from "zod";

const temaSchema = z.object({
  nombre_tema: z
    .string({ required_error: "El nombre del tema es obligatorio" })
    .trim()
    .min(1, "El nombre del tema es obligatorio")
    .max(150, "El nombre del tema debe tener máximo 150 caracteres"),
});

export const createTemaSchema = temaSchema;
export const updateTemaSchema = temaSchema.partial();
