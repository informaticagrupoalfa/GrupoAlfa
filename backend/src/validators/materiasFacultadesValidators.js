import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const materiaFacultadSchema = z.object({
  id_materia: fk("id_materia"),
  id_facultad: fk("id_facultad"),
});

export const createMateriaFacultadSchema = materiaFacultadSchema;
export const updateMateriaFacultadSchema = materiaFacultadSchema.partial();
