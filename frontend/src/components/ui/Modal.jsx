import PropTypes from "prop-types"

function ModalHeader({ children }) {
  return <div className="modal-header">{children}</div>
}

ModalHeader.propTypes = {
  children: PropTypes.node.isRequired,
}

function ModalBody({ children }) {
  return <div className="modal-body">{children}</div>
}

ModalBody.propTypes = {
  children: PropTypes.node.isRequired,
}

function ModalFooter({ children }) {
  return <div className="modal-actions">{children}</div>
}

ModalFooter.propTypes = {
  children: PropTypes.node.isRequired,
}

export default function Modal({ title, hint, onClose, children, placement = "center" }) {
  if (placement === "inline") {
    return (
      <div className="inline-form" role="region" aria-label={title}>
        <div className="inline-form-header">
          <button type="button" className="inline-form-title" onClick={onClose}>
            <h3>{title}</h3>
            <span className="inline-form-close" aria-hidden="true">
              ×
            </span>
          </button>
          {hint && <p className="muted inline-form-hint">{hint}</p>}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {(title || hint) && (
          <ModalHeader>
            {title && <h3>{title}</h3>}
            {hint && <p className="muted">{hint}</p>}
          </ModalHeader>
        )}
        {children}
      </div>
    </div>
  )
}

Modal.propTypes = {
  title: PropTypes.string,
  hint: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  placement: PropTypes.oneOf(["center", "inline"]),
}

Modal.Header = ModalHeader
Modal.Body = ModalBody
Modal.Footer = ModalFooter
