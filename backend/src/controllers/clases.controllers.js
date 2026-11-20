import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "clases",
  pk: "id_clase",
  label: "Clase no encontrada",
  writable: ["id_asesor_paralelo_materia", "id_paralelo", "id_asesor", "inicioclase", "tema"],
  filters: ["id_asesor_paralelo_materia", "tema"],
  dateRange: { column: "inicioclase", desdeParam: "desde", hastaParam: "hasta" },
  customFilters: [
    { param: "id_paralelo", clause: (table, placeholder) => `(${table}.id_paralelo = ${placeholder} OR EXISTS (
        SELECT 1 FROM asesor_paralelo_materia apm
        JOIN paralelo_materia pm ON pm.id_paralelo_materia = apm.id_paralelo_materia
        WHERE apm.id_asesor_paralelo_materia = ${table}.id_asesor_paralelo_materia
          AND pm.id_paralelo = ${placeholder}))` },
    { param: "id_materia", clause: (table, placeholder) => `EXISTS (
        SELECT 1 FROM paralelo_materia pm
        LEFT JOIN asesor_paralelo_materia apm ON apm.id_paralelo_materia = pm.id_paralelo_materia
        WHERE pm.id_materia = ${placeholder}
          AND (pm.id_paralelo = ${table}.id_paralelo
               OR apm.id_asesor_paralelo_materia = ${table}.id_asesor_paralelo_materia))` },
  ],
  fks: [
    { column: "id_asesor_paralelo_materia", table: "asesor_paralelo_materia", pk: "id_asesor_paralelo_materia", message: "La asignación del asesor no existe" },
    { column: "id_paralelo", table: "paralelos", pk: "id_paralelo", message: "El paralelo no existe" },
    { column: "id_asesor", table: "asesores", pk: "id_asesor", message: "El asesor no existe" },
  ],
});

export const getClases = crud.list;
export const getClaseById = crud.getById;
export const createClase = crud.create;
export const updateClase = crud.update;
export const deleteClase = crud.remove;
