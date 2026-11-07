import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const asignacionAsesoresSchema = z.object({
  id_asesor: fk("id_asesor"),
  id_paralelo: fk("id_paralelo"),
});

export const createAsignacionAsesoresSchema = asignacionAsesoresSchema;
export const updateAsignacionAsesoresSchema = asignacionAsesoresSchema.partial();
