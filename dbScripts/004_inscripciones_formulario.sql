-- =============================================================================
-- 004_inscripciones_formulario.sql
-- =============================================================================
-- Amplía la tabla inscripciones con los datos capturados por el formulario de
-- registro de usuario (datos académicos, personales, del apoderado y
-- administrativos).
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

BEGIN;

ALTER TABLE inscripciones
    ADD COLUMN IF NOT EXISTS id_carrera INT,
    ADD COLUMN IF NOT EXISTS nro_comprobante INT,
    ADD COLUMN IF NOT EXISTS nro_credencial INT,
    ADD COLUMN IF NOT EXISTS inicio_clases DATE,
    ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50),
    ADD COLUMN IF NOT EXISTS horario VARCHAR(100),
    ADD COLUMN IF NOT EXISTS grupo VARCHAR(50),
    ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100),
    ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100),
    ADD COLUMN IF NOT EXISTS nombre VARCHAR(100),
    ADD COLUMN IF NOT EXISTS edad INT,
    ADD COLUMN IF NOT EXISTS correo_electronico VARCHAR(150),
    ADD COLUMN IF NOT EXISTS colegio_de_procedencia VARCHAR(150),
    ADD COLUMN IF NOT EXISTS direccion_de_domicilio VARCHAR(255),
    ADD COLUMN IF NOT EXISTS firma TEXT,
    ADD COLUMN IF NOT EXISTS apoderado_nombre_completo VARCHAR(200),
    ADD COLUMN IF NOT EXISTS apoderado_celular VARCHAR(20),
    ADD COLUMN IF NOT EXISTS apoderado_parentesco VARCHAR(100),
    ADD COLUMN IF NOT EXISTS como_se_entero_detalle VARCHAR(255),
    ADD COLUMN IF NOT EXISTS elaborado_por VARCHAR(150),
    ADD COLUMN IF NOT EXISTS sucursal VARCHAR(100),
    ADD COLUMN IF NOT EXISTS fecha_registro DATE DEFAULT CURRENT_DATE;

ALTER TABLE inscripciones
    DROP CONSTRAINT IF EXISTS fk_inscripciones_carrera;

ALTER TABLE inscripciones
    ADD CONSTRAINT fk_inscripciones_carrera
    FOREIGN KEY (id_carrera)
    REFERENCES carreras(id_carrera)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

COMMENT ON COLUMN inscripciones.inicio_clases IS 'Fecha de inicio de clases del inscrito.';
COMMENT ON COLUMN inscripciones.fecha_registro IS 'Fecha en la que se registró la inscripción.';

COMMIT;
