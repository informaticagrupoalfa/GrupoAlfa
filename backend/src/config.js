export const DB_USER = process.env.DB_USER || "postgres";
export const DB_HOST = process.env.DB_HOST || "monorail.proxy.rlwy.net";
export const DB_PASSWORD = process.env.DB_PASSWORD || "yBFxWXIuNAQDeDXPWYwTNrsbsujOYScc";
export const DB_DATABASE = process.env.DB_DATABASE || "railway";
export const DB_PORT = process.env.DB_PORT || "30843";

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${encodeURIComponent(DB_DATABASE)}`;

export const PORT = process.env.PORT || 4000;
export const HOST = process.env.HOST || "0.0.0.0";

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";