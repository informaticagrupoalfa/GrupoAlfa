BEGIN;

-- La regla real es por paralelo, aunque la clase almacene la asignación.
-- El bloqueo transaccional evita que dos solicitudes simultáneas creen dos clases.
CREATE OR REPLACE FUNCTION public.validar_una_clase_diaria_por_paralelo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  paralelo_id integer;
BEGIN
  SELECT id_paralelo INTO paralelo_id
    FROM public.paralelo_materia_asesor
   WHERE id_paralelo_materia = NEW.id_asesor_paralelo_materia;

  IF paralelo_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(paralelo_id, (NEW.inicioclase - DATE '2000-01-01')::integer);
  IF EXISTS (
    SELECT 1
      FROM public.clases c
      JOIN public.paralelo_materia_asesor pma
        ON pma.id_paralelo_materia = c.id_asesor_paralelo_materia
     WHERE pma.id_paralelo = paralelo_id
       AND c.inicioclase = NEW.inicioclase
       AND c.id_clase IS DISTINCT FROM NEW.id_clase
  ) THEN
    RAISE EXCEPTION 'Ya existe una clase para este paralelo en esta fecha'
      USING ERRCODE = '23505', CONSTRAINT = 'uq_clases_paralelo_fecha';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_una_clase_diaria_por_paralelo ON public.clases;
CREATE TRIGGER trg_una_clase_diaria_por_paralelo
BEFORE INSERT OR UPDATE OF id_asesor_paralelo_materia, inicioclase ON public.clases
FOR EACH ROW EXECUTE FUNCTION public.validar_una_clase_diaria_por_paralelo();

-- Los registros históricos quedan intactos; se impiden duplicados nuevos.
CREATE OR REPLACE FUNCTION public.validar_una_asistencia_por_estudiante()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id_clase IS NULL OR NEW.id_estudiante IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(NEW.id_clase, NEW.id_estudiante);
  IF EXISTS (
    SELECT 1 FROM public.asistencias a
     WHERE a.id_clase = NEW.id_clase
       AND a.id_estudiante = NEW.id_estudiante
       AND a.id_asistencia IS DISTINCT FROM NEW.id_asistencia
  ) THEN
    RAISE EXCEPTION 'La asistencia de este estudiante ya fue registrada'
      USING ERRCODE = '23505', CONSTRAINT = 'uq_asistencias_clase_estudiante';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_una_asistencia_por_estudiante ON public.asistencias;
CREATE TRIGGER trg_una_asistencia_por_estudiante
BEFORE INSERT OR UPDATE OF id_clase, id_estudiante ON public.asistencias
FOR EACH ROW EXECUTE FUNCTION public.validar_una_asistencia_por_estudiante();

COMMIT;
