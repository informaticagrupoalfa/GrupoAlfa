import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function AulasView() {
  return (
    <section>
      <p className="muted">Aulas donde se dictan los paralelos.</p>
      <CrudPanel key="aulas" entity={ENTITIES.aulas} />
    </section>
  )
}
