import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const claseSchema = z.object({
  id_asesor_paralelo_materia: fk("id_asesor_paralelo_materia").optional(),
  id_paralelo: fk("id_paralelo").optional(),
  id_asesor: fk("id_asesor").optional(),
  tema: z.string().trim().max(100).optional(),
  inicioclase: z
    .string({ required_error: "La fecha de inicio de clase es obligatoria" })
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "El inicio de clase debe ser una fecha válida",
    }),
});

export const createClaseSchema = claseSchema.refine(
  (value) => value.id_asesor_paralelo_materia || (value.id_paralelo && value.id_asesor),
  { message: "Indica una asignación o un paralelo y asesor." },
);
export const createClaseAdministracionSchema = claseSchema.refine(
  (value) => value.id_asesor_paralelo_materia || value.id_paralelo,
  { message: "Indica una asignación o un paralelo." },
);
export const updateClaseSchema = claseSchema.partial();
