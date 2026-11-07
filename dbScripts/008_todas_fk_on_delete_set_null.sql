-- =============================================================================
-- 008_todas_fk_on_delete_set_null.sql
-- =============================================================================
-- Configura TODAS las restricciones de clave foránea (FK) del esquema
-- con la regla ON DELETE SET NULL y ON UPDATE CASCADE.
--
-- Para garantizar que PostgreSQL no falle en tiempo de ejecución al eliminar
-- registros referenciados (violación de 'not-null constraint'), este script:
--   1. Remueve la restricción NOT NULL de las 23 columnas que la poseían.
--   2. Elimina las 40 restricciones de clave foránea existentes.
--   3. Recrea las 40 restricciones FK con ON UPDATE CASCADE ON DELETE SET NULL.
--
-- Idempotente y transaccional: se puede ejecutar de forma segura.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PARTE 1: Ajustar nulabilidad de columnas FK (DROP NOT NULL)
-- =============================================================================
-- Tabla: asesor_paralelo
ALTER TABLE public.asesor_paralelo ALTER COLUMN id_asesor DROP NOT NULL;
ALTER TABLE public.asesor_paralelo ALTER COLUMN id_paralelo DROP NOT NULL;

-- Tabla: usuario_rol
ALTER TABLE public.usuario_rol ALTER COLUMN id_rol DROP NOT NULL;
ALTER TABLE public.usuario_rol ALTER COLUMN id_usuario DROP NOT NULL;

-- Tabla: asistencias
ALTER TABLE public.asistencias ALTER COLUMN id_clase DROP NOT NULL;
ALTER TABLE public.asistencias ALTER COLUMN id_estudiante DROP NOT NULL;

-- Tabla: capacitaciones
ALTER TABLE public.capacitaciones ALTER COLUMN id_convocatoria DROP NOT NULL;

-- Tabla: carreras
ALTER TABLE public.carreras ALTER COLUMN id_facultad DROP NOT NULL;

-- Tabla: clases
ALTER TABLE public.clases ALTER COLUMN id_paralelo DROP NOT NULL;

-- Tabla: convocatorias_preuniversitario
ALTER TABLE public.convocatorias_preuniversitario ALTER COLUMN id_facultad DROP NOT NULL;

-- Tabla: materia_asesor
ALTER TABLE public.materia_asesor ALTER COLUMN id_asesor DROP NOT NULL;
ALTER TABLE public.materia_asesor ALTER COLUMN id_materia DROP NOT NULL;

-- Tabla: materia_capacitacion
ALTER TABLE public.materia_capacitacion ALTER COLUMN id_capacitacion DROP NOT NULL;
ALTER TABLE public.materia_capacitacion ALTER COLUMN id_materia DROP NOT NULL;

-- Tabla: materia_facultad
ALTER TABLE public.materia_facultad ALTER COLUMN id_facultad DROP NOT NULL;
ALTER TABLE public.materia_facultad ALTER COLUMN id_materia DROP NOT NULL;

-- Tabla: matriculaciones
ALTER TABLE public.matriculaciones ALTER COLUMN id_paralelo DROP NOT NULL;

-- Tabla: materia_facultad_temas
ALTER TABLE public.materia_facultad_temas ALTER COLUMN id_materia_facultad DROP NOT NULL;
ALTER TABLE public.materia_facultad_temas ALTER COLUMN id_tema DROP NOT NULL;

-- Tabla: paralelos
ALTER TABLE public.paralelos ALTER COLUMN id_aula DROP NOT NULL;
ALTER TABLE public.paralelos ALTER COLUMN id_capacitacion DROP NOT NULL;

-- Tabla: postulaciones
ALTER TABLE public.postulaciones ALTER COLUMN id_carrera DROP NOT NULL;
ALTER TABLE public.postulaciones ALTER COLUMN id_estudiante DROP NOT NULL;

-- =============================================================================
-- PARTE 2: Eliminar y recrear restricciones FK con ON DELETE SET NULL
-- =============================================================================
-- -----------------------------------------------------------------------------
-- Tabla: administrativos (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.administrativos
    DROP CONSTRAINT IF EXISTS fk_administrativos_usuarios;

ALTER TABLE public.administrativos
    ADD CONSTRAINT fk_administrativos_usuarios
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: apoderados (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.apoderados
    DROP CONSTRAINT IF EXISTS fk_apoderados_usuarios;

ALTER TABLE public.apoderados
    ADD CONSTRAINT fk_apoderados_usuarios
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: asesor_paralelo (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.asesor_paralelo
    DROP CONSTRAINT IF EXISTS fk_asesor_paralelo_asesor;

ALTER TABLE public.asesor_paralelo
    ADD CONSTRAINT fk_asesor_paralelo_asesor
    FOREIGN KEY (id_asesor)
    REFERENCES public.asesores(id_asesor)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.asesor_paralelo
    DROP CONSTRAINT IF EXISTS fk_asesor_paralelo_paralelo;

ALTER TABLE public.asesor_paralelo
    ADD CONSTRAINT fk_asesor_paralelo_paralelo
    FOREIGN KEY (id_paralelo)
    REFERENCES public.paralelos(id_paralelo)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: asesores (1 FK)
-- -----------------------------------------------------------------------------
ALTER TABLE public.asesores
    DROP CONSTRAINT IF EXISTS fk_asesores_usuarios;

ALTER TABLE public.asesores
    ADD CONSTRAINT fk_asesores_usuarios
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: usuario_rol (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.usuario_rol
    DROP CONSTRAINT IF EXISTS fk_asignacion_rol_rol;

ALTER TABLE public.usuario_rol
    ADD CONSTRAINT fk_asignacion_rol_rol
    FOREIGN KEY (id_rol)
    REFERENCES public.roles(id_rol)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.usuario_rol
    DROP CONSTRAINT IF EXISTS fk_asignacion_rol_usuario;

ALTER TABLE public.usuario_rol
    ADD CONSTRAINT fk_asignacion_rol_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: asistencias (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.asistencias
    DROP CONSTRAINT IF EXISTS fk_asistencias_clases;

ALTER TABLE public.asistencias
    ADD CONSTRAINT fk_asistencias_clases
    FOREIGN KEY (id_clase)
    REFERENCES public.clases(id_clase)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.asistencias
    DROP CONSTRAINT IF EXISTS fk_asistencias_estudiantes;

ALTER TABLE public.asistencias
    ADD CONSTRAINT fk_asistencias_estudiantes
    FOREIGN KEY (id_estudiante)
    REFERENCES public.estudiantes(id_estudiante)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: avances (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.avances
    DROP CONSTRAINT IF EXISTS fk_avances_clase;

ALTER TABLE public.avances
    ADD CONSTRAINT fk_avances_clase
    FOREIGN KEY (id_clase)
    REFERENCES public.clases(id_clase)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.avances
    DROP CONSTRAINT IF EXISTS fk_avances_tema;

ALTER TABLE public.avances
    ADD CONSTRAINT fk_avances_tema
    FOREIGN KEY (id_tema)
    REFERENCES public.temas(id_tema)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

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
-- Tabla: clases (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.clases
    DROP CONSTRAINT IF EXISTS fk_clases_asesores;

ALTER TABLE public.clases
    ADD CONSTRAINT fk_clases_asesores
    FOREIGN KEY (id_asesor)
    REFERENCES public.asesores(id_asesor)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.clases
    DROP CONSTRAINT IF EXISTS fk_clases_paralelos;

ALTER TABLE public.clases
    ADD CONSTRAINT fk_clases_paralelos
    FOREIGN KEY (id_paralelo)
    REFERENCES public.paralelos(id_paralelo)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: contenidos (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.contenidos
    DROP CONSTRAINT IF EXISTS fk_contenidos_examen;

ALTER TABLE public.contenidos
    ADD CONSTRAINT fk_contenidos_examen
    FOREIGN KEY (id_examen_de_ingreso)
    REFERENCES public.examenes_de_ingreso(id_examen_de_ingreso)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.contenidos
    DROP CONSTRAINT IF EXISTS fk_contenidos_tema;

ALTER TABLE public.contenidos
    ADD CONSTRAINT fk_contenidos_tema
    FOREIGN KEY (id_tema)
    REFERENCES public.temas(id_tema)
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
-- Tabla: estudiantes (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.estudiantes
    DROP CONSTRAINT IF EXISTS fk_estudiantes_apoderado;

ALTER TABLE public.estudiantes
    ADD CONSTRAINT fk_estudiantes_apoderado
    FOREIGN KEY (id_apoderado)
    REFERENCES public.apoderados(id_apoderado)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.estudiantes
    DROP CONSTRAINT IF EXISTS fk_estudiantes_usuario;

ALTER TABLE public.estudiantes
    ADD CONSTRAINT fk_estudiantes_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: examenes_de_ingreso (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.examenes_de_ingreso
    DROP CONSTRAINT IF EXISTS fk_examenes_convocatoria;

ALTER TABLE public.examenes_de_ingreso
    ADD CONSTRAINT fk_examenes_convocatoria
    FOREIGN KEY (id_convocatoria)
    REFERENCES public.convocatorias_preuniversitario(id_convocatoria)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.examenes_de_ingreso
    DROP CONSTRAINT IF EXISTS fk_examenes_materia;

ALTER TABLE public.examenes_de_ingreso
    ADD CONSTRAINT fk_examenes_materia
    FOREIGN KEY (id_materia)
    REFERENCES public.materias(id_materia)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: inscripciones (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.inscripciones
    DROP CONSTRAINT IF EXISTS fk_inscripciones_administrativo;

ALTER TABLE public.inscripciones
    ADD CONSTRAINT fk_inscripciones_administrativo
    FOREIGN KEY (id_administrativo)
    REFERENCES public.administrativos(id_administrativo)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.inscripciones
    DROP CONSTRAINT IF EXISTS fk_inscripciones_estudiante;

ALTER TABLE public.inscripciones
    ADD CONSTRAINT fk_inscripciones_estudiante
    FOREIGN KEY (id_estudiante)
    REFERENCES public.estudiantes(id_estudiante)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: materia_asesor (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.materia_asesor
    DROP CONSTRAINT IF EXISTS fk_matasesores_asesores;

ALTER TABLE public.materia_asesor
    ADD CONSTRAINT fk_matasesores_asesores
    FOREIGN KEY (id_asesor)
    REFERENCES public.asesores(id_asesor)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.materia_asesor
    DROP CONSTRAINT IF EXISTS fk_matasesores_materia;

ALTER TABLE public.materia_asesor
    ADD CONSTRAINT fk_matasesores_materia
    FOREIGN KEY (id_materia)
    REFERENCES public.materias(id_materia)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: materia_capacitacion (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.materia_capacitacion
    DROP CONSTRAINT IF EXISTS fk_materia_capacitacion_capacitacion;

ALTER TABLE public.materia_capacitacion
    ADD CONSTRAINT fk_materia_capacitacion_capacitacion
    FOREIGN KEY (id_capacitacion)
    REFERENCES public.capacitaciones(id_capacitacion)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.materia_capacitacion
    DROP CONSTRAINT IF EXISTS fk_materia_capacitacion_materia;

ALTER TABLE public.materia_capacitacion
    ADD CONSTRAINT fk_materia_capacitacion_materia
    FOREIGN KEY (id_materia)
    REFERENCES public.materias(id_materia)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: materia_facultad (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.materia_facultad
    DROP CONSTRAINT IF EXISTS fk_materia_facultad_facultad;

ALTER TABLE public.materia_facultad
    ADD CONSTRAINT fk_materia_facultad_facultad
    FOREIGN KEY (id_facultad)
    REFERENCES public.facultades(id_facultad)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.materia_facultad
    DROP CONSTRAINT IF EXISTS fk_materia_facultad_materia;

ALTER TABLE public.materia_facultad
    ADD CONSTRAINT fk_materia_facultad_materia
    FOREIGN KEY (id_materia)
    REFERENCES public.materias(id_materia)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: matriculaciones (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.matriculaciones
    DROP CONSTRAINT IF EXISTS fk_matriculaciones_estudiantes;

ALTER TABLE public.matriculaciones
    ADD CONSTRAINT fk_matriculaciones_estudiantes
    FOREIGN KEY (id_estudiante)
    REFERENCES public.estudiantes(id_estudiante)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.matriculaciones
    DROP CONSTRAINT IF EXISTS fk_matriculaciones_paralelos;

ALTER TABLE public.matriculaciones
    ADD CONSTRAINT fk_matriculaciones_paralelos
    FOREIGN KEY (id_paralelo)
    REFERENCES public.paralelos(id_paralelo)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: mensualidades (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.mensualidades
    DROP CONSTRAINT IF EXISTS fk_mensualidades_administrativos;

ALTER TABLE public.mensualidades
    ADD CONSTRAINT fk_mensualidades_administrativos
    FOREIGN KEY (id_administrativo)
    REFERENCES public.administrativos(id_administrativo)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.mensualidades
    DROP CONSTRAINT IF EXISTS fk_mensualidades_estudiantes;

ALTER TABLE public.mensualidades
    ADD CONSTRAINT fk_mensualidades_estudiantes
    FOREIGN KEY (id_estudiante)
    REFERENCES public.estudiantes(id_estudiante)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Tabla: materia_facultad_temas (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.materia_facultad_temas
    DROP CONSTRAINT IF EXISTS fk_mft_materia_facultad;

ALTER TABLE public.materia_facultad_temas
    ADD CONSTRAINT fk_mft_materia_facultad
    FOREIGN KEY (id_materia_facultad)
    REFERENCES public.materia_facultad(id_materia_facultad)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.materia_facultad_temas
    DROP CONSTRAINT IF EXISTS fk_mft_tema;

ALTER TABLE public.materia_facultad_temas
    ADD CONSTRAINT fk_mft_tema
    FOREIGN KEY (id_tema)
    REFERENCES public.temas(id_tema)
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
-- Tabla: postulaciones (2 FKs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.postulaciones
    DROP CONSTRAINT IF EXISTS fk_postulaciones_carreras;

ALTER TABLE public.postulaciones
    ADD CONSTRAINT fk_postulaciones_carreras
    FOREIGN KEY (id_carrera)
    REFERENCES public.carreras(id_carrera)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.postulaciones
    DROP CONSTRAINT IF EXISTS fk_postulaciones_estudiantes;

ALTER TABLE public.postulaciones
    ADD CONSTRAINT fk_postulaciones_estudiantes
    FOREIGN KEY (id_estudiante)
    REFERENCES public.estudiantes(id_estudiante)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

COMMIT;
