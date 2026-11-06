-- Migracion: agregar columna codigo a la tabla aulas
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);
