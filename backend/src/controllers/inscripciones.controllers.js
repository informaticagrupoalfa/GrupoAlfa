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
    "id_paralelo",
    "como_se_entero_de_nosotros",
    "recalculo",
    "preparacion_previa",
    "tiempo_de_preparacion_meses",
    "lugar_de_preparacion",
    "num_credencial",
    "fecha_insc",
  ],
  filters: ["id_administrativo", "id_estudiante", "id_paralelo"],
  fks: [
    {
      column: "id_administrativo",
      table: "administrativos",
      pk: "id_administrativo",
      message: "El administrativo no existe",
    },
    { column: "id_estudiante", table: "estudiantes", pk: "id_estudiante", message: "El estudiante no existe" },
    { column: "id_paralelo", table: "paralelos", pk: "id_paralelo", message: "El paralelo no existe" },
  ],
});

async function assignRole(client, idUsuario, nombreRol) {
  const { rows } = await client.query(
    "SELECT id_rol FROM roles WHERE nombre = $1 LIMIT 1",
    [nombreRol]
  );
  if (rows.length === 0) return;
  await client.query(
    `INSERT INTO usuario_rol (id_rol, id_usuario)
     VALUES ($1, $2)
     ON CONFLICT (id_usuario, id_rol) DO NOTHING`,
    [rows[0].id_rol, idUsuario]
  );
}

export const getInscripciones = crud.list;
export const getInscripcionById = crud.getById;
export const createInscripcion = crud.create;
export const updateInscripcion = crud.update;
export const deleteInscripcion = crud.remove;

const listadoRelations = `FROM inscripciones i
  LEFT JOIN estudiantes e ON e.id_estudiante = i.id_estudiante
  LEFT JOIN usuarios eu ON eu.id_usuario = e.id_usuario
  LEFT JOIN paralelos p ON p.id_paralelo = i.id_paralelo
  LEFT JOIN aulas a ON a.id_aula = p.id_aula
  LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
  LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
  LEFT JOIN LATERAL (
    SELECT MIN(po.id_carrera) AS id_carrera
    FROM postulaciones po
    WHERE po.id_estudiante = i.id_estudiante
    HAVING COUNT(DISTINCT po.id_carrera) = 1
  ) postulacion ON true
  LEFT JOIN carreras cr ON cr.id_carrera = COALESCE(NULLIF(to_jsonb(i)->>'id_carrera', '')::integer, postulacion.id_carrera)
  LEFT JOIN facultades f ON f.id_facultad = COALESCE(cr.id_facultad, cv.id_facultad)`;

const detalleRelations = `${listadoRelations}
  LEFT JOIN administrativos ad ON ad.id_administrativo = i.id_administrativo
  LEFT JOIN usuarios au ON au.id_usuario = ad.id_usuario`;

export const getInscripcionesListado = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const search = String(req.query.q ?? "").trim().slice(0, 100);
    const values = search ? [`%${search}%`] : [];
    const where = search ? `WHERE i.id_inscripcion::text ILIKE $1
      OR eu.nro_carnet::text ILIKE $1
      OR concat_ws(' ', eu.nombre, eu.apellido_paterno, eu.apellido_materno) ILIKE $1
      OR p.nombre_paralelo ILIKE $1 OR cr.nombre ILIKE $1 OR f.nombre ILIKE $1` : "";
    const [list, count] = await Promise.all([
      pool.query(`SELECT i.id_inscripcion, i.fecha_insc, i.num_credencial,
          i.id_estudiante, i.id_paralelo, p.nombre_paralelo,
          concat_ws(' ', eu.nombre, eu.apellido_paterno, eu.apellido_materno) AS estudiante_nombre,
          eu.nro_carnet AS estudiante_ci, cr.nombre AS carrera_nombre,
          f.nombre AS facultad_nombre
        ${listadoRelations} ${where}
        ORDER BY i.id_inscripcion DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]),
      pool.query(search
        ? `SELECT COUNT(*)::integer AS total ${listadoRelations} ${where}`
        : "SELECT COUNT(*)::integer AS total FROM inscripciones", values),
    ]);
    res.json({ items: list.rows, total: count.rows[0].total });
  } catch (error) { next(error); }
};

export const getInscripcionDetalle = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "ID inválido" });
    const { rows } = await pool.query(`SELECT
        i.id_inscripcion, i.id_administrativo, i.id_estudiante, i.id_paralelo,
        cr.id_carrera,
        i.fecha_insc, i.num_credencial, i.como_se_entero_de_nosotros,
        i.recalculo, i.preparacion_previa, i.tiempo_de_preparacion_meses,
        i.lugar_de_preparacion,
        f.id_facultad, f.nombre AS facultad_nombre,
        cr.nombre AS carrera_nombre,
        cv.id_convocatoria, c.id_capacitacion, c.fecha_inicio AS capacitacion_inicio,
        c.fecha_fin AS capacitacion_fin, c.activo AS capacitacion_activa,
        p.nombre_paralelo, p.nivel AS paralelo_nivel, p.modalidad AS paralelo_modalidad,
        p.dias AS paralelo_dias, p.hora_inicio AS paralelo_hora_inicio,
        p.hora_fin AS paralelo_hora_fin,
        a.id_aula, a.codigo AS aula_codigo, a.capacidad AS aula_capacidad,
        ad.id_usuario AS administrativo_usuario_id,
        au.nombre AS administrativo_nombre, au.apellido_paterno AS administrativo_apellido_paterno,
        au.apellido_materno AS administrativo_apellido_materno,
        au.nro_carnet AS administrativo_ci, au.correo_electronico AS administrativo_correo,
        au.nro_telefono AS administrativo_telefono, au.usuario_vigente AS administrativo_usuario_vigente,
        e.id_usuario AS estudiante_usuario_id, e.colegio_de_procedencia,
        e.direccion_de_domicilio,
        eu.nombre AS estudiante_nombre, eu.apellido_paterno AS estudiante_apellido_paterno,
        eu.apellido_materno AS estudiante_apellido_materno,
        eu.nro_carnet AS estudiante_ci, eu.fecha_nacimiento AS estudiante_fecha_nacimiento,
        eu.correo_electronico AS estudiante_correo, eu.nro_telefono AS estudiante_telefono,
        eu.usuario_vigente AS estudiante_usuario_vigente
      ${detalleRelations} WHERE i.id_inscripcion = $1`, [id]);
    if (!rows.length) return res.status(404).json({ message: "Inscripción no encontrada" });
    res.json(rows[0]);
  } catch (error) { next(error); }
};

export const getInscripcionFichas = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 15, 1), 50);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const search = String(req.query.q ?? "").trim().slice(0, 100);
    const values = search ? [`%${search}%`] : [];
    const where = search ? `WHERE CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) ILIKE $1
      OR u.nro_carnet::text ILIKE $1 OR p.nombre_paralelo ILIKE $1
      OR i.id_inscripcion::text ILIKE $1` : "";
    const from = `FROM inscripciones i
      LEFT JOIN estudiantes e ON e.id_estudiante = i.id_estudiante
      LEFT JOIN usuarios u ON u.id_usuario = e.id_usuario
      LEFT JOIN paralelos p ON p.id_paralelo = i.id_paralelo ${where}`;
    const [{ rows }, count] = await Promise.all([
      pool.query(`SELECT i.id_inscripcion, i.id_estudiante, i.id_paralelo, i.fecha_insc,
          i.num_credencial, u.nombre, u.apellido_paterno, u.apellido_materno,
          u.nro_carnet AS ci, p.nombre_paralelo
        ${from} ORDER BY i.id_inscripcion DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]),
      pool.query(`SELECT COUNT(*)::integer AS total ${from}`, values),
    ]);
    res.json({ items: rows, total: count.rows[0].total });
  } catch (error) { next(error); }
};

export const getInscripcionFichaById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });
    const { rows } = await pool.query(
      `SELECT i.*, u.nombre, u.apellido_paterno, u.apellido_materno,
          u.nro_carnet AS ci, u.correo_electronico, u.nro_telefono AS celular,
          u.fecha_nacimiento, e.colegio_de_procedencia, e.direccion_de_domicilio,
          CASE WHEN e.foto IS NOT NULL THEN encode(e.foto, 'base64') END AS foto_base64,
          a.parentesco AS apoderado_parentesco, au.nombre AS apoderado_nombre,
          au.apellido_paterno AS apoderado_apellido_paterno,
          au.apellido_materno AS apoderado_apellido_materno,
          au.nro_carnet AS apoderado_ci, au.nro_telefono AS apoderado_telefono,
          au.correo_electronico AS apoderado_correo_electronico,
          p.nombre_paralelo, p.nivel, p.modalidad, p.dias, p.hora_inicio, p.hora_fin,
          c.fecha_inicio AS inicio_clases, f.nombre AS facultad,
          adu.nombre AS administrativo_nombre,
          adu.apellido_paterno AS administrativo_apellido_paterno,
          adu.apellido_materno AS administrativo_apellido_materno
       FROM inscripciones i
       LEFT JOIN estudiantes e ON e.id_estudiante = i.id_estudiante
       LEFT JOIN usuarios u ON u.id_usuario = e.id_usuario
       LEFT JOIN apoderados a ON a.id_apoderado = e.id_apoderado
       LEFT JOIN usuarios au ON au.id_usuario = a.id_usuario
       LEFT JOIN paralelos p ON p.id_paralelo = i.id_paralelo
       LEFT JOIN capacitaciones c ON c.id_capacitacion = p.id_capacitacion
       LEFT JOIN convocatorias_preuniversitario cv ON cv.id_convocatoria = c.id_convocatoria
       LEFT JOIN facultades f ON f.id_facultad = cv.id_facultad
       LEFT JOIN administrativos ad ON ad.id_administrativo = i.id_administrativo
       LEFT JOIN usuarios adu ON adu.id_usuario = ad.id_usuario
       WHERE i.id_inscripcion = $1`,
      [id],
    );
    if (!rows.length) return res.status(404).json({ error: "Inscripción no encontrada" });
    res.json(rows[0]);
  } catch (error) { next(error); }
};

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
    apoderado_correo_electronico,
    apoderado_contraseña,
    apoderado_parentesco,
      colegio_de_procedencia,
      direccion_de_domicilio,
      celular,
      id_administrativo,
      id_paralelo,
      id_carrera,
      como_se_entero_de_nosotros,
      como_se_entero_detalle,
      recalculo,
      preparacion_previa,
      tiempo_de_preparacion_meses,
      lugar_de_preparacion,
      nro_credencial,
      fecha_inscripcion,
      fecha_registro,
      inicio_clases,
      modalidad,
      horario,
      grupo,
      elaborado_por,
      sucursal,
      foto,
    } = req.body;

    // Reutilizar usuarios registrados; crear solo los que todavía no existen.
    const estudianteExistente = await client.query(
      "SELECT id_usuario FROM usuarios WHERE nro_carnet = $1 LIMIT 1",
      [ci]
    );
    let idUsuarioEstudiante;
    if (estudianteExistente.rows.length > 0) {
      idUsuarioEstudiante = estudianteExistente.rows[0].id_usuario;
    } else {
      const salEst = await bcrypt.genSalt(10);
      const contraEst = await bcrypt.hash(contraseña, salEst);
      const { rows } = await client.query(
        `INSERT INTO usuarios (nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, nro_telefono, contraseña, usuario_vigente)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
         RETURNING id_usuario`,
        [ci, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, celular ?? null, contraEst]
      );
      idUsuarioEstudiante = rows[0].id_usuario;
    }

    const apoderadoExistente = await client.query(
      "SELECT id_usuario FROM usuarios WHERE nro_carnet = $1 LIMIT 1",
      [apoderado_ci]
    );
    let idUsuarioApoderado;
    if (apoderadoExistente.rows.length > 0) {
      idUsuarioApoderado = apoderadoExistente.rows[0].id_usuario;
    } else {
      const salAp = await bcrypt.genSalt(10);
      const contraAp = await bcrypt.hash(apoderado_contraseña, salAp);
      const { rows } = await client.query(
        `INSERT INTO usuarios (nro_carnet, apellido_paterno, apellido_materno, nombre, nro_telefono, correo_electronico, contraseña, usuario_vigente)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)
         RETURNING id_usuario`,
        [apoderado_ci, apoderado_apellido_paterno, apoderado_apellido_materno, apoderado_nombre, apoderado_telefono, apoderado_correo_electronico ?? null, contraAp]
      );
      idUsuarioApoderado = rows[0].id_usuario;
    }

    // 5. Reutilizar el perfil de apoderado si el usuario ya lo tiene.
    const apoderadoPerfilExistente = await client.query(
      "SELECT id_apoderado FROM apoderados WHERE id_usuario = $1 LIMIT 1",
      [idUsuarioApoderado]
    );
    let idApoderado;
    if (apoderadoPerfilExistente.rows.length > 0) {
      idApoderado = apoderadoPerfilExistente.rows[0].id_apoderado;
    } else {
      const { rows } = await client.query(
        "INSERT INTO apoderados (id_usuario, parentesco) VALUES ($1,$2) RETURNING id_apoderado",
        [idUsuarioApoderado, apoderado_parentesco]
      );
      idApoderado = rows[0].id_apoderado;
    }

    // 6. Reutilizar el perfil de estudiante si el usuario ya lo tiene.
    const fotoBuffer = foto ? Buffer.from(foto, "base64") : null;
    const estudiantePerfilExistente = await client.query(
      "SELECT id_estudiante FROM estudiantes WHERE id_usuario = $1 LIMIT 1",
      [idUsuarioEstudiante]
    );
    let idEstudiante;
    if (estudiantePerfilExistente.rows.length > 0) {
      idEstudiante = estudiantePerfilExistente.rows[0].id_estudiante;
      await client.query(
        `UPDATE estudiantes
         SET id_apoderado = $1,
             colegio_de_procedencia = COALESCE($2, colegio_de_procedencia),
             direccion_de_domicilio = COALESCE($3, direccion_de_domicilio),
             foto = COALESCE($4, foto)
         WHERE id_estudiante = $5`,
        [idApoderado, colegio_de_procedencia ?? null, direccion_de_domicilio ?? null, fotoBuffer, idEstudiante]
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO estudiantes (id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio, foto)
         VALUES ($1,$2,$3,$4,$5) RETURNING id_estudiante`,
        [idUsuarioEstudiante, idApoderado, colegio_de_procedencia ?? null, direccion_de_domicilio ?? null, fotoBuffer]
      );
      idEstudiante = rows[0].id_estudiante;
    }

    if (id_carrera != null && id_carrera !== "") {
      // Serializa los registros del estudiante para evitar postulaciones duplicadas.
      await client.query("SELECT pg_advisory_xact_lock($1, $2)", [1937001, idEstudiante]);
      await client.query(
        `INSERT INTO postulaciones (id_estudiante, id_carrera)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM postulaciones WHERE id_estudiante = $1 AND id_carrera = $2
         )`,
        [idEstudiante, id_carrera],
      );
    }

    // 7. Crear inscripción: el paralelo se guarda directamente en la inscripción
    const columns = ["id_administrativo", "id_estudiante", "id_paralelo", "como_se_entero_de_nosotros",
      "recalculo", "preparacion_previa", "tiempo_de_preparacion_meses", "lugar_de_preparacion", "num_credencial", "fecha_insc"];
    const values = [id_administrativo, idEstudiante, id_paralelo ?? null, como_se_entero_de_nosotros ?? null,
      recalculo ?? false, preparacion_previa ?? false, tiempo_de_preparacion_meses ?? 0,
      lugar_de_preparacion ?? null, nro_credencial ?? null, fecha_inscripcion ?? null];
    const optional = { id_carrera, como_se_entero_detalle, fecha_registro, inicio_clases,
      modalidad, horario, grupo, elaborado_por, sucursal };
    const { rows: availableRows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'inscripciones'
         AND column_name = ANY($1::text[])`,
      [Object.keys(optional)],
    );
    const available = new Set(availableRows.map((row) => row.column_name));
    for (const [column, value] of Object.entries(optional)) {
      if (available.has(column) && value !== undefined && value !== null && value !== "") {
        columns.push(column);
        values.push(value);
      }
    }
    const { rows: inscripcionRow } = await client.query(
      `INSERT INTO inscripciones (${columns.join(", ")})
       VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")}) RETURNING id_inscripcion`,
      values,
    );
    const idInscripcion = inscripcionRow[0].id_inscripcion;

    await assignRole(client, idUsuarioEstudiante, "Estudiante");
    await assignRole(client, idUsuarioApoderado, "Apoderado");

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

    // pg unique violation (23505): devolver 409 con el campo y valor duplicado
    if (error.code === "23505") {
      const detail = error.detail || "";
      const columnMatch = detail.match(/Key \((.*?)\)=/);
      const valueMatch = detail.match(/=\((.*?)\)/);
      const column = columnMatch ? columnMatch[1] : null;
      const valor = valueMatch ? valueMatch[1] : null;
      const columnLabels = {
        nro_carnet: "ci",
        correo_electronico: "correo_electronico",
      };
      const campo = column ? (columnLabels[column] || column) : "campo";
      return res.status(409).json({
        error: `El ${campo} ya está registrado`,
        campo,
        valor,
      });
    }

    next(error);
  } finally {
    client.release();
  }
};
