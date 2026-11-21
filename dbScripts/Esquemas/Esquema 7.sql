--
-- PostgreSQL database dump
--

\restrict zgDztqQ9ggATXarVNpdeUm5qZ2RpKSsdBsV0TOJjDKo9ajmD3GJucAqwjjwQiQY

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.4

-- Started on 2026-11-21 10:24:37

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 17 (class 2615 OID 18263)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- TOC entry 459 (class 1255 OID 19445)
-- Name: establecer_contexto_auditoria(integer, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.establecer_contexto_auditoria(p_usuario_id integer, p_usuario_nombre text DEFAULT NULL::text, p_ip_origen text DEFAULT NULL::text, p_id_peticion text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
    PERFORM set_config('app.audit_user_id', COALESCE(p_usuario_id::text, ''), true);
    PERFORM set_config('app.audit_user_name', COALESCE(p_usuario_nombre, ''), true);
    PERFORM set_config('app.audit_client_ip', COALESCE(p_ip_origen, ''), true);
    PERFORM set_config('app.audit_request_id', COALESCE(p_id_peticion, ''), true);
END;
$$;


--
-- TOC entry 460 (class 1255 OID 19446)
-- Name: fn_proteger_auditorias(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_proteger_auditorias() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de auditoría no se pueden modificar ni eliminar';
END;
$$;


--
-- TOC entry 458 (class 1255 OID 19444)
-- Name: fn_registrar_auditoria(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_registrar_auditoria() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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
$$;


--
-- TOC entry 282 (class 1259 OID 18264)
-- Name: administrativos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administrativos (
    id_administrativo integer NOT NULL,
    id_usuario integer
);


--
-- TOC entry 283 (class 1259 OID 18267)
-- Name: administrativos_id_administrativo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.administrativos ALTER COLUMN id_administrativo ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.administrativos_id_administrativo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 284 (class 1259 OID 18268)
-- Name: apoderados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.apoderados (
    id_apoderado integer NOT NULL,
    id_usuario integer,
    parentesco character varying(50)
);


--
-- TOC entry 285 (class 1259 OID 18271)
-- Name: apoderados_id_apoderado_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.apoderados ALTER COLUMN id_apoderado ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.apoderados_id_apoderado_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 328 (class 1259 OID 19139)
-- Name: asesor_paralelo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asesor_paralelo (
    id_asignacion_asesor integer NOT NULL,
    id_asesor integer,
    id_paralelo integer
);


--
-- TOC entry 329 (class 1259 OID 19142)
-- Name: asesor_paralelo_id_asignacion_asesor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.asesor_paralelo ALTER COLUMN id_asignacion_asesor ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.asesor_paralelo_id_asignacion_asesor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 333 (class 1259 OID 19235)
-- Name: asesor_paralelo_materia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asesor_paralelo_materia (
    id_asesor_paralelo_materia integer NOT NULL,
    id_asesor integer NOT NULL,
    id_paralelo_materia integer,
    dias character varying(100)
);


--
-- TOC entry 332 (class 1259 OID 19234)
-- Name: asesor_paralelo_materia_id_asesor_paralelo_materia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.asesor_paralelo_materia ALTER COLUMN id_asesor_paralelo_materia ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.asesor_paralelo_materia_id_asesor_paralelo_materia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 286 (class 1259 OID 18275)
-- Name: asesores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asesores (
    id_asesor integer NOT NULL,
    id_usuario integer
);


--
-- TOC entry 287 (class 1259 OID 18278)
-- Name: asesores_id_asesor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.asesores ALTER COLUMN id_asesor ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.asesores_id_asesor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 288 (class 1259 OID 18279)
-- Name: usuario_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_rol (
    id_asignacion_rol integer NOT NULL,
    id_rol integer,
    id_usuario integer
);


--
-- TOC entry 289 (class 1259 OID 18282)
-- Name: asignacion_rol_id_asignacion_rol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usuario_rol ALTER COLUMN id_asignacion_rol ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.asignacion_rol_id_asignacion_rol_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 290 (class 1259 OID 18288)
-- Name: asistencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencias (
    id_asistencia integer NOT NULL,
    id_clase integer,
    id_estudiante integer,
    hora_entrada timestamp without time zone NOT NULL,
    salida_antes_de_tiempo timestamp without time zone,
    permiso boolean,
    razon_permiso character varying(150)
);


--
-- TOC entry 291 (class 1259 OID 18291)
-- Name: asistencias_id_asistencia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.asistencias ALTER COLUMN id_asistencia ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.asistencias_id_asistencia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 337 (class 1259 OID 19432)
-- Name: auditorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditorias (
    id_auditoria bigint NOT NULL,
    fecha_hora timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    id_transaccion bigint NOT NULL,
    esquema_tabla text NOT NULL,
    tabla text NOT NULL,
    operacion text NOT NULL,
    clave_anterior jsonb NOT NULL,
    clave_nueva jsonb,
    campos_modificados text[],
    datos_anteriores jsonb NOT NULL,
    datos_nuevos jsonb,
    usuario_bd text NOT NULL,
    usuario_app_id integer,
    usuario_app_nombre text,
    ip_origen text,
    id_peticion text,
    CONSTRAINT auditorias_operacion_check CHECK ((operacion = ANY (ARRAY['UPDATE'::text, 'DELETE'::text])))
);


--
-- TOC entry 336 (class 1259 OID 19431)
-- Name: auditorias_id_auditoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auditorias ALTER COLUMN id_auditoria ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.auditorias_id_auditoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 292 (class 1259 OID 18292)
-- Name: aulas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aulas (
    id_aula integer NOT NULL,
    capacidad integer NOT NULL,
    codigo character varying(20),
    CONSTRAINT aulas_capacidad_check CHECK ((capacidad > 0))
);


--
-- TOC entry 293 (class 1259 OID 18296)
-- Name: aulas_id_aula_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.aulas ALTER COLUMN id_aula ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.aulas_id_aula_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 325 (class 1259 OID 18738)
-- Name: capacitaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacitaciones (
    id_capacitacion integer NOT NULL,
    id_convocatoria integer,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_capacitaciones_fechas CHECK (((fecha_fin IS NULL) OR (fecha_fin >= fecha_inicio)))
);


--
-- TOC entry 324 (class 1259 OID 18737)
-- Name: capacitaciones_id_capacitacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.capacitaciones ALTER COLUMN id_capacitacion ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.capacitaciones_id_capacitacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 294 (class 1259 OID 18301)
-- Name: carreras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carreras (
    id_carrera integer NOT NULL,
    id_facultad integer,
    nombre character varying(150) NOT NULL
);


--
-- TOC entry 295 (class 1259 OID 18304)
-- Name: carreras_id_carrera_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.carreras ALTER COLUMN id_carrera ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.carreras_id_carrera_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 296 (class 1259 OID 18305)
-- Name: clases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clases (
    id_clase integer NOT NULL,
    id_paralelo integer,
    id_asesor integer,
    inicioclase date NOT NULL,
    tema character varying(100),
    id_asesor_paralelo_materia integer
);


--
-- TOC entry 297 (class 1259 OID 18308)
-- Name: clases_id_clase_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.clases ALTER COLUMN id_clase ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.clases_id_clase_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 298 (class 1259 OID 18309)
-- Name: contenidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contenidos (
    id_contenido integer NOT NULL,
    id_examen_de_ingreso integer,
    id_tema integer
);


--
-- TOC entry 299 (class 1259 OID 18312)
-- Name: contenidos_id_contenido_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contenidos ALTER COLUMN id_contenido ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.contenidos_id_contenido_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 300 (class 1259 OID 18316)
-- Name: convocatorias_preuniversitario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convocatorias_preuniversitario (
    id_convocatoria integer NOT NULL,
    id_facultad integer,
    fecha_inicio date NOT NULL,
    modalidad character varying(100)
);


--
-- TOC entry 301 (class 1259 OID 18319)
-- Name: convocatorias_preuniversitario_id_convocatoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.convocatorias_preuniversitario ALTER COLUMN id_convocatoria ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.convocatorias_preuniversitario_id_convocatoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 302 (class 1259 OID 18320)
-- Name: paralelos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paralelos (
    id_paralelo integer NOT NULL,
    id_aula integer,
    nivel character varying(100),
    nombre_paralelo character varying(150) NOT NULL,
    modalidad character varying(50),
    hora_inicio time without time zone,
    hora_fin time without time zone,
    activo boolean DEFAULT true NOT NULL,
    id_capacitacion integer,
    dias character varying(100),
    CONSTRAINT chk_paralelos_horas CHECK (((hora_inicio IS NULL) OR (hora_fin IS NULL) OR (hora_fin > hora_inicio)))
);


--
-- TOC entry 303 (class 1259 OID 18324)
-- Name: cursos_capacitacion_id_capacitacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.paralelos ALTER COLUMN id_paralelo ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cursos_capacitacion_id_capacitacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 304 (class 1259 OID 18325)
-- Name: estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudiantes (
    id_estudiante integer NOT NULL,
    id_usuario integer,
    id_apoderado integer,
    colegio_de_procedencia character varying(150),
    direccion_de_domicilio character varying(255),
    foto bytea
);


--
-- TOC entry 305 (class 1259 OID 18330)
-- Name: estudiantes_id_estudiante_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.estudiantes ALTER COLUMN id_estudiante ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.estudiantes_id_estudiante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 306 (class 1259 OID 18331)
-- Name: examenes_de_ingreso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examenes_de_ingreso (
    id_examen_de_ingreso integer NOT NULL,
    id_convocatoria integer,
    id_materia integer,
    foto bytea
);


--
-- TOC entry 307 (class 1259 OID 18336)
-- Name: examenes_de_ingreso_id_examen_de_ingreso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.examenes_de_ingreso ALTER COLUMN id_examen_de_ingreso ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.examenes_de_ingreso_id_examen_de_ingreso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 308 (class 1259 OID 18337)
-- Name: facultades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facultades (
    id_facultad integer NOT NULL,
    nombre character varying(150) NOT NULL
);


--
-- TOC entry 309 (class 1259 OID 18340)
-- Name: facultades_id_facultad_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.facultades ALTER COLUMN id_facultad ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.facultades_id_facultad_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 310 (class 1259 OID 18341)
-- Name: inscripciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inscripciones (
    id_inscripcion integer NOT NULL,
    id_administrativo integer,
    id_estudiante integer,
    como_se_entero_de_nosotros character varying(255),
    recalculo boolean DEFAULT false,
    preparacion_previa boolean DEFAULT false,
    tiempo_de_preparacion_meses integer DEFAULT 0,
    lugar_de_preparacion character varying(255),
    num_credencial integer,
    fecha_insc date,
    id_paralelo integer
);


--
-- TOC entry 311 (class 1259 OID 18349)
-- Name: inscripciones_id_inscripcion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inscripciones ALTER COLUMN id_inscripcion ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.inscripciones_id_inscripcion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 330 (class 1259 OID 19147)
-- Name: materia_asesor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materia_asesor (
    id_materia_asesor integer NOT NULL,
    id_asesor integer,
    id_materia integer
);


--
-- TOC entry 327 (class 1259 OID 18761)
-- Name: materia_capacitacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materia_capacitacion (
    id_asignacion_materia integer NOT NULL,
    id_materia integer,
    id_capacitacion integer
);


--
-- TOC entry 326 (class 1259 OID 18760)
-- Name: materia_capacitacion_id_asignacion_materia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.materia_capacitacion ALTER COLUMN id_asignacion_materia ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.materia_capacitacion_id_asignacion_materia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 323 (class 1259 OID 18662)
-- Name: materia_facultad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materia_facultad (
    id_materia_facultad integer NOT NULL,
    id_materia integer,
    id_facultad integer
);


--
-- TOC entry 322 (class 1259 OID 18661)
-- Name: materia_facultad_id_materia_facultad_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.materia_facultad ALTER COLUMN id_materia_facultad ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.materia_facultad_id_materia_facultad_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 312 (class 1259 OID 18353)
-- Name: materias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materias (
    id_materia integer NOT NULL,
    nombre_materia character varying(150) NOT NULL
);


--
-- TOC entry 331 (class 1259 OID 19150)
-- Name: materias_asesores_id_materia_asesor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.materia_asesor ALTER COLUMN id_materia_asesor ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.materias_asesores_id_materia_asesor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 313 (class 1259 OID 18358)
-- Name: materias_id_materia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.materias ALTER COLUMN id_materia ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.materias_id_materia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 314 (class 1259 OID 18364)
-- Name: mensualidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mensualidades (
    id_mensualidad integer NOT NULL,
    fecha_inicio_mensualidad date NOT NULL,
    fecha_fin_mensualidad date NOT NULL,
    pago numeric(10,2) NOT NULL,
    id_inscripcion integer,
    codigo_comprobante integer,
    CONSTRAINT mensualidades_pago_check CHECK ((pago >= (0)::numeric))
);


--
-- TOC entry 315 (class 1259 OID 18368)
-- Name: mensualidades_id_mensualidad_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mensualidades ALTER COLUMN id_mensualidad ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mensualidades_id_mensualidad_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 335 (class 1259 OID 19281)
-- Name: paralelo_materia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paralelo_materia (
    id_paralelo_materia integer NOT NULL,
    id_paralelo integer NOT NULL,
    id_materia integer NOT NULL
);


--
-- TOC entry 334 (class 1259 OID 19280)
-- Name: paralelo_materia_id_paralelo_materia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.paralelo_materia ALTER COLUMN id_paralelo_materia ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.paralelo_materia_id_paralelo_materia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 316 (class 1259 OID 18369)
-- Name: postulaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postulaciones (
    id_postulacion integer NOT NULL,
    id_estudiante integer,
    id_carrera integer
);


--
-- TOC entry 317 (class 1259 OID 18372)
-- Name: postulaciones_id_postulacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.postulaciones ALTER COLUMN id_postulacion ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.postulaciones_id_postulacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 318 (class 1259 OID 18373)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id_rol integer NOT NULL,
    nombre character varying(50) NOT NULL
);


--
-- TOC entry 319 (class 1259 OID 18376)
-- Name: roles_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.roles ALTER COLUMN id_rol ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.roles_id_rol_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 320 (class 1259 OID 18381)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    nro_carnet integer NOT NULL,
    apellido_paterno character varying(100) NOT NULL,
    apellido_materno character varying(100),
    nombre character varying(100) NOT NULL,
    fecha_nacimiento date,
    correo_electronico character varying(150),
    "contraseña" character varying(255),
    usuario_vigente boolean,
    nro_telefono character varying(20)
);


--
-- TOC entry 321 (class 1259 OID 18386)
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ALTER COLUMN id_usuario ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 3725 (class 2606 OID 18388)
-- Name: administrativos administrativos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrativos
    ADD CONSTRAINT administrativos_pkey PRIMARY KEY (id_administrativo);


--
-- TOC entry 3728 (class 2606 OID 18390)
-- Name: apoderados apoderados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apoderados
    ADD CONSTRAINT apoderados_pkey PRIMARY KEY (id_apoderado);


--
-- TOC entry 3812 (class 2606 OID 19239)
-- Name: asesor_paralelo_materia asesor_paralelo_materia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo_materia
    ADD CONSTRAINT asesor_paralelo_materia_pkey PRIMARY KEY (id_asesor_paralelo_materia);


--
-- TOC entry 3803 (class 2606 OID 19157)
-- Name: asesor_paralelo asesor_paralelo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo
    ADD CONSTRAINT asesor_paralelo_pkey PRIMARY KEY (id_asignacion_asesor);


--
-- TOC entry 3731 (class 2606 OID 18392)
-- Name: asesores asesores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesores
    ADD CONSTRAINT asesores_pkey PRIMARY KEY (id_asesor);


--
-- TOC entry 3734 (class 2606 OID 18394)
-- Name: usuario_rol asignacion_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT asignacion_rol_pkey PRIMARY KEY (id_asignacion_rol);


--
-- TOC entry 3740 (class 2606 OID 18400)
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id_asistencia);


--
-- TOC entry 3822 (class 2606 OID 19440)
-- Name: auditorias auditorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_pkey PRIMARY KEY (id_auditoria);


--
-- TOC entry 3744 (class 2606 OID 18402)
-- Name: aulas aulas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aulas
    ADD CONSTRAINT aulas_pkey PRIMARY KEY (id_aula);


--
-- TOC entry 3795 (class 2606 OID 18744)
-- Name: capacitaciones capacitaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacitaciones
    ADD CONSTRAINT capacitaciones_pkey PRIMARY KEY (id_capacitacion);


--
-- TOC entry 3746 (class 2606 OID 18406)
-- Name: carreras carreras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_pkey PRIMARY KEY (id_carrera);


--
-- TOC entry 3748 (class 2606 OID 18408)
-- Name: clases clases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clases
    ADD CONSTRAINT clases_pkey PRIMARY KEY (id_clase);


--
-- TOC entry 3751 (class 2606 OID 18410)
-- Name: contenidos contenidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenidos
    ADD CONSTRAINT contenidos_pkey PRIMARY KEY (id_contenido);


--
-- TOC entry 3755 (class 2606 OID 18412)
-- Name: convocatorias_preuniversitario convocatorias_preuniversitario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convocatorias_preuniversitario
    ADD CONSTRAINT convocatorias_preuniversitario_pkey PRIMARY KEY (id_convocatoria);


--
-- TOC entry 3761 (class 2606 OID 18416)
-- Name: estudiantes estudiantes_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_id_usuario_key UNIQUE (id_usuario);


--
-- TOC entry 3763 (class 2606 OID 18418)
-- Name: estudiantes estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (id_estudiante);


--
-- TOC entry 3766 (class 2606 OID 18420)
-- Name: examenes_de_ingreso examenes_de_ingreso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examenes_de_ingreso
    ADD CONSTRAINT examenes_de_ingreso_pkey PRIMARY KEY (id_examen_de_ingreso);


--
-- TOC entry 3769 (class 2606 OID 18422)
-- Name: facultades facultades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facultades
    ADD CONSTRAINT facultades_pkey PRIMARY KEY (id_facultad);


--
-- TOC entry 3772 (class 2606 OID 18424)
-- Name: inscripciones inscripciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripciones
    ADD CONSTRAINT inscripciones_pkey PRIMARY KEY (id_inscripcion);


--
-- TOC entry 3799 (class 2606 OID 18765)
-- Name: materia_capacitacion materia_capacitacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_capacitacion
    ADD CONSTRAINT materia_capacitacion_pkey PRIMARY KEY (id_asignacion_materia);


--
-- TOC entry 3791 (class 2606 OID 18666)
-- Name: materia_facultad materia_facultad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_facultad
    ADD CONSTRAINT materia_facultad_pkey PRIMARY KEY (id_materia_facultad);


--
-- TOC entry 3808 (class 2606 OID 19161)
-- Name: materia_asesor materias_asesores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_asesor
    ADD CONSTRAINT materias_asesores_pkey PRIMARY KEY (id_materia_asesor);


--
-- TOC entry 3774 (class 2606 OID 18430)
-- Name: materias materias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias
    ADD CONSTRAINT materias_pkey PRIMARY KEY (id_materia);


--
-- TOC entry 3776 (class 2606 OID 18434)
-- Name: mensualidades mensualidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensualidades
    ADD CONSTRAINT mensualidades_pkey PRIMARY KEY (id_mensualidad);


--
-- TOC entry 3814 (class 2606 OID 19484)
-- Name: asesor_paralelo_materia no_asesorRepetido; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo_materia
    ADD CONSTRAINT "no_asesorRepetido" UNIQUE (id_asesor_paralelo_materia, id_asesor, dias);


--
-- TOC entry 3818 (class 2606 OID 19285)
-- Name: paralelo_materia paralelo_materia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paralelo_materia
    ADD CONSTRAINT paralelo_materia_pkey PRIMARY KEY (id_paralelo_materia);


--
-- TOC entry 3759 (class 2606 OID 18414)
-- Name: paralelos paralelos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paralelos
    ADD CONSTRAINT paralelos_pkey PRIMARY KEY (id_paralelo);


--
-- TOC entry 3778 (class 2606 OID 18436)
-- Name: postulaciones postulaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT postulaciones_pkey PRIMARY KEY (id_postulacion);


--
-- TOC entry 3780 (class 2606 OID 18438)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 3782 (class 2606 OID 18440)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- TOC entry 3816 (class 2606 OID 19299)
-- Name: asesor_paralelo_materia uq_apm_asesor_paralelo_materia_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo_materia
    ADD CONSTRAINT uq_apm_asesor_paralelo_materia_id UNIQUE (id_asesor, id_paralelo_materia);


--
-- TOC entry 3806 (class 2606 OID 19165)
-- Name: asesor_paralelo uq_asesor_paralelo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo
    ADD CONSTRAINT uq_asesor_paralelo UNIQUE (id_asesor, id_paralelo);


--
-- TOC entry 3810 (class 2606 OID 19167)
-- Name: materia_asesor uq_materia_asesor_asesor_materia; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_asesor
    ADD CONSTRAINT uq_materia_asesor_asesor_materia UNIQUE (id_asesor, id_materia);


--
-- TOC entry 3801 (class 2606 OID 18767)
-- Name: materia_capacitacion uq_materia_capacitacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_capacitacion
    ADD CONSTRAINT uq_materia_capacitacion UNIQUE (id_materia, id_capacitacion);


--
-- TOC entry 3793 (class 2606 OID 18668)
-- Name: materia_facultad uq_materia_facultad; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_facultad
    ADD CONSTRAINT uq_materia_facultad UNIQUE (id_materia, id_facultad);


--
-- TOC entry 3820 (class 2606 OID 19287)
-- Name: paralelo_materia uq_paralelo_materia; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paralelo_materia
    ADD CONSTRAINT uq_paralelo_materia UNIQUE (id_paralelo, id_materia);


--
-- TOC entry 3738 (class 2606 OID 18700)
-- Name: usuario_rol uq_usuario_rol_usuario_rol; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT uq_usuario_rol_usuario_rol UNIQUE (id_usuario, id_rol);


--
-- TOC entry 3784 (class 2606 OID 18444)
-- Name: usuarios usuarios_correo_electronico_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_electronico_key UNIQUE (correo_electronico);


--
-- TOC entry 3786 (class 2606 OID 18446)
-- Name: usuarios usuarios_nro_carnet_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_nro_carnet_key UNIQUE (nro_carnet);


--
-- TOC entry 3788 (class 2606 OID 18448)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 3770 (class 1259 OID 19093)
-- Name: fki_fk_inscripciones_paralelos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_fk_inscripciones_paralelos ON public.inscripciones USING btree (id_paralelo);


--
-- TOC entry 3726 (class 1259 OID 18449)
-- Name: idx_administrativo_usuarios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administrativo_usuarios ON public.administrativos USING btree (id_usuario);


--
-- TOC entry 3729 (class 1259 OID 18450)
-- Name: idx_apoderado_usuarios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apoderado_usuarios ON public.apoderados USING btree (id_usuario);


--
-- TOC entry 3804 (class 1259 OID 19168)
-- Name: idx_asesor_paralelo_paralelo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asesor_paralelo_paralelo ON public.asesor_paralelo USING btree (id_paralelo);


--
-- TOC entry 3732 (class 1259 OID 18451)
-- Name: idx_asesor_usuarios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asesor_usuarios ON public.asesores USING btree (id_usuario);


--
-- TOC entry 3735 (class 1259 OID 18452)
-- Name: idx_asignacion_rol_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_rol_rol ON public.usuario_rol USING btree (id_rol);


--
-- TOC entry 3736 (class 1259 OID 18453)
-- Name: idx_asignacion_rol_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_rol_usuario ON public.usuario_rol USING btree (id_usuario);


--
-- TOC entry 3741 (class 1259 OID 18454)
-- Name: idx_asistencias_clase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_clase ON public.asistencias USING btree (id_clase);


--
-- TOC entry 3742 (class 1259 OID 18455)
-- Name: idx_asistencias_estudiante; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_estudiante ON public.asistencias USING btree (id_estudiante);


--
-- TOC entry 3823 (class 1259 OID 19443)
-- Name: idx_auditorias_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditorias_clave ON public.auditorias USING gin (clave_anterior jsonb_path_ops);


--
-- TOC entry 3824 (class 1259 OID 19441)
-- Name: idx_auditorias_tabla_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditorias_tabla_fecha ON public.auditorias USING btree (esquema_tabla, tabla, fecha_hora DESC);


--
-- TOC entry 3825 (class 1259 OID 19442)
-- Name: idx_auditorias_usuario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditorias_usuario_fecha ON public.auditorias USING btree (usuario_app_id, fecha_hora DESC);


--
-- TOC entry 3796 (class 1259 OID 18750)
-- Name: idx_capacitaciones_convocatoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacitaciones_convocatoria ON public.capacitaciones USING btree (id_convocatoria);


--
-- TOC entry 3749 (class 1259 OID 18798)
-- Name: idx_clases_paralelo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clases_paralelo ON public.clases USING btree (id_paralelo);


--
-- TOC entry 3752 (class 1259 OID 18458)
-- Name: idx_contenidos_examen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenidos_examen ON public.contenidos USING btree (id_examen_de_ingreso);


--
-- TOC entry 3753 (class 1259 OID 18459)
-- Name: idx_contenidos_tema; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenidos_tema ON public.contenidos USING btree (id_tema);


--
-- TOC entry 3764 (class 1259 OID 18460)
-- Name: idx_estudiante_usuarios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estudiante_usuarios ON public.estudiantes USING btree (id_usuario);


--
-- TOC entry 3767 (class 1259 OID 18660)
-- Name: idx_examenes_convocatoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_examenes_convocatoria ON public.examenes_de_ingreso USING btree (id_convocatoria);


--
-- TOC entry 3797 (class 1259 OID 18778)
-- Name: idx_materia_capacitacion_capacitacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materia_capacitacion_capacitacion ON public.materia_capacitacion USING btree (id_capacitacion);


--
-- TOC entry 3789 (class 1259 OID 18679)
-- Name: idx_materia_facultad_facultad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materia_facultad_facultad ON public.materia_facultad USING btree (id_facultad);


--
-- TOC entry 3756 (class 1259 OID 18759)
-- Name: idx_paralelos_aula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paralelos_aula ON public.paralelos USING btree (id_aula);


--
-- TOC entry 3757 (class 1259 OID 18758)
-- Name: idx_paralelos_capacitacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paralelos_capacitacion ON public.paralelos USING btree (id_capacitacion);


--
-- TOC entry 3862 (class 2620 OID 19449)
-- Name: administrativos trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.administrativos FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3863 (class 2620 OID 19450)
-- Name: apoderados trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.apoderados FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3885 (class 2620 OID 19451)
-- Name: asesor_paralelo trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.asesor_paralelo FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3887 (class 2620 OID 19452)
-- Name: asesor_paralelo_materia trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.asesor_paralelo_materia FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3864 (class 2620 OID 19453)
-- Name: asesores trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.asesores FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3866 (class 2620 OID 19454)
-- Name: asistencias trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.asistencias FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3867 (class 2620 OID 19455)
-- Name: aulas trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.aulas FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3883 (class 2620 OID 19456)
-- Name: capacitaciones trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.capacitaciones FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3868 (class 2620 OID 19457)
-- Name: carreras trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.carreras FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3869 (class 2620 OID 19458)
-- Name: clases trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.clases FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3870 (class 2620 OID 19459)
-- Name: contenidos trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.contenidos FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3871 (class 2620 OID 19460)
-- Name: convocatorias_preuniversitario trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.convocatorias_preuniversitario FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3873 (class 2620 OID 19461)
-- Name: estudiantes trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.estudiantes FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3874 (class 2620 OID 19462)
-- Name: examenes_de_ingreso trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.examenes_de_ingreso FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3875 (class 2620 OID 19463)
-- Name: facultades trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.facultades FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3876 (class 2620 OID 19464)
-- Name: inscripciones trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.inscripciones FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3886 (class 2620 OID 19465)
-- Name: materia_asesor trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.materia_asesor FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3884 (class 2620 OID 19466)
-- Name: materia_capacitacion trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.materia_capacitacion FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3882 (class 2620 OID 19467)
-- Name: materia_facultad trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.materia_facultad FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3877 (class 2620 OID 19468)
-- Name: materias trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.materias FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3878 (class 2620 OID 19469)
-- Name: mensualidades trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.mensualidades FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3888 (class 2620 OID 19470)
-- Name: paralelo_materia trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.paralelo_materia FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3872 (class 2620 OID 19471)
-- Name: paralelos trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.paralelos FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3879 (class 2620 OID 19472)
-- Name: postulaciones trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.postulaciones FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3880 (class 2620 OID 19473)
-- Name: roles trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3865 (class 2620 OID 19474)
-- Name: usuario_rol trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.usuario_rol FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3881 (class 2620 OID 19475)
-- Name: usuarios trg_auditorias_cambios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_cambios AFTER DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria();


--
-- TOC entry 3889 (class 2620 OID 19447)
-- Name: auditorias trg_auditorias_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_inmutable BEFORE DELETE OR UPDATE ON public.auditorias FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_auditorias();


--
-- TOC entry 3890 (class 2620 OID 19448)
-- Name: auditorias trg_auditorias_no_truncar; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditorias_no_truncar BEFORE TRUNCATE ON public.auditorias FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_auditorias();


--
-- TOC entry 3826 (class 2606 OID 18800)
-- Name: administrativos fk_administrativos_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrativos
    ADD CONSTRAINT fk_administrativos_usuarios FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3858 (class 2606 OID 19242)
-- Name: asesor_paralelo_materia fk_apm_asesores; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo_materia
    ADD CONSTRAINT fk_apm_asesores FOREIGN KEY (id_asesor) REFERENCES public.asesores(id_asesor) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3859 (class 2606 OID 19300)
-- Name: asesor_paralelo_materia fk_apm_paralelo_materia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo_materia
    ADD CONSTRAINT fk_apm_paralelo_materia FOREIGN KEY (id_paralelo_materia) REFERENCES public.paralelo_materia(id_paralelo_materia) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3827 (class 2606 OID 18805)
-- Name: apoderados fk_apoderados_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apoderados
    ADD CONSTRAINT fk_apoderados_usuarios FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3854 (class 2606 OID 19171)
-- Name: asesor_paralelo fk_asesor_paralelo_asesor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo
    ADD CONSTRAINT fk_asesor_paralelo_asesor FOREIGN KEY (id_asesor) REFERENCES public.asesores(id_asesor) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3855 (class 2606 OID 19176)
-- Name: asesor_paralelo fk_asesor_paralelo_paralelo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesor_paralelo
    ADD CONSTRAINT fk_asesor_paralelo_paralelo FOREIGN KEY (id_paralelo) REFERENCES public.paralelos(id_paralelo) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3828 (class 2606 OID 18820)
-- Name: asesores fk_asesores_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asesores
    ADD CONSTRAINT fk_asesores_usuarios FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3829 (class 2606 OID 18825)
-- Name: usuario_rol fk_asignacion_rol_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT fk_asignacion_rol_rol FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3830 (class 2606 OID 18830)
-- Name: usuario_rol fk_asignacion_rol_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT fk_asignacion_rol_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3831 (class 2606 OID 18835)
-- Name: asistencias fk_asistencias_clases; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT fk_asistencias_clases FOREIGN KEY (id_clase) REFERENCES public.clases(id_clase) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3832 (class 2606 OID 18840)
-- Name: asistencias fk_asistencias_estudiantes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT fk_asistencias_estudiantes FOREIGN KEY (id_estudiante) REFERENCES public.estudiantes(id_estudiante) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3851 (class 2606 OID 19000)
-- Name: capacitaciones fk_capacitaciones_convocatorias; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacitaciones
    ADD CONSTRAINT fk_capacitaciones_convocatorias FOREIGN KEY (id_convocatoria) REFERENCES public.convocatorias_preuniversitario(id_convocatoria) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3833 (class 2606 OID 19005)
-- Name: carreras fk_carreras_facultades; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT fk_carreras_facultades FOREIGN KEY (id_facultad) REFERENCES public.facultades(id_facultad) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3834 (class 2606 OID 19257)
-- Name: clases fk_clases_asesor_paralelo_materia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clases
    ADD CONSTRAINT fk_clases_asesor_paralelo_materia FOREIGN KEY (id_asesor_paralelo_materia) REFERENCES public.asesor_paralelo_materia(id_asesor_paralelo_materia) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3835 (class 2606 OID 18875)
-- Name: contenidos fk_contenidos_examen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenidos
    ADD CONSTRAINT fk_contenidos_examen FOREIGN KEY (id_examen_de_ingreso) REFERENCES public.examenes_de_ingreso(id_examen_de_ingreso) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3836 (class 2606 OID 19010)
-- Name: convocatorias_preuniversitario fk_convocatorias_facultades; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convocatorias_preuniversitario
    ADD CONSTRAINT fk_convocatorias_facultades FOREIGN KEY (id_facultad) REFERENCES public.facultades(id_facultad) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3839 (class 2606 OID 18890)
-- Name: estudiantes fk_estudiantes_apoderado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT fk_estudiantes_apoderado FOREIGN KEY (id_apoderado) REFERENCES public.apoderados(id_apoderado) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3840 (class 2606 OID 19094)
-- Name: estudiantes fk_estudiantes_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT fk_estudiantes_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3841 (class 2606 OID 18900)
-- Name: examenes_de_ingreso fk_examenes_convocatoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examenes_de_ingreso
    ADD CONSTRAINT fk_examenes_convocatoria FOREIGN KEY (id_convocatoria) REFERENCES public.convocatorias_preuniversitario(id_convocatoria) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3842 (class 2606 OID 19015)
-- Name: examenes_de_ingreso fk_examenes_materia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examenes_de_ingreso
    ADD CONSTRAINT fk_examenes_materia FOREIGN KEY (id_materia) REFERENCES public.materias(id_materia) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3843 (class 2606 OID 18910)
-- Name: inscripciones fk_inscripciones_administrativo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripciones
    ADD CONSTRAINT fk_inscripciones_administrativo FOREIGN KEY (id_administrativo) REFERENCES public.administrativos(id_administrativo) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3844 (class 2606 OID 18915)
-- Name: inscripciones fk_inscripciones_estudiante; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripciones
    ADD CONSTRAINT fk_inscripciones_estudiante FOREIGN KEY (id_estudiante) REFERENCES public.estudiantes(id_estudiante) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3845 (class 2606 OID 19088)
-- Name: inscripciones fk_inscripciones_paralelos; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripciones
    ADD CONSTRAINT fk_inscripciones_paralelos FOREIGN KEY (id_paralelo) REFERENCES public.paralelos(id_paralelo) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3856 (class 2606 OID 19196)
-- Name: materia_asesor fk_matasesores_asesores; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_asesor
    ADD CONSTRAINT fk_matasesores_asesores FOREIGN KEY (id_asesor) REFERENCES public.asesores(id_asesor) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3857 (class 2606 OID 19201)
-- Name: materia_asesor fk_matasesores_materia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_asesor
    ADD CONSTRAINT fk_matasesores_materia FOREIGN KEY (id_materia) REFERENCES public.materias(id_materia) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3852 (class 2606 OID 18930)
-- Name: materia_capacitacion fk_materia_capacitacion_capacitacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_capacitacion
    ADD CONSTRAINT fk_materia_capacitacion_capacitacion FOREIGN KEY (id_capacitacion) REFERENCES public.capacitaciones(id_capacitacion) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3853 (class 2606 OID 18935)
-- Name: materia_capacitacion fk_materia_capacitacion_materia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_capacitacion
    ADD CONSTRAINT fk_materia_capacitacion_materia FOREIGN KEY (id_materia) REFERENCES public.materias(id_materia) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3849 (class 2606 OID 18940)
-- Name: materia_facultad fk_materia_facultad_facultad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_facultad
    ADD CONSTRAINT fk_materia_facultad_facultad FOREIGN KEY (id_facultad) REFERENCES public.facultades(id_facultad) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3850 (class 2606 OID 18945)
-- Name: materia_facultad fk_materia_facultad_materia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materia_facultad
    ADD CONSTRAINT fk_materia_facultad_materia FOREIGN KEY (id_materia) REFERENCES public.materias(id_materia) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3846 (class 2606 OID 19065)
-- Name: mensualidades fk_mensualidades_inscripciones; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensualidades
    ADD CONSTRAINT fk_mensualidades_inscripciones FOREIGN KEY (id_inscripcion) REFERENCES public.inscripciones(id_inscripcion) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3860 (class 2606 OID 19293)
-- Name: paralelo_materia fk_paralelo_materia_materias; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paralelo_materia
    ADD CONSTRAINT fk_paralelo_materia_materias FOREIGN KEY (id_materia) REFERENCES public.materias(id_materia) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3861 (class 2606 OID 19288)
-- Name: paralelo_materia fk_paralelo_materia_paralelos; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paralelo_materia
    ADD CONSTRAINT fk_paralelo_materia_paralelos FOREIGN KEY (id_paralelo) REFERENCES public.paralelos(id_paralelo) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3837 (class 2606 OID 19025)
-- Name: paralelos fk_paralelos_aulas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paralelos
    ADD CONSTRAINT fk_paralelos_aulas FOREIGN KEY (id_aula) REFERENCES public.aulas(id_aula) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3838 (class 2606 OID 19030)
-- Name: paralelos fk_paralelos_capacitaciones; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paralelos
    ADD CONSTRAINT fk_paralelos_capacitaciones FOREIGN KEY (id_capacitacion) REFERENCES public.capacitaciones(id_capacitacion) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3847 (class 2606 OID 19035)
-- Name: postulaciones fk_postulaciones_carreras; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT fk_postulaciones_carreras FOREIGN KEY (id_carrera) REFERENCES public.carreras(id_carrera) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3848 (class 2606 OID 18995)
-- Name: postulaciones fk_postulaciones_estudiantes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT fk_postulaciones_estudiantes FOREIGN KEY (id_estudiante) REFERENCES public.estudiantes(id_estudiante) ON UPDATE CASCADE ON DELETE SET NULL;


-- Completed on 2026-11-21 10:24:58

--
-- PostgreSQL database dump complete
--

\unrestrict zgDztqQ9ggATXarVNpdeUm5qZ2RpKSsdBsV0TOJjDKo9ajmD3GJucAqwjjwQiQY

