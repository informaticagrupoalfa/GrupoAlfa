import PropTypes from "prop-types"
import BrandLogo from "../../ui/BrandLogo"
import TextField from "../../ui/TextField"
import Button from "../../ui/Button"

export default function LoginForm({
  email,
  password,
  error,
  serverError,
  disabled,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoRegister,
  onPreloadRegister,
}) {
  return (
    <section className="login-card">
      <BrandLogo size={72} />
      <p className="eyebrow">Grupo Alfa</p>
      <h1>Bienvenido de nuevo</h1>
      <p className="intro">Ingresa tus datos para continuar.</p>

      <form onSubmit={onSubmit}>
        <TextField
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={onEmailChange}
          placeholder="tu-correo@ejemplo.com"
          autoComplete="email"
          required
        />
        <TextField
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={onPasswordChange}
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          required
        />

        {(error || serverError) && (
          <p className="error-message" role="alert">
            {error || serverError}
          </p>
        )}

        <Button type="submit" disabled={disabled}>
          {disabled ? "Verificando..." : "Iniciar sesión"}
        </Button>
        <button
          className="link-button center"
          type="button"
          hidden
          onClick={onGoRegister}
          onMouseEnter={onPreloadRegister}
          onFocus={onPreloadRegister}
        >
          ¿No tienes cuenta? Regístrate
        </button>
      </form>
    </section>
  )
}

LoginForm.propTypes = {
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  error: PropTypes.string.isRequired,
  serverError: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onGoRegister: PropTypes.func.isRequired,
  onPreloadRegister: PropTypes.func.isRequired,
}
