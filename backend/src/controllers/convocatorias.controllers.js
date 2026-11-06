import { pool } from "../db.js";
import { createCrud } from "../utils/crudFactory.js";

const crud = createCrud({
  table: "convocatorias_preuniversitario",
  pk: "id_convocatoria",
  label: "Convocatoria no encontrada",
  writable: ["id_facultad", "fecha_inicio"],
  filters: ["id_facultad"],
  fks: [
    { column: "id_facultad", table: "facultades", pk: "id_facultad", message: "La facultad no existe" },
  ],
  deleteGuards: [
    {
      table: "cursos_capacitacion",
      fk: "id_convocatoria",
      message: "No se puede eliminar: la convocatoria tiene cursos de capacitación asociados",
    },
  ],
});

export const getConvocatorias = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id_convocatoria, c.id_facultad, c.fecha_inicio, f.nombre AS nombre_facultad
      FROM convocatorias_preuniversitario c
      JOIN facultades f ON f.id_facultad = c.id_facultad
      ORDER BY c.id_convocatoria ASC
    `);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getConvocatoriaById = crud.getById;
export const createConvocatoria = crud.create;
export const updateConvocatoria = crud.update;
export const deleteConvocatoria = crud.remove;
