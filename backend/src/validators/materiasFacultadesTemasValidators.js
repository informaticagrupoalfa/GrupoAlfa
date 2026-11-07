import { z } from "zod";

const fk = (label) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} debe ser numérico` })
    .int(`El ${label} debe ser un entero`)
    .positive(`El ${label} debe ser mayor a 0`);

const materiaFacultadTemaSchema = z.object({
  id_materia_facultad: fk("id_materia_facultad"),
  id_tema: fk("id_tema"),
});

export const createMateriaFacultadTemaSchema = materiaFacultadTemaSchema;
export const updateMateriaFacultadTemaSchema = materiaFacultadTemaSchema.partial();
