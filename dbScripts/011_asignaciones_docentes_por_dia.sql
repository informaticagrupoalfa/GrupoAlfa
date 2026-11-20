-- Permite asignar un asesor y una materia por día de un paralelo.
-- Los registros previos quedan con dias NULL y se pueden migrar manualmente.
ALTER TABLE public.asesor_paralelo_materia
  ADD COLUMN IF NOT EXISTS dias character varying(100);

ALTER TABLE public.asesor_paralelo_materia
  ALTER COLUMN dias TYPE character varying(100);

ALTER TABLE public.asesor_paralelo_materia
  DROP CONSTRAINT IF EXISTS uq_apm_asesor_paralelo_materia_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_apm_materia_dia
  ON public.asesor_paralelo_materia (id_paralelo_materia, dias)
  WHERE dias IS NOT NULL;
