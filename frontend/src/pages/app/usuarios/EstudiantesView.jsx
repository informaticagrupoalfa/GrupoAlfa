import { useCallback, useState } from "react"
import CrudPanel from "../../../components/dashboard/CrudPanel"
import StudentAttendanceCalendar from "../../../components/features/estudiantes/StudentAttendanceCalendar"
import { ENTITIES } from "../../../config/entities"

export default function EstudiantesView() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const selectStudent = useCallback((student) => setSelectedStudent(student), [])

  return (
    <>
      <CrudPanel key="estudiantes" entity={ENTITIES.estudiantes} onRecordSelect={selectStudent} />
      <StudentAttendanceCalendar student={selectedStudent} />
    </>
  )
}
