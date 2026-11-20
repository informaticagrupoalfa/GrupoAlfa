-- Auditoría de cambios para las tablas de public (PostgreSQL).
-- Sustituye a Auditoria.sql, que usa nombres de tablas y columnas anteriores.
-- Ejecutar después de crear el esquema. Es seguro volver a ejecutarlo.
-- Registra UPDATE y DELETE; INSERT se omite deliberadamente.
--
-- El usuario de base de datos (session_user) siempre queda registrado. Para
-- identificar también al usuario de la aplicación, llamar a la función de
-- contexto dentro de la MISMA transacción y conexión que hace la escritura:
--
-- BEGIN;
-- SELECT public.establecer_contexto_auditoria(42, 'Ana Pérez', '192.0.2.10', 'peticion-123');
-- UPDATE public.aulas SET capacidad = 35 WHERE id_aula = 1;
-- COMMIT;
--
-- SET LOCAL se limpia al terminar la transacción: no pasa al siguiente usuario
-- de una conexión reutilizada por el pool. Sin ese contexto, usuario_app_id
-- queda NULL y usuario_bd conserva la identidad disponible en PostgreSQL.

BEGIN;

CREATE TABLE IF NOT EXISTS public.auditorias (
    id_auditoria bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_hora timestamptz NOT NULL DEFAULT clock_timestamp(),
    id_transaccion bigint NOT NULL,
    esquema_tabla text NOT NULL,
    tabla text NOT NULL,
    operacion text NOT NULL CHECK (operacion IN ('UPDATE', 'DELETE')),
    clave_anterior jsonb NOT NULL,
    clave_nueva jsonb,
    campos_modificados text[],
    datos_anteriores jsonb NOT NULL,
    datos_nuevos jsonb,
    usuario_bd text NOT NULL,
    usuario_app_id integer,
    usuario_app_nombre text,
    ip_origen text,
    id_peticion text
);

CREATE INDEX IF NOT EXISTS idx_auditorias_tabla_fecha
    ON public.auditorias (esquema_tabla, tabla, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_auditorias_usuario_fecha
    ON public.auditorias (usuario_app_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_auditorias_clave
    ON public.auditorias USING gin (clave_anterior jsonb_path_ops);

-- SECURITY DEFINER permite insertar en auditorias aun si el rol que modifica
-- las tablas de negocio no tiene permiso directo de escritura en el registro.
CREATE OR REPLACE FUNCTION public.fn_registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $func$
DECLARE
    v_antes jsonb;
    v_despues jsonb;
    v_clave_antes jsonb;
    v_clave_despues jsonb;
    v_campos text[];
    v_campo text;
    v_datos_antes jsonb := '{}'::jsonb;
    v_datos_despues jsonb := '{}'::jsonb;
    v_secretos constant text[] := ARRAY[
        'contraseña', 'password', 'password_hash', 'token',
        'access_token', 'refresh_token', 'secret', 'foto', 'foto_base64'
    ];
BEGIN
    v_antes := to_jsonb(OLD);

    IF TG_OP = 'UPDATE' THEN
        v_despues := to_jsonb(NEW);
        SELECT array_agg(k ORDER BY k)
          INTO v_campos
          FROM jsonb_object_keys(v_despues) AS columnas(k)
         WHERE (v_antes -> k) IS DISTINCT FROM (v_despues -> k);

        -- No registrar UPDATE que no cambió ningún valor.
        IF v_campos IS NULL THEN
            RETURN NEW;
        END IF;

        FOREACH v_campo IN ARRAY v_campos LOOP
            IF v_campo = ANY(v_secretos) THEN
                v_datos_antes := v_datos_antes || jsonb_build_object(v_campo, '[REDACTADO]');
                v_datos_despues := v_datos_despues || jsonb_build_object(v_campo, '[REDACTADO]');
            ELSE
                v_datos_antes := v_datos_antes || jsonb_build_object(v_campo, v_antes -> v_campo);
                v_datos_despues := v_datos_despues || jsonb_build_object(v_campo, v_despues -> v_campo);
            END IF;
        END LOOP;
    ELSE
        -- En DELETE se conserva la fila anterior, excepto secretos y fotos.
        v_datos_antes := v_antes - v_secretos;
    END IF;

    -- Obtiene la clave primaria desde el catálogo. Funciona también con claves
    -- compuestas y evita asumir que todas las tablas tienen el mismo id.
    SELECT COALESCE(jsonb_object_agg(a.attname, v_antes -> a.attname), '{}'::jsonb),
           COALESCE(jsonb_object_agg(a.attname, v_despues -> a.attname), '{}'::jsonb)
      INTO v_clave_antes, v_clave_despues
      FROM pg_index ix
      JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
     WHERE ix.indrelid = TG_RELID AND ix.indisprimary;

    INSERT INTO public.auditorias (
        fecha_hora, id_transaccion, esquema_tabla, tabla, operacion,
        clave_anterior, clave_nueva, campos_modificados,
        datos_anteriores, datos_nuevos, usuario_bd, usuario_app_id,
        usuario_app_nombre, ip_origen, id_peticion
    ) VALUES (
        clock_timestamp(), txid_current(), TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP,
        v_clave_antes,
        CASE WHEN TG_OP = 'UPDATE' THEN v_clave_despues ELSE NULL END,
        v_campos, v_datos_antes,
        CASE WHEN TG_OP = 'UPDATE' THEN v_datos_despues ELSE NULL END,
        session_user,
        NULLIF(current_setting('app.audit_user_id', true), '')::integer,
        NULLIF(current_setting('app.audit_user_name', true), ''),
        COALESCE(NULLIF(current_setting('app.audit_client_ip', true), ''), inet_client_addr()::text),
        NULLIF(current_setting('app.audit_request_id', true), '')
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.establecer_contexto_auditoria(
    p_usuario_id integer,
    p_usuario_nombre text DEFAULT NULL,
    p_ip_origen text DEFAULT NULL,
    p_id_peticion text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $func$
BEGIN
    PERFORM set_config('app.audit_user_id', COALESCE(p_usuario_id::text, ''), true);
    PERFORM set_config('app.audit_user_name', COALESCE(p_usuario_nombre, ''), true);
    PERFORM set_config('app.audit_client_ip', COALESCE(p_ip_origen, ''), true);
    PERFORM set_config('app.audit_request_id', COALESCE(p_id_peticion, ''), true);
END;
$func$;

-- El registro es de solo anexado para operaciones ordinarias.
CREATE OR REPLACE FUNCTION public.fn_proteger_auditorias()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $func$
BEGIN
    RAISE EXCEPTION 'Los registros de auditoría no se pueden modificar ni eliminar';
END;
$func$;

DROP TRIGGER IF EXISTS trg_auditorias_inmutable ON public.auditorias;
CREATE TRIGGER trg_auditorias_inmutable
    BEFORE UPDATE OR DELETE ON public.auditorias
    FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_auditorias();

DROP TRIGGER IF EXISTS trg_auditorias_no_truncar ON public.auditorias;
CREATE TRIGGER trg_auditorias_no_truncar
    BEFORE TRUNCATE ON public.auditorias
    FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_auditorias();

-- Quita los triggers del script anterior si llegaron a instalarse parcialmente.
DO $bloque$
DECLARE
    v_trigger record;
BEGIN
    FOR v_trigger IN
        SELECT t.tgname, n.nspname, c.relname
          FROM pg_trigger t
          JOIN pg_class c ON c.oid = t.tgrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND NOT t.tgisinternal
           AND t.tgfoid = to_regprocedure('public.fn_auditar_cambio()')
    LOOP
        EXECUTE format('DROP TRIGGER %I ON %I.%I',
                       v_trigger.tgname, v_trigger.nspname, v_trigger.relname);
    END LOOP;
END;
$bloque$;

-- Instala el mismo trigger en todas las tablas ordinarias actuales de public.
-- Si se agregan tablas después, volver a ejecutar este script.
DO $bloque$
DECLARE
    v_tabla record;
BEGIN
    FOR v_tabla IN
        SELECT n.nspname, c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind = 'r'
           AND NOT c.relispartition
           AND c.relname NOT IN ('auditoria', 'auditorias')
         ORDER BY c.relname
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_auditorias_cambios ON %I.%I',
                       v_tabla.nspname, v_tabla.relname);
        EXECUTE format(
            'CREATE TRIGGER trg_auditorias_cambios AFTER UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria()',
            v_tabla.nspname, v_tabla.relname
        );
    END LOOP;
END;
$bloque$;

COMMIT;
