import { useEffect, useState } from "react"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"
import { fetchDatabaseTables, fetchTableRows } from "../../services/dataExplorerService"

const PAGE_SIZE = 20

function formatCell(value) {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export default function DataExplorerPage() {
  const [tables, setTables] = useState([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState("")

  const [selected, setSelected] = useState("")
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function loadTables() {
      setTablesLoading(true)
      setTablesError("")
      try {
        const data = await fetchDatabaseTables()
        if (active) setTables(data)
      } catch (error) {
        if (active) {
          setTablesError(error.userMessage ?? "No se pudieron cargar las tablas de la base de datos.")
        }
      } finally {
        if (active) setTablesLoading(false)
      }
    }
    loadTables()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selected) return undefined
    let active = true
    async function loadRows() {
      setDataLoading(true)
      setDataError("")
      try {
        const data = await fetchTableRows(selected, page, PAGE_SIZE)
        if (!active) return
        setColumns(Array.isArray(data?.columnas) ? data.columnas : [])
        setRows(Array.isArray(data?.filas) ? data.filas : [])
        setTotal(Number(data?.total) || 0)
        setTotalPages(Math.max(1, Number(data?.totalPaginas) || 1))
      } catch (error) {
        if (!active) return
        setColumns([])
        setRows([])
        setTotal(0)
        setTotalPages(1)
        setDataError(error.userMessage ?? "No se pudieron cargar los registros de la tabla.")
      } finally {
        if (active) setDataLoading(false)
      }
    }
    loadRows()
    return () => {
      active = false
    }
  }, [selected, page, reloadKey])

  const handleSelect = (event) => {
    const next = event.target.value
    setSelected(next)
    setPage(1)
    setColumns([])
    setRows([])
    setTotal(0)
    setTotalPages(1)
    setDataError("")
    setDataLoading(Boolean(next))
  }

  return (
    <section className="data-explorer">
      <p className="muted">
        Selecciona una tabla para visualizar sus registros. La vista es de solo lectura y muestra{" "}
        {PAGE_SIZE} registros por página.
      </p>

      {tablesError ? (
        <ErrorFallback message={tablesError} onRetry={() => window.location.reload()} />
      ) : tablesLoading ? (
        <Skeleton lines={2} />
      ) : (
        <div className="data-explorer-toolbar">
          <label className="form-label" htmlFor="tabla-select">
            Tabla
          </label>
          <select id="tabla-select" value={selected} onChange={handleSelect}>
            <option value="">Selecciona una tabla…</option>
            {tables.map((tabla) => (
              <option key={tabla} value={tabla}>
                {tabla}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selected && !tablesLoading && !tablesError && (
        <p className="muted">Elige una tabla del listado para consultar sus primeros registros.</p>
      )}

      {selected && dataError && (
        <ErrorFallback message={dataError} onRetry={() => setReloadKey((value) => value + 1)} />
      )}

      {selected && !dataError && dataLoading && <Skeleton lines={6} />}

      {selected && !dataError && !dataLoading && (
        <>
          <div className="data-explorer-meta">
            <span>
              Tabla <strong>{selected}</strong>
            </span>
            <span>
              {total} registro{total === 1 ? "" : "s"} · Página {page} de {totalPages}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="muted">La tabla no tiene registros.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.name} className={column.isForeign ? "th-foreign" : "th-own"}>
                        {column.label ?? column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={`${page}-${rowIndex}`}>
                      {columns.map((column) => {
                        const text = formatCell(row[column.name])
                        return (
                          <td key={column.name} className={`data-cell${column.isForeign ? " td-foreign" : ""}`} title={text}>
                            {text}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="data-explorer-pagination">
            <button
              className="secondary-button small"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Anterior
            </button>
            <span className="muted">
              Página {page} de {totalPages}
            </span>
            <button
              className="secondary-button small"
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  )
}
