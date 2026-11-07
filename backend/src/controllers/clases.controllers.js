import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "clases",
  pk: "id_clase",
  label: "Clase no encontrada",
  writable: ["id_paralelo", "id_asesor", "id_tema", "inicioClase"],
  filters: ["id_paralelo", "id_asesor", "id_tema"],
  filterAliases: { id_curso: "id_paralelo", curso: "id_paralelo" },
  dateRange: { column: "inicioClase", desdeParam: "desde", hastaParam: "hasta" },
  customFilters: [
    {
      // La materia llega vía la puente materia_capacitacion (paralelo → capacitación ↔ materia).
      param: "id_materia",
      clause: (table, p) =>
        `EXISTS (
          SELECT 1
          FROM paralelos p
          JOIN materia_capacitacion mc ON mc.id_capacitacion = p.id_capacitacion
          WHERE p.id_paralelo = ${table}.id_paralelo
            AND mc.id_materia = ${p}
        )`,
    },
  ],
  fks: [
    {
      column: "id_paralelo",
      table: "paralelos",
      pk: "id_paralelo",
      message: "El paralelo no existe",
    },
    { column: "id_asesor", table: "asesores", pk: "id_asesor", message: "El asesor no existe" },
    { column: "id_tema", table: "temas", pk: "id_tema", message: "El tema no existe" },
  ],
  deleteGuards: [
    { table: "avances", fk: "id_clase", message: "No se puede eliminar: la clase tiene avances asociados" },
  ],
});

export const getClases = crud.list;
export const getClaseById = crud.getById;
export const createClase = crud.create;
export const updateClase = crud.update;
export const deleteClase = crud.remove;
