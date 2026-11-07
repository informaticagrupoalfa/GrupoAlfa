-- Limpiar la tabla de facultades e insertar registros base
DELETE FROM facultades;

INSERT INTO facultades (nombre) VALUES
  ('Ciencias Económicas y Financieras'),
  ('Ingeniería'),
  ('Ciencias Farmacéuticas y Bioquímicas'),
  ('Medicina, Enfermería, Nutrición y Tecnología Médica'),
  ('Odontología');
