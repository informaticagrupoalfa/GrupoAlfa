-- =============================================================================
-- 003_agregar_activo_cursos_capacitacion.sql
-- =============================================================================
-- Agrega la columna booleana 'activo' a cursos_capacitacion y la incluye en la
-- lógica de capacitaciones activas (fecha vigente + activo = true).
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

BEGIN;

ALTER TABLE cursos_capacitacion
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN cursos_capacitacion.activo
    IS 'Indica si el curso de capacitación está activo para uso en el sistema.';

COMMIT;
