import CrudPanel from "../../../components/dashboard/CrudPanel"
import { ENTITIES } from "../../../config/entities"

export default function AdministrativosView() {
  return <CrudPanel key="administrativos" entity={ENTITIES.administrativos} />
}
