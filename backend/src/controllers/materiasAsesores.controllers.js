import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "materia_asesor",
  pk: "id_materia_asesor",
  label: "Asignación no encontrada",
  writable: ["id_asesor", "id_materia"],
  filters: ["id_asesor", "id_materia"],
  fks: [
    { column: "id_asesor", table: "asesores", pk: "id_asesor", message: "El asesor no existe" },
    { column: "id_materia", table: "materias", pk: "id_materia", message: "La materia no existe" },
  ],
});

export const getMateriasAsesores = crud.list;
export const getMateriasAsesoresById = crud.getById;
export const createMateriasAsesores = crud.create;
export const updateMateriasAsesores = crud.update;
export const deleteMateriasAsesores = crud.remove;
