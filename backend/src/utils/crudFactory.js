import { pool } from "../db.js";

/**
 * Factoría de controladores CRUD con el contrato REST del proyecto:
 * GET colección (200, con filtros opcionales) · GET :id (200|400|404) ·
 * POST (201|400 zod|409 FK) · PUT (200|400|404|409) · DELETE (204|400|404|409).
 *
 * - Sustantivos plurales en rutas, sin verbos; `201` en create, `204` sin body en delete.
 * - Queries parametrizadas `$1..$n`; errores pg vía `next(error)` → `errorMiddleware`
 *   (`23505/23503→409`, `22P02→400`).
 * - `INSERT`/`UPDATE` dinámicos solo con claves provistas: respeta `DEFAULT` de la BD
 *   (ej. `recalculo`) en create y `COALESCE` en update.
 *
 * @param {object} cfg
 * @param {string} cfg.table tabla SQL
 * @param {string} cfg.pk columna PK
 * @param {string} cfg.label nombre singular para mensajes 404 ("Carrera", "Clase"...)
 * @param {string[]} cfg.writable columnas escribibles (allowlist del body)
 * @param {string[]} [cfg.filters] columnas filtrables por query (`?col=valor`)
 * @param {Record<string,string>} [cfg.filterAliases] alias de query → columna canónica
 * @param {{column:string,table:string,pk:string,message:string}[]} [cfg.fks]
 *   FKs a verificar antes de INSERT/UPDATE → `409 { error }` si no existe el padre
 * @param {{table:string,fk:string,message:string}[]} [cfg.deleteGuards]
 *   chequeos previos en DELETE (relaciones `RESTRICT`) → `409 { error }` específico
 * @param {{column:string,desdeParam?:string,hastaParam?:string}} [cfg.dateRange]
 *   filtro por rango de fechas (`?desde= &hasta=`, 400 si son inválidas)
 * @param {{param:string,clause:(table:string,placeholder:string)=>string}[]} [cfg.customFilters]
 *   filtros extra por query (ej. vía `EXISTS` en tablas puente)
 */
export const PAGE_DEFAULT_LIMIT = 25;
export const PAGE_MAX_LIMIT = 100;

export function createCrud(cfg) {
  const { table, pk, label, writable, filters = [], filterAliases = {}, fks = [], deleteGuards = [], dateRange = null, customFilters = [] } = cfg;

  const buildWhere = (query) => {
    const clauses = [];
    const values = [];
    const seen = new Set();
    for (const [rawKey, rawValue] of Object.entries(query ?? {})) {
      if (rawValue === undefined || rawValue === "") continue;
      const column = filters.includes(rawKey) ? rawKey : filterAliases[rawKey];
      if (!column || seen.has(column)) continue;
      seen.add(column);
      values.push(rawValue);
      clauses.push(`${column} = $${values.length}`);
    }
    return { clauses, values };
  };

  const checkFKs = async (body) => {
    for (const fk of fks) {
      const value = body?.[fk.column];
      if (value == null) continue;
      const hit = await pool.query(`SELECT 1 FROM ${fk.table} WHERE ${fk.pk} = $1`, [value]);
      if (hit.rows.length === 0) return fk.message;
    }
    return null;
  };

  const list = async (req, res, next) => {
    try {
      const { clauses, values } = buildWhere(req.query);
      if (dateRange) {
        const { column, desdeParam = "desde", hastaParam = "hasta" } = dateRange;
        const desde = req.query?.[desdeParam];
        const hasta = req.query?.[hastaParam];
        if (desde !== undefined && desde !== "") {
          if (Number.isNaN(new Date(desde).getTime())) {
            return res.status(400).json({ message: `El parámetro ${desdeParam} debe ser una fecha válida` });
          }
          values.push(desde);
          clauses.push(`${column} >= $${values.length}`);
        }
        if (hasta !== undefined && hasta !== "") {
          if (Number.isNaN(new Date(hasta).getTime())) {
            return res.status(400).json({ message: `El parámetro ${hastaParam} debe ser una fecha válida` });
          }
          values.push(hasta);
          clauses.push(`${column} <= $${values.length}`);
        }
      }
      for (const cf of customFilters) {
        const v = req.query?.[cf.param];
        if (v === undefined || v === "") continue;
        values.push(v);
        clauses.push(cf.clause(table, `$${values.length}`));
      }
      let limit = parseInt(req.query?.limit, 10);
      if (Number.isNaN(limit)) limit = PAGE_DEFAULT_LIMIT;
      limit = Math.min(Math.max(limit, 1), PAGE_MAX_LIMIT);
      let offset = parseInt(req.query?.offset, 10);
      if (Number.isNaN(offset) || offset < 0) offset = 0;
      values.push(limit, offset);
      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
      const { rows } = await pool.query(
        `SELECT * FROM ${table} ${where} ORDER BY ${pk} DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.status(200).json(rows);
    } catch (error) {
      next(error);
    }
  };

  const getById = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE ${pk} = $1`, [id]);
      if (rows.length === 0) return res.status(404).json({ message: label });
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  };

  const create = async (req, res, next) => {
    try {
      const fkError = await checkFKs(req.body);
      if (fkError) return res.status(409).json({ error: fkError });
      const cols = writable.filter((c) => req.body?.[c] !== undefined);
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
        cols.map((c) => req.body[c]),
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  };

  const update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
      const fkError = await checkFKs(req.body);
      if (fkError) return res.status(409).json({ error: fkError });
      const cols = writable.filter((c) => req.body?.[c] !== undefined);
      if (cols.length === 0) {
        const { rows } = await pool.query(`SELECT * FROM ${table} WHERE ${pk} = $1`, [id]);
        if (rows.length === 0) return res.status(404).json({ message: label });
        return res.json(rows[0]);
      }
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${cols.map((c, i) => `${c} = COALESCE($${i + 1}, ${c})`).join(", ")} WHERE ${pk} = $${cols.length + 1} RETURNING *`,
        [...cols.map((c) => req.body[c]), id],
      );
      if (rows.length === 0) return res.status(404).json({ message: label });
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  };

  const remove = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "ID debe ser numérico" });
      const exists = await pool.query(`SELECT 1 FROM ${table} WHERE ${pk} = $1`, [id]);
      if (exists.rows.length === 0) return res.status(404).json({ message: label });
      for (const guard of deleteGuards) {
        const hit = await pool.query(`SELECT 1 FROM ${guard.table} WHERE ${guard.fk} = $1 LIMIT 1`, [id]);
        if (hit.rows.length > 0) return res.status(409).json({ error: guard.message });
      }
      await pool.query(`DELETE FROM ${table} WHERE ${pk} = $1`, [id]);
      return res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  };

  return { list, getById, create, update, remove };
}
