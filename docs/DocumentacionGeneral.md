# Documentación General — Sistema Académico Grupo Alfa

Documentación del Módulo 1 del sistema académico de la institución Grupo Alfa. El contenido funcional se adaptó de `docs/Analisis.md`; las tecnologías y el esquema de base de datos se verificaron contra los archivos del proyecto, que tienen prioridad sobre el análisis.

**Fuentes utilizadas:**

- `docs/Analisis.md` — problema, objetivos, alcance, actores, requisitos y procesos.
- `dbScripts/Script.sql` — esquema real de la base de datos PostgreSQL.
- `dbScripts/Esquema ER.pgerd` — modelo entidad-relación.
- `backend/package.json`, `frontend/package.json`, `package.json` y `Mobile/` — tecnologías y versiones.
- `backend/src/` — autenticación, validaciones, rutas y configuración.
- `docs/pantallas.md` — rutas y funcionalidad de las pantallas web.

Se omitieron las tecnologías mencionadas en el análisis que no tienen respaldo en los archivos del proyecto.

---

## 1. Información general del proyecto

### 1.1. Nombre del sistema

- **Nombre de la plataforma:** Sistema Académico para la Institución Grupo Alfa: Módulo 1.
- **Nombre corto o sigla:** Grupo Alfa / Sistema Académico.

### 1.2. Descripción

- **¿Qué es la plataforma?**
  Es un sistema académico para centralizar la información de estudiantes, apoderados, asesores, grupos, materias, aulas, horarios, cursos de capacitación, matrículas, mensualidades y registros de asistencia de la institución Grupo Alfa.

- **¿Qué problema busca solucionar?**
  La institución gestiona actualmente la asistencia y los registros académicos de forma manual, con listas impresas, carpetas físicas, formularios y fuentes de información dispersas. Esto dificulta la trazabilidad, el control y la verificación de quién asistió, en qué fecha, horario, materia y aula, especialmente cuando funcionan varios grupos, aulas y horarios simultáneamente.

- **¿A quién está dirigida?**
  Está dirigida al personal administrativo de la institución, a los docentes o asesores, a los estudiantes y, cuando corresponde, a sus padres o apoderados.

- **Situación actual (resumen del análisis):**
  La asistencia se registra en listas impresas que se entregan al aula, se completan por los estudiantes, se recogen y se archivan físicamente. Parte de la información se administra en hojas de cálculo y existen registros manuales para actividades extraordinarias. El proceso depende del desplazamiento del personal administrativo y presenta riesgo de pérdida de documentos, errores humanos y falta de actualización inmediata.

### 1.3. Objetivo general

Diseñar y desarrollar un sistema académico para el control de asistencia de la institución Grupo Alfa, centralizando la información de estudiantes, grupos, materias, aulas, horarios y registros de asistencia, con el propósito de mejorar la gestión académica y facilitar el seguimiento del desempeño y la asistencia de los estudiantes por parte de la institución y, cuando corresponda, de sus padres o apoderados.

### 1.4. Objetivos específicos

- Diseñar una base de datos que permita centralizar la información académica y administrativa relacionada con los estudiantes.
- Implementar mecanismos digitales para el registro y control de asistencia.
- Registrar la asistencia de los estudiantes considerando la fecha, materia, grupo, aula y horario.
- Registrar y gestionar permisos de salida anticipada.
- Mantener información de los apoderados de los estudiantes cuando corresponda.
- Realizar la trazabilidad de permisos.
- Centralizar la información de horarios, aulas, materias y grupos.
- Facilitar la generación de reportes relacionados con la asistencia.
- Permitir una mejor trazabilidad de las inscripciones y del historial académico del estudiante.
- Establecer una estructura que pueda ampliarse posteriormente hacia otros módulos del sistema académico.

### 1.5. Alcance

#### Incluido

- Inscripción de alumnos: registro, matriculación y asociación de estudiantes con cursos, horarios y asignaturas correspondientes.
- Control y registro de asistencias: registro digitalizado de asistencias por clase, faltas, atrasos y licencias justificadas.
- Coordinación y asignación de horarios: configuración de horarios académicos y asignación de aulas, evitando solapamientos o conflictos por capacidad.
- Gestión de usuarios, estudiantes, apoderados, asesores, personal administrativo, facultades, carreras, convocatorias, materias, temas, aulas y cursos de capacitación.
- Registro de matrículas y mensualidades en el esquema de datos y en las pantallas implementadas.

#### Fuera del alcance

- Módulo de Caja y Finanzas: cobro de inscripciones y facturación electrónica.
- Contratación de docentes: contratos y pagos a docentes.
- Contratación de personal administrativo: reclutamiento, gestión de recursos humanos y planillas de sueldos.
- Control de horarios administrativos: marcado biométrico y control de jornada laboral del personal no docente.

> El esquema de base de datos incluye `mensualidades` y datos de inscripción, aunque el módulo de caja y finanzas se mantiene fuera del alcance según el análisis.

> Las actividades extraordinarias, evaluaciones, calificaciones, certificación y reportes aparecen en el análisis como necesidades, pero no se encontraron módulos implementados para ellas en el proyecto.

### 1.6. Actores del sistema

| Actor | Descripción |
|---|---|
| Estudiante | Participa en los procesos académicos, asiste a clases y puede solicitar cambios de horario, recuperación de clases, permisos de salida, inscripción, credenciales y participación en actividades extraordinarias. |
| Docente / Asesor | Planifica y ejecuta las materias. Puede participar en capacitaciones de distintas facultades y coordinarse con otros docentes para la asignación de horarios. |
| Personal administrativo | Entrega y recoge listas, verifica cantidades, archiva registros, controla permisos de salida, verifica información de estudiantes y realiza procesos de inscripción. |
| Padre o apoderado | Realiza seguimiento del estudiante, especialmente en casos de menores, y puede solicitar información sobre exámenes, asistencia, descuentos, precios y requisitos de los cursos. |
| Coordinador de materia / horarios | Docente representante de una materia que participa en la coordinación de horarios. |
| Administrador del sistema | Usuario asociado al rol SysAdmin en el catálogo; no se identificó una pantalla específica de administración. |

---

# 2. Descripción del funcionamiento

## 2.1. Flujo general

```text
Registro del usuario / estudiante
        ↓
Inscripción y matriculación en un curso de capacitación
        ↓
Asignación de curso, aula y horario
        ↓
Registro de clases
        ↓
Toma de asistencia
        ↓
Consulta de asistencias
        ↓
Control de mensualidades
```

## 2.2. Módulos del sistema

- [x] Autenticación
- [x] Usuarios
- [x] Estudiantes
- [x] Docentes / Asesores
- [x] Cursos de capacitación
- [ ] Paralelos
- [x] Inscripciones
- [x] Asistencia
- [ ] Evaluaciones
- [ ] Calificaciones
- [ ] Horarios como módulo independiente
- [x] Pagos / Mensualidades
- [ ] Certificados
- [ ] Reportes
- [ ] Configuración

**Módulos adicionales implementados:**

- Materias y temas.
- Facultades y carreras.
- Convocatorias.
- Aulas.
- Matriculaciones.
- Roles y asignación de roles.
- Clases, avances y asistencias.

> Los horarios se almacenan como datos del curso de capacitación (`fecha_inicio`, `hora_inicio` y `hora_fin`) y del aula asignada; no existe una pantalla independiente de horarios.

---

# 3. Requerimientos

## 3.1. Requerimientos funcionales

El estado se determina según lo implementado en el repositorio. **Parcial** indica que existen datos, endpoints o parte del flujo, pero no una funcionalidad completa de interfaz o de proceso.

| ID | Requerimiento | Actor | Estado |
|---|---|---|---|
| RF-001 | Registrar y consultar la información de los estudiantes, incluyendo asistencia, materias, exámenes y actividades extraordinarias. | Personal administrativo | Parcial |
| RF-002 | Registrar cuando un estudiante solicita retirarse antes de finalizar el horario establecido. | Personal administrativo | Parcial |
| RF-003 | Almacenar los datos del apoderado del estudiante cuando la institución requiera este mecanismo de control. | Personal administrativo | Implementado |
| RF-004 | Registrar el motivo de la salida y la autorización o confirmación correspondiente. | Personal administrativo | Parcial |
| RF-005 | Consultar horarios y aulas disponibles para facilitar la asignación de estudiantes y la gestión de cambios. | Personal administrativo | Parcial |
| RF-006 | Registrar grupos asociados con preparación, aula, horario y materia, y mostrar la disponibilidad de cupos. | Personal administrativo | Parcial |
| RF-007 | Registrar las materias que forman parte de las diferentes preparaciones. | Personal administrativo | Implementado |
| RF-008 | Registrar las aulas disponibles y asociarlas con grupos y horarios. | Personal administrativo | Implementado |
| RF-009 | Consultar quién asistió, en qué fecha, horario, materia y aula. | Personal administrativo / Asesor | Implementado |
| RF-010 | Registrar actividades extraordinarias de fin de semana como talleres, repasos, maratones y exámenes simulacro. | Personal administrativo | Pendiente |
| RF-011 | Conocer los estudiantes activos por grupo. | Personal administrativo | Parcial |
| RF-012 | Ver la lista oficial de estudiantes por grupo. | Asesor / Personal administrativo | Implementado |
| RF-013 | Conocer la capacidad de aula y el total de estudiantes inscritos para todos los grupos. | Personal administrativo | Parcial |
| RF-014 | Ver en tiempo real la cantidad de inscritos. | Personal administrativo | Parcial |
| RF-015 | Conocer las fechas de pago de estudiantes. | Personal administrativo | Implementado |
| RF-016 | Realizar cambios de carrera para la capacitación. | Personal administrativo | Pendiente |
| RF-017 | Registrar permisos en las listas, incluyendo retiro anticipado y motivo. | Personal administrativo | Parcial |
| RF-018 | Revisar el aula en la que se encuentra un estudiante a partir de la carrera y el horario. | Apoderado / Personal administrativo | Parcial |
| RF-019 | Conocer el porcentaje de estudiantes que aprueba el examen de ingreso. | Personal administrativo | Pendiente |
| RF-020 | Registrar permisos para recuperar clases con otro asesor. | Personal administrativo | Pendiente |
| RF-021 | Identificar estudiantes que asisten como oyentes y validar su situación. | Personal administrativo | Pendiente |
| RF-022 | Ver la lista de asesores que dictan las capacitaciones. | Personal administrativo | Implementado |
| RF-023 | Ver la lista de talleres vigentes y el aula en la que se desarrollan. | Personal administrativo | Pendiente |

**Requerimientos adicionales identificados en el proyecto:**

| ID | Requerimiento | Estado |
|---|---|---|
| RF-024 | Autenticar usuarios mediante correo o carnet y contraseña, con sesión JWT. | Implementado |
| RF-025 | Gestionar usuarios y asignar roles de asesor, administrativo, apoderado o estudiante. | Implementado |
| RF-026 | Registrar matrículas de estudiantes en cursos de capacitación, con comprobante y credencial. | Implementado |
| RF-027 | Registrar mensualidades con fecha de inicio, fecha de fin y monto pagado. | Implementado |
| RF-028 | Gestionar facultades, carreras, convocatorias, aulas, materias y temas. | Parcial |

## 3.2. Requerimientos no funcionales

### RNF-001 — Seguridad

El análisis exige controlar el acceso, proteger la información de estudiantes y apoderados y que las funciones dependan del rol del usuario. La implementación actual autentica con JWT, almacena las contraseñas con hash bcrypt y protege los endpoints; no se encontró una matriz de permisos por rol implementada.

### RNF-002 — Rendimiento

- Tiempo máximo esperado de respuesta: no más de 1 segundo para consultas habituales de estudiantes, horarios y asistencia.
- Número esperado de usuarios simultáneos: no definido en el análisis.

### RNF-003 — Disponibilidad

- Horario de disponibilidad: jornadas de atención de 8:00 a 20:00 y jornadas de capacitación de la institución.
- Nivel de disponibilidad esperado: no definido en el análisis.

### RNF-004 — Usabilidad

La interfaz debe ser sencilla, intuitiva y accesible para que el personal administrativo pueda registrar y consultar información sin depender de procedimientos técnicos complejos.

### RNF-005 — Mantenibilidad

La aplicación debe organizarse modularmente para permitir agregar posteriormente otros módulos académicos y administrativos sin necesidad de refactorizar la estructura existente.

### RNF-006 — Integridad de datos

La información debe mantener relaciones consistentes entre estudiantes, grupos, materias, aulas, horarios y asistencias, aplicando restricciones de clave foránea y validaciones de unicidad en la base de datos.

### RNF-007 — Escalabilidad

La arquitectura debe permitir incorporar nuevas facultades, materias, grupos, aulas, horarios y actividades sin rediseñar completamente el sistema.

### RNF-008 — Trazabilidad

Los registros de asistencia y permisos deben conservar información suficiente para conocer cuándo ocurrió el evento y a qué estudiante, clase, materia y aula estuvo asociado. El esquema registra fecha y hora de entrada, salida anticipada, permiso y razón del permiso. No se encontró un campo que registre el usuario que creó el registro de asistencia.

---

# 4. Usuarios y permisos

## 4.1. Roles

**Roles definidos en los datos de ejemplo de la base de datos (`dbScripts/UsuariosFicticios.sql`):**

- SysAdmin
- Rooter
- Gerencia
- Cajero
- Administración
- Asesor Coordinador
- Asesor
- Apoderado
- Estudiante
- Invitado

**Roles gestionados desde la pantalla de Usuarios:**

- Asesor.
- Administrativo.
- Apoderado.
- Estudiante.

No se encontró una matriz de permisos por rol implementada. El control de acceso actual se limita a exigir autenticación; la interfaz no restringe módulos según el rol del usuario.

## 4.2. Autenticación

- **Método de autenticación:** el backend acepta `id_usuario`, `nro_carnet` o `correo_electronico` junto con la contraseña. La pantalla web de inicio de sesión utiliza el correo electrónico.
- **Recuperación de contraseña:** no implementada.
- **Política de contraseñas:** mínimo 8 caracteres al registrar o actualizar un usuario, validado en el frontend y en el backend con Zod.
- **Gestión de sesiones:** token JWT firmado con `JWT_SECRET`, con expiración por defecto de 8 días. El token se devuelve en la respuesta, se guarda en `localStorage` (`ga_token`) y también se establece como cookie `jwt` con `httpOnly`, `sameSite: strict` y duración de 7 días. En producción la cookie usa `secure`.
- **Cierre de sesión:** el endpoint `POST /api/usuarios/logout` limpia la cookie `jwt`. La interfaz web, al presionar **Cerrar sesión**, elimina `ga_token` y `ga_user` de `localStorage` y redirige al login; no invoca el endpoint de logout.

## 4.3. Autorización

- **Roles:** existen el catálogo `roles` y la tabla puente `asignacion_rol` en el esquema. La pantalla de Usuarios no escribe en esas tablas: los roles operativos se asignan creando registros en `asesores`, `administrativos`, `apoderados` o `estudiantes`.
- **Permisos:** no se identificó una matriz de permisos por rol ni restricciones por módulo en el frontend.
- **Restricciones de acceso:** las rutas del frontend bajo `/app` requieren un usuario almacenado en `localStorage`; los endpoints del backend, excepto registro, login y logout, requieren un JWT válido mediante `authMiddleware`.

---

# 5. Módulo de estudiantes

## 5.1. Registro

Datos almacenados en la tabla `estudiantes` y en la tabla relacionada `usuarios`:

- **Código / carnet:** `usuarios.nro_carnet` (`INT`, único, obligatorio).
- **Nombres:** `usuarios.nombre` (`VARCHAR(100)`, obligatorio).
- **Apellidos:** `usuarios.apellido_paterno` (`VARCHAR(100)`, obligatorio) y `usuarios.apellido_materno` (`VARCHAR(100)`).
- **Fecha de nacimiento:** `usuarios.fecha_nacimiento` (`DATE`).
- **Teléfono:** no se almacena en `estudiantes`; el apoderado tiene `apoderados.celular` (`VARCHAR(20)`).
- **Correo:** `usuarios.correo_electronico` (`VARCHAR(150)`, único).
- **Dirección:** `estudiantes.direccion_de_domicilio` (`VARCHAR(255)`).
- **Colegio de procedencia:** `estudiantes.colegio_de_procedencia` (`VARCHAR(150)`).
- **Estado:** `usuarios.usuario_vigente` (`BOOLEAN`).
- **Apoderado:** `estudiantes.id_apoderado` (FK opcional a `apoderados`).
- **Fotografía:** `estudiantes.foto` (`BYTEA`); no se gestiona desde la interfaz web en esta versión.

## 5.2. Gestión

- Crear estudiante asociado a un usuario existente.
- Editar datos personales y académicos.
- Asignar o cambiar el apoderado.
- Marcar al usuario como vigente o no vigente.
- Buscar estudiantes en la tabla.
- Eliminar el registro.
- Asignar el rol de Estudiante desde la pantalla de Usuarios.

## 5.3. Historial académico

```text
Estudiante
 ├── Matriculaciones
 │    └── Cursos de capacitación
 ├── Asistencias
 │    └── Clases
 ├── Mensualidades
 ├── Postulaciones
 └── Apoderado
```

> El historial se obtiene de las relaciones de la base de datos; no existe una pantalla específica de historial académico.

---

# 6. Módulo académico

## 6.1. Cursos

- Crear curso de capacitación.
- Editar curso de capacitación.
- Asignar convocatoria y aula.
- Definir nivel, modalidad, fecha de inicio y horario (`hora_inicio`, `hora_fin`).
- Asignar asesores al curso mediante `asignaciones_asesores`.
- Asignar materias al curso mediante `asignaciones_materias`.
- Eliminar curso.

> La duración se representa con la fecha de inicio y las horas de inicio y fin; no existe una fecha de finalización del curso en el esquema.

## 6.2. Paralelos

Sin contenido en el análisis para este proyecto. El modelo utiliza cursos de capacitación y aulas en lugar de una entidad de paralelos.

## 6.3. Inscripciones

- Registro de datos de inscripción: administrativo, estudiante, cómo se enteró de la institución, recálculo, preparación previa, tiempo y lugar de preparación.
- Asociación del estudiante a un curso de capacitación mediante `matriculaciones`.
- Registro de número de comprobante y número de credencial.
- Control de vigencia de la matrícula mediante `esta_vigente`.
- Consulta de inscripciones y matrículas.

> No se encontraron pantallas específicas de retiro, cambio de paralelo ni historial de inscripciones.

---

# 7. Asistencia

## 7.1. Registro

Estados y datos disponibles en el esquema y en la interfaz:

- **Presente:** existe un registro en `asistencias` con `hora_entrada` y sin marca de ausencia.
- **Ausente:** la interfaz envía el registro con `permiso = false`.
- **Salida anticipada:** campo `salida_antes_de_tiempo` (`TIMESTAMP`).
- **Permiso:** campo `permiso` (`BOOLEAN`) y `razon_permiso` (`VARCHAR(150)`).

> No se encontraron estados específicos de “retraso” o “justificado” como valores independientes en la base de datos.

## 7.2. Consulta

- Asistencia por clase.
- Asistencia por estudiante mediante el endpoint de asistencias.
- Filtros por rango de fechas, curso, materia y tema en la pantalla Llamar lista.
- Detalle de una lista con estudiantes presentes, ausentes y sin marcar.
- Conteo de presentes y ausentes por clase.

## 7.3. Reportes

Sin contenido en el análisis para reportes de asistencia implementados. La pantalla permite consultar y filtrar listas, pero no generar reportes consolidados ni porcentajes de asistencia.

---

# 8. Evaluaciones y calificaciones

Sin contenido en el análisis para un módulo implementado de evaluaciones y calificaciones. El esquema incluye exámenes de ingreso y contenidos, pero no una entidad de notas ni un cálculo de calificación final.

---

# 9. Horarios

## 9.1. Gestión

- Los horarios se registran como parte del curso de capacitación: `fecha_inicio`, `hora_inicio` y `hora_fin`.
- El aula se asigna al curso mediante `cursos_capacitacion.id_aula`.
- La convocatoria se asigna mediante `cursos_capacitacion.id_convocatoria`.
- Los asesores se asignan al curso mediante `asignaciones_asesores`.
- Las materias se asignan al curso mediante `asignaciones_materias`.

No existe una pantalla independiente de horarios ni una entidad `horario` en el esquema.

## 9.2. Conflictos

Sin contenido en el análisis para la detección automática de conflictos implementada. No se encontraron validaciones de docente en dos clases simultáneas, aula ocupada o cursos con horarios superpuestos.

---

# 10. Certificación

Sin contenido en el análisis para este proyecto.

---

# 11. Reportes

Sin contenido en el análisis para reportes implementados. El análisis menciona la generación de reportes como una necesidad y objetivo futuro, pero no se encontró un módulo de reportes en el proyecto.

---

# 12. Arquitectura del sistema

## 12.1. Arquitectura general

```text
┌──────────────────────────┐        ┌──────────────────────────┐
│ Aplicación web (React)   │        │ Aplicación Android       │
│ Navegador del usuario    │        │ Kotlin + Jetpack Compose │
└────────────┬─────────────┘        │ (base inicial, sin       │
             │ HTTP/REST + JWT      │ integración de red)      │
             ▼                      └──────────────────────────┘
┌──────────────────────────┐
│ Backend API              │
│ Node.js + Express        │
└────────────┬─────────────┘
             │ pg / SQL
             ▼
┌──────────────────────────┐
│ Base de datos            │
│ PostgreSQL               │
└──────────────────────────┘
```

La aplicación web consume la API REST. El proyecto móvil existe como base Android con Kotlin y Jetpack Compose, sin integración de red implementada en esta versión. El backend concentra la lógica de negocio, la validación y el acceso a PostgreSQL.

## 12.2. Tecnologías

| Componente | Tecnología | Versión |
|---|---|---|
| Frontend | React | 18.2.0 |
| Frontend | React DOM | 18.2.0 |
| Frontend | React Router DOM | 7.18.4 |
| Frontend | Axios | 1.4.0 |
| Frontend | PropTypes | 15.8.1 |
| Build | Vite | 4.3.9 |
| Build | @vitejs/plugin-react | 4.0.1 |
| Build | concurrently (scripts raíz) | 9.2.5 |
| Backend | Node.js | No especificada en el proyecto |
| Backend | Express | 5.2.1 |
| Backend | jsonwebtoken | 9.0.3 |
| Backend | bcrypt | 6.0.0 |
| Backend | pg | 8.23.0 |
| Backend | Zod | 4.6.5 |
| Backend | dotenv | 17.4.2 |
| Backend | cors | 2.8.6 |
| Backend | morgan | 1.12.1 |
| Backend | cookie-parser | 1.4.7 |
| API | REST / JSON | Sin versionado en la URL |
| Base de datos | PostgreSQL | No especificada en el proyecto |
| Mobile | Kotlin | 2.2.10 |
| Mobile | Jetpack Compose (BOM) | 2026.02.01 |
| Mobile | Android Gradle Plugin | 9.3.3 |
| Mobile | minSdk / targetSdk / compileSdk | 24 / 37 / 37 |
| Control de versiones | Git | — |
| Repositorio | GitHub | `https://github.com/mluquet-glitch/Grupo-Alfa.git` |

## 12.3. Componentes externos

- **Servicio de correo:** no identificado.
- **Servicio de autenticación:** autenticación propia con JWT; no se identificaron proveedores externos.
- **Almacenamiento:** PostgreSQL; no se identificó un servicio externo de almacenamiento.
- **APIs externas:** no identificadas.
- **Otros:** no identificados.

---

# 13. Base de datos

## 13.1. Modelo entidad-relación

El modelo se encuentra en [`dbScripts/Esquema ER.pgerd`](../dbScripts/Esquema%20ER.pgerd). El script de creación se encuentra en [`dbScripts/Script.sql`](../dbScripts/Script.sql). El esquema contiene 27 tablas.

## 13.2. Tablas

### Tabla: `usuarios`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_usuario` | `INT` | PK, identidad | Identificador del usuario. |
| `nro_carnet` | `INT` | `UNIQUE`, `NOT NULL` | Número de carnet del usuario. |
| `apellido_paterno` | `VARCHAR(100)` | `NOT NULL` | Apellido paterno. |
| `apellido_materno` | `VARCHAR(100)` | — | Apellido materno. |
| `nombre` | `VARCHAR(100)` | `NOT NULL` | Nombre del usuario. |
| `fecha_nacimiento` | `DATE` | — | Fecha de nacimiento. |
| `correo_electronico` | `VARCHAR(150)` | `UNIQUE` | Correo electrónico. |
| `contraseña` | `VARCHAR(255)` | — | Hash de la contraseña (bcrypt). |
| `usuario_vigente` | `BOOLEAN` | — | Indica si el usuario está vigente. |

> En `Script.sql` la columna aparece como `Usuario_vigente`; al no estar entre comillas, PostgreSQL la crea con el nombre `usuario_vigente`, que es el usado por el backend.

### Tabla: `administrativos`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_administrativo` | `INT` | PK, identidad | Identificador del administrativo. |
| `id_usuario` | `INT` | FK → `usuarios(id_usuario)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Usuario asociado. |

### Tabla: `facultades`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_facultad` | `INT` | PK, identidad | Identificador de la facultad. |
| `nombre` | `VARCHAR(150)` | `NOT NULL` | Nombre de la facultad. |

### Tabla: `aulas`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_aula` | `INT` | PK, identidad | Identificador del aula. |
| `capacidad` | `INT` | `NOT NULL`, `CHECK (capacidad > 0)` | Capacidad máxima del aula. |

### Tabla: `asesores`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_asesor` | `INT` | PK, identidad | Identificador del asesor. |
| `id_usuario` | `INT` | FK → `usuarios(id_usuario)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Usuario asociado. |

### Tabla: `materias`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_materia` | `INT` | PK, identidad | Identificador de la materia. |
| `nombre_materia` | `VARCHAR(150)` | `NOT NULL` | Nombre de la materia. |

### Tabla: `temas`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_tema` | `INT` | PK, identidad | Identificador del tema. |
| `id_materia` | `INT` | FK → `materias(id_materia)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Materia a la que pertenece el tema. |
| `nombre_tema` | `VARCHAR(100)` | — | Nombre del tema. |

### Tabla: `apoderados`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_apoderado` | `INT` | PK, identidad | Identificador del apoderado. |
| `id_usuario` | `INT` | FK → `usuarios(id_usuario)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Usuario asociado. |
| `celular` | `VARCHAR(20)` | — | Número de celular del apoderado. |

### Tabla: `estudiantes`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_estudiante` | `INT` | PK, identidad | Identificador del estudiante. |
| `id_usuario` | `INT` | `UNIQUE`; FK → `usuarios(id_usuario)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Usuario asociado al estudiante. |
| `id_apoderado` | `INT` | FK → `apoderados(id_apoderado)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Apoderado del estudiante. |
| `colegio_de_procedencia` | `VARCHAR(150)` | — | Colegio de procedencia. |
| `direccion_de_domicilio` | `VARCHAR(255)` | — | Dirección del domicilio. |
| `foto` | `BYTEA` | — | Fotografía del estudiante. |

### Tabla: `inscripciones`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_inscripcion` | `INT` | PK, identidad | Identificador de la inscripción. |
| `id_administrativo` | `INT` | FK → `administrativos(id_administrativo)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Administrativo que registra la inscripción. |
| `id_estudiante` | `INT` | FK → `estudiantes(id_estudiante)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Estudiante inscrito. |
| `como_se_entero_de_nosotros` | `VARCHAR(255)` | — | Medio por el que conoció la institución. |
| `recalculo` | `BOOLEAN` | `DEFAULT FALSE` | Indica si aplica recálculo. |
| `preparacion_previa` | `BOOLEAN` | `DEFAULT FALSE` | Indica si tuvo preparación previa. |
| `tiempo_de_preparacion_meses` | `INT` | `DEFAULT 0` | Tiempo de preparación previa en meses. |
| `lugar_de_preparacion` | `VARCHAR(255)` | — | Lugar donde realizó su preparación. |

### Tabla: `roles`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_rol` | `INT` | PK, identidad | Identificador del rol. |
| `nombre` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | Nombre del rol. |

### Tabla: `asignacion_rol`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_asignacion_rol` | `INT` | PK, identidad | Identificador de la asignación. |
| `id_rol` | `INT` | `NOT NULL`; FK → `roles(id_rol)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Rol asignado. |
| `id_usuario` | `INT` | `NOT NULL`; FK → `usuarios(id_usuario)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Usuario que recibe el rol. |

### Tabla: `carreras`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_carrera` | `INT` | PK, identidad | Identificador de la carrera. |
| `id_facultad` | `INT` | `NOT NULL`; FK → `facultades(id_facultad)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Facultad a la que pertenece. |
| `nombre` | `VARCHAR(150)` | `NOT NULL` | Nombre de la carrera. |

### Tabla: `convocatorias_preuniversitario`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_convocatoria` | `INT` | PK, identidad | Identificador de la convocatoria. |
| `id_facultad` | `INT` | `NOT NULL`; FK → `facultades(id_facultad)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Facultad de la convocatoria. |
| `fecha_inicio` | `DATE` | `NOT NULL` | Fecha de inicio de la convocatoria. |

### Tabla: `examenes_de_ingreso`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_examen_de_ingreso` | `INT` | PK, identidad | Identificador del examen. |
| `id_convocatoria` | `INT` | FK → `convocatorias_preuniversitario(id_convocatoria)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Convocatoria asociada. |
| `id_materia` | `INT` | FK → `materias(id_materia)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Materia del examen. |
| `foto` | `BYTEA` | — | Imagen o archivo asociado. |

### Tabla: `contenidos`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_contenido` | `INT` | PK, identidad | Identificador del contenido. |
| `id_examen_de_ingreso` | `INT` | FK → `examenes_de_ingreso(id_examen_de_ingreso)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Examen asociado. |
| `id_tema` | `INT` | FK → `temas(id_tema)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Tema incluido en el examen. |

### Tabla: `materias_asesores`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_materia_asesor` | `INT` | PK, identidad | Identificador de la relación. |
| `id_asesor` | `INT` | `NOT NULL`; FK → `asesores(id_asesor)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Asesor. |
| `id_materia` | `INT` | `NOT NULL`; FK → `materias(id_materia)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Materia que dicta el asesor. |

### Tabla: `postulaciones`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_postulacion` | `INT` | PK, identidad | Identificador de la postulación. |
| `id_estudiante` | `INT` | `NOT NULL`; FK → `estudiantes(id_estudiante)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Estudiante que postula. |
| `id_carrera` | `INT` | `NOT NULL`; FK → `carreras(id_carrera)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Carrera a la que postula. |

### Tabla: `cursos_capacitacion`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_capacitacion` | `INT` | PK, identidad | Identificador del curso de capacitación. |
| `id_convocatoria` | `INT` | `NOT NULL`; FK → `convocatorias_preuniversitario(id_convocatoria)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Convocatoria asociada. |
| `id_aula` | `INT` | `NOT NULL`; FK → `aulas(id_aula)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Aula asignada. |
| `nivel` | `VARCHAR(100)` | — | Nivel del curso. |
| `nombre` | `VARCHAR(150)` | `NOT NULL` | Nombre del curso. |
| `modalidad` | `VARCHAR(50)` | — | Modalidad del curso. |
| `fecha_inicio` | `DATE` | — | Fecha de inicio. |
| `hora_inicio` | `TIME` | — | Hora de inicio. |
| `hora_fin` | `TIME` | — | Hora de finalización. |

### Tabla: `materias_convocatoria_asignacion`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_asignacion_materia_convocatoria` | `INT` | PK, identidad | Identificador de la asignación. |
| `id_convocatoria` | `INT` | `NOT NULL`; FK → `convocatorias_preuniversitario(id_convocatoria)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Convocatoria. |
| `id_materia` | `INT` | `NOT NULL`; FK → `materias(id_materia)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Materia asignada. |

### Tabla: `asignaciones_asesores`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_asignacion_asesor` | `INT` | PK, identidad | Identificador de la asignación. |
| `id_asesor` | `INT` | `NOT NULL`; FK → `asesores(id_asesor)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Asesor asignado. |
| `id_curso_capacitacion` | `INT` | `NOT NULL`; FK → `cursos_capacitacion(id_capacitacion)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Curso de capacitación. |

### Tabla: `asignaciones_materias`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_asignacion_materia` | `INT` | PK, identidad | Identificador de la asignación. |
| `id_materia` | `INT` | `NOT NULL`; FK → `materias(id_materia)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Materia asignada. |
| `id_curso_capacitacion` | `INT` | `NOT NULL`; FK → `cursos_capacitacion(id_capacitacion)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Curso de capacitación. |

### Tabla: `matriculaciones`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_matriculacion` | `INT` | PK, identidad | Identificador de la matrícula. |
| `id_estudiante` | `INT` | `NOT NULL`; FK → `estudiantes(id_estudiante)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Estudiante matriculado. |
| `id_curso_capacitacion` | `INT` | `NOT NULL`; FK → `cursos_capacitacion(id_capacitacion)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Curso de capacitación. |
| `esta_vigente` | `BOOLEAN` | `DEFAULT TRUE` | Indica si la matrícula está vigente. |
| `nro_comprobante` | `INT` | — | Número de comprobante de pago. |
| `nro_credencial` | `INT` | — | Número de credencial. |

### Tabla: `clases`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_clase` | `INT` | PK, identidad | Identificador de la clase. |
| `id_curso_capacitacion` | `INT` | `NOT NULL`; FK → `cursos_capacitacion(id_capacitacion)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Curso al que pertenece la clase. |
| `id_asesor` | `INT` | `NOT NULL`; FK → `asesores(id_asesor)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Asesor que dicta la clase. |
| `id_tema` | `INT` | Sin FK declarada en el script | Tema trabajado en la clase. |
| `inicioClase` | `DATE` | `NOT NULL` | Fecha de la clase. |

### Tabla: `avances`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_avance` | `INT` | PK, identidad | Identificador del avance. |
| `id_clase` | `INT` | FK → `clases(id_clase)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Clase asociada. |
| `id_tema` | `INT` | FK → `temas(id_tema)`; `ON UPDATE CASCADE`, `ON DELETE SET NULL` | Tema avanzado. |

### Tabla: `mensualidades`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_mensualidad` | `INT` | PK, identidad | Identificador de la mensualidad. |
| `id_estudiante` | `INT` | `NOT NULL`; FK → `estudiantes(id_estudiante)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Estudiante que paga. |
| `id_administrativo` | `INT` | `NOT NULL`; FK → `administrativos(id_administrativo)`; `ON UPDATE CASCADE`, `ON DELETE RESTRICT` | Administrativo que registra el pago. |
| `fecha_inicio_mensualidad` | `DATE` | `NOT NULL` | Inicio del período pagado. |
| `fecha_fin_mensualidad` | `DATE` | `NOT NULL` | Fin del período pagado. |
| `pago` | `NUMERIC(10,2)` | `NOT NULL`, `CHECK (pago >= 0)` | Monto pagado. |

### Tabla: `asistencias`

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_asistencia` | `INT` | PK, identidad | Identificador de la asistencia. |
| `id_clase` | `INT` | `NOT NULL`; FK → `clases(id_clase)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Clase asociada. |
| `id_estudiante` | `INT` | `NOT NULL`; FK → `estudiantes(id_estudiante)`; `ON UPDATE CASCADE`, `ON DELETE CASCADE` | Estudiante. |
| `hora_entrada` | `TIMESTAMP` | `NOT NULL` | Fecha y hora de entrada. |
| `salida_antes_de_tiempo` | `TIMESTAMP` | — | Fecha y hora de salida anticipada. |
| `permiso` | `BOOLEAN` | — | Indica si cuenta con permiso o si se registra como ausencia. |
| `razon_permiso` | `VARCHAR(150)` | — | Motivo del permiso. |

## 13.3. Relaciones

| Relación | Cardinalidad | Clave foránea |
|---|---|---|
| `usuarios` → `administrativos` | 1:N | `id_usuario` |
| `usuarios` → `asesores` | 1:N | `id_usuario` |
| `usuarios` → `apoderados` | 1:N | `id_usuario` |
| `usuarios` → `estudiantes` | 1:0..1 | `id_usuario` (`UNIQUE`) |
| `usuarios` → `asignacion_rol` | 1:N | `id_usuario` |
| `roles` → `asignacion_rol` | 1:N | `id_rol` |
| `apoderados` → `estudiantes` | 1:N | `id_apoderado` |
| `facultades` → `carreras` | 1:N | `id_facultad` |
| `facultades` → `convocatorias_preuniversitario` | 1:N | `id_facultad` |
| `carreras` → `postulaciones` | 1:N | `id_carrera` |
| `convocatorias_preuniversitario` → `cursos_capacitacion` | 1:N | `id_convocatoria` |
| `convocatorias_preuniversitario` → `examenes_de_ingreso` | 1:N | `id_convocatoria` |
| `convocatorias_preuniversitario` → `materias_convocatoria_asignacion` | 1:N | `id_convocatoria` |
| `aulas` → `cursos_capacitacion` | 1:N | `id_aula` |
| `materias` → `temas` | 1:N | `id_materia` |
| `materias` → `materias_asesores` | 1:N | `id_materia` |
| `materias` → `materias_convocatoria_asignacion` | 1:N | `id_materia` |
| `materias` → `asignaciones_materias` | 1:N | `id_materia` |
| `materias` → `examenes_de_ingreso` | 1:N | `id_materia` |
| `asesores` → `materias_asesores` | 1:N | `id_asesor` |
| `asesores` → `asignaciones_asesores` | 1:N | `id_asesor` |
| `asesores` → `clases` | 1:N | `id_asesor` |
| `cursos_capacitacion` → `asignaciones_asesores` | 1:N | `id_curso_capacitacion` |
| `cursos_capacitacion` → `asignaciones_materias` | 1:N | `id_curso_capacitacion` |
| `cursos_capacitacion` → `matriculaciones` | 1:N | `id_curso_capacitacion` |
| `cursos_capacitacion` → `clases` | 1:N | `id_curso_capacitacion` |
| `estudiantes` → `inscripciones` | 1:N | `id_estudiante` |
| `estudiantes` → `matriculaciones` | 1:N | `id_estudiante` |
| `estudiantes` → `postulaciones` | 1:N | `id_estudiante` |
| `estudiantes` → `mensualidades` | 1:N | `id_estudiante` |
| `estudiantes` → `asistencias` | 1:N | `id_estudiante` |
| `administrativos` → `inscripciones` | 1:N | `id_administrativo` |
| `administrativos` → `mensualidades` | 1:N | `id_administrativo` |
| `clases` → `asistencias` | 1:N | `id_clase` |
| `clases` → `avances` | 1:N | `id_clase` |
| `temas` → `contenidos` | 1:N | `id_tema` |
| `temas` → `avances` | 1:N | `id_tema` |
| `examenes_de_ingreso` → `contenidos` | 1:N | `id_examen_de_ingreso` |

**Restricciones de integridad relevantes:**

- `usuarios.nro_carnet` y `usuarios.correo_electronico` son únicos.
- `estudiantes.id_usuario` es único: un usuario puede ser un solo estudiante.
- `roles.nombre` es único.
- `aulas.capacidad` debe ser mayor que 0.
- `mensualidades.pago` debe ser mayor o igual a 0.
- `clases.id_tema` no tiene clave foránea declarada en `Script.sql`.

**Índices definidos:**

- `idx_estudiante_usuarios` en `estudiantes(id_usuario)`.
- `idx_administrativo_usuarios` en `administrativos(id_usuario)`.
- `idx_apoderado_usuarios` en `apoderados(id_usuario)`.
- `idx_asesor_usuarios` en `asesores(id_usuario)`.
- `idx_asignacion_rol_rol` en `asignacion_rol(id_rol)`.
- `idx_asignacion_rol_usuario` en `asignacion_rol(id_usuario)`.
- `idx_matriculaciones_estudiante` en `matriculaciones(id_estudiante)`.
- `idx_matriculaciones_curso` en `matriculaciones(id_curso_capacitacion)`.
- `idx_mensualidades_estudiantes` en `mensualidades(id_estudiante)`.
- `idx_asistencias_clase` en `asistencias(id_clase)`.
- `idx_asistencias_estudiante` en `asistencias(id_estudiante)`.
- `idx_examenes_convocatoria` en `examenes_de_ingreso(id_examen_de_ingreso)`.
- `idx_temas_materia` en `temas(id_materia)`.
- `idx_contenidos_examen` en `contenidos(id_examen_de_ingreso)`.
- `idx_contenidos_tema` en `contenidos(id_tema)`.
- `idx_avances_tema` en `avances(id_tema)`.
- `idx_avances_clase` en `avances(id_clase)`.

## 13.4. Diccionario de datos

Las descripciones de cada campo se encuentran en las tablas de la sección 13.2. Los identificadores principales son:

| Campo | Propósito |
|---|---|
| `usuarios.id_usuario` | Identificador único del usuario y referencia para roles, estudiantes, asesores, apoderados y administrativos. |
| `usuarios.nro_carnet` | Carnet único del usuario. |
| `estudiantes.id_estudiante` | Identificador del estudiante usado en matrículas, asistencias, mensualidades y postulaciones. |
| `asesores.id_asesor` | Identificador del asesor usado en clases, materias y asignaciones. |
| `cursos_capacitacion.id_capacitacion` | Identificador del curso usado en matrículas, clases y asignaciones. |
| `clases.id_clase` | Identificador de la clase usado en asistencias y avances. |
| `matriculaciones.id_matriculacion` | Identificador de la relación estudiante-curso. |
| `mensualidades.id_mensualidad` | Identificador del registro de pago mensual. |
| `asistencias.id_asistencia` | Identificador del registro de asistencia de un estudiante en una clase. |

---

# 14. API

## 14.1. Convenciones

- **Base URL:** `http://localhost:4000/api` en desarrollo. El frontend la configura con `VITE_API_URL`.
- **Versión:** sin versionado en la URL.
- **Formato de intercambio:** JSON.
- **Autenticación:** JWT enviado en `Authorization: Bearer <token>` o en la cookie `jwt`.
- **Recursos:** sustantivos plurales; `POST` para crear, `GET` para consultar, `PUT` para actualizar y `DELETE` para eliminar.
- **Paginación:** los listados basados en el CRUD genérico aceptan `limit` (por defecto 25, máximo 100) y `offset` (por defecto 0). Los controladores propios de usuarios y estudiantes no aplican paginación.
- **Validación:** los cuerpos de las peticiones se validan con Zod; los errores devuelven `400`.
- **Filtros:** algunos recursos aceptan filtros por columnas; las clases aceptan `desde`, `hasta`, `id_curso_capacitacion`, `id_materia` y `id_tema`.

## 14.2. Endpoints

### Autenticación y estado

| Método | Endpoint | Descripción | Autenticación |
|---|---|---|---|
| POST | `/api/usuarios` | Registrar usuario | No |
| POST | `/api/usuarios/login` | Iniciar sesión | No |
| POST | `/api/usuarios/logout` | Cerrar sesión y limpiar cookie | No |
| GET | `/health` | Verificar estado del servidor | No |

### Recursos CRUD

Todos los recursos siguientes tienen `GET` de colección, `GET /:id`, `POST`, `PUT /:id` y `DELETE /:id`, protegidos con JWT.

| Recurso | Ruta base |
|---|---|
| Usuarios | `/api/usuarios` |
| Materias | `/api/materias` |
| Asesores | `/api/asesores` |
| Capacitaciones | `/api/capacitaciones` |
| Temas | `/api/temas` |
| Estudiantes | `/api/estudiantes` |
| Administrativos | `/api/administrativos` |
| Apoderados | `/api/apoderados` |
| Facultades | `/api/facultades` |
| Aulas | `/api/aulas` |
| Roles | `/api/roles` |
| Carreras | `/api/carreras` |
| Convocatorias | `/api/convocatorias` |
| Asignaciones de rol | `/api/asignaciones-rol` |
| Inscripciones | `/api/inscripciones` |
| Exámenes | `/api/examenes` |
| Contenidos | `/api/contenidos` |
| Materias-asesores | `/api/materias-asesores` |
| Postulaciones | `/api/postulaciones` |
| Materias-convocatoria | `/api/materias-convocatoria` |
| Asignaciones de asesores | `/api/asignaciones-asesores` |
| Asignaciones de materias | `/api/asignaciones-materias` |
| Matriculaciones | `/api/matriculaciones` |
| Clases | `/api/clases` |
| Avances | `/api/avances` |
| Mensualidades | `/api/mensualidades` |
| Asistencias | `/api/asistencias` |

> En `/api/usuarios`, el `POST` de registro es público; las operaciones de consulta, actualización y eliminación requieren JWT.

### Ejemplo: iniciar sesión

**Request:**

```http
POST /api/usuarios/login
Content-Type: application/json
```

```json
{
  "correo_electronico": "usuario@ejemplo.com",
  "contraseña": "********"
}
```

**Response `200`:**

```json
{
  "estado": "exito",
  "datos": {
    "id_usuario": 1,
    "nro_carnet": 1000001,
    "nombre": "Juan Carlos",
    "apellido_paterno": "Mamani",
    "apellido_materno": "Quispe",
    "correo_electronico": "usuario@ejemplo.com",
    "usuario_vigente": true
  },
  "token": "<jwt>"
}
```

### Ejemplo: registrar usuario

**Request:**

```http
POST /api/usuarios
Content-Type: application/json
```

```json
{
  "nro_carnet": 1234567,
  "apellido_paterno": "Pérez",
  "apellido_materno": "López",
  "nombre": "Juan",
  "fecha_nacimiento": "2000-01-15",
  "correo_electronico": "juan.perez@ejemplo.com",
  "contraseña": "********"
}
```

**Response `201`:**

```json
{
  "estado": "exito",
  "datos": {
    "id_usuario": 46,
    "nro_carnet": 1234567,
    "correo_electronico": "juan.perez@ejemplo.com",
    "usuario_vigente": true
  },
  "token": "<jwt>"
}
```

### Códigos de respuesta

| Código | Uso |
|---|---|
| `200` | Consulta o actualización exitosa. |
| `201` | Recurso creado. |
| `204` | Recurso eliminado sin cuerpo de respuesta. |
| `400` | Datos inválidos, parámetros incorrectos o validación Zod fallida. |
| `401` | Token ausente, inválido o expirado; credenciales incorrectas. |
| `404` | Recurso o ruta no encontrada. |
| `409` | Conflicto por duplicado, referencia foránea o registro en uso. |
| `500` | Error interno del servidor. |

---

# 15. Seguridad

## 15.1. Autenticación

- **Método:** JWT firmado con `JWT_SECRET`.
- **Tokens:** payload con `{ id }`; expiración por defecto de 8 días.
- **Sesiones:** token en `localStorage` y cookie `jwt` con `httpOnly`, `sameSite: strict`, `secure` en producción y duración de 7 días.

## 15.2. Autorización

- **Roles:** catálogo `roles` y asignaciones en `asignacion_rol`.
- **Permisos:** no se identificó una matriz de permisos por rol.
- **Protección de endpoints:** `authMiddleware` valida el token y consulta el usuario en la base de datos. Se aplica a todos los recursos excepto registro, login y logout.

## 15.3. Contraseñas

- **Algoritmo de hash:** bcrypt, con `genSalt(10)`.
- **Política de contraseñas:** mínimo 8 caracteres.
- **Recuperación:** no implementada.

## 15.4. Protección de datos

- **Información sensible:** datos personales de estudiantes, apoderados, usuarios y registros de asistencia.
- **Cifrado:** contraseñas con hash bcrypt; no se identificó cifrado adicional de campos en la base de datos.
- **Acceso restringido:** los endpoints requieren autenticación, pero no se encontraron restricciones por rol.

## 15.5. Seguridad de la aplicación

- **Validación de entradas:** Zod en backend y validaciones de formulario en frontend.
- **Protección contra SQL Injection:** consultas parametrizadas con `pg` y listas de columnas permitidas en el CRUD.
- **CORS:** configurado con `cors()` sin lista explícita de orígenes.
- **Protección contra ataques de fuerza bruta:** no se identificó limitación de intentos.
- **Gestión de tokens:** expiración, cookie `httpOnly` y eliminación del token en respuestas `401` desde el frontend.
- **Logs:** registro de peticiones HTTP con `morgan("dev")` en consola.

---

# 16. Instalación y configuración

## 16.1. Requisitos

```text
Sistema operativo: no especificado
Node.js: requerido (versión no especificada)
npm: requerido (versión no especificada)
PostgreSQL: requerido (versión no especificada)
Git: requerido
```

## 16.2. Clonar proyecto

```bash
git clone https://github.com/mluquet-glitch/Grupo-Alfa.git
cd <carpeta-del-proyecto>
```

## 16.3. Variables de entorno

**Backend (`backend/.env`):**

```env
DB_USER=
DB_HOST=
DB_PASSWORD=
DB_DATABASE=
DB_PORT=
DATABASE_URL=
PORT=4000
JWT_SECRET=
JWT_EXPIRES_IN=8d
NODE_ENV=development
```

**Frontend (`frontend/.env`):**

```env
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=GrupoAlfa
```

| Variable | Descripción | Obligatoria |
|---|---|---|
| `DB_USER` | Usuario de PostgreSQL. | No; valor por defecto en `config.js`. |
| `DB_HOST` | Host de PostgreSQL. | No; valor por defecto en `config.js`. |
| `DB_PASSWORD` | Contraseña de PostgreSQL. | No; valor por defecto en `config.js`. |
| `DB_DATABASE` | Nombre de la base de datos. | No; valor por defecto en `config.js`. |
| `DB_PORT` | Puerto de PostgreSQL. | No; valor por defecto en `config.js`. |
| `DATABASE_URL` | URL completa de conexión; reemplaza a las variables individuales. | No. |
| `PORT` | Puerto del backend. | No; por defecto `4000`. |
| `JWT_SECRET` | Clave para firmar los tokens. | Sí. |
| `JWT_EXPIRES_IN` | Expiración del token. | No; por defecto `8d` en `generateToken.js`. |
| `NODE_ENV` | Entorno de ejecución. | No. |
| `VITE_API_URL` | URL base de la API para el frontend. | Sí para que el frontend se conecte. |
| `VITE_APP_NAME` | Nombre de la aplicación en la configuración del cliente. | No; por defecto `GrupoAlfa`. |

**Valores por defecto del backend:** `DB_HOST=localhost`, `DB_PORT=5432`, `DB_DATABASE=Grupo Alfa`, `DB_USER=postgres` y `PORT=4000`. La contraseña por defecto existe en `config.js`, pero se recomienda definirla en `.env` y no reutilizarla.

## 16.4. Instalación de dependencias

Desde la raíz del proyecto:

```bash
npm run install:all
```

También se puede instalar por separado:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

## 16.5. Configuración de base de datos

1. Crear una base de datos en PostgreSQL (con la configuración por defecto, el nombre es `Grupo Alfa`).
2. Ejecutar [`dbScripts/Script.sql`](../dbScripts/Script.sql) para crear las tablas, restricciones e índices.
3. Opcionalmente, ejecutar [`dbScripts/UsuariosFicticios.sql`](../dbScripts/UsuariosFicticios.sql) para cargar datos de ejemplo.
4. Configurar `backend/.env` con las credenciales correspondientes.

**Observaciones:**

- `Script.sql` elimina las tablas existentes con `DROP TABLE ... CASCADE` antes de crearlas; no debe ejecutarse sobre una base con datos sin respaldo.
- No se identificaron migraciones ni un sistema de seeds automático.
- Los datos de `UsuariosFicticios.sql` incluyen contraseñas de ejemplo con formato de hash no funcional; no deben usarse para iniciar sesión sin generar hashes bcrypt válidos.
- No se identificó un usuario administrador inicial con contraseña real.

## 16.6. Ejecución

Desde la raíz del proyecto:

```bash
npm run dev
```

Esto inicia:

- Backend en `http://localhost:4000`.
- Frontend en `http://localhost:5173`.

También se pueden ejecutar por separado:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

## 16.7. Producción

```bash
npm run build
npm --prefix backend start
```

El build del frontend se genera en `frontend/dist`. No se identificó un proceso de despliegue automatizado ni configuración de servidor de producción.

---

# 17. Despliegue

Sin contenido en el análisis para este proyecto. No se identificaron archivos de infraestructura ni configuración de despliegue.

---

# 18. Manual de usuario

## 18.1. Iniciar sesión

1. Ingresar a la aplicación web.
2. Introducir el correo electrónico y la contraseña.
3. Presionar **Iniciar sesión**.
4. Si las credenciales son correctas, se accede al dashboard.

**Captura:** pendiente.

## 18.2. Registrar estudiante

1. Ir a **Usuarios**.
2. Presionar **Nuevo**.
3. Completar carnet, nombres, apellidos, fecha de nacimiento, correo y contraseña.
4. Seleccionar el rol **Estudiante**.
5. Completar los campos de estudiante: ID de apoderado, colegio de procedencia y dirección de domicilio.
6. Presionar **Guardar**.

También es posible gestionar el registro de estudiante desde `/app/estudiantes` para un usuario existente.

**Captura:** pendiente.

## 18.3. Registrar asistencia

1. Ir a **Llamar lista**.
2. Abrir la pestaña **Tomar clase**.
3. Seleccionar materia, tema, curso, asesor, aula, fecha y horario.
4. Marcar a cada estudiante como **Presente** o **Ausente**, o usar **Todos presentes** / **Todos ausentes**.
5. Presionar **Guardar lista**.

**Captura:** pendiente.

## 18.4. Registrar calificaciones

Sin contenido en el análisis para este proyecto.

## 18.5. Generar reportes

Sin contenido en el análisis para este proyecto.

---

# 19. Mantenimiento

Sin contenido en el análisis para este proyecto.

---

# 20. Respaldo y recuperación

Sin contenido en el análisis para este proyecto.

---

# 21. Pruebas

Sin contenido en el análisis para este proyecto. No se identificó una suite de pruebas automatizadas; el script `backend/package.json` de `test` no ejecuta pruebas.

---

# 22. Control de versiones

## 22.1. Repositorio

- **URL:** `https://github.com/mluquet-glitch/Grupo-Alfa.git`
- **Organización:** `mluquet-glitch`
- **Rama principal:** `main`

## 22.2. Estrategia de ramas

No se identificó una estrategia formal documentada. Las ramas presentes en el repositorio local son:

```text
main
 ├── auth
 ├── Feature--Tomar-lista (integrada en main)
 └── mobile
```

## 22.3. Convención de commits

No se identificó una convención formal. Los mensajes observados son descriptivos y no siguen un formato estricto.

## 22.4. Pull Requests

Sin contenido en el análisis para este proyecto.

---

# 23. Historial de cambios

| Versión | Fecha | Cambio | Responsable |
|---|---|---|---|
| 1.0.0 | 24/10/2026 | Elaboración de la documentación general a partir de `docs/Analisis.md`, el esquema SQL y los archivos del proyecto. | |

---

# 24. Anexos

## 24.1. Diagramas

- Modelo entidad-relación: [`dbScripts/Esquema ER.pgerd`](../dbScripts/Esquema%20ER.pgerd).
- Arquitectura general: sección 12.1 de este documento.
- Documentación de pantallas web: [`docs/pantallas.md`](pantallas.md).

## 24.2. Scripts SQL

- Creación de tablas y restricciones: [`dbScripts/Script.sql`](../dbScripts/Script.sql).
- Datos de ejemplo: [`dbScripts/UsuariosFicticios.sql`](../dbScripts/UsuariosFicticios.sql).
- Scripts de prueba: [`dbScripts/SCRIPTS de prueba.sql`](../dbScripts/SCRIPTS%20de%20prueba.sql).

## 24.3. Ejemplos de API

Los ejemplos de login y registro, junto con los códigos HTTP, se encuentran en la sección 14.2.

## 24.4. Glosario

| Término | Definición |
|---|---|
| Usuario | Cuenta del sistema con carnet, datos personales, correo, contraseña y estado de vigencia. |
| Estudiante | Usuario registrado como alumno de la institución, con datos académicos y apoderado asociado. |
| Asesor | Docente que dicta materias y clases en los cursos de capacitación. |
| Apoderado | Padre, madre o responsable del estudiante. |
| Administrativo | Personal de la institución que realiza inscripciones, matrículas y registros administrativos. |
| Facultad | Unidad académica a la que pertenecen carreras y convocatorias. |
| Carrera | Programa académico al que puede postular un estudiante. |
| Convocatoria | Proceso de preparación asociado a una facultad y una fecha de inicio. |
| Curso de capacitación | Curso asociado a una convocatoria, un aula, un nivel, una modalidad y un horario. |
| Materia | Asignatura que forma parte de un curso o convocatoria. |
| Tema | Contenido específico asociado a una materia. |
| Aula | Espacio físico con una capacidad máxima. |
| Matriculación | Relación entre un estudiante y un curso de capacitación, con comprobante, credencial y vigencia. |
| Mensualidad | Registro de pago de un estudiante con período de inicio, fin y monto. |
| Clase | Sesión dictada por un asesor para un curso, con fecha y tema. |
| Asistencia | Registro de entrada de un estudiante a una clase, con posibilidad de salida anticipada y permiso. |
| Permiso | Autorización registrada para una salida anticipada u otra excepción. |
| Salida anticipada | Retiro del estudiante antes de finalizar el horario de la clase. |

---

# 25. Información de contacto y responsables

| Responsabilidad | Persona/Equipo | Contacto |
|---|---|---|
| Responsable del sistema | | |
| Responsable académico (docente coordinador) | M.Sc. Cayoja Cortez Juan | |
| Tutor institucional | Lic. Adán Sanz Guerrero Selaez | |
| Desarrollo / pasante | Luque Tarqui Marcelo | |
| Administrador técnico | | |
| Soporte | | |
