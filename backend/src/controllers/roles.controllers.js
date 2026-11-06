import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "roles",
  pk: "id_rol",
  label: "Rol no encontrado",
  writable: ["nombre"],
  deleteGuards: [
    { table: "usuario_rol", fk: "id_rol", message: "No se puede eliminar: el rol tiene asignaciones asociadas" },
  ],
});

export const getRoles = crud.list;
export const getRolById = crud.getById;
export const createRol = crud.create;
export const updateRol = crud.update;
export const deleteRol = crud.remove;
