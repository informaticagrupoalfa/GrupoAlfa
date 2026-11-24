export function capacitacionVigente(capacitacion, hoy) {
  const inicio = String(capacitacion?.fecha_inicio ?? "").slice(0, 10)
  const fin = String(capacitacion?.fecha_fin ?? "").slice(0, 10)
  return capacitacion?.activo === true && Boolean(inicio && fin && inicio <= hoy && hoy <= fin)
}
