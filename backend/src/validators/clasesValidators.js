import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const claseSchema = z.object({
  id_asesor_paralelo_materia: fk("id_asesor_paralelo_materia").optional(),
  id_paralelo: fk("id_paralelo").optional(),
  id_materia: fk("id_materia").optional(),
  id_asesor: fk("id_asesor").optional(),
  asesor: z.string().trim().max(100).optional(),
  materia: z.string().trim().max(150).optional(),
  aula: z.string().trim().max(50).optional(),
  tema: z.string().trim().max(100).optional(),
  inicioclase: z
    .string({ required_error: "La fecha de inicio de clase es obligatoria" })
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "El inicio de clase debe ser una fecha válida",
    }),
});

const hasAssignment = (value) =>
  value.id_asesor_paralelo_materia || (value.id_paralelo && value.id_materia);

export const createClaseSchema = claseSchema.refine(
  (value) => hasAssignment(value) && (value.id_asesor_paralelo_materia || value.id_asesor),
  { message: "Indica una asignación o un paralelo, una materia y un asesor." },
);
export const createClaseAdministracionSchema = claseSchema.refine(
  (value) => hasAssignment(value),
  { message: "Indica una asignación o un paralelo y una materia." },
);
export const updateClaseSchema = claseSchema.partial();
