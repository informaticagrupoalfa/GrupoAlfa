import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import PropTypes from "prop-types"
import "./FloatingAlert.css"

export default function FloatingAlert({ title, onClose, children, className = "" }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return createPortal(
    <div className="floating-alert-backdrop">
      <section
        className={["floating-alert-dialog", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="floating-alert-header">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeRef} type="button" className="floating-alert-close" aria-label="Cerrar aviso" onClick={onClose}>×</button>
        </div>
        <div className="floating-alert-content">{children}</div>
      </section>
    </div>,
    document.body,
  )
}

FloatingAlert.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
}
