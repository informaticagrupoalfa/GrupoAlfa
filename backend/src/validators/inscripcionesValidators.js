import { z } from "zod";

const fkOpcional = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`)
    .optional();

const enteroOpcional = (label, { min = 0 } = {}) =>
  z.coerce
    .number({ invalid_type_error: `${label} debe ser numérico` })
    .int(`${label} debe ser un entero`)
    .min(min, `${label} no puede ser menor a ${min}`)
    .optional();

const textoOpcional = (label, max) =>
  z
    .string({ invalid_type_error: `${label} debe ser texto` })
    .trim()
    .max(max, `${label} debe tener máximo ${max} caracteres`)
    .optional();

const fechaOpcional = (label) =>
  z
    .string({ invalid_type_error: `${label} debe ser una fecha` })
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: `${label} debe ser una fecha válida`,
    })
    .optional();

const inscripcionSchema = z.object({
  id_administrativo: fkOpcional("id_administrativo"),
  id_estudiante: fkOpcional("id_estudiante"),
  id_paralelo: fkOpcional("id_paralelo"),

  como_se_entero_de_nosotros: textoOpcional("El medio por el que se enteró", 255),
  recalculo: z.boolean().optional(),
  preparacion_previa: z.boolean().optional(),
  tiempo_de_preparacion_meses: enteroOpcional("El tiempo de preparación", { min: 0 }),
  lugar_de_preparacion: textoOpcional("El lugar de preparación", 255),
  num_credencial: enteroOpcional("El número de credencial"),
  fecha_insc: fechaOpcional("La fecha de inscripción"),
});

export const createInscripcionSchema = inscripcionSchema;
export const updateInscripcionSchema = inscripcionSchema.partial();
