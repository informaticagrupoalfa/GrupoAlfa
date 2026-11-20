import assert from "node:assert/strict"
import { test } from "node:test"
import { parseStudentQr, partitionRoster } from "../src/pages/app/pase-lista/llamarListaUtils.js"

test("el QR de estudiante identifica su ID y rechaza otros contenidos", () => {
  assert.equal(parseStudentQr(" 42 "), "42")
  assert.equal(parseStudentQr("estudiante:42"), null)
  assert.equal(parseStudentQr("0"), null)
})

test("una asistencia guardada pasa al estudiante de pendientes a registrados", () => {
  const roster = [{ id_estudiante: 42, nombre: "Ana" }, { id_estudiante: 43, nombre: "Luis" }]
  const attendances = [{ id_estudiante: 42, permiso: null, razon_permiso: null }]
  const result = partitionRoster(roster, attendances)
  assert.deepEqual(result.pending.map((item) => item.id_estudiante), [43])
  assert.deepEqual(result.registered.map((item) => item.id_estudiante), [42])
  assert.equal(result.registeredIds.has("42"), true)
})
