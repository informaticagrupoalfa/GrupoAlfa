import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function ConvocatoriasView() {
  return (
    <section>
      <p className="muted">Convocatorias de preuniversitario. Requieren facultad existente.</p>
      <CrudPanel key="convocatorias" entity={ENTITIES.convocatorias} />
    </section>
  )
}
