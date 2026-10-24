import { pool } from "../db.js";
import { generateToken } from "../utils/generateToken.js";
import bcrypt from "bcrypt";

const PUBLIC_COLUMNS =
  "id_usuario, nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, usuario_vigente";

const rolesSubquery = (alias = "usuarios") => `COALESCE((
  SELECT json_agg(r.nombre ORDER BY r.nombre)
  FROM asignacion_rol ar
  JOIN roles r ON r.id_rol = ar.id_rol
  WHERE ar.id_usuario = ${alias}.id_usuario
), '[]'::json) AS roles`;

const getRolesForUser = async (idUsuario) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(json_agg(r.nombre ORDER BY r.nombre), '[]'::json) AS roles
     FROM asignacion_rol ar
     JOIN roles r ON r.id_rol = ar.id_rol
     WHERE ar.id_usuario = $1`,
    [idUsuario]
  );
  return Array.isArray(rows[0]?.roles) ? rows[0].roles : [];
};

const sanitize = (row) => {
  if (!row) return row;
  const { contraseña, ...rest } = row;
  return rest;
};

const existePorCarnet = async (nro_carnet) => {
  if (nro_carnet == null) return false;
  const { rows } = await pool.query("SELECT 1 FROM usuarios WHERE nro_carnet = $1", [nro_carnet]);
  return rows.length > 0;
};

const existePorCorreo = async (correo_electronico) => {
  if (!correo_electronico) return false;
  const { rows } = await pool.query("SELECT 1 FROM usuarios WHERE correo_electronico = $1", [correo_electronico]);
  return rows.length > 0;
};

export const getUsuarios = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_COLUMNS}, ${rolesSubquery("usuarios")}
       FROM usuarios ORDER BY id_usuario ASC`
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getUsuarioById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID debe ser numérico" });
    }
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_COLUMNS}, ${rolesSubquery("usuarios")}
       FROM usuarios WHERE id_usuario = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

// Catálogo mínimo para pantallas académicas (nombres y carnet, sin datos sensibles).
export const getUsuarioCatalogo = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_usuario, nro_carnet, apellido_paterno, apellido_materno, nombre
       FROM usuarios ORDER BY id_usuario ASC`
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

export const getMe = (req, res) => res.status(200).json(req.user);

export const createUsuario = async (req, res, next) => {
  try {
    const {
      nro_carnet,
      apellido_paterno,
      apellido_materno,
      nombre,
      fecha_nacimiento,
      correo_electronico,
      contraseña,
      usuario_vigente,
    } = req.body;

    if (await existePorCarnet(nro_carnet)) {
      return res.status(409).json({ error: "El nro de carnet ya existe" });
    }
    if (await existePorCorreo(correo_electronico)) {
      return res.status(409).json({ error: "El correo electrónico ya existe" });
    }

    const sal = await bcrypt.genSalt(10);
    const contraEncriptada = await bcrypt.hash(contraseña, sal);

    const { rows } = await pool.query(
      `INSERT INTO usuarios
       (nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, contraseña, usuario_vigente)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${PUBLIC_COLUMNS}`,
      [nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, contraEncriptada, usuario_vigente ?? true]
    );

    const token = generateToken(rows[0].id_usuario, res);

    res.status(201).json({
      estado: "exito",
      datos: { ...rows[0], roles: [] },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { id_usuario, nro_carnet, correo_electronico, contraseña } = req.body;

    let rows;
    if (id_usuario != null) {
      const r = await pool.query("SELECT * FROM usuarios WHERE id_usuario = $1", [id_usuario]);
      rows = r.rows;
    } else if (nro_carnet != null) {
      const r = await pool.query("SELECT * FROM usuarios WHERE nro_carnet = $1", [nro_carnet]);
      rows = r.rows;
    } else {
      const r = await pool.query("SELECT * FROM usuarios WHERE correo_electronico = $1", [correo_electronico]);
      rows = r.rows;
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: "No existe en la base de datos" });
    }

    const user = rows[0];
    const esValido = await bcrypt.compare(contraseña, user.contraseña);

    if (!esValido) {
      return res.status(401).json({ error: "Usuario o contraseña erróneos" });
    }

    const token = generateToken(user.id_usuario, res);
    const roles = await getRolesForUser(user.id_usuario);

    res.status(200).json({
      estado: "exito",
      datos: { ...sanitize(user), roles },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({
    status: "Exito",
    message: "El usuario ya no esta logeado",
  });
};

export const updateUsuario = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID debe ser numérico" });
    }

    const existente = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id_usuario = $1`, [id]);
    if (existente.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const {
      nro_carnet,
      apellido_paterno,
      apellido_materno,
      nombre,
      fecha_nacimiento,
      correo_electronico,
      contraseña,
      usuario_vigente,
    } = req.body;

    // chequeo conflicto nro_carnet si cambia
    if (nro_carnet && nro_carnet !== existente.rows[0].nro_carnet) {
      if (await existePorCarnet(nro_carnet)) {
        return res.status(409).json({ error: "El nro de carnet ya existe" });
      }
    }

    // chequeo conflicto correo si cambia
    if (correo_electronico && correo_electronico !== existente.rows[0].correo_electronico) {
      if (await existePorCorreo(correo_electronico)) {
        return res.status(409).json({ error: "El correo electrónico ya existe" });
      }
    }

    let contraEncriptada = null;
    if (contraseña) {
      const sal = await bcrypt.genSalt(10);
      contraEncriptada = await bcrypt.hash(contraseña, sal);
    }

    // update dinámico: COALESCE mantiene valor actual si no se envía
    const { rows } = await pool.query(
      `UPDATE usuarios
       SET nro_carnet = COALESCE($1, nro_carnet),
           apellido_paterno = COALESCE($2, apellido_paterno),
           apellido_materno = COALESCE($3, apellido_materno),
           nombre = COALESCE($4, nombre),
           fecha_nacimiento = COALESCE($5, fecha_nacimiento),
           correo_electronico = COALESCE($6, correo_electronico),
           contraseña = COALESCE($7, contraseña),
           usuario_vigente = COALESCE($8, usuario_vigente)
       WHERE id_usuario = $9
       RETURNING ${PUBLIC_COLUMNS}`,
      [nro_carnet ?? null, apellido_paterno ?? null, apellido_materno ?? null, nombre ?? null, fecha_nacimiento ?? null, correo_electronico ?? null, contraEncriptada, usuario_vigente ?? null, id]
    );

    return res.json({ ...rows[0], roles: await getRolesForUser(id) });
  } catch (error) {
    next(error);
  }
};

export const updateUsuarioRoles = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID debe ser numérico" });
  }

  const requestedRoles = [
    ...new Set(
      (req.body.roles ?? [])
        .map((role) => String(role).trim())
        .filter(Boolean)
    ),
  ];

  const client = await pool.connect();
  try {
    const exists = await client.query(
      "SELECT 1 FROM usuarios WHERE id_usuario = $1",
      [id]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    let roleRows = [];
    if (requestedRoles.length > 0) {
      const rolesResult = await client.query(
        "SELECT id_rol, nombre FROM roles WHERE nombre = ANY($1::text[]) ORDER BY nombre",
        [requestedRoles]
      );
      roleRows = rolesResult.rows;

      if (roleRows.length !== requestedRoles.length) {
        const found = new Set(roleRows.map((role) => role.nombre));
        const missing = requestedRoles.filter((role) => !found.has(role));
        return res.status(400).json({
          error: `Roles inexistentes: ${missing.join(", ")}`,
        });
      }
    }

    await client.query("BEGIN");
    await client.query("DELETE FROM asignacion_rol WHERE id_usuario = $1", [id]);
    for (const role of roleRows) {
      await client.query(
        "INSERT INTO asignacion_rol (id_rol, id_usuario) VALUES ($1, $2)",
        [role.id_rol, id]
      );
    }
    await client.query("COMMIT");

    return res.status(200).json({
      id_usuario: id,
      roles: roleRows.map((role) => role.nombre),
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

export const deleteUsuario = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID debe ser numérico" });
    }
    const { rowCount } = await pool.query("DELETE FROM usuarios WHERE id_usuario = $1", [id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};
