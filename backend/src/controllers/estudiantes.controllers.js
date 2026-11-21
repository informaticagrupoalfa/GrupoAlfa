import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { ROLE_NAMES } from "../config/roles.js";

const PUBLIC_COLUMNS = "id_estudiante, id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio";
const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const fotoToBuffer = (value) => {
  if (value == null || value === "") return null;
  const raw = String(value)
    .replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "")
    .replace(/\s/g, "");
  if (!raw || !BASE64_RE.test(raw)) {
    const error = new Error("La foto no tiene un formato válido");
    error.statusCode = 400;
    throw error;
  }
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) {
    const error = new Error("La foto no tiene un formato válido");
    error.statusCode = 400;
    throw error;
  }
  if (buffer.length > PHOTO_MAX_BYTES) {
    const error = new Error("La foto no puede superar los 8 MB");
    error.statusCode = 400;
    throw error;
  }
  return buffer;
};

const checkApoderadoExists = async (client, idApoderado) => {
  if (idApoderado == null) return true;
  const { rowCount } = await client.query("SELECT 1 FROM apoderados WHERE id_apoderado = $1", [idApoderado]);
  return rowCount > 0;
};

const rollbackAndRespond = async (client, res, status, body) => {
  await client.query("ROLLBACK");
  return res.status(status).json(body);
};

export const getEstudiantes = async (req, res, next) => {
  try {
    const { q } = req.query;
    let query = `
      SELECT e.id_estudiante, e.id_usuario, e.id_apoderado, e.colegio_de_procedencia, e.direccion_de_domicilio,
             u.nro_carnet, u.nombre, u.apellido_paterno, u.apellido_materno
      FROM estudiantes e
      JOIN usuarios u ON u.id_usuario = e.id_usuario
    `;
    const params = [];
    if (q) {
      query += ` WHERE u.nombre ILIKE $${params.length + 1}
                 OR u.apellido_paterno ILIKE $${params.length + 2}
                 OR u.apellido_materno ILIKE $${params.length + 3}
                 OR u.nro_carnet::text ILIKE $${params.length + 4}`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    query += ` ORDER BY e.id_estudiante DESC`;
    const { rows } = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getEstudianteById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM estudiantes WHERE id_estudiante = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Estudiante no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createEstudiante = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      id_usuario,
      usuario,
      id_apoderado,
      colegio_de_procedencia,
      direccion_de_domicilio,
      foto_base64,
    } = req.body;

    let idUsuario = id_usuario ?? null;

    if (idUsuario == null) {
      if (!usuario) {
        return await rollbackAndRespond(client, res, 400, {
          message: "Indica un usuario existente o los datos para crear uno nuevo",
        });
      }

      const { rowCount: carnetExists } = await client.query(
        "SELECT 1 FROM usuarios WHERE nro_carnet = $1",
        [usuario.nro_carnet],
      );
      if (carnetExists > 0) {
        return await rollbackAndRespond(client, res, 409, { error: "El nro de carnet ya existe" });
      }

      const { rowCount: correoExists } = await client.query(
        "SELECT 1 FROM usuarios WHERE correo_electronico = $1",
        [usuario.correo_electronico],
      );
      if (correoExists > 0) {
        return await rollbackAndRespond(client, res, 409, { error: "El correo electrónico ya existe" });
      }

      const contraEncriptada = await bcrypt.hash(usuario.contraseña, 10);
      const { rows: usuarioRows } = await client.query(
        `INSERT INTO usuarios
          (nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento,
           correo_electronico, nro_telefono, contraseña, usuario_vigente)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id_usuario`,
        [
          usuario.nro_carnet,
          usuario.apellido_paterno,
          usuario.apellido_materno,
          usuario.nombre,
          usuario.fecha_nacimiento,
          usuario.correo_electronico,
          usuario.nro_telefono ?? null,
          contraEncriptada,
          usuario.usuario_vigente ?? true,
        ],
      );
      idUsuario = usuarioRows[0].id_usuario;

      // El alta desde este módulo crea una cuenta de estudiante utilizable.
      await client.query(
        `INSERT INTO usuario_rol (id_usuario, id_rol)
         SELECT $1, id_rol FROM roles WHERE nombre = $2
         ON CONFLICT DO NOTHING`,
        [idUsuario, ROLE_NAMES.ESTUDIANTE],
      );
    } else {
      const { rowCount: usuarioExists } = await client.query(
        "SELECT 1 FROM usuarios WHERE id_usuario = $1",
        [idUsuario],
      );
      if (usuarioExists === 0) {
        return await rollbackAndRespond(client, res, 404, { message: "El usuario no existe" });
      }
    }

    const { rowCount: estudianteExists } = await client.query(
      "SELECT 1 FROM estudiantes WHERE id_usuario = $1",
      [idUsuario],
    );
    if (estudianteExists > 0) {
      return await rollbackAndRespond(client, res, 409, {
        error: "El usuario ya tiene una ficha de estudiante",
      });
    }

    if (!(await checkApoderadoExists(client, id_apoderado ?? null))) {
      return await rollbackAndRespond(client, res, 409, { error: "El apoderado no existe" });
    }

    const fotoBuffer = fotoToBuffer(foto_base64);
    const { rows } = await client.query(
      `INSERT INTO estudiantes
        (id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio, foto)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING ${PUBLIC_COLUMNS}`,
      [
        idUsuario,
        id_apoderado ?? null,
        colegio_de_procedencia ?? null,
        direccion_de_domicilio ?? null,
        fotoBuffer,
      ],
    );

    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

export const updateEstudiante = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query(
      `SELECT e.id_estudiante, e.id_usuario, e.id_apoderado,
              u.nro_carnet, u.correo_electronico
       FROM estudiantes e
       JOIN usuarios u ON u.id_usuario = e.id_usuario
       WHERE e.id_estudiante = $1
       FOR UPDATE OF e`,
      [id],
    );
    if (existingRows.length === 0) {
      return await rollbackAndRespond(client, res, 404, { message: "Estudiante no encontrado" });
    }

    const existing = existingRows[0];
    const body = req.body;
    let idUsuario = existing.id_usuario;

    if (hasOwn(body, "id_usuario")) {
      const nuevoId = body.id_usuario;
      const { rowCount: usuarioExists } = await client.query(
        "SELECT 1 FROM usuarios WHERE id_usuario = $1",
        [nuevoId],
      );
      if (usuarioExists === 0) {
        return await rollbackAndRespond(client, res, 404, { message: "El usuario no existe" });
      }
      const { rowCount: duplicated } = await client.query(
        "SELECT 1 FROM estudiantes WHERE id_usuario = $1 AND id_estudiante <> $2",
        [nuevoId, id],
      );
      if (duplicated > 0) {
        return await rollbackAndRespond(client, res, 409, {
          error: "El usuario ya tiene otra ficha de estudiante",
        });
      }
      idUsuario = nuevoId;
    }

    const usuario = body.usuario ?? {};
    if (Object.keys(usuario).length > 0) {
      if (usuario.nro_carnet != null && Number(usuario.nro_carnet) !== Number(existing.nro_carnet)) {
        const { rowCount } = await client.query(
          "SELECT 1 FROM usuarios WHERE nro_carnet = $1 AND id_usuario <> $2",
          [usuario.nro_carnet, idUsuario],
        );
        if (rowCount > 0) {
          return await rollbackAndRespond(client, res, 409, { error: "El nro de carnet ya existe" });
        }
      }

      if (usuario.correo_electronico && usuario.correo_electronico !== existing.correo_electronico) {
        const { rowCount } = await client.query(
          "SELECT 1 FROM usuarios WHERE correo_electronico = $1 AND id_usuario <> $2",
          [usuario.correo_electronico, idUsuario],
        );
        if (rowCount > 0) {
          return await rollbackAndRespond(client, res, 409, { error: "El correo electrónico ya existe" });
        }
      }

      const sets = [];
      const values = [];
      const add = (column, value) => {
        values.push(value);
        sets.push(`${column} = $${values.length}`);
      };

      if (hasOwn(usuario, "nro_carnet")) add("nro_carnet", usuario.nro_carnet);
      if (hasOwn(usuario, "apellido_paterno")) add("apellido_paterno", usuario.apellido_paterno);
      if (hasOwn(usuario, "apellido_materno")) add("apellido_materno", usuario.apellido_materno);
      if (hasOwn(usuario, "nombre")) add("nombre", usuario.nombre);
      if (hasOwn(usuario, "fecha_nacimiento")) add("fecha_nacimiento", usuario.fecha_nacimiento);
      if (hasOwn(usuario, "correo_electronico")) add("correo_electronico", usuario.correo_electronico);
      if (hasOwn(usuario, "nro_telefono")) add("nro_telefono", usuario.nro_telefono || null);
      if (hasOwn(usuario, "usuario_vigente")) add("usuario_vigente", usuario.usuario_vigente);
      if (usuario.contraseña) {
        add("contraseña", await bcrypt.hash(usuario.contraseña, 10));
      }

      if (sets.length > 0) {
        values.push(idUsuario);
        await client.query(
          `UPDATE usuarios SET ${sets.join(", ")} WHERE id_usuario = $${values.length}`,
          values,
        );
      }
    }

    const sets = [];
    const values = [];
    const add = (column, value) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (hasOwn(body, "id_usuario")) add("id_usuario", idUsuario);
    if (hasOwn(body, "id_apoderado")) {
      if (body.id_apoderado != null && !(await checkApoderadoExists(client, body.id_apoderado))) {
        return await rollbackAndRespond(client, res, 409, { error: "El apoderado no existe" });
      }
      add("id_apoderado", body.id_apoderado ?? null);
    }
    if (hasOwn(body, "colegio_de_procedencia")) {
      add("colegio_de_procedencia", body.colegio_de_procedencia || null);
    }
    if (hasOwn(body, "direccion_de_domicilio")) {
      add("direccion_de_domicilio", body.direccion_de_domicilio || null);
    }
    if (hasOwn(body, "foto_base64")) {
      add("foto", fotoToBuffer(body.foto_base64));
    }

    if (sets.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE estudiantes SET ${sets.join(", ")} WHERE id_estudiante = $${values.length}`,
        values,
      );
    }

    const { rows: updatedRows } = await client.query(
      `SELECT ${PUBLIC_COLUMNS},
              CASE WHEN foto IS NOT NULL THEN encode(foto, 'base64') END AS foto_base64
       FROM estudiantes WHERE id_estudiante = $1`,
      [id],
    );

    await client.query("COMMIT");
    res.json(updatedRows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

export const deleteEstudiante = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
    const { rowCount } = await pool.query("DELETE FROM estudiantes WHERE id_estudiante = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ message: "Estudiante no encontrado" });
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
