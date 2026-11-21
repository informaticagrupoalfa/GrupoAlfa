import assert from "node:assert/strict";
import { test } from "node:test";
import { createClaseAdministracionSchema, createClaseSchema } from "../src/validators/clasesValidators.js";

test("Administración puede crear una clase indicando paralelo y materia, sin asesor", () => {
  const clase = { id_paralelo: 3, id_materia: 8, inicioclase: "2026-11-20" };
  assert.equal(createClaseAdministracionSchema.safeParse(clase).success, true);
  assert.equal(createClaseSchema.safeParse(clase).success, false);
});

test("Administración también puede usar la asignación directa", () => {
  const clase = { id_asesor_paralelo_materia: 15, inicioclase: "2026-11-20" };
  assert.equal(createClaseAdministracionSchema.safeParse(clase).success, true);
});

test("Administración aún debe indicar asignación o paralelo y materia, y una fecha válida", () => {
  assert.equal(createClaseAdministracionSchema.safeParse({ inicioclase: "2026-11-20" }).success, false);
  assert.equal(createClaseAdministracionSchema.safeParse({ id_paralelo: 3, inicioclase: "2026-11-20" }).success, false);
  assert.equal(createClaseAdministracionSchema.safeParse({ id_paralelo: 3, id_materia: 8, inicioclase: "fecha inválida" }).success, false);
});
