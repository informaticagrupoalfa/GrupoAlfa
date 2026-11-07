import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "facultades",
  pk: "id_facultad",
  label: "Facultad no encontrada",
  writable: ["nombre"],
});

export const getFacultades = crud.list;
export const getFacultadById = crud.getById;
export const createFacultad = crud.create;
export const updateFacultad = crud.update;
export const deleteFacultad = crud.remove;
