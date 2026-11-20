-- Limpieza total de datos para iniciar las pruebas reales (PostgreSQL).
-- Ejecutar en la base correcta despues de contar con un respaldo.
-- Conserva tablas, relaciones, funciones, triggers y permisos. Elimina todas
-- las filas de las tablas de public, incluidos usuarios, roles y auditorias,
-- y reinicia las secuencias de identidad asociadas.
-- No vuelve a crear usuarios administradores ni datos de catalogo.
--
-- Ejecutar como propietario de las tablas o con permisos suficientes.
-- Todo se realiza en una transaccion: ante cualquier error se revierte.

BEGIN;

DO $limpieza$
DECLARE
    v_tablas text;
    v_cantidad integer;
    v_trigger_auditoria text;
BEGIN
    -- Evita vaciar por accidente una base que no tenga el esquema esperado.
    IF to_regclass('public.usuarios') IS NULL
       OR to_regclass('public.inscripciones') IS NULL
       OR to_regclass('public.facultades') IS NULL
       OR to_regclass('public.roles') IS NULL THEN
        RAISE EXCEPTION 'No se encontro el esquema academico esperado en la base %', current_database();
    END IF;

    -- auditorias.sql protege el historial contra TRUNCATE. Se suspende solo
    -- ese trigger durante la limpieza y se restaura su estado original.
    SELECT t.tgenabled::text
      INTO v_trigger_auditoria
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'auditorias'
       AND t.tgname = 'trg_auditorias_no_truncar';

    IF v_trigger_auditoria IS NOT NULL AND v_trigger_auditoria <> 'D' THEN
        ALTER TABLE public.auditorias DISABLE TRIGGER trg_auditorias_no_truncar;
    END IF;

    SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY c.relname),
           count(*)
      INTO v_tablas, v_cantidad
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND NOT c.relispartition;

    IF v_tablas IS NULL THEN
        RAISE EXCEPTION 'No se encontraron tablas para limpiar en el esquema public';
    END IF;

    -- Se incluyen todas las tablas relacionadas en una misma sentencia.
    -- RESTRICT impide que CASCADE alcance datos fuera del esquema public.
    EXECUTE 'TRUNCATE TABLE ' || v_tablas || ' RESTART IDENTITY RESTRICT';

    IF v_trigger_auditoria = 'O' THEN
        ALTER TABLE public.auditorias ENABLE TRIGGER trg_auditorias_no_truncar;
    ELSIF v_trigger_auditoria = 'A' THEN
        ALTER TABLE public.auditorias ENABLE ALWAYS TRIGGER trg_auditorias_no_truncar;
    ELSIF v_trigger_auditoria = 'R' THEN
        ALTER TABLE public.auditorias ENABLE REPLICA TRIGGER trg_auditorias_no_truncar;
    END IF;

    RAISE NOTICE 'Limpieza completada: % tablas de public vaciadas; identidades reiniciadas.', v_cantidad;
END;
$limpieza$;

COMMIT;
