import { pool } from "../db.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const quoteIdentifier = (name) => `"${String(name).replace(/"/g, '""')}"`;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getTablas = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name ASC`,
    );
    res.status(200).json({ tablas: rows.map((row) => row.table_name) });
  } catch (error) {
    next(error);
  }
};

export const getTablaDatos = async (req, res, next) => {
  try {
    const tabla = String(req.params.tabla ?? "");

    const existe = await pool.query(
      `SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = $1`,
      [tabla],
    );
    if (existe.rows.length === 0) {
      return res.status(404).json({ message: "Tabla no encontrada" });
    }

    const { rows: columnRows } = await pool.query(
      `SELECT column_name, ordinal_position
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position ASC`,
      [tabla],
    );
    const nativeColumns = columnRows.map((row) => row.column_name);

    const { rows: foreignKeys } = await pool.query(
      `SELECT kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column,
              tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
         AND tc.table_name = $1
       ORDER BY tc.constraint_name, kcu.ordinal_position`,
      [tabla],
    );
    // Resolve one FK column per constraint; composite constraints are not joined incorrectly.
    const uniqueForeignKeys = foreignKeys.filter((key, index, all) =>
      all.findIndex((candidate) => candidate.constraint_name === key.constraint_name) === index
      && all.filter((candidate) => candidate.constraint_name === key.constraint_name).length === 1,
    );
    const joins = [];
    const selectExtras = [];
    const joinedColumns = [];
    for (const [index, fk] of uniqueForeignKeys.entries()) {
      const { rows: targetColumns } = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [fk.ref_table],
      );
      const available = new Set(targetColumns.map((column) => column.column_name));
      const identityColumns = [
        "nombre_completo", "nombre", "nombre_paralelo", "nombre_materia", "nombre_tema",
        "codigo", "nro_carnet", "correo_electronico", "fecha_inicio",
      ].filter((column) => available.has(column));
      const personNameColumns = ["nombre", "apellido_paterno", "apellido_materno"].filter((column) => available.has(column));
      const identityColumn = identityColumns[0] ?? targetColumns.find((column) => column.column_name !== fk.ref_column)?.column_name ?? fk.ref_column;
      const alias = `fk_${index}_identificativo`;
      const tableAlias = `fk_ref_${index}`;
      joins.push(
        `LEFT JOIN public.${quoteIdentifier(fk.ref_table)} ${tableAlias}
         ON ${tableAlias}.${quoteIdentifier(fk.ref_column)} = base.${quoteIdentifier(fk.column_name)}`,
      );
      const identityExpression = identityColumns.includes("nombre_completo")
        ? `${tableAlias}.${quoteIdentifier("nombre_completo")}`
        : personNameColumns.length > 1
          ? `NULLIF(CONCAT_WS(' ', ${personNameColumns.map((column) => `${tableAlias}.${quoteIdentifier(column)}`).join(", ")}), '')`
          : `${tableAlias}.${quoteIdentifier(identityColumn)}`;
      const identityLabel = identityColumns.includes("nombre_completo")
        ? "nombre_completo"
        : personNameColumns.length > 1
          ? personNameColumns.join(" + ")
          : identityColumn;
      selectExtras.push(`${identityExpression} AS ${quoteIdentifier(alias)}`);
      joinedColumns.push({ name: alias, label: `${fk.ref_table} (${identityLabel})`, isForeign: true, isJoined: true, refTable: fk.ref_table, sourceColumn: fk.column_name });
    }
    const foreignColumnNames = new Set(uniqueForeignKeys.map((key) => key.column_name));
    const columnas = [
      ...columnRows.map((column) => ({ name: column.column_name, isForeign: foreignColumnNames.has(column.column_name) })),
      ...joinedColumns,
    ];

    const { rows: pkRows } = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
         AND kcu.constraint_schema = tc.constraint_schema
         AND kcu.table_schema = tc.table_schema
         AND kcu.table_name = tc.table_name
       WHERE tc.table_schema = 'public'
         AND tc.table_name = $1
         AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position ASC
       LIMIT 1`,
      [tabla],
    );
    const orderColumn = pkRows[0]?.column_name ?? columnas[0];

    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const page = parsePositiveInt(req.query.page, 1);
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM public.${quoteIdentifier(tabla)}`,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const orderBy = orderColumn ? ` ORDER BY ${quoteIdentifier(orderColumn)} ASC` : "";
    const selections = nativeColumns.map((column) => `base.${quoteIdentifier(column)}`);
    selections.push(...selectExtras);
    const { rows } = await pool.query(
      `SELECT ${selections.join(", ")} FROM public.${quoteIdentifier(tabla)} base ${joins.join(" ")}${orderBy.replace(quoteIdentifier(orderColumn), `base.${quoteIdentifier(orderColumn)}`)} LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.status(200).json({
      tabla,
      columnas,
      filas: rows,
      total,
      pagina: page,
      limite: limit,
      totalPaginas: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
};
