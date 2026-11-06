--CONVENCIONES
--fk_<tabla_hija>_<tabla_padre>


-- =============================================================================
-- 002_renombrar_tablas_relacionales.sql
-- =============================================================================
-- Renombra tablas relacionales (junction / many-to-many) a nombres más
-- específicos que reflejen la relación entre entidades.
-- Ejemplo: asignacion_rol → usuario_rol
-- =============================================================================

BEGIN;

-- 1. asignacion_rol → usuario_rol
-- Relación entre usuarios y roles
ALTER TABLE IF EXISTS asignacion_rol
    RENAME TO usuario_rol;

-- 2. materias_asesores → materia_asesor
-- Relación entre materias y asesores
ALTER TABLE IF EXISTS materias_asesores
    RENAME TO materia_asesor;

-- 3. asignaciones_asesores → asesor_curso_capacitacion
-- Relación entre asesores y cursos de capacitación
ALTER TABLE IF EXISTS asignaciones_asesores
    RENAME TO asesor_curso_capacitacion;

-- 4. asignaciones_materias → materia_curso_capacitacion
-- Relación entre materias y cursos de capacitación
ALTER TABLE IF EXISTS asignaciones_materias
    RENAME TO materia_curso_capacitacion;

-- 5. materias_convocatoria_asignacion → convocatoria_materia
-- Relación entre convocatorias y materias
ALTER TABLE IF EXISTS materias_convocatoria_asignacion
    RENAME TO convocatoria_materia;

COMMIT;
