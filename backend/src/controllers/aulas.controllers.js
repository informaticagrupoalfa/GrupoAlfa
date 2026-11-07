import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "aulas",
  pk: "id_aula",
  label: "Aula no encontrada",
  writable: ["codigo", "capacidad"],
  deleteGuards: [
    {
      table: "paralelos",
      fk: "id_aula",
      message: "No se puede eliminar: el aula tiene paralelos asociados",
    },
  ],
});

export const getAulas = crud.list;
export const getAulaById = crud.getById;
export const createAula = crud.create;
export const updateAula = crud.update;
export const deleteAula = crud.remove;
