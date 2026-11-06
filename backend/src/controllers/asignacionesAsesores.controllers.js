import { createCrud } from "../utils/crudFactory.js";

const CURSO_FK = {
  column: "id_curso_capacitacion",
  table: "cursos_capacitacion",
  pk: "id_capacitacion",
  message: "El curso de capacitación no existe",
};
// Alias cortos aceptados como filtro (?id_curso= / ?curso=).
const CURSO_ALIASES = { id_curso: "id_curso_capacitacion", curso: "id_curso_capacitacion" };

const asesores = createCrud({
  table: "asesor_curso_capacitacion",
  pk: "id_asignacion_asesor",
  label: "Asignación no encontrada",
  writable: ["id_asesor", "id_curso_capacitacion"],
  filters: ["id_asesor", "id_curso_capacitacion"],
  filterAliases: CURSO_ALIASES,
  fks: [
    { column: "id_asesor", table: "asesores", pk: "id_asesor", message: "El asesor no existe" },
    CURSO_FK,
  ],
});

export const getAsignacionesAsesores = asesores.list;
export const getAsignacionAsesoresById = asesores.getById;
export const createAsignacionAsesores = asesores.create;
export const updateAsignacionAsesores = asesores.update;
export const deleteAsignacionAsesores = asesores.remove;
