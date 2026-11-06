import { createCrud } from "../utils/crudFactory.js";

const CURSO_FK = {
  column: "id_curso_capacitacion",
  table: "cursos_capacitacion",
  pk: "id_capacitacion",
  message: "El curso de capacitación no existe",
};
const CURSO_ALIASES = { id_curso: "id_curso_capacitacion", curso: "id_curso_capacitacion" };

const crud = createCrud({
  table: "materia_curso_capacitacion",
  pk: "id_asignacion_materia",
  label: "Asignación no encontrada",
  writable: ["id_materia", "id_curso_capacitacion"],
  filters: ["id_materia", "id_curso_capacitacion"],
  filterAliases: CURSO_ALIASES,
  fks: [
    { column: "id_materia", table: "materias", pk: "id_materia", message: "La materia no existe" },
    CURSO_FK,
  ],
});

export const getAsignacionesMaterias = crud.list;
export const getAsignacionMateriasById = crud.getById;
export const createAsignacionMaterias = crud.create;
export const updateAsignacionMaterias = crud.update;
export const deleteAsignacionMaterias = crud.remove;
