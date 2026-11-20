export function parseStudentQr(raw) {
  const value = String(raw).trim()
  return /^[1-9]\d*$/.test(value) ? value : null
}

export function partitionRoster(roster, attendances) {
  const attendanceByStudent = new Map(attendances.map((item) => [String(item.id_estudiante), item]))
  return {
    pending: roster.filter((item) => !attendanceByStudent.has(String(item.id_estudiante))),
    registered: roster.filter((item) => attendanceByStudent.has(String(item.id_estudiante))).map((item) => {
      const attendance = attendanceByStudent.get(String(item.id_estudiante))
      return { ...item, permiso: attendance.permiso, razon_permiso: attendance.razon_permiso }
    }),
    registeredIds: new Set(attendanceByStudent.keys()),
  }
}
