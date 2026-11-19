import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function AsesoresView() {
  return <CrudPanel key="asesores" entity={ENTITIES.asesores} />
}
