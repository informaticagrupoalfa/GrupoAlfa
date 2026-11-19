import CapacitacionActivaBanner from "../../../components/features/capacitaciones/CapacitacionActivaBanner"
import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function MateriasView() {
  return (
    <section>
      <CapacitacionActivaBanner />
      <p className="muted">Materias que conforman las capacitaciones.</p>
      <CrudPanel key="materias" entity={ENTITIES.materias} defaultParams={{ activas: "true" }} />
    </section>
  )
}
