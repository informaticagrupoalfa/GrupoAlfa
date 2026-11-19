import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "mensualidades",
  pk: "id_mensualidad",
  label: "Mensualidad no encontrada",
  writable: [
    "id_inscripcion",
    "fecha_inicio_mensualidad",
    "fecha_fin_mensualidad",
    "pago",
    "codigo_comprobante",
  ],
  filters: ["id_inscripcion"],
  fks: [
    {
      column: "id_inscripcion",
      table: "inscripciones",
      pk: "id_inscripcion",
      message: "La inscripción no existe",
    },
  ],
});

export const getMensualidades = crud.list;
export const getMensualidadById = crud.getById;
export const createMensualidad = crud.create;
export const updateMensualidad = crud.update;
export const deleteMensualidad = crud.remove;
