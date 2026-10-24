import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export const authMiddleware = async (req, res, next) => {
  // La autorización global ya cargó al usuario; evitamos una segunda consulta.
  if (req.user) return next();

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({ error: "No autorizado, token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nro_carnet, u.apellido_paterno, u.apellido_materno,
              u.nombre, u.fecha_nacimiento, u.correo_electronico, u.usuario_vigente,
              COALESCE((
                SELECT json_agg(r.nombre ORDER BY r.nombre)
                FROM asignacion_rol ar
                JOIN roles r ON r.id_rol = ar.id_rol
                WHERE ar.id_usuario = u.id_usuario
              ), '[]'::json) AS roles
       FROM usuarios u
       WHERE u.id_usuario = $1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuario ya no existe" });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    return res.status(401).json({ error: "No autorizado, token inválido" });
  }
};
