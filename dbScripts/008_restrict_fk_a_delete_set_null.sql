-- =============================================================================
-- 008_restrict_fk_a_delete_set_null.sql
-- =============================================================================
-- Convierte únicamente las claves foráneas (FK) que tienen ON DELETE RESTRICT
-- a ON DELETE SET NULL (con ON UPDATE CASCADE).
--
-- Total de restricciones modificadas: 8
-- Siguiendo la Opción A, se remueve la restricción NOT NULL de las 7 columnas
-- que la poseían, evitando errores en PostgreSQL ('violates not-null constraint')
-- al eliminar registros de las tablas padre.
--
-- Idempotente y transaccional.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PARTE 1: Ajustar nulabilidad de columnas FK (DROP NOT NULL)
-- =============================================================================
-- Tabla: capacitaciones
ALTER TABLE public.capacitaciones ALTER COLUMN id_convocatoria DROP NOT NULL;

-- Tabla: carreras
ALTER TABLE public.carreras ALTER COLUMN id_facultad DROP NOT NULL;

-- Tabla: convocatorias_preuniversitario
ALTER TABLE public.convocatorias_preuniversitario ALTER COLUMN id_facultad DROP NOT NULL;

-- Tabla: matriculaciones
ALTER TABLE public.matriculaciones ALTER COLUMN id_paralelo DROP NOT NULL;

-- Tabla: paralelos
ALTER TABLE public.paralelos ALTER COLUMN id_aula DROP NOT NULL;
ALTER TABLE public.paralelos ALTER COLUMN id_capacitacion DROP NOT NULL;

-- Tabla: postulaciones
ALTER TABLE public.postulaciones ALTER COLUMN id_carrera DROP NOT NULL;

-- =============================================================================
-- PARTE 2: Eliminar y recrear las restricciones RESTRICT con ON DELETE SET NULL
-- =============================================================================
-- -----------------------------------------------------------------------------
-- Tabla: capacitaciones (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.capacitaciones
    DROP CONSTRAINT IF EXISTS fk_capacitaciones_convocatorias;

ALTER TABLE public.capacitaciones
    ADD CONSTRAINT fk_capacitaciones_convocatorias
    FOREIGN KEY (id_convocatoria)
    REFERENCES public.convocatorias_preuniversitario(id_convocatoria)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: carreras (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.carreras
    DROP CONSTRAINT IF EXISTS fk_carreras_facultades;

ALTER TABLE public.carreras
    ADD CONSTRAINT fk_carreras_facultades
    FOREIGN KEY (id_facultad)
    REFERENCES public.facultades(id_facultad)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: convocatorias_preuniversitario (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.convocatorias_preuniversitario
    DROP CONSTRAINT IF EXISTS fk_convocatorias_facultades;

ALTER TABLE public.convocatorias_preuniversitario
    ADD CONSTRAINT fk_convocatorias_facultades
    FOREIGN KEY (id_facultad)
    REFERENCES public.facultades(id_facultad)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: examenes_de_ingreso (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.examenes_de_ingreso
    DROP CONSTRAINT IF EXISTS fk_examenes_materia;

ALTER TABLE public.examenes_de_ingreso
    ADD CONSTRAINT fk_examenes_materia
    FOREIGN KEY (id_materia)
    REFERENCES public.materias(id_materia)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: matriculaciones (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.matriculaciones
    DROP CONSTRAINT IF EXISTS fk_matriculaciones_paralelos;

ALTER TABLE public.matriculaciones
    ADD CONSTRAINT fk_matriculaciones_paralelos
    FOREIGN KEY (id_paralelo)
    REFERENCES public.paralelos(id_paralelo)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: paralelos (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.paralelos
    DROP CONSTRAINT IF EXISTS fk_paralelos_aulas;

ALTER TABLE public.paralelos
    ADD CONSTRAINT fk_paralelos_aulas
    FOREIGN KEY (id_aula)
    REFERENCES public.aulas(id_aula)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.paralelos
    DROP CONSTRAINT IF EXISTS fk_paralelos_capacitaciones;

ALTER TABLE public.paralelos
    ADD CONSTRAINT fk_paralelos_capacitaciones
    FOREIGN KEY (id_capacitacion)
    REFERENCES public.capacitaciones(id_capacitacion)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: postulaciones (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.postulaciones
    DROP CONSTRAINT IF EXISTS fk_postulaciones_carreras;

ALTER TABLE public.postulaciones
    ADD CONSTRAINT fk_postulaciones_carreras
    FOREIGN KEY (id_carrera)
    REFERENCES public.carreras(id_carrera)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

COMMIT;
