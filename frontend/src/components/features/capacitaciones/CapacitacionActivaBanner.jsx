import { useEffect, useState } from "react"
import { getCapacitacionesActivas } from "../../../services/academicService"

export default function CapacitacionActivaBanner() {
  const [capacitacionActiva, setCapacitacionActiva] = useState(null)

  useEffect(() => {
    let mounted = true
    getCapacitacionesActivas()
      .then((rows) => {
        if (mounted) setCapacitacionActiva(rows.length > 0 ? rows[0] : null)
      })
      .catch(() => {
        if (mounted) setCapacitacionActiva(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (!capacitacionActiva) return null

  return (
    <div className="curso-activo">
      <strong>Capacitación activa:</strong>{" "}
      {capacitacionActiva.nombre_facultad
        ? `${capacitacionActiva.nombre_facultad} - ${String(capacitacionActiva.fecha_inicio ?? "").slice(0, 10)}`
        : `Capacitación ${capacitacionActiva.id_capacitacion}`}
      &nbsp;|&nbsp;
      {String(capacitacionActiva.fecha_inicio ?? "").slice(0, 10)} &rarr;{" "}
      {capacitacionActiva.fecha_fin ? String(capacitacionActiva.fecha_fin).slice(0, 10) : "sin fecha fin"}
    </div>
  )
}
