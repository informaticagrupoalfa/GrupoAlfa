import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react"
import { useCrud } from "../../hooks/useCrud"
import { ENTITIES } from "../../config/entities"
import DataTable from "../../components/dashboard/DataTable"
import Skeleton from "../../components/ui/Skeleton"
import ErrorFallback from "../../components/ui/ErrorFallback"
import {
  ROLE_KEYS,
  ROLE_LABELS,
  createRoles,
  fetchRoleMap,
  getUserRoles,
  syncRoles,
} from "../../services/rolesService"
import { fetchRoleCatalog, updateUsuarioRoles } from "../../services/usersService"

const UsuarioFormModal = lazy(() => import("../../components/features/usuarios/UsuarioFormModal"))

const PAGE_SIZE = 25
const entity = ENTITIES.usuarios

function toIdApoderado(value) {
  if (value === "" || value == null) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

async function persistSystemRoles(idUsuario, roles) {
  try {
    await updateUsuarioRoles(idUsuario, roles)
    return ""
  } catch (error) {
    return (
      error?.userMessage ??
      error?.response?.data?.error ??
      "No se pudieron guardar los roles de acceso."
    )
  }
}

export default function UsuariosPage() {
  const { items, isLoading, error, selected, setSelected, reload, save, remove } = useCrud(entity)
  const [roleMap, setRoleMap] = useState(null)
  const [roleCatalog, setRoleCatalog] = useState([])
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [rolesNotice, setRolesNotice] = useState("")

  const refreshRoles = useCallback(async () => {
    try {
      setRoleMap(await fetchRoleMap())
    } catch {
      setRoleMap(null)
    }
    try {
      setRoleCatalog(await fetchRoleCatalog())
    } catch {
      setRoleCatalog([])
    }
  }, [])

  useEffect(() => {
    refreshRoles()
  }, [refreshRoles])

  const rows = useMemo(
    () =>
      items.map((row) => ({
        ...row,
        vigente: row.usuario_vigente ? "Sí" : "No",
        rol: Array.isArray(row.roles) && row.roles.length > 0 ? row.roles.join(", ") : "—",
      })),
    [items],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      entity.columns.some((col) => String(row[col.key] ?? "").toLowerCase().includes(term)),
    )
  }, [rows, search])

  const visible = useMemo(() => filtered.slice(0, PAGE_SIZE), [filtered])

  const openCreate = useCallback(() => {
    setSelected(null)
    setFormError("")
    setRolesNotice("")
    setModalOpen(true)
  }, [setSelected])

  const openEdit = useCallback(
    (row) => {
      setSelected(row)
      setFormError("")
      setRolesNotice("")
      setModalOpen(true)
    },
    [setSelected],
  )

  const currentRoles = useMemo(() => {
    const base = { asesores: false, administrativos: false, apoderados: false, estudiantes: false }
    if (selected?.id_usuario == null) return base
    for (const role of getUserRoles(selected.id_usuario, roleMap)) base[role] = true
    return base
  }, [selected, roleMap])

  const currentSystemRoles = useMemo(
    () => (Array.isArray(selected?.roles) ? selected.roles : []),
    [selected],
  )
  const isCreating = modalOpen && selected?.id_usuario == null

  const currentRoleFields = useMemo(() => {
    const fields = {
      estudiantes: { id_apoderado: "", colegio_de_procedencia: "", direccion_de_domicilio: "" },
      apoderados: { celular: "" },
    }
    if (selected?.id_usuario == null || !roleMap) return fields
    const id = Number(selected.id_usuario)
    const est = roleMap.estudiantes?.get(id)
    if (est) {
      fields.estudiantes = {
        id_apoderado: est.id_apoderado ?? "",
        colegio_de_procedencia: est.colegio_de_procedencia ?? "",
        direccion_de_domicilio: est.direccion_de_domicilio ?? "",
      }
    }
    const apo = roleMap.apoderados?.get(id)
    if (apo) fields.apoderados = { celular: apo.celular ?? "" }
    return fields
  }, [selected, roleMap])

  const buildUsuarioPayload = (values) => {
    const payload = {
      nro_carnet: Number(values.nro_carnet),
      apellido_paterno: String(values.apellido_paterno).trim(),
      apellido_materno: String(values.apellido_materno).trim(),
      nombre: String(values.nombre).trim(),
      fecha_nacimiento: values.fecha_nacimiento,
      correo_electronico: String(values.correo_electronico).trim(),
      usuario_vigente: Boolean(values.usuario_vigente),
    }
    if (values.contraseña) payload.contraseña = values.contraseña
    return payload
  }

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("¿Eliminar este usuario? También se eliminarán sus roles asociados.")) return
      try {
        await remove(id)
        await refreshRoles()
      } catch (err) {
        alert(err.userMessage ?? "No se pudo eliminar.")
      }
    },
    [remove, refreshRoles],
  )

  const handleSubmit = useCallback(
    async ({ values, roles, roleFields, systemRoles = [] }) => {
      setSaving(true)
      setFormError("")
      setRolesNotice("")
      try {
        const isCreate = selected?.id_usuario == null
        const payload = buildUsuarioPayload(values)

        if (isCreate) {
          const res = await save(payload)
          const createdId = res?.datos?.id_usuario ?? res?.id_usuario
          let idUsuario = createdId
          if (idUsuario == null) {
            const fresh = await reload()
            idUsuario = fresh.find((row) => Number(row.nro_carnet) === Number(values.nro_carnet))?.id_usuario
          }
          if (idUsuario == null) {
            setFormError("El usuario se creó pero no se pudo obtener su ID para asignar roles.")
            return
          }
          const roleErrors = await createRoles(idUsuario, roles, {
            estudiantes: {
              ...roleFields.estudiantes,
              id_apoderado: toIdApoderado(roleFields.estudiantes.id_apoderado),
            },
            apoderados: roleFields.apoderados,
          })
          const systemRolesError = await persistSystemRoles(idUsuario, systemRoles)
          setModalOpen(false)
          setSelected(null)
          await reload()
          await refreshRoles()
          if (roleErrors.length > 0 || systemRolesError) {
            const detail = [
              ...roleErrors.map((e) => `${ROLE_LABELS[e.role]} (${e.message})`),
              ...(systemRolesError ? [systemRolesError] : []),
            ].join("; ")
            setRolesNotice(
              `Usuario creado, pero hubo problemas con sus roles: ${detail}. Puedes reintentarlo editando el usuario.`,
            )
          }
          return
        }

        const removals = ROLE_KEYS.filter(
          (role) => currentRoles[role] && !roles[role],
        )
        if (removals.length > 0) {
          const names = removals.map((role) => ROLE_LABELS[role]).join(", ")
          const ok = window.confirm(
            `Se quitará definitivamente el rol: ${names}. Esta acción no se puede deshacer. ¿Continuar?`,
          )
          if (!ok) return
        }
        await save(payload)
        const roleErrors = await syncRoles(selected.id_usuario, roles, {
          estudiantes: {
            ...roleFields.estudiantes,
            id_apoderado: toIdApoderado(roleFields.estudiantes.id_apoderado),
          },
          apoderados: roleFields.apoderados,
        }, roleMap)
        const systemRolesError = await persistSystemRoles(selected.id_usuario, systemRoles)
        setModalOpen(false)
        setSelected(null)
        await reload()
        await refreshRoles()
        if (roleErrors.length > 0 || systemRolesError) {
          const detail = [
            ...roleErrors.map((e) => `${ROLE_LABELS[e.role]} (${e.message})`),
            ...(systemRolesError ? [systemRolesError] : []),
          ].join("; ")
          setRolesNotice(
            `Usuario actualizado, pero hubo problemas con roles: ${detail}`,
          )
        }
      } catch (err) {
        setFormError(err.userMessage ?? err?.response?.data?.error ?? "No se pudo guardar.")
      } finally {
        setSaving(false)
      }
    },
    [selected, save, reload, refreshRoles, setSelected, currentRoles, roleMap],
  )

  if (isLoading) return <Skeleton lines={6} />
  if (error) {
    return <ErrorFallback message={error} onRetry={() => reload()} />
  }

  return (
    <section>
      {rolesNotice && (
        <p className="warning-message" role="alert">
          {rolesNotice}{" "}
          <button type="button" className="link-button" onClick={() => setRolesNotice("")}>
            Cerrar
          </button>
        </p>
      )}
      <div className="crud-toolbar usuarios-toolbar">
        <input
          type="search"
          placeholder="Buscar en Usuarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar"
        />
        <label
          className={isCreating ? "create-toggle is-active" : "create-toggle"}
          htmlFor="nuevo-usuario-toggle"
        >
          <span className="create-toggle-label">Nuevo usuario</span>
          <input
            id="nuevo-usuario-toggle"
            type="checkbox"
            role="switch"
            checked={isCreating}
            onChange={(event) => {
              if (event.target.checked) openCreate()
              else setModalOpen(false)
            }}
          />
          <span className="create-toggle-track" aria-hidden="true" />
        </label>
      </div>
      {isCreating && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <UsuarioFormModal
            key={selected?.id_usuario ?? "new"}
            initial={selected}
            initialRoles={currentRoles}
            initialRoleFields={currentRoleFields}
            roleCatalog={roleCatalog}
            initialSystemRoles={currentSystemRoles}
            saving={saving}
            formError={formError}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </Suspense>
      )}
      <p className="muted">
        {filtered.length} registro(s){filtered.length > PAGE_SIZE ? ` (mostrando ${PAGE_SIZE})` : ""}
      </p>
      <DataTable rows={visible} columns={entity.columns} pk={entity.pk} onEdit={openEdit} onDelete={handleDelete} />
      {modalOpen && selected && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <UsuarioFormModal
            key={selected?.id_usuario ?? "new"}
            initial={selected}
            initialRoles={currentRoles}
            initialRoleFields={currentRoleFields}
            roleCatalog={roleCatalog}
            initialSystemRoles={currentSystemRoles}
            saving={saving}
            formError={formError}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </Suspense>
      )}
    </section>
  )
}
