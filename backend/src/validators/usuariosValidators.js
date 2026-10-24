import { z } from "zod";

const usuarioSchema = z.object({
  nro_carnet: z.coerce
    .number({ invalid_type_error: "El número de carnet es obligatorio" })
    .int("El número de carnet debe ser un entero")
    .positive("El número de carnet debe ser mayor a 0"),
  apellido_paterno: z
    .string({ required_error: "El apellido paterno es obligatorio" })
    .trim()
    .min(1, "El apellido paterno es obligatorio"),
  apellido_materno: z
    .string({ required_error: "El apellido materno es obligatorio" })
    .trim()
    .min(1, "El apellido materno es obligatorio"),
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio"),
  fecha_nacimiento: z
    .string({ required_error: "La fecha de nacimiento es obligatoria" })
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "La fecha de nacimiento debe ser una fecha válida",
    }),
  correo_electronico: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .trim()
    .email("Debe ingresar un correo electrónico válido"),
  contraseña: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  usuario_vigente: z.coerce.boolean().optional().default(true),
});

const createUsuarioSchema = usuarioSchema;
const updateUsuarioSchema = usuarioSchema
  .partial()
  .extend({
    nro_carnet: z.coerce
      .number({ invalid_type_error: "El número de carnet debe ser numérico" })
      .int("El número de carnet debe ser un entero")
      .positive("El número de carnet debe ser mayor a 0")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

const loginUsuarioSchema = z
  .object({
    id_usuario: z.coerce
      .number({ invalid_type_error: "El id_usuario debe ser numérico" })
      .int("El id_usuario debe ser un entero")
      .positive("El id_usuario debe ser mayor a 0")
      .optional(),
    nro_carnet: z.coerce
      .number({ invalid_type_error: "El número de carnet debe ser numérico" })
      .int("El número de carnet debe ser un entero")
      .positive("El número de carnet debe ser mayor a 0")
      .optional(),
    correo_electronico: z
      .string()
      .trim()
      .email("Debe ingresar un correo electrónico válido")
      .optional(),
    contraseña: z.string().min(1, "La contraseña es obligatoria").optional(),
    password: z.string().min(1, "La contraseña es obligatoria").optional(),
  })
  .transform((data) => {
    // normaliza alias password -> contraseña
    if (!data.contraseña && data.password) {
      data.contraseña = data.password;
    }
    delete data.password;
    return data;
  })
  .refine(
    (data) =>
      (data.id_usuario !== undefined ||
        data.nro_carnet !== undefined ||
        !!data.correo_electronico) &&
      !!data.contraseña,
    {
      message: "Debe enviar id_usuario, nro_carnet o correo_electronico y la contraseña",
    }
  );

const updateUsuarioRolesSchema = z.object({
  roles: z
    .array(
      z
        .string({ invalid_type_error: "Cada rol debe ser texto" })
        .trim()
        .min(1, "El nombre del rol no puede estar vacío")
    )
    .max(20, "Se enviaron demasiados roles"),
});

export {
  createUsuarioSchema,
  updateUsuarioSchema,
  loginUsuarioSchema,
  updateUsuarioRolesSchema,
};
