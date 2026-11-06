import { useAuth } from "../../hooks/useAuth"

export default function RoleSelector() {
  const { loggedUser, activeRole, switchRole } = useAuth()
  const roles = Array.isArray(loggedUser?.roles) ? loggedUser.roles : []

  if (roles.length <= 1) return null

  return (
    <div className="role-selector">
      <label className="role-label" htmlFor="active-role">
        Rol activo
      </label>
      <select
        id="active-role"
        className="role-select"
        value={activeRole ?? roles[0]}
        onChange={(e) => switchRole(e.target.value)}
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  )
}
