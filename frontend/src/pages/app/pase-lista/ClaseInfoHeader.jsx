import PropTypes from "prop-types"
import BrandLogo from "../../../components/ui/BrandLogo"
import "./ClaseActualView.css"

export default function ClaseInfoHeader({ fields }) {
  return <div className="clase-actual-header">
    <div className="clase-actual-logo"><BrandLogo size={90} /></div>
    <div className="clase-actual-fields">
      {fields.map(([label, value]) => <div className="clase-actual-field" key={label}><span>{label}</span><strong>{value || "No registrado"}</strong></div>)}
    </div>
  </div>
}

ClaseInfoHeader.propTypes = { fields: PropTypes.arrayOf(PropTypes.array).isRequired }
