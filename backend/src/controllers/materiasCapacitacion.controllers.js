import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "materia_capacitacion",
  pk: "id_asignacion_materia",
  label: "Asignación no encontrada",
  writable: ["id_materia", "id_capacitacion"],
  filters: ["id_materia", "id_capacitacion"],
  fks: [
    { column: "id_materia", table: "materias", pk: "id_materia", message: "La materia no existe" },
    {
      column: "id_capacitacion",
      table: "capacitaciones",
      pk: "id_capacitacion",
      message: "La capacitación no existe",
    },
  ],
});

export const getMateriasCapacitacion = crud.list;
export const getMateriaCapacitacionById = crud.getById;
export const createMateriaCapacitacion = crud.create;
export const updateMateriaCapacitacion = crud.update;
export const deleteMateriaCapacitacion = crud.remove;
