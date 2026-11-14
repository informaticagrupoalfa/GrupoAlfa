import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const fecha = (label) =>
  z
    .string({ required_error: `${label} es obligatoria` })
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: `${label} debe ser una fecha válida`,
    });

const mensualidadSchema = z.object({
  id_inscripcion: fk("id_inscripcion"),
  id_administrativo: fk("id_administrativo"),
  fecha_inicio_mensualidad: fecha("La fecha de inicio"),
  fecha_fin_mensualidad: fecha("La fecha de fin"),
  pago: z.coerce
    .number({ invalid_type_error: "El pago debe ser numérico" })
    .min(0, "El pago no puede ser negativo"),
  codigo_comprobante: z.coerce
    .number({ invalid_type_error: "El código de comprobante debe ser numérico" })
    .int("El código de comprobante debe ser un entero")
    .optional(),
});

export const createMensualidadSchema = mensualidadSchema;
export const updateMensualidadSchema = mensualidadSchema.partial();
