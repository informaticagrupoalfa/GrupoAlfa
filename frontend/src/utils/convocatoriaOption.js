export function formatConvocatoriaOption(convocatoria) {
  const id = convocatoria?.id_convocatoria ?? "Sin ID"
  const nombre = String(convocatoria?.nombre_facultad ?? "Sin facultad").slice(0, 10)
  const fechaInicio = String(convocatoria?.fecha_inicio ?? "").slice(0, 10) || "Sin fecha"

  return `${id} - ${nombre} - ${fechaInicio}`
}
