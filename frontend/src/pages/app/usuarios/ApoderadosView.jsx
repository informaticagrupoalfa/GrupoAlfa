import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function ApoderadosView() {
  return <CrudPanel key="apoderados" entity={ENTITIES.apoderados} />
}
