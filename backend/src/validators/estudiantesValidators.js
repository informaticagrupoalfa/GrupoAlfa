import { z } from "zod";
import { createUsuarioSchema, updateUsuarioSchema } from "./usuariosValidators.js";

const nullableText = (max, message) =>
  z.string().trim().max(max, message).nullable().optional();

const fotoSchema = z
  .string()
  .trim()
  .max(8_000_000, "La foto es demasiado grande")
  .nullable()
  .optional();

const apoderadoSchema = z
  .union([
    z.coerce
      .number({ invalid_type_error: "El id_apoderado debe ser numérico" })
      .int("El id_apoderado debe ser un entero")
      .positive("El id_apoderado debe ser mayor a 0"),
    z.null(),
  ])
  .optional();

const usuarioCreateSchema = createUsuarioSchema.extend({
  nro_telefono: z.string().trim().max(20, "El teléfono debe tener máximo 20 caracteres").nullable().optional(),
});

const estudianteFields = {
  id_apoderado: apoderadoSchema,
  colegio_de_procedencia: nullableText(150, "El colegio debe tener máximo 150 caracteres"),
  direccion_de_domicilio: nullableText(255, "La dirección debe tener máximo 255 caracteres"),
  foto_base64: fotoSchema,
};

// Se mantiene el formato anterior (id_usuario plano) para no romper otros
// formularios que ya consumen este endpoint. Además se permite crear el
// usuario y su ficha de estudiante en una sola operación.
export const createEstudianteSchema = z
  .object({
    id_usuario: z.coerce
      .number({ invalid_type_error: "El id_usuario debe ser numérico" })
      .int("El id_usuario debe ser un entero")
      .positive("El id_usuario debe ser mayor a 0")
      .optional(),
    usuario: usuarioCreateSchema.optional(),
    ...estudianteFields,
  })
  .refine((data) => data.id_usuario != null || data.usuario != null, {
    message: "Indica un usuario existente o los datos para crear uno nuevo",
    path: ["id_usuario"],
  });

export const updateEstudianteSchema = z
  .object({
    id_usuario: z.coerce
      .number({ invalid_type_error: "El id_usuario debe ser numérico" })
      .int("El id_usuario debe ser un entero")
      .positive("El id_usuario debe ser mayor a 0")
      .optional(),
    usuario: updateUsuarioSchema.optional(),
    ...estudianteFields,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });
