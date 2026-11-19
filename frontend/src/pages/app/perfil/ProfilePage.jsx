import { useState } from "react"
import { Link } from "react-router-dom"
import PropTypes from "prop-types"
import { useAuth } from "../../../hooks/useAuth"
import { fetchCurrentUser } from "../../../services/usersService"
import { getDefaultAppPath } from "../../../config/permissions"

const DATE_FORMATTER = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

function formatDate(value) {
  if (!value) return "No registrada"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No registrada"
  return DATE_FORMATTER.format(date)
}

function buildFullName(user) {
  const parts = [user?.nombre, user?.apellido_paterno, user?.apellido_materno]
    .map((part) => (part ? String(part).trim() : ""))
    .filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "Usuario"
}

function getInitials(user) {
  const initials = [user?.nombre, user?.apellido_paterno]
    .map((part) => (part ? String(part).trim().charAt(0) : ""))
    .filter(Boolean)
    .join("")
  return initials ? initials.toUpperCase() : "US"
}

function InfoRow({ label, value }) {
  return (
    <div className="profile-row">
      <span className="profile-row-label">{label}</span>
      <span className="profile-row-value">{value}</span>
    </div>
  )
}

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

export default function ProfilePage() {
  const { loggedUser, signIn } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const roles = Array.isArray(loggedUser?.roles) ? loggedUser.roles : []
  const vigente = loggedUser?.usuario_vigente !== false
  const defaultPath = getDefaultAppPath(loggedUser)

  const handleRefresh = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const user = await fetchCurrentUser()
      if (user) signIn(user)
      setMessage("Datos del perfil actualizados.")
    } catch {
      setError("No se pudo actualizar la información del perfil. Intenta nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-card">
        <div className="profile-summary">
          <div className="profile-avatar" aria-hidden="true">
            {getInitials(loggedUser)}
          </div>
          <div className="profile-summary-text">
            <h2>{buildFullName(loggedUser)}</h2>
            <p className="muted">{loggedUser?.correo_electronico ?? "Sin correo registrado"}</p>
            <span className={vigente ? "profile-badge active" : "profile-badge"}>
              {vigente ? "Usuario vigente" : "Usuario inactivo"}
            </span>
          </div>
        </div>

        <div className="profile-details">
          <h3>Información personal</h3>
          <div className="profile-grid">
            <InfoRow label="Nombre" value={loggedUser?.nombre || "No registrado"} />
            <InfoRow
              label="Apellido paterno"
              value={loggedUser?.apellido_paterno || "No registrado"}
            />
            <InfoRow
              label="Apellido materno"
              value={loggedUser?.apellido_materno || "No registrado"}
            />
            <InfoRow label="Nro. de carnet" value={loggedUser?.nro_carnet ?? "No registrado"} />
            <InfoRow
              label="Fecha de nacimiento"
              value={formatDate(loggedUser?.fecha_nacimiento)}
            />
            <InfoRow
              label="Correo electrónico"
              value={loggedUser?.correo_electronico || "No registrado"}
            />
            <InfoRow
              label="Estado"
              value={vigente ? "Vigente" : "Inactivo"}
            />
            <InfoRow label="ID de usuario" value={loggedUser?.id_usuario ?? "—"} />
          </div>
        </div>

        <div className="profile-details">
          <h3>Roles de acceso</h3>
          {roles.length > 0 ? (
            <div className="profile-roles">
              {roles.map((role) => (
                <span key={role} className="profile-role-chip">
                  {role}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">
              Tu usuario no tiene roles asignados. Solicita acceso a un administrador.
            </p>
          )}
        </div>

        {message && <p className="profile-success" role="status">{message}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}

        <div className="profile-actions">
          {defaultPath !== "/app/sin-acceso" && (
            <Link className="profile-back-link" to={defaultPath}>
              Volver al inicio
            </Link>
          )}
          <button
            className="secondary-button small"
            type="button"
            onClick={handleRefresh}
            disabled={saving}
          >
            {saving ? "Actualizando..." : "Actualizar datos"}
          </button>
        </div>
      </div>
    </section>
  )
}
