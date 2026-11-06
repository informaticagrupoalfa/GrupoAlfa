-- =============================================================================
-- 001_usuarios_delete_set_null.sql
-- =============================================================================
-- Cambia las claves foráneas que apuntan a usuarios(id_usuario) para que,
-- al eliminar un usuario, el registro relacionado se deje con id_usuario = NULL
-- en lugar de borrarse en cascada (que choca con los RESTRICT de matriculaciones
-- y mensualidades).
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

BEGIN;

-- administrativos.id_usuario -> usuarios.id_usuario  (CASCADE → SET NULL)
ALTER TABLE administrativos
    DROP CONSTRAINT IF EXISTS fk_administrativos_usuarios;

ALTER TABLE administrativos
    ADD CONSTRAINT fk_administrativos_usuarios
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- apoderados.id_usuario -> usuarios.id_usuario  (CASCADE → SET NULL)
ALTER TABLE apoderados
    DROP CONSTRAINT IF EXISTS fk_apoderados_usuarios;

ALTER TABLE apoderados
    ADD CONSTRAINT fk_apoderados_usuarios
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- estudiantes.id_usuario -> usuarios.id_usuario  (CASCADE → SET NULL)
ALTER TABLE estudiantes
    DROP CONSTRAINT IF EXISTS fk_estudiantes_usuario;

ALTER TABLE estudiantes
    ADD CONSTRAINT fk_estudiantes_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- asignacion_rol.id_usuario -> usuarios.id_usuario  (ya era SET NULL, se deja igual)
ALTER TABLE asignacion_rol
    DROP CONSTRAINT IF EXISTS fk_asignacion_rol_usuario;

ALTER TABLE asignacion_rol
    ADD CONSTRAINT fk_asignacion_rol_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

COMMIT;
