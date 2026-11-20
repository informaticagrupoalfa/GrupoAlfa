# Documentación por módulos → pantallas → vistas

Documentación funcional del frontend web de **Grupo Alfa**, organizada de mayor a menor nivel:

1. **Módulo**: sección del sistema (equivale a una entrada del menú lateral o a un conjunto funcional).
2. **Pantalla (page)**: componente de React asociado a una ruta del router.
3. **Vista (view)**: componente que se monta dentro de una pantalla, normalmente mediante pestañas (`?tab=...`) o subsecciones.

Para cada vista se indica **para qué sirve** y **qué usuarios están habilitados** para usarla.

- **Última actualización:** 20/11/2026
- **Aplicación:** React + Vite (`frontend/`)
- **Fuentes de verdad:**
  - `frontend/src/routes/router.jsx`
  - `frontend/src/config/permissions.js`
  - `frontend/src/config/moduleTabs.js`
  - `frontend/src/config/entities.js`
  - `frontend/src/pages/app/**`
  - `backend/src/config/roles.js`
  - `backend/src/controllers/llamarLista.controllers.js`

---

## 1. Cómo se determina el acceso

El acceso a módulos y vistas se calcula en el frontend con estas reglas:

1. **Sesión**: `RequireAuth` exige un usuario autenticado. Si no lo hay, redirige a `/login`.
2. **Módulo**: `RequireModuleAccess` y `EntityPage` consultan `canAccessModule(usuario, moduleKey)`. Si el usuario no tiene el rol requerido, redirige a `/app/sin-acceso`.
3. **Rol activo**: el menú lateral usa `canAccessModuleWithRole(usuario, rolActivo, moduleKey)`. Si un usuario tiene varios roles, el selector **Rol activo** del encabezado permite cambiar el rol con el que se calcula el menú.
4. **Pestañas**: `getModuleTabConfig(moduleKey, rolActivo)` puede ocultar pestañas según el rol activo. Por ejemplo:
   - En **Capacitaciones**, los usuarios que no son `SysAdmin` solo ven la pestaña **Gestión académica**.
   - En **Inscripciones**, los roles que no pertenecen al grupo de inscripción solo ven **Listado**.
5. **Ruta de inicio**: `HomeRedirect` envía al primer módulo permitido según este orden: `dashboard`, `usuarios`, `capacitaciones`, `matriculaciones`, `pase-lista`, `llamar-lista`. Si ninguno aplica, va a `/app/sin-acceso`.

> **Matiz importante:** el guard de ruta valida contra **cualquiera** de los roles del usuario (`canAccessModule`), mientras que el menú y las pestañas se calculan con el **rol activo** (`canAccessModuleWithRole` / `getModuleTabConfig`). Por eso un usuario con varios roles puede ver distintas opciones al cambiar su rol activo.

---

## 2. Roles del sistema

### 2.1. Catálogo de roles

Los nombres deben coincidir exactamente con los registrados en la base de datos y en `backend/src/config/roles.js`:

- `SysAdmin`
- `Rooter`
- `Gerencia`
- `Cajero`
- `Administración`
- `Asesor`
- `Asesor Coordinador`
- `Estudiante`
- `Apoderado`

### 2.2. Grupos de acceso

Definidos en `frontend/src/config/permissions.js`:

| Grupo | Roles incluidos |
|---|---|
| `management` | `SysAdmin`, `Rooter`, `Gerencia` |
| `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `enrollment` | `SysAdmin`, `Administración` |
| `sysadmin` | `SysAdmin` |
| `advisor` | `SysAdmin`, `Asesor`, `Asesor Coordinador` |

### 2.3. Módulos y grupo que los habilita

| Módulo (`moduleKey`) | Grupo | Roles habilitados |
|---|---|---|
| `dashboard` | `management` | `SysAdmin`, `Rooter`, `Gerencia` |
| `usuarios` | `management` | `SysAdmin`, `Rooter`, `Gerencia` |
| `capacitaciones` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `paralelos` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `convocatorias` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `facultades` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `aulas` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `materias` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `temas` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `asesores` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `estudiantes` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `matriculaciones` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `mensualidades` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `inscripciones` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `pase-lista` | `academic` | `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` |
| `llamar-lista` | `advisor` | `SysAdmin`, `Asesor`, `Asesor Coordinador` |
| `datos` | `sysadmin` | `SysAdmin` |

### 2.4. Roles sin módulos asignados

- `Estudiante`: no tiene módulos en `MODULE_ACCESS`; solo puede autenticarse y ver **Mi perfil**.
- `Apoderado`: igual que `Estudiante`, sin módulos operativos; solo **Mi perfil**.

---

## 3. Mapa general de rutas

| Ruta | Pantalla | Módulo | Acceso |
|---|---|---|---|
| `/login` | `LoginPage` | Autenticación | Público |
| `/registro` | `RegisterPage` | Autenticación | Público, **ruta actualmente deshabilitada** |
| `/` | `HomeRedirect` | — | Autenticado (redirige) |
| `/app` | `HomeRedirect` | — | Autenticado (redirige) |
| `/app/dashboard` | `DashboardPage` | Dashboard | `management` |
| `/app/usuarios` | `UsuariosPage` | Usuarios | `management` |
| `/app/capacitaciones` | `CapacitacionesPage` | Capacitaciones | `academic` |
| `/app/inscripciones` | `InscripcionesPage` | Inscripciones | `academic` |
| `/app/matriculaciones` | `MatriculacionesPage` | Matriculaciones | `academic` |
| `/app/pase-lista` | `PaseListaPage` | Pase de lista | `academic` |
| `/app/llamar-lista` | `LlamarListaDocentePage` | Llamar lista | `advisor` |
| `/app/estudiantes` | `EstudiantesPage` | Estudiantes | `academic` |
| `/app/datos` | `DataExplorerPage` | Explorador de datos | `sysadmin` |
| `/app/perfil` | `ProfilePage` | Perfil | Cualquier usuario autenticado |
| `/app/sin-acceso` | `ForbiddenPage` | Errores | Cualquier usuario autenticado |
| `/app/:entityKey` | `EntityPage` | CRUD genérico | Según la entidad |
| `*` | `NotFoundPage` | Errores | Público |

---

## 4. Documentación por módulo

# 4.1. Módulo Autenticación

## Pantalla `LoginPage`

- **Ruta:** `/login`
- **Archivo:** `frontend/src/pages/auth/LoginPage.jsx`
- **Layout:** `AuthLayout`
- **Propósito:** autenticar al usuario con correo y contraseña. Si ya hay sesión, redirige al primer módulo permitido o a la ruta solicitada originalmente.

### Vista `LoginScreen`

- **Archivo:** `frontend/src/components/features/auth/LoginScreen.jsx`
- **Para qué sirve:** formulario de inicio de sesión. Valida correo y contraseña, muestra estado de carga y errores del servidor.
- **Usuarios habilitados:** público, cualquier persona con credenciales válidas.
- **Nota:** tras iniciar sesión se guarda el usuario y el token. La redirección usa `getDefaultAppPath` o la ruta `from` si el usuario tiene acceso.

## Pantalla `RegisterPage` (deshabilitada)

- **Ruta:** `/registro` (comentada en `router.jsx`)
- **Archivo:** `frontend/src/pages/auth/RegisterPage.jsx`
- **Propósito:** registrar una cuenta nueva.
- **Usuarios habilitados:** actualmente **nadie**, porque la ruta no está montada. Si se accede a `/registro`, cae en la página 404.

---

# 4.2. Módulo Dashboard

## Pantalla `DashboardPage`

- **Ruta:** `/app/dashboard`
- **Archivo:** `frontend/src/pages/app/dashboard/DashboardPage.jsx`
- **Módulo:** `dashboard`
- **Propósito:** ofrecer un resumen general del estado académico y accesos rápidos a los módulos.

### Vista `DashboardHome`

- **Archivo:** `frontend/src/components/dashboard/DashboardHome.jsx`
- **Para qué sirve:**
  - Consulta `GET /dashboard/resumen`.
  - Muestra indicadores y gráficos del estado académico.
  - Presenta una matriz semanal de capacidad de aulas por día y horario, con estados libre, con cupos, llena o con exceso.
  - Muestra tarjetas de acceso a las entidades que el usuario puede ver según `canAccessModule`.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`.

### Vista interna `Asistencia / Llamar lista`

- **Ubicación:** dentro de `DashboardPage`, sección “Asistencia”.
- **Para qué sirve:** tarjeta de acceso directo al módulo `pase-lista`.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia` (por herencia del módulo Dashboard).

---

# 4.3. Módulo Usuarios

## Pantalla `UsuariosPage`

- **Ruta:** `/app/usuarios`
- **Archivo:** `frontend/src/pages/app/usuarios/UsuariosPage.jsx`
- **Módulo:** `usuarios`
- **Propósito:** administrar usuarios del sistema y sus distintos roles (usuario base, asesor, administrativo, apoderado y estudiante).
- **Pestañas disponibles:** Usuarios, Asesores, Administrativos, Apoderados, Estudiantes.
- **Usuarios habilitados para el módulo:** `SysAdmin`, `Rooter`, `Gerencia`.

### Vista `UsuariosView`

- **Pestaña / parámetro:** `?tab=usuarios` (pestaña por defecto)
- **Archivo:** `frontend/src/pages/app/usuarios/UsuariosView.jsx`
- **Para qué sirve:**
  - CRUD de usuarios (`usuarios`).
  - Búsqueda, paginación y edición mediante modal.
  - Muestra el rol de acceso de cada usuario.
  - Permite asignar o quitar roles (`asesores`, `administrativos`, `apoderados`, `estudiantes`) desde el formulario.
  - Gestiona credenciales, datos personales y vigencia del usuario.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`.

### Vista `AsesoresView`

- **Pestaña / parámetro:** `?tab=asesores`
- **Archivo:** `frontend/src/pages/app/usuarios/AsesoresView.jsx`
- **Para qué sirve:** CRUD del rol **Asesor** mediante `CrudPanel` sobre la entidad `asesores`. Vincula un usuario existente con el rol de asesor.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`.
- **Nota:** no confundir con la pantalla genérica `/app/asesores`; esta vista vive dentro del módulo Usuarios.

### Vista `AdministrativosView`

- **Pestaña / parámetro:** `?tab=administrativos`
- **Archivo:** `frontend/src/pages/app/usuarios/AdministrativosView.jsx`
- **Para qué sirve:** CRUD del rol **Administrativo**, vinculado a un usuario existente.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`.

### Vista `ApoderadosView`

- **Pestaña / parámetro:** `?tab=apoderados`
- **Archivo:** `frontend/src/pages/app/usuarios/ApoderadosView.jsx`
- **Para qué sirve:** CRUD del rol **Apoderado**, incluyendo parentesco y datos de contacto del usuario asociado.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`.

### Vista `EstudiantesView`

- **Pestaña / parámetro:** `?tab=estudiantes`
- **Archivo:** `frontend/src/pages/app/usuarios/EstudiantesView.jsx`
- **Para qué sirve:** CRUD del rol **Estudiante** mediante `CrudPanel`. Registra el vínculo con el usuario, apoderado, colegio de procedencia y dirección.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`.
- **Nota:** es distinta de la pantalla `EstudiantesPage` (`/app/estudiantes`), que es una consulta académica con QR y detalle.

---

# 4.4. Módulo Capacitaciones

## Pantalla `CapacitacionesPage`

- **Ruta:** `/app/capacitaciones`
- **Archivo:** `frontend/src/pages/app/capacitaciones/CapacitacionesPage.jsx`
- **Módulo:** `capacitaciones`
- **Propósito:** configurar la estructura académica: facultades, convocatorias, capacitaciones, materias, aulas y paralelos con asignación de docentes.
- **Pestañas:** Gestión académica, Capacitaciones, Paralelos, Convocatorias, Facultades, Aulas, Materias.
- **Usuarios habilitados para el módulo:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Regla de pestañas:** solo `SysAdmin` ve todas las pestañas. Cualquier otro rol del grupo académico ve únicamente **Gestión académica**; si intenta abrir otra pestaña por URL, la pantalla vuelve a Gestión académica.

### Vista `GestionAcademicaView`

- **Pestaña / parámetro:** `?tab=gestion` (pestaña por defecto)
- **Archivo:** `frontend/src/pages/app/capacitaciones/GestionAcademicaView.jsx`
- **Para qué sirve:**
  - Asistente por pasos para preparar la estructura académica.
  - Pasos: Facultades → Convocatorias → Capacitaciones → Materias → Aulas → Paralelos y docentes.
  - Permite crear, editar y eliminar registros de cada paso.
  - Permite asociar materias a una capacitación.
  - Permite definir días, horario, aula y materias de un paralelo.
  - Permite asignar asesores por día y materia mediante la matriz de asignaciones docentes.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.

### Vista `CapacitacionesView`

- **Pestaña / parámetro:** `?tab=capacitaciones`
- **Archivo:** `frontend/src/pages/app/capacitaciones/CapacitacionesView.jsx`
- **Para qué sirve:** CRUD de capacitaciones asociadas a una convocatoria, con fechas de inicio y fin y estado activo.
- **Usuarios habilitados:** `SysAdmin` (único rol que ve esta pestaña).

### Vista `ParalelosView`

- **Pestaña / parámetro:** `?tab=paralelos`
- **Archivo:** `frontend/src/pages/app/capacitaciones/ParalelosView.jsx`
- **Para qué sirve:** CRUD de paralelos: capacitación, aula, nombre, nivel, modalidad, días y horario. Incluye un banner de capacitación activa.
- **Usuarios habilitados:** `SysAdmin`.

### Vista `ConvocatoriasView`

- **Pestaña / parámetro:** `?tab=convocatorias`
- **Archivo:** `frontend/src/pages/app/capacitaciones/ConvocatoriasView.jsx`
- **Para qué sirve:** CRUD de convocatorias de preuniversitario. Cada convocatoria requiere una facultad existente y registra fecha de inicio y modalidad.
- **Usuarios habilitados:** `SysAdmin`.

### Vista `FacultadesView`

- **Pestaña / parámetro:** `?tab=facultades`
- **Archivo:** `frontend/src/pages/app/capacitaciones/FacultadesView.jsx`
- **Para qué sirve:** CRUD de facultades, que son la base para carreras y convocatorias.
- **Usuarios habilitados:** `SysAdmin`.

### Vista `AulasView`

- **Pestaña / parámetro:** `?tab=aulas`
- **Archivo:** `frontend/src/pages/app/capacitaciones/AulasView.jsx`
- **Para qué sirve:** CRUD de aulas con código y capacidad. Las aulas se usan en paralelos y en la matriz de capacidad del dashboard.
- **Usuarios habilitados:** `SysAdmin`.

### Vista `MateriasView`

- **Pestaña / parámetro:** `?tab=materias`
- **Archivo:** `frontend/src/pages/app/capacitaciones/MateriasView.jsx`
- **Para qué sirve:** CRUD de materias. Muestra las materias activas y permite asociarlas a capacitaciones desde la gestión académica.
- **Usuarios habilitados:** `SysAdmin`.

### Vista `TemasView` (acceso por URL)

- **Ruta:** `/app/temas`
- **Archivo:** `frontend/src/pages/app/capacitaciones/TemasView.jsx`
- **Para qué sirve:** CRUD de temas asociados opcionalmente a una materia.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Nota:** no tiene pestaña en `CapacitacionesPage`; se accede por URL directa o mediante el CRUD genérico.

---

# 4.5. Módulo Inscripciones

## Pantalla `InscripcionesPage`

- **Ruta:** `/app/inscripciones`
- **Archivo:** `frontend/src/pages/app/inscripciones/InscripcionesPage.jsx`
- **Módulo:** `inscripciones`
- **Propósito:** registrar, consultar y reportar las inscripciones de estudiantes a paralelos.
- **Pestañas:** Inscripciones (registro), Listado, Reportes.
- **Usuarios habilitados para el módulo:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Regla de pestañas:**
  - `SysAdmin` y `Administración` ven las tres pestañas.
  - `Rooter`, `Gerencia` y `Cajero` solo ven **Listado**, que además queda como pestaña por defecto.

### Vista `RegistroView`

- **Pestaña / parámetro:** `?tab=registro` (pestaña por defecto para `SysAdmin` y `Administración`)
- **Archivo:** `frontend/src/pages/app/inscripciones/RegistroView.jsx`
- **Para qué sirve:**
  - Lista las inscripciones existentes con buscador y paginación.
  - Permite crear una inscripción nueva mediante `InscripcionRegistroForm`.
  - Permite consultar y editar la ficha de una inscripción.
  - Permite eliminar una inscripción.
  - Muestra datos del estudiante, apoderado, inscripción, capacitación, paralelo, aula y personas vinculadas.
- **Usuarios habilitados:** `SysAdmin`, `Administración`.

### Vista `ListadoView`

- **Pestaña / parámetro:** `?tab=listado`
- **Archivo:** `frontend/src/pages/app/inscripciones/ListadoView.jsx`
- **Para qué sirve:** consulta de inscripciones en modo lista con detalle lateral. Muestra información académica, facultad, carrera, capacitación, paralelo, aula, apoderado y administrativo.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.

### Vista `ReportesView`

- **Pestaña / parámetro:** `?tab=reportes`
- **Archivo:** `frontend/src/pages/app/inscripciones/ReportesView.jsx`
- **Para qué sirve:**
  - Seleccionar una inscripción y previsualizar su reporte.
  - Editar el **código de conducta** que se incluye en el reporte.
  - Generar una constancia imprimible o guardable como PDF en una ventana nueva.
- **Usuarios habilitados:** `SysAdmin`, `Administración`.

### Componente de reporte `InscripcionReport`

- **Archivo:** `frontend/src/pages/app/inscripciones/InscripcionReport.jsx`
- **Para qué sirve:** plantilla imprimible de la constancia de inscripción. Incluye encabezado institucional, datos del estudiante, apoderado, administrativo, capacitación, paralelo, aula, horario y código de conducta.
- **Usuarios habilitados:** no es una ruta independiente; se usa desde `ReportesView` (`SysAdmin`, `Administración`).

---

# 4.6. Módulo Matriculaciones / Mensualidades

## Pantalla `MatriculacionesPage`

- **Ruta:** `/app/matriculaciones`
- **Archivo:** `frontend/src/pages/app/matriculaciones/MatriculacionesPage.jsx`
- **Módulo:** `matriculaciones`
- **Propósito:** registrar y consultar los pagos mensuales asociados a cada inscripción.
- **Pestañas:** Realizar pago, Listado, Tabla.
- **Comportamiento por defecto:** al entrar sin `?tab`, la pantalla monta **Tabla** (`mensualidades-tabla`).
- **Usuarios habilitados para el módulo:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Regla de pestañas:** todos los roles del grupo académico ven las tres vistas.

### Vista `MensualidadesTablaView`

- **Pestaña / parámetro:** `?tab=mensualidades-tabla`
- **Archivo:** `frontend/src/pages/app/matriculaciones/MensualidadesTablaView.jsx`
- **Para qué sirve:**
  - CRUD tabular de mensualidades.
  - Muestra inscripción, estudiante, administrativo, fechas, pago y comprobante.
  - Permite crear, editar y eliminar mensualidades mediante modal.
  - Usa catálogos de usuarios, estudiantes, administrativos, inscripciones y paralelos para mostrar nombres legibles.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.

### Vista `MensualidadesEstudiantesView`

- **Pestaña / parámetro:** `?tab=mensualidades-estudiantes` (etiqueta “Realizar pago”)
- **Archivo:** `frontend/src/pages/app/matriculaciones/MensualidadesEstudiantesView.jsx`
- **Para qué sirve:**
  - Buscar y seleccionar un estudiante.
  - Ver sus inscripciones y el estado de sus mensualidades.
  - Registrar un pago mensual con fechas, monto y comprobante.
  - Editar o eliminar mensualidades existentes.
  - Muestra un calendario de mensualidades por inscripción.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.

### Vista `MensualidadesListadoView`

- **Pestaña / parámetro:** `?tab=mensualidades`
- **Archivo:** `frontend/src/pages/app/matriculaciones/MensualidadesListadoView.jsx`
- **Para qué sirve:** listado de mensualidades con detalle lateral. Muestra datos del estudiante, carnet, correo, teléfono, mensualidad, inscripción, paralelo, nivel, modalidad, horario y calendario.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.

---

# 4.7. Módulo Pase de lista

## Pantalla `PaseListaPage`

- **Ruta:** `/app/pase-lista`
- **Archivo:** `frontend/src/pages/app/pase-lista/PaseListaPage.jsx`
- **Módulo:** `pase-lista`
- **Propósito:** gestionar las listas de asistencia de las clases y tomar asistencia de un paralelo.
- **Pestañas:** Asistencias, Tomar clase.
- **Usuarios habilitados para el módulo:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Regla de pestañas:** no se filtran por rol; todos ven ambas.

### Vista `AsistenciasView`

- **Pestaña / parámetro:** `?tab=asistencias` (pestaña por defecto)
- **Archivo:** `frontend/src/pages/app/pase-lista/AsistenciasView.jsx`
- **Para qué sirve:**
  - Listar las listas de asistencia registradas.
  - Filtrar por fecha, paralelo, materia o tema.
  - Seleccionar una lista y editar las marcas de asistencia (presente / ausente).
  - Eliminar listas de asistencia de la base de datos.
  - Crear una lista nueva mediante `TomarClaseView`.
  - Recuperar copias locales guardadas en el dispositivo.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.

### Vista `TomarClaseView`

- **Pestaña / parámetro:** `?tab=tomar-clase`
- **Archivo:** `frontend/src/pages/app/pase-lista/TomarClaseView.jsx`
- **Para qué sirve:**
  - Registrar una clase con materia, asesor, fecha, hora de inicio/fin, paralelo, aula y tema.
  - Cargar los estudiantes del paralelo.
  - Marcar asistencia de cada estudiante.
  - Guardar la lista en la base de datos.
  - Para el rol `Administración`, los campos de materia, asesor, aula, tema y horas son opcionales; para los demás roles son obligatorios.
- **Usuarios habilitados:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Reutilización:** también se monta dentro de `AsistenciasView` al crear una “Nueva lista”.

---

# 4.8. Módulo Llamar lista (docentes)

## Pantalla `LlamarListaDocentePage`

- **Ruta:** `/app/llamar-lista`
- **Archivo:** `frontend/src/pages/app/pase-lista/LlamarListaDocentePage.jsx`
- **Módulo:** `llamar-lista`
- **Propósito:** que el asesor consulte sus asignaciones y clases, y registre asistencia mediante lectura de QR o selección manual.
- **Usuarios habilitados para el módulo:** `SysAdmin`, `Asesor`, `Asesor Coordinador`.
- **Alcance de datos:**
  - `SysAdmin`: puede consultar todas las asignaciones y clases (`scope=all`).
  - `Asesor` y `Asesor Coordinador`: solo ven sus propias asignaciones y clases (`scope=mine`).
- **Vistas:** esta pantalla no usa pestañas; internamente combina:
  - Selector de asignación (paralelo / materia / día).
  - Selector de clase y fecha.
  - Lista de estudiantes del paralelo.
  - Escáner de QR con cámara.
  - Ficha emergente del estudiante registrado.
  - Marcado manual de asistencia y registro de permisos o justificaciones.

### Utilidades `llamarListaUtils`

- **Archivo:** `frontend/src/pages/app/pase-lista/llamarListaUtils.js`
- **Para qué sirve:** funciones auxiliares para interpretar el QR del estudiante y dividir el listado entre estudiantes presentes, ausentes o no registrados.
- **Usuarios habilitados:** no es una vista; se usa dentro de `LlamarListaDocentePage` por `SysAdmin`, `Asesor` y `Asesor Coordinador`.

---

# 4.9. Módulo Estudiantes

## Pantalla `EstudiantesPage`

- **Ruta:** `/app/estudiantes`
- **Archivo:** `frontend/src/pages/app/estudiantes/EstudiantesPage.jsx`
- **Módulo:** `estudiantes`
- **Propósito:** consultar el resumen académico de los estudiantes, filtrarlos por capacitación y paralelo, ver su detalle y generar su código QR.
- **Usuarios habilitados para el módulo:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Composición interna:**
  - **Buscador y filtros:** texto libre, capacitación y paralelo.
  - **Listado paginado:** tarjetas de estudiantes (`/estudiantes/resumen`).
  - **Detalle del estudiante:** ficha con datos personales, académicos y de inscripción (`/estudiantes/:id/detalle`).
  - **Código QR:** generado en el navegador a partir del ID del estudiante.
- **Nota:** no es un CRUD. Para crear o editar el rol Estudiante se usa `Usuarios → pestaña Estudiantes` (`EstudiantesView`).

---

# 4.10. Módulo Explorador de datos

## Pantalla `DataExplorerPage`

- **Ruta:** `/app/datos`
- **Archivo:** `frontend/src/pages/app/datos/DataExplorerPage.jsx`
- **Módulo:** `datos`
- **Propósito:** explorar de forma técnica las tablas de la base de datos y sus registros.
- **Usuarios habilitados:** únicamente `SysAdmin`.
- **Composición interna:**
  - Listado de tablas (`GET /datos/tablas`).
  - Selector de tabla.
  - Tabla paginada de registros (`GET /datos/tablas/:tabla`), con 20 filas por página.
  - Manejo de celdas nulas, booleanas y objetos JSON.
- **Nota de seguridad:** esta restricción se aplica tanto en el frontend como en el backend (`requireRole(SysAdmin)`).

---

# 4.11. Módulo Perfil

## Pantalla `ProfilePage`

- **Ruta:** `/app/perfil`
- **Archivo:** `frontend/src/pages/app/perfil/ProfilePage.jsx`
- **Módulo:** no tiene `moduleKey`; es accesible para cualquier usuario autenticado.
- **Propósito:** mostrar los datos del usuario autenticado, sus roles y su estado.
- **Composición interna:**
  - Resumen con avatar de iniciales, nombre, correo y estado (vigente / inactivo).
  - Información personal: nombre, apellidos, carnet, fecha de nacimiento, correo, estado e ID.
  - Roles de acceso asignados.
  - Botón para refrescar los datos del perfil (`fetchCurrentUser`).
  - Enlace “Volver al inicio” al primer módulo permitido.
- **Usuarios habilitados:** cualquier usuario autenticado, incluidos `Estudiante` y `Apoderado`.

---

## 5. Vistas transversales y de soporte

### `EntityPage`

- **Ruta:** `/app/:entityKey`
- **Archivo:** `frontend/src/pages/app/EntityPage.jsx`
- **Para qué sirve:** resolver CRUD genéricos y pantallas especiales según la entidad solicitada.
- **Entidades especiales:**
  - `usuarios` → `UsuariosPage`
  - `capacitaciones` → `CapacitacionesPage`
  - `matriculaciones` → `MatriculacionesPage`
- **Entidades genéricas:** `materias`, `asesores`, `paralelos`, `convocatorias`, `facultades`, `aulas`, `temas`, entre otras con `endpoint`.
- **Acceso:** se valida con `canAccessModule(usuario, entityKey)`.
  - `usuarios` → `SysAdmin`, `Rooter`, `Gerencia`.
  - `materias`, `asesores`, `paralelos`, `convocatorias`, `facultades`, `aulas`, `temas`, `estudiantes` → grupo académico (`SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`).
  - Si la entidad no existe o no tiene `endpoint`, muestra “Módulo no encontrado”.

### `ForbiddenPage`

- **Ruta:** `/app/sin-acceso`
- **Archivo:** `frontend/src/pages/app/ForbiddenPage.jsx`
- **Para qué sirve:** informar que el usuario no tiene permisos sobre la sección solicitada. Muestra los roles asignados y un enlace al primer módulo disponible.
- **Usuarios habilitados:** cualquier usuario autenticado.

### `NotFoundPage`

- **Ruta:** `*`
- **Archivo:** `frontend/src/pages/app/NotFoundPage.jsx`
- **Para qué sirve:** mostrar la página 404 cuando la ruta no existe.
- **Usuarios habilitados:** público.

### `HomeRedirect`

- **Rutas:** `/` y `/app`
- **Archivo:** `frontend/src/routes/HomeRedirect.jsx`
- **Para qué sirve:** redirigir al login si no hay sesión o al primer módulo permitido si hay sesión.
- **Orden de preferencia:** `dashboard` → `usuarios` → `capacitaciones` → `matriculaciones` → `pase-lista` → `llamar-lista`.
- **Usuarios habilitados:** todos.

### `RequireAuth`

- **Archivo:** `frontend/src/routes/guards/RequireAuth.jsx`
- **Para qué sirve:** proteger todas las rutas bajo `/app`. Si no hay usuario autenticado, redirige a `/login` guardando la ruta de origen.

### `RequireModuleAccess`

- **Archivo:** `frontend/src/routes/guards/RequireModuleAccess.jsx`
- **Para qué sirve:** validar que el usuario tenga un rol del grupo asociado al `moduleKey` antes de renderizar la pantalla. Si no, redirige a `/app/sin-acceso`.

---

## 6. Resumen rápido de habilitación por módulo

- **Dashboard:** `SysAdmin`, `Rooter`, `Gerencia`.
- **Usuarios:** `SysAdmin`, `Rooter`, `Gerencia`.
- **Capacitaciones:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` (solo `SysAdmin` ve las pestañas de catálogos; el resto solo Gestión académica).
- **Inscripciones:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración` (solo `SysAdmin` y `Administración` ven Registro y Reportes; el resto solo Listado).
- **Matriculaciones:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Pase de lista:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Llamar lista:** `SysAdmin`, `Asesor`, `Asesor Coordinador` (`SysAdmin` ve todas las asignaciones; los asesores solo las propias).
- **Estudiantes:** `SysAdmin`, `Rooter`, `Gerencia`, `Cajero`, `Administración`.
- **Explorador de datos:** `SysAdmin`.
- **Mi perfil:** cualquier usuario autenticado.
- **Estudiante / Apoderado:** sin módulos operativos; solo perfil.

---

## 7. Nota sobre la autorización en el backend

Las restricciones descritas en este documento son las que aplica la interfaz. En el backend, la autorización explícita por rol encontrada en las rutas se limita a:

- `GET /api/dashboard/resumen` → `management` (`SysAdmin`, `Rooter`, `Gerencia`).
- `GET /api/datos/tablas` y `GET /api/datos/tablas/:tabla` → solo `SysAdmin`.

El resto de endpoints exige una sesión válida mediante `authMiddleware`, pero no siempre vuelve a validar el rol. Además, `/api/llamar-lista/*` ajusta el alcance de los datos en el controlador: `SysAdmin` puede ver todo y los demás usuarios solo sus asignaciones. Por tanto, si se requiere seguridad estricta por rol en todos los módulos, debe reforzarse también en las rutas/controladores del backend.
