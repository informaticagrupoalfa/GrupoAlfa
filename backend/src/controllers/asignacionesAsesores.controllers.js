import { createCrud } from "../utils/crudFactory.js";

const PARALELO_FK = {
  column: "id_paralelo",
  table: "paralelos",
  pk: "id_paralelo",
  message: "El paralelo no existe",
};
// Alias cortos aceptados como filtro (?id_curso= / ?curso=).
const PARALELO_ALIASES = { id_curso: "id_paralelo", curso: "id_paralelo" };

const asesores = createCrud({
  table: "asesor_paralelo",
  pk: "id_asignacion_asesor",
  label: "Asignación no encontrada",
  writable: ["id_asesor", "id_paralelo"],
  filters: ["id_asesor", "id_paralelo"],
  filterAliases: PARALELO_ALIASES,
  fks: [
    { column: "id_asesor", table: "asesores", pk: "id_asesor", message: "El asesor no existe" },
    PARALELO_FK,
  ],
});

export const getAsignacionesAsesores = asesores.list;
export const getAsignacionAsesoresById = asesores.getById;
export const createAsignacionAsesores = asesores.create;
export const updateAsignacionAsesores = asesores.update;
export const deleteAsignacionAsesores = asesores.remove;
