import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "inscripciones",
  pk: "id_inscripcion",
  label: "Inscripción no encontrada",
  writable: [
    "id_administrativo",
    "id_estudiante",
    "id_carrera",
    "como_se_entero_de_nosotros",
    "como_se_entero_detalle",
    "recalculo",
    "preparacion_previa",
    "tiempo_de_preparacion_meses",
    "lugar_de_preparacion",
    "nro_comprobante",
    "nro_credencial",
    "inicio_clases",
    "modalidad",
    "horario",
    "grupo",
    "apellido_paterno",
    "apellido_materno",
    "nombre",
    "edad",
    "correo_electronico",
    "colegio_de_procedencia",
    "direccion_de_domicilio",
    "firma",
    "apoderado_nombre_completo",
    "apoderado_celular",
    "apoderado_parentesco",
    "elaborado_por",
    "sucursal",
    "fecha_registro",
  ],
  filters: ["id_administrativo", "id_estudiante", "id_carrera"],
  fks: [
    {
      column: "id_administrativo",
      table: "administrativos",
      pk: "id_administrativo",
      message: "El administrativo no existe",
    },
    { column: "id_estudiante", table: "estudiantes", pk: "id_estudiante", message: "El estudiante no existe" },
    { column: "id_carrera", table: "carreras", pk: "id_carrera", message: "La carrera no existe" },
  ],
});

export const getInscripciones = crud.list;
export const getInscripcionById = crud.getById;
export const createInscripcion = crud.create;
export const updateInscripcion = crud.update;
export const deleteInscripcion = crud.remove;
