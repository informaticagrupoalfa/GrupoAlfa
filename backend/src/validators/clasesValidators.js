import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const claseSchema = z.object({
  id_paralelo: fk("id_paralelo"),
  id_asesor: fk("id_asesor"),
  id_tema: fk("id_tema").optional(),
  inicioClase: z
    .string({ required_error: "La fecha de inicio de clase es obligatoria" })
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "El inicio de clase debe ser una fecha válida",
    }),
});

export const createClaseSchema = claseSchema;
export const updateClaseSchema = claseSchema.partial();
