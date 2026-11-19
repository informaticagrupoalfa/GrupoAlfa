import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function EstudiantesView() {
  return <CrudPanel key="estudiantes" entity={ENTITIES.estudiantes} />
}
