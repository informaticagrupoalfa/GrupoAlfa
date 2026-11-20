import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "clases",
  pk: "id_clase",
  label: "Clase no encontrada",
  writable: ["id_asesor_paralelo_materia", "inicioClase"],
  filters: ["id_asesor_paralelo_materia"],
  filterAliases: { id_curso: "id_paralelo", curso: "id_paralelo" },
  dateRange: { column: "inicioClase", desdeParam: "desde", hastaParam: "hasta" },
  customFilters: [],
  fks: [
    { column: "id_asesor_paralelo_materia", table: "asesor_paralelo_materia", pk: "id_asesor_paralelo_materia", message: "La asignación del asesor no existe" },
  ],
});

export const getClases = crud.list;
export const getClaseById = crud.getById;
export const createClase = crud.create;
export const updateClase = crud.update;
export const deleteClase = crud.remove;
