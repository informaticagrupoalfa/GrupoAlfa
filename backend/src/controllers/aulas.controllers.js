import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "aulas",
  pk: "id_aula",
  label: "Aula no encontrada",
  writable: ["codigo", "capacidad"],
});

export const getAulas = crud.list;
export const getAulaById = crud.getById;
export const createAula = crud.create;
export const updateAula = crud.update;
export const deleteAula = crud.remove;
