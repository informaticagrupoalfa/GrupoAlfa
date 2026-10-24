import { useEffect, useState } from "react"
import PropTypes from "prop-types"
import Modal from "../../ui/Modal"
import TextField from "../../ui/TextField"
import Button from "../../ui/Button"
import { ROLE_KEYS, ROLE_LABELS } from "../../../services/rolesService"

const EMAIL_RE = /^\S+@\S+\.\S+$/

function emptyRoleFields() {
  return {
    estudiantes: { id_apoderado: "", colegio_de_procedencia: "", direccion_de_domicilio: "" },
    apoderados: { celular: "" },
  }
}

export default function UsuarioFormModal({
  initial,
  initialRoles,
  initialRoleFields,
  roleCatalog = [],
  initialSystemRoles = [],
  saving,
  formError,
  onClose,
  onSubmit,
}) {
  const isCreate = initial?.id_usuario == null
  const [values, setValues] = useState(() => ({
    nro_carnet: initial?.nro_carnet ?? "",
    apellido_paterno: initial?.apellido_paterno ?? "",
    apellido_materno: initial?.apellido_materno ?? "",
    nombre: initial?.nombre ?? "",
    fecha_nacimiento: initial?.fecha_nacimiento ? String(initial.fecha_nacimiento).slice(0, 10) : "",
    correo_electronico: initial?.correo_electronico ?? "",
    contraseña: "",
    usuario_vigente: initial?.usuario_vigente ?? true,
  }))
  const [roles, setRoles] = useState(() => ({
    asesores: false,
    administrativos: false,
    apoderados: false,
    estudiantes: false,
    ...(initialRoles ?? {}),
  }))
  const [roleFields, setRoleFields] = useState(() => ({
    ...emptyRoleFields(),
    ...(initialRoleFields ?? {}),
    estudiantes: { ...emptyRoleFields().estudiantes, ...(initialRoleFields?.estudiantes ?? {}) },
    apoderados: { ...emptyRoleFields().apoderados, ...(initialRoleFields?.apoderados ?? {}) },
  }))
  const [systemRoles, setSystemRoles] = useState(() =>
    Array.isArray(initialSystemRoles) ? initialSystemRoles : [],
  )
  const [localError, setLocalError] = useState("")

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }))

  const toggleRole = (role) => setRoles((prev) => ({ ...prev, [role]: !prev[role] }))

  const toggleSystemRole = (roleName) =>
    setSystemRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((name) => name !== roleName)
        : [...prev, roleName],
    )

  const setRoleField = (role, name, value) =>
    setRoleFields((prev) => ({ ...prev, [role]: { ...prev[role], [name]: value } }))

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError("")

    const required = [
      ["nro_carnet", "Nro de carnet"],
      ["apellido_paterno", "Apellido paterno"],
      ["apellido_materno", "Apellido materno"],
      ["nombre", "Nombre"],
      ["fecha_nacimiento", "Fecha de nacimiento"],
      ["correo_electronico", "Correo electrónico"],
    ]
    if (isCreate) required.push(["contraseña", "Contraseña"])
    for (const [name, label] of required) {
      if (values[name] === "" || values[name] == null) {
        setLocalError(`El campo "${label}" es obligatorio.`)
        return
      }
    }
    if (!EMAIL_RE.test(String(values.correo_electronico).trim())) {
      setLocalError("Debe ingresar un correo electrónico válido.")
      return
    }
    if (Number.isNaN(new Date(values.fecha_nacimiento).getTime())) {
      setLocalError("La fecha de nacimiento debe ser una fecha válida.")
      return
    }
    if (values.contraseña && String(values.contraseña).length < 8) {
      setLocalError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (roles.apoderados && roleFields.apoderados.celular && roleFields.apoderados.celular.length > 20) {
      setLocalError("El celular del apoderado debe tener máximo 20 caracteres.")
      return
    }
    if (roles.estudiantes) {
      const est = roleFields.estudiantes
      if (est.colegio_de_procedencia && est.colegio_de_procedencia.length > 150) {
        setLocalError("El colegio debe tener máximo 150 caracteres.")
        return
      }
      if (est.direccion_de_domicilio && est.direccion_de_domicilio.length > 255) {
        setLocalError("La dirección debe tener máximo 255 caracteres.")
        return
      }
    }
    onSubmit({ values, roles, roleFields, systemRoles })
  }

  return (
    <Modal
      title={isCreate ? "Nuevo Usuario" : "Editar Usuario"}
      hint="Los roles de acceso definen qué pantallas y APIs puede usar el usuario. Los perfiles agregan datos específicos."
      onClose={onClose}
      placement={isCreate ? "inline" : "center"}
    >
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <TextField
            id="u-nro_carnet"
            label="Nro de carnet"
            type="number"
            value={values.nro_carnet}
            onChange={(event) => set("nro_carnet", event.target.value)}
            required
          />
          <TextField
            id="u-nombre"
            label="Nombre"
            value={values.nombre}
            onChange={(event) => set("nombre", event.target.value)}
            maxLength={100}
            required
          />
          <TextField
            id="u-apellido_paterno"
            label="Apellido paterno"
            value={values.apellido_paterno}
            onChange={(event) => set("apellido_paterno", event.target.value)}
            maxLength={100}
            required
          />
          <TextField
            id="u-apellido_materno"
            label="Apellido materno"
            value={values.apellido_materno}
            onChange={(event) => set("apellido_materno", event.target.value)}
            maxLength={100}
            required
          />
          <TextField
            id="u-fecha_nacimiento"
            label="Fecha de nacimiento"
            type="date"
            value={values.fecha_nacimiento}
            onChange={(event) => set("fecha_nacimiento", event.target.value)}
            required
          />
          <TextField
            id="u-correo_electronico"
            label="Correo electrónico"
            type="email"
            value={values.correo_electronico}
            onChange={(event) => set("correo_electronico", event.target.value)}
            maxLength={150}
            autoComplete="email"
            required
          />
          <TextField
            id="u-contraseña"
            label={isCreate ? "Contraseña" : "Contraseña (vacía = no cambia)"}
            type="password"
            value={values.contraseña}
            onChange={(event) => set("contraseña", event.target.value)}
            autoComplete="new-password"
            required={isCreate}
          />
          <div className="form-row form-row-inline">
            <input
              id="u-vigente"
              type="checkbox"
              checked={Boolean(values.usuario_vigente)}
              onChange={(event) => set("usuario_vigente", event.target.checked)}
            />
            <label htmlFor="u-vigente">Usuario vigente</label>
          </div>

          <div className="form-row">
            <span className="form-label" id="system-roles-label">Roles de acceso</span>
            <div className="toggle-group" role="group" aria-labelledby="system-roles-label">
              {roleCatalog.map((role) => (
                <button
                  key={role.id_rol ?? role.nombre}
                  type="button"
                  className={systemRoles.includes(role.nombre) ? "toggle-chip active" : "toggle-chip"}
                  aria-pressed={systemRoles.includes(role.nombre)}
                  onClick={() => toggleSystemRole(role.nombre)}
                >
                  {role.nombre}
                </button>
              ))}
            </div>
            <p className="muted">
              SysAdmin, Rooter y Gerencia administran usuarios. Cajero y Administración acceden a la operación académica.
            </p>
          </div>

          <div className="form-row">
            <span className="form-label" id="roles-label">Perfiles</span>
            <div className="toggle-group" role="group" aria-labelledby="roles-label">
              {ROLE_KEYS.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={roles[role] ? "toggle-chip active" : "toggle-chip"}
                  aria-pressed={Boolean(roles[role])}
                  onClick={() => toggleRole(role)}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          {roles.apoderados && (
            <div className="role-fields">
              <p className="muted">Datos de apoderado</p>
              <TextField
                id="u-apoderado-celular"
                label="Celular (opcional)"
                value={roleFields.apoderados.celular}
                onChange={(event) => setRoleField("apoderados", "celular", event.target.value)}
                maxLength={20}
              />
            </div>
          )}

          {roles.estudiantes && (
            <div className="role-fields">
              <p className="muted">Datos de estudiante</p>
              <TextField
                id="u-estudiante-apoderado"
                label="ID apoderado (opcional)"
                type="number"
                value={roleFields.estudiantes.id_apoderado}
                onChange={(event) => setRoleField("estudiantes", "id_apoderado", event.target.value)}
              />
              <TextField
                id="u-estudiante-colegio"
                label="Colegio de procedencia (opcional)"
                value={roleFields.estudiantes.colegio_de_procedencia}
                onChange={(event) => setRoleField("estudiantes", "colegio_de_procedencia", event.target.value)}
                maxLength={150}
              />
              <TextField
                id="u-estudiante-direccion"
                label="Dirección de domicilio (opcional)"
                value={roleFields.estudiantes.direccion_de_domicilio}
                onChange={(event) => setRoleField("estudiantes", "direccion_de_domicilio", event.target.value)}
                maxLength={255}
              />
            </div>
          )}

          {(localError || formError) && (
            <p className="error-message" role="alert">{localError || formError}</p>
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Body>
    </Modal>
  )
}

UsuarioFormModal.propTypes = {
  initial: PropTypes.object,
  initialRoles: PropTypes.object,
  initialRoleFields: PropTypes.object,
  roleCatalog: PropTypes.arrayOf(PropTypes.object),
  initialSystemRoles: PropTypes.arrayOf(PropTypes.string),
  saving: PropTypes.bool.isRequired,
  formError: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}
