-- Limpieza parcial basada en dbScripts/Esquemas/Esquema8.sql.
-- Conserva únicamente los datos de usuarios, roles, asesores, materias y facultades.
-- También se vacía usuario_rol: las cuentas quedan sin asignaciones de rol.
-- Ejecutar en la base correcta después de crear un respaldo. Este archivo no se ejecuta automáticamente.
-- La operación es transaccional y RESTRICT impide vaciar tablas adicionales por CASCADE.

BEGIN;

DO $limpieza_dos$
DECLARE
    v_estado_trigger text;
BEGIN
    -- Verifica las cinco tablas protegidas y las relaciones clave del esquema.
    IF to_regclass('public.usuarios') IS NULL
       OR to_regclass('public.roles') IS NULL
       OR to_regclass('public.asesores') IS NULL
       OR to_regclass('public.materias') IS NULL
       OR to_regclass('public.facultades') IS NULL
       OR to_regclass('public.usuario_rol') IS NULL
       OR to_regclass('public.auditorias') IS NULL
       OR to_regclass('public.inscripciones') IS NULL THEN
        RAISE EXCEPTION 'No se encontró el esquema académico esperado en la base %', current_database();
    END IF;

    -- El esquema protege auditorias contra TRUNCATE. Se restaura el estado
    -- anterior del trigger antes de confirmar la transacción.
    SELECT t.tgenabled::text INTO v_estado_trigger
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'auditorias'
       AND t.tgname = 'trg_auditorias_no_truncar';

    IF v_estado_trigger IS NOT NULL AND v_estado_trigger <> 'D' THEN
        ALTER TABLE public.auditorias DISABLE TRIGGER trg_auditorias_no_truncar;
    END IF;

    TRUNCATE TABLE
        public.administrativos,
        public.apoderados,
        public.asesor_paralelo,
        public.usuario_rol,
        public.asistencias,
        public.auditorias,
        public.aulas,
        public.capacitaciones,
        public.carreras,
        public.clases,
        public.contenidos,
        public.convocatorias_preuniversitario,
        public.paralelos,
        public.estudiantes,
        public.examenes_de_ingreso,
        public.inscripciones,
        public.materia_asesor,
        public.materia_capacitacion,
        public.materia_facultad,
        public.mensualidades,
        public.paralelo_materia_asesor,
        public.postulaciones
    RESTART IDENTITY RESTRICT;

    IF v_estado_trigger = 'O' THEN
        ALTER TABLE public.auditorias ENABLE TRIGGER trg_auditorias_no_truncar;
    ELSIF v_estado_trigger = 'A' THEN
        ALTER TABLE public.auditorias ENABLE ALWAYS TRIGGER trg_auditorias_no_truncar;
    ELSIF v_estado_trigger = 'R' THEN
        ALTER TABLE public.auditorias ENABLE REPLICA TRIGGER trg_auditorias_no_truncar;
    END IF;

    RAISE NOTICE 'Limpieza parcial completada. Se conservaron usuarios, roles, asesores, materias y facultades.';
END;
$limpieza_dos$;

COMMIT;
