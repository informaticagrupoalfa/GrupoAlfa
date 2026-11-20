-- Limpia las claves foráneas antiguas y conserva el modelo relacional nuevo.
-- No modifica columnas, valores, nulabilidad ni registros.

-- asesor_paralelo_materia ahora referencia al asesor y a paralelo_materia.
ALTER TABLE public.asesor_paralelo_materia
    DROP CONSTRAINT IF EXISTS fk_apm_paralelos,
    DROP CONSTRAINT IF EXISTS fk_apm_materias;

-- clases ahora se relaciona con asesor_paralelo_materia.
ALTER TABLE public.clases
    DROP CONSTRAINT IF EXISTS fk_clases_asesores,
    DROP CONSTRAINT IF EXISTS fk_clases_paralelos;

-- Asegura las claves foráneas del modelo deseado si alguna aún no existe.
DO $relaciones_nuevas$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.asesor_paralelo_materia'::regclass
          AND conname = 'fk_apm_asesores'
    ) THEN
        ALTER TABLE public.asesor_paralelo_materia
            ADD CONSTRAINT fk_apm_asesores
            FOREIGN KEY (id_asesor)
            REFERENCES public.asesores(id_asesor)
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.asesor_paralelo_materia'::regclass
          AND conname = 'fk_apm_paralelo_materia'
    ) THEN
        ALTER TABLE public.asesor_paralelo_materia
            ADD CONSTRAINT fk_apm_paralelo_materia
            FOREIGN KEY (id_paralelo_materia)
            REFERENCES public.paralelo_materia(id_paralelo_materia)
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.paralelo_materia'::regclass
          AND conname = 'fk_paralelo_materia_paralelos'
    ) THEN
        ALTER TABLE public.paralelo_materia
            ADD CONSTRAINT fk_paralelo_materia_paralelos
            FOREIGN KEY (id_paralelo)
            REFERENCES public.paralelos(id_paralelo)
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.paralelo_materia'::regclass
          AND conname = 'fk_paralelo_materia_materias'
    ) THEN
        ALTER TABLE public.paralelo_materia
            ADD CONSTRAINT fk_paralelo_materia_materias
            FOREIGN KEY (id_materia)
            REFERENCES public.materias(id_materia)
            ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.clases'::regclass
          AND conname = 'fk_clases_asesor_paralelo_materia'
    ) THEN
        ALTER TABLE public.clases
            ADD CONSTRAINT fk_clases_asesor_paralelo_materia
            FOREIGN KEY (id_asesor_paralelo_materia)
            REFERENCES public.asesor_paralelo_materia(id_asesor_paralelo_materia)
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END
$relaciones_nuevas$;
