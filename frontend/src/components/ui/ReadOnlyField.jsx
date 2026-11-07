import PropTypes from "prop-types"

export default function ReadOnlyField({ id, label, value, placeholder = "—" }) {
  return (
    <div className="form-row readonly-field">
      <span className="readonly-label" id={id ? `${id}-label` : undefined}>{label}</span>
      <div
        className="readonly-value"
        id={id}
        aria-labelledby={id ? `${id}-label` : undefined}
      >
        {value === "" || value == null ? placeholder : value}
      </div>
    </div>
  )
}

ReadOnlyField.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  placeholder: PropTypes.string,
}
