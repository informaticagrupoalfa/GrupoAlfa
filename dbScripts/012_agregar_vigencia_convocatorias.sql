-- =============================================================================
-- 012_agregar_vigencia_convocatorias.sql
-- =============================================================================
-- Agrega la columna booleana 'vigencia' a convocatorias_preuniversitario.
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

BEGIN;

ALTER TABLE convocatorias_preuniversitario
    ADD COLUMN IF NOT EXISTS vigencia BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN convocatorias_preuniversitario.vigencia
    IS 'Indica si la convocatoria se encuentra vigente.';

COMMIT;
