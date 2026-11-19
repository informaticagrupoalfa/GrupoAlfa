import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function TemasView() {
  return (
    <section>
      <p className="muted">Temas asociados a una materia.</p>
      <CrudPanel key="temas" entity={ENTITIES.temas} />
    </section>
  )
}
