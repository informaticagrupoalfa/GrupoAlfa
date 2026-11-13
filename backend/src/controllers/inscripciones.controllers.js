import { createCrud } from "../utils/crudFactory.js";
import { pool } from "../db.js";
import bcrypt from "bcrypt";

const crud = createCrud({
  table: "inscripciones",
  pk: "id_inscripcion",
  label: "Inscripción no encontrada",
  writable: [
    "id_administrativo",
    "id_estudiante",
    "id_carrera",
    "como_se_entero_de_nosotros",
    "como_se_entero_detalle",
    "recalculo",
    "preparacion_previa",
    "tiempo_de_preparacion_meses",
    "lugar_de_preparacion",
    "nro_comprobante",
    "nro_credencial",
    "inicio_clases",
    "modalidad",
    "horario",
    "grupo",
    "apellido_paterno",
    "apellido_materno",
    "nombre",
    "edad",
    "correo_electronico",
    "colegio_de_procedencia",
    "direccion_de_domicilio",
    "firma",
    "apoderado_nombre_completo",
    "apoderado_celular",
    "apoderado_parentesco",
    "elaborado_por",
    "sucursal",
    "fecha_registro",
  ],
  filters: ["id_administrativo", "id_estudiante", "id_carrera"],
  fks: [
    {
      column: "id_administrativo",
      table: "administrativos",
      pk: "id_administrativo",
      message: "El administrativo no existe",
    },
    { column: "id_estudiante", table: "estudiantes", pk: "id_estudiante", message: "El estudiante no existe" },
    { column: "id_carrera", table: "carreras", pk: "id_carrera", message: "La carrera no existe" },
  ],
});

export const getInscripciones = crud.list;
export const getInscripcionById = crud.getById;
export const createInscripcion = crud.create;
export const updateInscripcion = crud.update;
export const deleteInscripcion = crud.remove;

export const registrarEstudiante = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      ci,
      apellido_paterno,
      apellido_materno,
      nombre,
      fecha_nacimiento,
      correo_electronico,
      contraseña,
      apoderado_ci,
      apoderado_nombre,
      apoderado_apellido_paterno,
      apoderado_apellido_materno,
      apoderado_telefono,
      apoderado_contraseña,
      apoderado_parentesco,
      colegio_de_procedencia,
      direccion_de_domicilio,
      id_administrativo,
      id_paralelo,
      nro_comprobante,
      como_se_entero_de_nosotros,
      recalculo,
      preparacion_previa,
      tiempo_de_preparacion_meses,
      lugar_de_preparacion,
      nro_credencial,
      fecha_inscripcion,
      foto,
    } = req.body;

    // 1. Verificar CI del estudiante
    const estudianteExists = await client.query(
      "SELECT 1 FROM usuarios WHERE nro_carnet = $1",
      [ci]
    );
    if (estudianteExists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "El CI del estudiante ya está registrado" });
    }

    // 2. Verificar CI del apoderado
    const apoderadoExists = await client.query(
      "SELECT 1 FROM usuarios WHERE nro_carnet = $1",
      [apoderado_ci]
    );
    if (apoderadoExists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "El CI del apoderado ya está registrado" });
    }

    // 3. Crear usuario del estudiante
    const salEst = await bcrypt.genSalt(10);
    const contraEst = await bcrypt.hash(contraseña, salEst);
    const { rows: usuarioEstudiante } = await client.query(
      `INSERT INTO usuarios (nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, contraseña, usuario_vigente)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       RETURNING id_usuario`,
      [ci, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, contraEst]
    );
    const idUsuarioEstudiante = usuarioEstudiante[0].id_usuario;

    // 4. Crear usuario del apoderado
    const salAp = await bcrypt.genSalt(10);
    const contraAp = await bcrypt.hash(apoderado_contraseña, salAp);
    const { rows: usuarioApoderado } = await client.query(
      `INSERT INTO usuarios (nro_carnet, apellido_paterno, apellido_materno, nombre, nro_telefono, contraseña, usuario_vigente)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING id_usuario`,
      [apoderado_ci, apoderado_apellido_paterno, apoderado_apellido_materno, apoderado_nombre, apoderado_telefono, contraAp]
    );
    const idUsuarioApoderado = usuarioApoderado[0].id_usuario;

    // 5. Crear apoderado
    const { rows: apoderadoRow } = await client.query(
      "INSERT INTO apoderados (id_usuario, parentesco) VALUES ($1,$2) RETURNING id_apoderado",
      [idUsuarioApoderado, apoderado_parentesco]
    );
    const idApoderado = apoderadoRow[0].id_apoderado;

    // 6. Crear estudiante
    const fotoBuffer = foto ? Buffer.from(foto, "base64") : null;
    const { rows: estudianteRow } = await client.query(
      `INSERT INTO estudiantes (id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio, foto)
       VALUES ($1,$2,$3,$4,$5) RETURNING id_estudiante`,
      [idUsuarioEstudiante, idApoderado, colegio_de_procedencia ?? null, direccion_de_domicilio ?? null, fotoBuffer]
    );
    const idEstudiante = estudianteRow[0].id_estudiante;

    // 7. Crear matrícula
    await client.query(
      `INSERT INTO matriculaciones (id_estudiante, id_paralelo, esta_vigente, nro_comprobante, nro_credencial)
       VALUES ($1,$2,true,$3,$4)`,
      [idEstudiante, id_paralelo ?? null, nro_comprobante ?? null, nro_credencial ?? null]
    );

    // 8. Crear inscripción (usando columna fecha_insc y num_credencial del esquema)
    const { rows: inscripcionRow } = await client.query(
      `INSERT INTO inscripciones (id_administrativo, id_estudiante, como_se_entero_de_nosotros, recalculo, preparacion_previa, tiempo_de_preparacion_meses, lugar_de_preparacion, num_credencial, fecha_insc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_inscripcion`,
      [id_administrativo, idEstudiante, como_se_entero_de_nosotros ?? null, recalculo ?? false, preparacion_previa ?? false, tiempo_de_preparacion_meses ?? 0, lugar_de_preparacion ?? null, nro_credencial ?? null, fecha_inscripcion ?? null]
    );
    const idInscripcion = inscripcionRow[0].id_inscripcion;

    // 9. Crear mensualidad
    const fechaInicio = fecha_inscripcion ?? new Date().toISOString().split("T")[0];
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + 1);
    await client.query(
      `INSERT INTO mensualidades (id_administrativo, fecha_inicio_mensualidad, fecha_fin_mensualidad, pago, id_inscripcion)
       VALUES ($1,$2,$3,$4,$5)`,
      [id_administrativo, fechaInicio, fechaFin.toISOString().split("T")[0], 0, idInscripcion]
    );

    await client.query("COMMIT");

    res.status(201).json({
      estado: "exito",
      mensaje: "Estudiante registrado correctamente",
      datos: {
        id_usuario_estudiante: idUsuarioEstudiante,
        id_usuario_apoderado: idUsuarioApoderado,
        id_apoderado: idApoderado,
        id_estudiante: idEstudiante,
        id_inscripcion: idInscripcion,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};
