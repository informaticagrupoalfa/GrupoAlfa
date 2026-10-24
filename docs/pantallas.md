# Documentación de pantallas — Web Grupo Alfa

Documentación funcional de todas las pantallas de la aplicación web (`frontend/`), incluyendo rutas, contenido, acciones, validaciones y endpoints utilizados.

- **Última actualización:** 24/10/2026
- **Aplicación:** React + Vite (`frontend/`)
- **URL de desarrollo:** `http://localhost:5173`
- **API:** `VITE_API_URL` (por defecto `http://localhost:4000/api`)
- **Fuente de verdad del código:** `frontend/src/routes/router.jsx`, `frontend/src/config/entities.js` y páginas/componentes de `frontend/src`.

---

## 1. Mapa general de navegación

| Ruta | Pantalla | Acceso | Layout |
|---|---|---|---|
| `/login` | Iniciar sesión | Público | `AuthLayout` |
| `/registro` | Crear cuenta | Público | `AuthLayout` |
| `/` | Redirección a `/app/dashboard` | — | — |
| `/app` | Redirección a `/app/dashboard` | Autenticado | `DashboardLayout` |
| `/app/dashboard` | Dashboard / Resumen académico | Autenticado | `DashboardLayout` |
| `/app/usuarios` | Usuarios | Autenticado | `DashboardLayout` |
| `/app/capacitaciones` | Capacitaciones (con pestañas) | Autenticado | `DashboardLayout` |
| `/app/matriculaciones` | Matriculaciones (con pestañas) | Autenticado | `DashboardLayout` |
| `/app/pase-lista` | Llamar lista (con pestañas) | Autenticado | `DashboardLayout` |
| `/app/materias` | CRUD genérico de Materias | Autenticado, por URL | `DashboardLayout` |
| `/app/asesores` | CRUD genérico de Asesores | Autenticado, por URL | `DashboardLayout` |
| `/app/temas` | CRUD genérico de Temas | Autenticado, por URL | `DashboardLayout` |
| `/app/estudiantes` | CRUD genérico de Estudiantes | Autenticado, por URL | `DashboardLayout` |
| `/app/convocatorias` | CRUD genérico de Convocatorias | Autenticado, por URL | `DashboardLayout` |
| `/app/facultades` | CRUD genérico de Facultades | Autenticado, por URL | `DashboardLayout` |
| `/app/aulas` | CRUD genérico de Aulas | Autenticado, por URL | `DashboardLayout` |
| `/app/mensualidades` | Ruta técnica de Mensualidades (no soportada como pantalla independiente) | Autenticado, por URL | `DashboardLayout` |
| Cualquier otra ruta | Página no encontrada (404) | Público | Ninguno |

### Navegación lateral

El sidebar muestra únicamente:

1. Dashboard
2. Usuarios
3. Capacitaciones
4. Matriculaciones
5. Llamar lista

Materias, Asesores, Temas y Estudiantes tienen `hideFromNav: true`: no aparecen en el lateral, pero sus pantallas siguen disponibles por URL y, en el caso de Materias y Temas, también desde la sección **Cursos** de Capacitaciones.

### Protección de rutas

- `RequireAuth` redirige a `/login` si no hay usuario en `localStorage` (`ga_user`).
- El token se guarda en `localStorage` (`ga_token`) y se envía como `Authorization: Bearer <token>` en cada petición.
- Las rutas del backend (salvo registro y login) requieren `authMiddleware`.
- La interfaz **no aplica permisos por rol**: cualquier usuario autenticado puede ver todos los módulos.

---

## 2. Comportamientos compartidos

Elementos reutilizados en casi todas las pantallas:

| Elemento | Comportamiento |
|---|---|
| `Skeleton` | Placeholder de carga mientras se consultan datos o se carga un chunk. |
| `ErrorFallback` | Mensaje de error con botón de reintento. |
| `DataTable` | Tabla de datos con columnas configurables y acciones **Editar** / **Eliminar**. Si no hay filas muestra “Sin registros.”. |
| `Modal` | Diálogo con título, texto de ayuda, cuerpo y pie. Se cierra con clic en el fondo o tecla `Escape`. |
| Buscador | Filtra en el cliente por todas las columnas visibles de la tabla. |
| Paginación de tablas CRUD | Se muestran como máximo **25 registros**; no hay paginación, solo aviso “(mostrando 25)”. |
| Confirmaciones | Las eliminaciones usan `window.confirm`; los errores de guardado/eliminación se muestran en el modal o con `alert`. |
| Toasts/avisos | Algunas pantallas usan mensajes en línea (`.warning-message`, `.error-message`, `.tc-status`). |

---

## 3. Pantallas públicas

### 3.1. Iniciar sesión — `/login`

**Objetivo:** autenticar al usuario y dar acceso al panel.

**Contenido**

- Logo de Grupo Alfa.
- Título “Bienvenido de nuevo” y texto introductorio.
- Campo **Correo electrónico** (`type=email`, requerido).
- Campo **Contraseña** (`type=password`, requerido).
- Botón **Iniciar sesión**.
- Enlace **¿No tienes cuenta? Regístrate** (precarga el chunk de registro).

**Validaciones y estados**

- El correo debe cumplir el patrón `usuario@dominio.ext`.
- La contraseña es obligatoria.
- Durante el envío el botón muestra “Verificando...” y se deshabilita.
- Credenciales inválidas: “El correo o la contraseña no son correctos.”
- Si ya hay sesión activa, redirige automáticamente a `/app/dashboard`.

**Endpoints**

- `POST /api/usuarios/login` con `{ correo_electronico, contraseña }`.
- Respuesta esperada: `{ datos: usuario, token }`.

**Redirección posterior:** a la ruta original solicitada (`location.state.from`) o a `/app/dashboard`.

---

### 3.2. Crear cuenta — `/registro`

**Objetivo:** registrar un nuevo usuario y dejarlo autenticado.

**Contenido**

- Logo, título “Crear cuenta” y texto introductorio.
- Campos obligatorios:
  - Nro de carnet (`number`, mínimo 1).
  - Nombre.
  - Apellido paterno.
  - Apellido materno.
  - Fecha de nacimiento (`date`).
  - Correo electrónico (`email`).
  - Contraseña (`password`).
  - Confirmar contraseña (`password`).
- Botón **Registrarse**.
- Enlace **¿Ya tienes cuenta? Inicia sesión**.

**Validaciones**

- Correo con formato válido.
- Contraseña de al menos 8 caracteres.
- Confirmación igual a la contraseña.
- Fecha de nacimiento válida.
- El resto de campos son obligatorios vía HTML.

**Endpoints**

- `POST /api/usuarios` con los datos del formulario.

**Comportamiento posterior**

- Inicia sesión automáticamente con el usuario y token devueltos.
- Redirige a `/app/dashboard`.
- No se asignan roles automáticamente; el usuario queda creado sin rol.

---

## 4. Pantallas autenticadas

Todas comparten:

- Sidebar fijo con navegación y logo.
- Encabezado con “Grupo Alfa”, título de la pantalla, nombre del usuario y botón **Cerrar sesión**.
- El título se deduce del segundo segmento de la URL.
- Cerrar sesión limpia `ga_user` y `ga_token` y redirige a `/login`.

### 4.1. Dashboard — `/app/dashboard`

**Objetivo:** ofrecer una vista rápida del estado del sistema y accesos directos.

**Contenido**

- Título **Resumen académico**.
- Tarjetas con el total de registros de cada entidad:
  - Usuarios
  - Materias
  - Asesores
  - Capacitaciones
  - Matriculaciones
  - Temas
  - Estudiantes
- Cada tarjeta es clicable y navega al CRUD correspondiente.
- Si un conteo falla, muestra “—” en esa tarjeta.
- Sección **Asistencia**:
  - Texto “Pasa lista por curso de capacitación.”
  - Tarjeta **Llamar lista** que navega a `/app/pase-lista`.

**Endpoints**

- `GET /api/usuarios`
- `GET /api/materias`
- `GET /api/asesores`
- `GET /api/capacitaciones`
- `GET /api/matriculaciones`
- `GET /api/temas`
- `GET /api/estudiantes`

**Estados**

- Carga: skeleton.
- Error total: mensaje “No se pudo cargar el resumen.”
- Errores individuales: conteo “—”.

---

### 4.2. Usuarios — `/app/usuarios`

**Objetivo:** administrar usuarios y sus roles.

**Contenido**

- Buscador “Buscar en Usuarios…”.
- Botón **Nuevo**.
- Contador de registros filtrados.
- Tabla con columnas:
  - Carnet
  - Nombre
  - Correo
  - Vigente
  - Rol
  - Acciones (Editar / Eliminar)
- Aviso de roles cuando una operación parcial falla, con botón **Cerrar**.

**Acciones**

- **Nuevo:** abre el modal de alta.
- **Editar:** abre el modal con los datos y roles actuales.
- **Eliminar:** pide confirmación (“También se eliminarán sus roles asociados.”) y refresca la tabla y los roles.

**Modal Nuevo/Editar Usuario**

Campos:

- Nro de carnet (obligatorio, numérico).
- Nombre (obligatorio, máx. 100).
- Apellido paterno (obligatorio, máx. 100).
- Apellido materno (obligatorio, máx. 100).
- Fecha de nacimiento (obligatoria).
- Correo electrónico (obligatorio, máx. 150, formato válido).
- Contraseña:
  - Obligatoria al crear.
  - En edición, vacía significa “no cambiar”.
  - Mínimo 8 caracteres si se escribe.
- Checkbox **Usuario vigente**.
- Selector de roles tipo chips: Asesor, Administrativo, Apoderado, Estudiante.
- Campos condicionales:
  - **Apoderado:** Celular (opcional, máx. 20).
  - **Estudiante:** ID apoderado (opcional), Colegio de procedencia (opcional, máx. 150), Dirección de domicilio (opcional, máx. 255).

Comportamiento de roles:

- Al crear, después de guardar el usuario se crean las filas de rol seleccionadas.
- Al editar, se crean los roles nuevos y se eliminan los desmarcados; antes de quitar roles se pide confirmación.
- Si falla algún rol, el usuario igualmente se guarda y se muestra un aviso con el detalle.
- “Rol” en la tabla se calcula consultando asesores, administrativos, apoderados y estudiantes.

**Endpoints**

- `GET/POST/PUT/DELETE /api/usuarios`
- `GET/POST/DELETE /api/asesores`
- `GET/POST/DELETE /api/administrativos`
- `GET/POST/DELETE /api/apoderados`
- `GET/POST/DELETE /api/estudiantes`

**Estados**

- Carga inicial: skeleton.
- Error de carga: `ErrorFallback` con reintento.
- Sin resultados: “Sin registros.”.

---

### 4.3. Capacitaciones — `/app/capacitaciones`

**Objetivo:** gestionar cursos de capacitación y sus catálogos relacionados.

La pantalla tiene dos grupos independientes de pestañas:

#### Grupo principal

| Pestaña | Descripción | Columnas |
|---|---|---|
| **Capacitaciones** | Cursos de capacitación. Requieren convocatoria y aula existentes. | ID, Nombre, Nivel, Modalidad, Inicio |
| **Convocatorias** | Convocatorias de preuniversitario. Requieren facultad existente. | ID, Facultad (ID), Inicio |
| **Facultades** | Facultades a las que pertenecen carreras y convocatorias. | ID, Nombre |
| **Aulas** | Aulas donde se dictan los cursos. | ID, Capacidad |

Solo se monta la pestaña activa; las demás no consultan datos.

#### Sección Cursos

| Pestaña | Descripción | Columnas |
|---|---|---|
| **Materias** | Materias que conforman los cursos. | ID, Nombre |
| **Temas** | Temas asociados opcionalmente a una materia. | ID, Tema, Materia |

**Formularios**

- **Capacitaciones**
  - ID convocatoria (obligatorio, numérico).
  - ID aula (obligatorio, numérico).
  - Nombre (obligatorio, máx. 150).
  - Nivel (opcional, máx. 100).
  - Modalidad (opcional, máx. 50).
  - Fecha de inicio (opcional).
  - Hora inicio / Hora fin (opcionales).
  - Validación: la hora de fin debe ser mayor que la de inicio.
- **Convocatorias**
  - ID facultad (obligatorio).
  - Fecha de inicio (obligatoria).
- **Facultades**
  - Nombre de la facultad (obligatorio, máx. 150).
- **Aulas**
  - Capacidad (obligatoria, numérica).
- **Materias**
  - Nombre de la materia (obligatorio, máx. 150).
- **Temas**
  - Nombre del tema (obligatorio, máx. 150).
  - ID materia (opcional).
  - La pestaña permite filtrar por ID materia y recargar los datos con ese filtro.

**Acciones comunes**

- Buscar en el cliente.
- **Nuevo**, **Editar**, **Eliminar** (con confirmación).
- Paginación visual máxima de 25 registros.

**Endpoints**

- `/api/capacitaciones`
- `/api/convocatorias`
- `/api/facultades`
- `/api/aulas`
- `/api/materias`
- `/api/temas`

---

### 4.4. Matriculaciones — `/app/matriculaciones`

**Objetivo:** relacionar estudiantes con cursos y registrar sus pagos mensuales.

Pestañas:

| Pestaña | Descripción | Columnas |
|---|---|---|
| **Matriculaciones** | Relaciona estudiantes con cursos de capacitación. | ID, Estudiante, Curso, Vigente, Comprobante, Credencial |
| **Mensualidades** | Registra los pagos mensuales de los estudiantes. | ID, Estudiante, Administrativo, Inicio, Fin, Pago |

**Contenido común**

- Buscador por todas las columnas.
- Contador de registros filtrados.
- Tabla con acciones Editar / Eliminar.
- Máximo 25 filas visibles.
- Nombres de estudiante, curso y administrativo resueltos desde los catálogos.

**Modal Nueva/Editar matriculación**

- **Estudiante:** combobox con sugerencias por nombre; obligatorio.
- **Curso de capacitación:** selector; obligatorio.
- **Vigente:** checkbox, activo por defecto.
- **Nro de comprobante:** opcional, numérico.
- **Nro de credencial:** opcional, numérico.

**Modal Nueva/Editar mensualidad**

- **Estudiante:** combobox; obligatorio.
- **Administrativo:** combobox; obligatorio.
- **Fecha de inicio / Fecha de fin:** obligatorias; la fecha de fin debe ser mayor o igual que la de inicio.
- **Pago:** obligatorio, numérico y mayor o igual a 0.

**Endpoints**

- `/api/matriculaciones`
- `/api/mensualidades`
- Catálogos: `/api/usuarios`, `/api/estudiantes`, `/api/administrativos`, `/api/capacitaciones`

**Estados**

- Carga de catálogos: skeleton global.
- Error de carga de pestaña: `ErrorFallback`.
- Sin datos: “Sin registros.”.

---

### 4.5. Llamar lista — `/app/pase-lista`

**Objetivo:** tomar asistencia de un curso y consultar las listas guardadas.

Tiene dos pestañas: **Asistencias** (activa por defecto) y **Tomar clase**.

Al entrar se cargan en paralelo los catálogos de materias, asesores, capacitaciones, temas, estudiantes, usuarios, aulas y asignaciones de materias. Si falla la carga global: “No se pudieron cargar los catálogos.” con botón de recarga.

#### Pestaña Tomar clase

**Bloque “Qué se enseña”**

- **Materia:** combobox con sugerencias.
- **Tema avanzado:** combobox con sugerencias.
- Botón **＋ Nuevo tema para esta materia**:
  - Muestra campo “Nombre del tema nuevo” (máx. 150).
  - Exige haber elegido una materia.
  - Crea el tema en la base de datos, refresca la lista y lo deja seleccionado.
  - Botones **Adicionar tema** / **Cancelar**.

**Bloque “Quién y dónde”**

- **Curso de capacitación:** combobox.
  - Al seleccionarlo se autocompletan aula, hora de inicio y hora de fin desde el curso.
  - Carga los estudiantes matriculados en el curso.
  - Si el backend no devuelve matrículas, muestra todos los estudiantes con un aviso.
- **Asesor:** combobox.
- **Aula:** combobox (muestra capacidad).

**Bloque “Cuándo”**

- **Fecha** (por defecto el día actual).
- **Hora inicio** y **Hora fin**.
- Validación: hora de fin mayor que hora de inicio.

**Lista de estudiantes**

- Cabecera con total, presentes y ausentes.
- Botones **Todos presentes** y **Todos ausentes**.
- Cada fila muestra iniciales, nombre, colegio de procedencia y botones **Presente** / **Ausente**.
- Indicador de avance: marcados/total, barra de presentes/ausentes y chips con presentes, ausentes y sin marcar.

**Guardado**

Requiere:

- Materia, asesor, curso, aula y tema seleccionados.
- Hora de inicio y fin completas y coherentes.
- Al menos un estudiante marcado.

Acciones al guardar:

1. Crea una **clase**.
2. Crea una **asistencia** por cada estudiante marcado:
   - Presente: solo hora de entrada.
   - Ausente: hora de entrada + `permiso: false`.
3. Si todas las asistencias se guardaron correctamente, guarda en `localStorage` (`ga_pase_lista`) una copia de la última lista con sus metadatos.
4. Avisa el resultado y refresca la pestaña Asistencias. Si hubo fallos parciales, informa cuántas asistencias no se guardaron y no escribe la copia local.

**Endpoints**

- `GET /api/materias`, `/api/asesores`, `/api/capacitaciones`, `/api/temas`, `/api/estudiantes`, `/api/usuarios`, `/api/aulas`, `/api/asignaciones-materias`
- `GET /api/matriculaciones?id_curso_capacitacion=...` (con alias de respaldo)
- `POST /api/temas`
- `POST /api/clases`
- `POST /api/asistencias`

#### Pestaña Asistencias

**Filtros combinables (chips)**

- **Fecha:** desde / hasta.
- **Curso:** selector.
- **Materia:** selector.
- **Tema avanzado:** selector.

Al activar un filtro se muestran sus controles; al desactivarlo se limpia su valor.

**Tabla de clases**

Columnas: ID, Fecha, Curso, Materia, Tema avanzado, Presentes, Ausentes.

- Cada fila es clicable y abre el detalle.
- Paginación de **10 registros** por página con botones **← Anterior** y **Siguiente →**.
- Sin resultados: “No hay listas registradas con esos filtros…”.

**Detalle de lista (modal)**

- Título con curso y fecha.
- Resumen de guardado, presentes y ausentes.
- Metadatos: materia, asesor, horario, aula y tema.
- Tabla de estudiantes con estado Presente / Ausente / Sin marcar.
- Acciones:
  - **Eliminar lista:** elimina la clase de la base de datos (con confirmación).
  - **Cerrar.**

**Sección “En este dispositivo”**

- Muestra la última lista guardada en `localStorage` si no aparece ya en la página actual.
- Se puede abrir para ver el detalle.
- Permite eliminar la copia local con confirmación.

**Endpoints**

- `GET /api/clases` con filtros `desde`, `hasta`, `id_curso_capacitacion`, `id_materia`, `id_tema`, `limit`, `offset`.
- `GET /api/asistencias?id_clase=...`
- `DELETE /api/clases/:id`

---

## 5. Pantallas CRUD genéricas (acceso por URL)

Estas pantallas usan el mismo componente `CrudPage` y se resuelven con la ruta dinámica `/app/:entityKey`. Comparten:

- Buscador por todas las columnas.
- Botón **Nuevo**.
- Tabla con Editar / Eliminar.
- Modal genérico de alta/edición.
- Confirmación antes de eliminar.
- Máximo 25 filas visibles.
- Validación de campos obligatorios y longitudes máximas.

### 5.1. Materias — `/app/materias`

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Nombre |
| Campos | Nombre de la materia (obligatorio, máx. 150) |
| Endpoint | `/api/materias` |
| Acceso alternativo | Pestaña **Materias** en Capacitaciones → Cursos |

### 5.2. Asesores — `/app/asesores`

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Asesor, Correo |
| Campos | ID de usuario / nro_carnet (obligatorio, numérico) |
| Endpoint | `/api/asesores` |
| Nota | El usuario debe existir previamente. |

### 5.3. Temas — `/app/temas`

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Tema, Materia |
| Campos | Nombre del tema (obligatorio, máx. 150); ID materia (opcional) |
| Filtro extra | Campo “ID materia” + botón **Filtrar** |
| Endpoint | `/api/temas` |
| Acceso alternativo | Pestaña **Temas** en Capacitaciones → Cursos |

### 5.4. Estudiantes — `/app/estudiantes`

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Estudiante, Colegio, Dirección |
| Campos | ID de usuario (obligatorio); ID apoderado, Colegio de procedencia (máx. 150) y Dirección (máx. 255), opcionales |
| Endpoint | `/api/estudiantes` |
| Nota | La foto no se gestiona desde esta versión. |

### 5.5. Convocatorias — `/app/convocatorias`

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Facultad (ID), Inicio |
| Campos | ID facultad (obligatorio); Fecha de inicio (obligatoria) |
| Endpoint | `/api/convocatorias` |
| Acceso alternativo | Pestaña **Convocatorias** en Capacitaciones |

### 5.6. Facultades — `/app/facultades`

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Nombre |
| Campos | Nombre de la facultad (obligatorio, máx. 150) |
| Endpoint | `/api/facultades` |
| Acceso alternativo | Pestaña **Facultades** en Capacitaciones |

### 5.7. Aulas — `/app/aulas`

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Capacidad |
| Campos | Capacidad (obligatoria, numérica, mayor a 0) |
| Endpoint | `/api/aulas` |
| Acceso alternativo | Pestaña **Aulas** en Capacitaciones |

### 5.8. Mensualidades — `/app/mensualidades` (ruta no soportada)

| Aspecto | Detalle |
|---|---|
| Columnas | ID, Estudiante, Administrativo, Inicio, Fin, Pago |
| Campos | Sin `fields` en la configuración: el modal genérico no está habilitado |
| Endpoint | `/api/mensualidades` |
| Vía soportada | Pestaña **Mensualidades** dentro de `/app/matriculaciones` |

> La ruta `/app/mensualidades` resuelve técnicamente por la ruta dinámica `:entityKey`, pero **no debe usarse**: la entidad `mensualidades` no define `fields`, por lo que el CRUD genérico no puede construir su formulario. La pantalla oficial es la pestaña dentro de Matriculaciones, que usa `MensualidadFormModal`.

> Nota general: `EntityPage` solo deriva a las pantallas especiales para `usuarios`, `capacitaciones` y `matriculaciones`. El resto usa `CrudPage`. Si la entidad no existe o no tiene endpoint, muestra “Módulo no encontrado.”.

---

## 6. Página no encontrada — ruta desconocida

**Objetivo:** informar que la ruta no existe.

**Contenido**

- Título **Página no encontrada**.
- Texto “La ruta que buscas no existe.”.
- Enlace **Volver al dashboard**.

Se muestra para cualquier ruta que no coincida con las definidas (por ejemplo, `/foo`). Para una ruta `/app/<entidad-inexistente>` se muestra en su lugar el error “Módulo no encontrado.” dentro del layout autenticado.

---

## 7. Resumen de endpoints por pantalla

| Pantalla | Endpoints principales |
|---|---|
| Login | `POST /api/usuarios/login` |
| Registro | `POST /api/usuarios` |
| Dashboard | `GET` de usuarios, materias, asesores, capacitaciones, matriculaciones, temas y estudiantes |
| Usuarios | CRUD `/api/usuarios` + CRUD de roles (`asesores`, `administrativos`, `apoderados`, `estudiantes`) |
| Capacitaciones | CRUD `/api/capacitaciones`, `/api/convocatorias`, `/api/facultades`, `/api/aulas`, `/api/materias`, `/api/temas` |
| Matriculaciones | CRUD `/api/matriculaciones` y `/api/mensualidades` |
| Llamar lista | Catálogos + `POST /api/clases`, `POST /api/asistencias`, `GET/DELETE /api/clases`, `GET /api/asistencias` |

---

## 8. Consideraciones técnicas

- **Código dividido por rutas:** las páginas se cargan con `React.lazy` y `Suspense`; las pestañas y modales pesados también se cargan bajo demanda.
- **Datos en cliente:** búsquedas, filtros de tabla y paginación visual se hacen en el navegador sobre el listado completo devuelto por la API.
- **Persistencia local:** solo la última lista de asistencia se guarda en `localStorage` (`ga_pase_lista`); la fuente principal es la base de datos.
- **Sesión:** usuario y token en `localStorage` (`ga_user`, `ga_token`); un `401` limpia ambos.
- **Roles:** existen roles de usuario, pero no restringen el acceso a pantallas en el frontend.
- **Variables de entorno del frontend:** `VITE_API_URL`, `VITE_APP_NAME`, `VITE_FEATURE_DEBUG`.
