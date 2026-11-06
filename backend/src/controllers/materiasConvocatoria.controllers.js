import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "convocatoria_materia",
  pk: "id_asignacion_materia_convocatoria",
  label: "Asignación no encontrada",
  writable: ["id_convocatoria", "id_materia"],
  filters: ["id_convocatoria", "id_materia"],
  fks: [
    {
      column: "id_convocatoria",
      table: "convocatorias_preuniversitario",
      pk: "id_convocatoria",
      message: "La convocatoria no existe",
    },
    { column: "id_materia", table: "materias", pk: "id_materia", message: "La materia no existe" },
  ],
});

export const getMateriasConvocatoria = crud.list;
export const getMateriasConvocatoriaById = crud.getById;
export const createMateriasConvocatoria = crud.create;
export const updateMateriasConvocatoria = crud.update;
export const deleteMateriasConvocatoria = crud.remove;
