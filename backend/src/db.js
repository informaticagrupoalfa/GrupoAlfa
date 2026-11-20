import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool(env.db);
