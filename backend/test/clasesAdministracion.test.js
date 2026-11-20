import assert from "node:assert/strict";
import { test } from "node:test";
import { createClaseAdministracionSchema, createClaseSchema } from "../src/validators/clasesValidators.js";

test("Administración puede crear una clase sin asesor, tema ni asistencias", () => {
  const clase = { id_paralelo: 3, inicioclase: "2026-11-20" };
  assert.equal(createClaseAdministracionSchema.safeParse(clase).success, true);
  assert.equal(createClaseSchema.safeParse(clase).success, false);
});

test("Administración aún debe indicar paralelo o asignación y una fecha válida", () => {
  assert.equal(createClaseAdministracionSchema.safeParse({ inicioclase: "2026-11-20" }).success, false);
  assert.equal(createClaseAdministracionSchema.safeParse({ id_paralelo: 3, inicioclase: "fecha inválida" }).success, false);
});
