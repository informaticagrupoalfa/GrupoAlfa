import { z } from "zod";

const idFacultad = z.coerce
  .number({ invalid_type_error: "El id_facultad debe ser numérico" })
  .int("El id_facultad debe ser un entero")
  .positive("El id_facultad debe ser mayor a 0");

const carreraSchema = z.object({
  id_facultad: idFacultad,
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(150, "El nombre debe tener máximo 150 caracteres"),
});

export const createCarreraSchema = carreraSchema;
export const updateCarreraSchema = carreraSchema.extend({ id_facultad: idFacultad.nullable() }).partial();
