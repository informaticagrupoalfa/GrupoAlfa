import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "paralelos",
  pk: "id_paralelo",
  label: "Paralelo no encontrado",
  writable: [
    "id_capacitacion",
    "id_aula",
    "nivel",
    "nombre_paralelo",
    "modalidad",
    "hora_inicio",
    "hora_fin",
    "dias",
    "activo",
  ],
  filters: ["id_capacitacion", "id_aula"],
  fks: [
    {
      column: "id_capacitacion",
      table: "capacitaciones",
      pk: "id_capacitacion",
      message: "La capacitación no existe",
    },
    { column: "id_aula", table: "aulas", pk: "id_aula", message: "El aula no existe" },
  ],
});

export const getParalelos = crud.list;
export const getParaleloById = crud.getById;
export const createParalelo = crud.create;
export const updateParalelo = crud.update;
export const deleteParalelo = crud.remove;
