import { memo } from "react"
import PropTypes from "prop-types"
import { getDisplayName } from "../../config/entities"

function formatDate(value) {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const Row = memo(function Row({ row, columns, pk, onEdit, onDelete }) {  return (
    <tr>
      {columns.map((col) => (
        <td key={col.key} className={col.isForeign ? "td-foreign" : undefined}>
          {col.key === "nombre_completo"
            ? getDisplayName(row) || "—"
            : col.type === "date"
              ? formatDate(row[col.key])
              : row[col.key] ?? "—"}
        </td>
      ))}
      <td className="actions">
        <button type="button" className="link-button" onClick={() => onEdit(row)}>
          Editar
        </button>
        <button type="button" className="link-button danger" onClick={() => onDelete(row[pk])}>
          Eliminar
        </button>
      </td>
    </tr>
  )
})

Row.propTypes = {
  row: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  pk: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

export default function DataTable({ rows, columns, pk, onEdit, onDelete }) {
  if (rows.length === 0) return <p className="muted">Sin registros.</p>
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.isForeign ? "th-foreign" : undefined}>{col.label}</th>
            ))}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row[pk]} row={row} columns={columns} pk={pk} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

DataTable.propTypes = {
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  pk: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}
