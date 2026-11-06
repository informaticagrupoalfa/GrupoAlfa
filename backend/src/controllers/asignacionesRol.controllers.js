import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "usuario_rol",
  pk: "id_asignacion_rol",
  label: "Asignación de rol no encontrada",
  writable: ["id_rol", "id_usuario"],
  filters: ["id_rol", "id_usuario"],
  fks: [
    { column: "id_rol", table: "roles", pk: "id_rol", message: "El rol no existe" },
    { column: "id_usuario", table: "usuarios", pk: "id_usuario", message: "El usuario no existe" },
  ],
});

export const getAsignacionesRol = crud.list;
export const getAsignacionRolById = crud.getById;
export const createAsignacionRol = crud.create;
export const updateAsignacionRol = crud.update;
export const deleteAsignacionRol = crud.remove;
