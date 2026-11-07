import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "matriculaciones",
  pk: "id_matriculacion",
  label: "Matriculación no encontrada",
  writable: ["id_estudiante", "id_paralelo", "esta_vigente", "nro_comprobante", "nro_credencial"],
  filters: ["id_estudiante", "id_paralelo"],
  filterAliases: { id_curso: "id_paralelo", curso: "id_paralelo" },
  fks: [
    { column: "id_estudiante", table: "estudiantes", pk: "id_estudiante", message: "El estudiante no existe" },
    {
      column: "id_paralelo",
      table: "paralelos",
      pk: "id_paralelo",
      message: "El paralelo no existe",
    },
  ],
});

export const getMatriculaciones = crud.list;
export const getMatriculacionById = crud.getById;
export const createMatriculacion = crud.create;
export const updateMatriculacion = crud.update;
export const deleteMatriculacion = crud.remove;
