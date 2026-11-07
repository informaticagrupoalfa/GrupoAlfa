import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const matriculacionSchema = z.object({
  id_estudiante: fk("id_estudiante"),
  id_paralelo: fk("id_paralelo"),
  esta_vigente: z.boolean().optional(),
  nro_comprobante: z.coerce
    .number({ invalid_type_error: "El nro de comprobante debe ser numérico" })
    .int("El nro de comprobante debe ser un entero")
    .optional(),
  nro_credencial: z.coerce
    .number({ invalid_type_error: "El nro de credencial debe ser numérico" })
    .int("El nro de credencial debe ser un entero")
    .optional(),
});

export const createMatriculacionSchema = matriculacionSchema;
export const updateMatriculacionSchema = matriculacionSchema.partial();
