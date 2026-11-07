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
  id_carrera: fkOpcional("id_carrera"),

  nro_comprobante: enteroOpcional("El nro de comprobante"),
  nro_credencial: enteroOpcional("El nro de credencial"),
  inicio_clases: fechaOpcional("La fecha de inicio de clases"),
  modalidad: textoOpcional("La modalidad", 50),
  horario: textoOpcional("El horario", 100),
  grupo: textoOpcional("El grupo", 50),

  apellido_paterno: textoOpcional("El apellido paterno", 100),
  apellido_materno: textoOpcional("El apellido materno", 100),
  nombre: textoOpcional("El nombre", 100),
  edad: enteroOpcional("La edad", { min: 0 }),
  correo_electronico: textoOpcional("El correo electrónico", 150),
  colegio_de_procedencia: textoOpcional("El colegio de procedencia", 150),
  direccion_de_domicilio: textoOpcional("La dirección de domicilio", 255),
  firma: textoOpcional("La firma", 255),

  apoderado_nombre_completo: textoOpcional("El nombre del apoderado", 200),
  apoderado_celular: textoOpcional("El celular del apoderado", 20),
  apoderado_parentesco: textoOpcional("El parentesco del apoderado", 100),

  como_se_entero_de_nosotros: textoOpcional("El medio por el que se enteró", 255),
  como_se_entero_detalle: textoOpcional("El detalle del medio por el que se enteró", 255),
  recalculo: z.boolean().optional(),
  preparacion_previa: z.boolean().optional(),
  tiempo_de_preparacion_meses: enteroOpcional("El tiempo de preparación", { min: 0 }),
  lugar_de_preparacion: textoOpcional("El lugar de preparación", 255),

  elaborado_por: textoOpcional("El elaborador", 150),
  sucursal: textoOpcional("La sucursal", 100),
  fecha_registro: fechaOpcional("La fecha de registro"),
});

export const createInscripcionSchema = inscripcionSchema;
export const updateInscripcionSchema = inscripcionSchema.partial();
