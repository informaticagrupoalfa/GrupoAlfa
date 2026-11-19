import CapacitacionActivaBanner from "../../../components/features/capacitaciones/CapacitacionActivaBanner"
import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function ParalelosView() {
  return (
    <section>
      <CapacitacionActivaBanner />
      <p className="muted">Paralelos de una capacitación: aula, nivel, modalidad, horario y días.</p>
      <CrudPanel key="paralelos" entity={ENTITIES.paralelos} />
    </section>
  )
}
