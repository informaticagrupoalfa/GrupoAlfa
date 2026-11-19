import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function FacultadesView() {
  return (
    <section>
      <p className="muted">Facultades a las que pertenecen carreras y convocatorias.</p>
      <CrudPanel key="facultades" entity={ENTITIES.facultades} />
    </section>
  )
}
