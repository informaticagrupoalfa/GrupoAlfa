import { createCrud } from "../utils/crudFactory.js";

const CAPACITACION_FK = {
  column: "id_capacitacion",
  table: "capacitaciones",
  pk: "id_capacitacion",
  message: "La capacitación no existe",
};
// Alias cortos aceptados como filtro (?id_curso= / ?curso=).
const CAPACITACION_ALIASES = { id_curso: "id_capacitacion", curso: "id_capacitacion" };

const crud = createCrud({
  table: "materia_capacitacion",
  pk: "id_asignacion_materia",
  label: "Asignación no encontrada",
  writable: ["id_materia", "id_capacitacion"],
  filters: ["id_materia", "id_capacitacion"],
  filterAliases: CAPACITACION_ALIASES,
  fks: [
    { column: "id_materia", table: "materias", pk: "id_materia", message: "La materia no existe" },
    CAPACITACION_FK,
  ],
});

export const getAsignacionesMaterias = crud.list;
export const getAsignacionMateriasById = crud.getById;
export const createAsignacionMaterias = crud.create;
export const updateAsignacionMaterias = crud.update;
export const deleteAsignacionMaterias = crud.remove;
