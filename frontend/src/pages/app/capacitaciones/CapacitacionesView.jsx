import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function CapacitacionesView() {
  return (
    <section>
      <p className="muted">Capacitaciones asociadas a una convocatoria y a un rango de fechas.</p>
      <CrudPanel key="capacitaciones" entity={ENTITIES.capacitaciones} />
    </section>
  )
}
