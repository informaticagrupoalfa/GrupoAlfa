-- =============================================================================
-- 007_datos_demo_capacitaciones_paralelos.sql
-- =============================================================================
-- Datos ficticios nuevos para probar el modelo capacitaciones/paralelos.
-- Se apoya en convocatorias, aulas, materias, asesores y estudiantes ya
-- existentes en la base local.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Capacitaciones
-- -----------------------------------------------------------------------------
INSERT INTO public.capacitaciones (id_convocatoria, fecha_inicio, fecha_fin, activo)
VALUES
    (1, DATE '2026-09-01', DATE '2027-02-28', TRUE),
    (2, DATE '2026-10-01', DATE '2027-03-31', TRUE),
    (3, DATE '2026-11-01', DATE '2027-04-30', TRUE);

-- -----------------------------------------------------------------------------
-- Paralelos
-- -----------------------------------------------------------------------------
INSERT INTO public.paralelos
    (id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo)
SELECT c.id_capacitacion, 1, 'Iniciando', 'Paralelo A - Mañana', 'Presencial', TIME '08:00', TIME '12:00', 'Lunes, Miércoles, Viernes', TRUE
FROM public.capacitaciones c
WHERE c.id_convocatoria = 1 AND c.fecha_inicio = DATE '2026-09-01';

INSERT INTO public.paralelos
    (id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo)
SELECT c.id_capacitacion, 2, 'Iniciando', 'Paralelo B - Tarde', 'Presencial', TIME '14:00', TIME '18:00', 'Martes, Jueves', TRUE
FROM public.capacitaciones c
WHERE c.id_convocatoria = 1 AND c.fecha_inicio = DATE '2026-09-01';

INSERT INTO public.paralelos
    (id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo)
SELECT c.id_capacitacion, 3, 'Intermedio', 'Paralelo A - Intensivo', 'Presencial', TIME '08:00', TIME '12:30', 'Lunes a Viernes', TRUE
FROM public.capacitaciones c
WHERE c.id_convocatoria = 2 AND c.fecha_inicio = DATE '2026-10-01';

INSERT INTO public.paralelos
    (id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo)
SELECT c.id_capacitacion, 4, 'Intermedio', 'Paralelo B - Virtual', 'Virtual', TIME '19:00', TIME '21:30', 'Lunes, Miércoles', TRUE
FROM public.capacitaciones c
WHERE c.id_convocatoria = 2 AND c.fecha_inicio = DATE '2026-10-01';

INSERT INTO public.paralelos
    (id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo)
SELECT c.id_capacitacion, 5, 'Avanzado', 'Paralelo A - Fin de semana', 'Híbrida', TIME '09:00', TIME '13:00', 'Sábado, Domingo', TRUE
FROM public.capacitaciones c
WHERE c.id_convocatoria = 3 AND c.fecha_inicio = DATE '2026-11-01';

INSERT INTO public.paralelos
    (id_capacitacion, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, dias, activo)
SELECT c.id_capacitacion, 6, 'Avanzado', 'Paralelo B - Noche', 'Presencial', TIME '18:30', TIME '21:30', 'Martes, Jueves', TRUE
FROM public.capacitaciones c
WHERE c.id_convocatoria = 3 AND c.fecha_inicio = DATE '2026-11-01';

-- -----------------------------------------------------------------------------
-- Materias por capacitación
-- -----------------------------------------------------------------------------
INSERT INTO public.materia_capacitacion (id_materia, id_capacitacion)
SELECT m.id_materia, c.id_capacitacion
FROM public.capacitaciones c
JOIN public.materias m ON m.nombre_materia IN ('Matemáticas', 'Física', 'Lenguaje')
WHERE c.id_convocatoria = 1 AND c.fecha_inicio = DATE '2026-09-01';

INSERT INTO public.materia_capacitacion (id_materia, id_capacitacion)
SELECT m.id_materia, c.id_capacitacion
FROM public.capacitaciones c
JOIN public.materias m ON m.nombre_materia IN ('Matemáticas', 'Química', 'Biología')
WHERE c.id_convocatoria = 2 AND c.fecha_inicio = DATE '2026-10-01';

INSERT INTO public.materia_capacitacion (id_materia, id_capacitacion)
SELECT m.id_materia, c.id_capacitacion
FROM public.capacitaciones c
JOIN public.materias m ON m.nombre_materia IN ('Lenguaje', 'Historia', 'Razonamiento Lógico', 'Informática')
WHERE c.id_convocatoria = 3 AND c.fecha_inicio = DATE '2026-11-01';

-- -----------------------------------------------------------------------------
-- Asesores por paralelo
-- -----------------------------------------------------------------------------
INSERT INTO public.asesor_paralelo (id_asesor, id_paralelo)
SELECT a.id_asesor, p.id_paralelo
FROM public.paralelos p
JOIN public.asesores a ON a.id_asesor IN (2, 3, 4, 5, 6, 7)
WHERE (p.nombre_paralelo = 'Paralelo A - Mañana' AND a.id_asesor = 2)
   OR (p.nombre_paralelo = 'Paralelo B - Tarde' AND a.id_asesor = 3)
   OR (p.nombre_paralelo = 'Paralelo A - Intensivo' AND a.id_asesor = 4)
   OR (p.nombre_paralelo = 'Paralelo B - Virtual' AND a.id_asesor = 5)
   OR (p.nombre_paralelo = 'Paralelo A - Fin de semana' AND a.id_asesor = 6)
   OR (p.nombre_paralelo = 'Paralelo B - Noche' AND a.id_asesor = 7);

-- -----------------------------------------------------------------------------
-- Matrículas de ejemplo
-- -----------------------------------------------------------------------------
INSERT INTO public.matriculaciones
    (id_estudiante, id_paralelo, esta_vigente, nro_comprobante, nro_credencial)
SELECT e.id_estudiante, p.id_paralelo, TRUE, 1000 + e.id_estudiante, 2000 + e.id_estudiante
FROM public.paralelos p
JOIN public.estudiantes e ON e.id_estudiante IN (2, 3, 4)
WHERE (p.nombre_paralelo = 'Paralelo A - Mañana' AND e.id_estudiante = 2)
   OR (p.nombre_paralelo = 'Paralelo A - Intensivo' AND e.id_estudiante = 3)
   OR (p.nombre_paralelo = 'Paralelo A - Fin de semana' AND e.id_estudiante = 4);

-- -----------------------------------------------------------------------------
-- Clases de ejemplo para el pase de lista
-- -----------------------------------------------------------------------------
INSERT INTO public.clases (id_paralelo, id_asesor, id_tema, inicioclase)
SELECT p.id_paralelo, 2, (SELECT id_tema FROM public.temas ORDER BY id_tema LIMIT 1), DATE '2026-11-09'
FROM public.paralelos p
WHERE p.nombre_paralelo = 'Paralelo A - Mañana';

INSERT INTO public.clases (id_paralelo, id_asesor, id_tema, inicioclase)
SELECT p.id_paralelo, 4, (SELECT id_tema FROM public.temas ORDER BY id_tema LIMIT 1), DATE '2026-11-10'
FROM public.paralelos p
WHERE p.nombre_paralelo = 'Paralelo A - Intensivo';

-- -----------------------------------------------------------------------------
-- Asistencias de ejemplo para la primera clase
-- -----------------------------------------------------------------------------
INSERT INTO public.asistencias (id_clase, id_estudiante, hora_entrada, permiso)
SELECT c.id_clase, e.id_estudiante, c.inicioclase::timestamp + TIME '08:00', TRUE
FROM public.clases c
JOIN public.estudiantes e ON e.id_estudiante IN (2, 3)
WHERE c.inicioclase = DATE '2026-11-09';

COMMIT;
