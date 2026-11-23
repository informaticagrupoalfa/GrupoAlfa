import PropTypes from "prop-types"

export default function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  maxLength,
  min,
  step,
  autoComplete,
  error,
}) {
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        min={min}
        step={step}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

TextField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  maxLength: PropTypes.number,
  min: PropTypes.string,
  step: PropTypes.string,
  autoComplete: PropTypes.string,
  error: PropTypes.string,
}
