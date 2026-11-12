# Plan: pantalla Estudiantes (matriz paginada)

**Ruta del plan:** `.kilo/plans/1794417681373-estudiantes-screen.md`
**Estado:** listo para implementar

## Objetivo
Crear una nueva pantalla "Estudiantes" accesible desde el sidebar, con los datos de estudiantes en una matriz paginada de tarjetas (5 columnas × 3 filas), filtros por capacitación y paralelo, recuento total, y dos contadores adicionales (tiempo hasta fin de mensualidad y clases asistidas) con fondo distinto.

## Decisiones tomadas (resueltas)
- **Control de acceso:** grupo `academic` existente (`config/permissions.js:20`) = {SysAdmin, Rooter, Gerencia, Administración, Cajero}. Incluye los roles solicitados {Administración, SysAdmin, Gerencia, Rooter}. El usuario aceptó incluir a Cajero; **no hay cambios en `permissions.js`**. `MODULE_ACCESS.estudiantes` ya vale `"academic"`.
- **Ruta:** `/app/estudiantes`, nueva página `EstudiantesPage`, registrada **antes** del catch-all `:entityKey` en `router.jsx` para que tenga precedencia.
- **Sidebar:** ítem de nav dedicado "Estudiantes" → `/app/estudiantes`, cargado perezosamente, filtrado por `canAccessModuleWithRole(..., "estudiantes")`.
- **Endpoint backend:** `GET /api/estudiantes/resumen` (nuevo), paginado del servidor, con filtros `q`, `id_capacitacion`, `id_paralelo`, `page`, `limit`.
- **Matriz:** 25 tarjetas por página (5 columnas × 5 filas), CSS `grid-template-columns: repeat(5, 1fr)`; `limit=25` en el endpoint.
- **Campos adicionales (fondo distinto):** "Clases asistidas" (conteo de `asistencias`) y "Fin de mensualidad / días restantes" (desde `mensualidades.fecha_fin_mensualidad` más reciente). Si la fecha ya pasó, mostrar "Vencida".

## Modelo de datos confirmado (backend)
- `estudiantes(id_estudiante, id_usuario UNIQUE, id_apoderado, colegio_de_procedencia, direccion_de_domicilio)` join `usuarios(nro_carnet, nombre, apellido_paterno, apellido_materno, correo_electronico)`
- `matriculaciones(id_estudiante, id_paralelo, esta_vigente)` → `paralelos(nombre_paralelo, id_capacitacion)` → `capacitaciones`
- `mensualidades(id_estudiante, fecha_inicio_mensualidad, fecha_fin_mensualidad, pago)`
- `asistencias(id_estudiante)` → conteo por estudiante
- Endpoints existentes reutilizables: `GET /capacitaciones`, `GET /paralelos?id_capacitacion=`, `GET /estudiantes` (join usuarios)

## Tareas

### Backend
1. Crear `backend/src/controllers/estudiantesResumen.controllers.js`
   - Handler `getEstudiantesResumen(req, res, next)`
   - SQL: `estudiantes e JOIN usuarios u`; `LEFT JOIN matriculaciones m (esta_vigente=true) JOIN paralelos p JOIN capacitaciones c`; `LEFT JOIN` mensualidad más reciente por `fecha_fin_mensualidad DESC`; `LEFT JOIN (SELECT id_estudiante, COUNT(*) AS asistencias FROM asistencias GROUP BY id_estudiante) a`
   - Filtros: `q` (nombres/apellidos/carnet ILIKE), `id_capacitacion`, `id_paralelo`
   - Pagínación: `LIMIT`/`OFFSET` + `COUNT(*)`; devuelve `{ filas, total, pagina, limite, totalPaginas }`
   - Cada fila: `id_estudiante, id_usuario, nro_carnet, nombre, apellido_paterno, apellido_materno, correo_electronico, colegio_de_procedencia, direccion_de_domicilio, id_paralelo, nombre_paralelo, id_capacitacion, fecha_fin_mensualidad, asistencias`
2. Crear `backend/src/routes/estudiantesResumen.routes.js` con `router.get("/estudiantes/resumen", authMiddleware, getEstudiantesResumen)`
3. Editar `backend/src/app.js`: importar y registrar `app.use("/api", estudiantesResumenRoutes)`
   - La autorización global (`apiAuthorization`) aplica `ACADEMIC_ROLES` a `/estudiantes/resumen` (no es ruta de gestión ni inscripciones), coherente con el grupo `academic`.

### Frontend
4. Crear `frontend/src/pages/app/EstudiantesPage.jsx`
   - Toolbar: buscador `q`, select capacitación, select paralelo (cargado filtrado por `GET /paralelos?id_capacitacion`), botón limpiar filtros
   - Carga `GET /estudiantes/resumen` con `page` y `limit=25`
   - Muestra `total` ("Total: N estudiante(s)")
   - Matriz de 25 tarjetas (página actual), 5 columnas × 5 filas
   - Cada tarjeta: filas `campo: valor` — Nombre, Carnet, Correo, Colegio, Dirección, Paralelo, Capacitación; texto medio-pequeño
   - Dos filas extra con clase de fondo distinta: "Clases asistidas" y "Fin de mensualidad (días restantes / Vencida)"
   - Paginación (reutilizar `components/ui/Pagination`), estados de carga (`Skeleton`) y error (`ErrorFallback`)
5. Editar `frontend/src/routes/router.jsx`: añadir `Route path="estudiantes"` con `<RequireModuleAccess moduleKey="estudiantes"><EstudiantesPage /></RequireModuleAccess>` antes de `path=":entityKey"`
6. Editar `frontend/src/components/dashboard/Sidebar.jsx`: añadir ítem nav "Estudiantes" (`to="/app/estudiantes"`, lazy `EstudiantesPage`, `canAccessModuleWithRole(..., "estudiantes")`)
7. Editar `frontend/src/App.css`: clases `.estudiantes-grid` (5 columnas), `.estudiante-card` (texto sm), `.campo-valor` (label + valor), `.campo-extra` (fondo distinto), responsive (menos columnas en móvil)

## Validación
- Frontend: `cd frontend && npm run lint` y `npm run build`
- Backend: `node --check` en los archivos cambiados; iniciar `npm run dev` y probar `GET /api/estudiantes/resumen` con y sin filtros
- Navegar a `/app/estudiantes` con un usuario del grupo académico y verificar sidebar, matriz, filtros, contadores y paginación

## Out of scope
- Editar/crear estudiantes desde esta pantalla (solo lectura)
- Cambiar el grupo de acceso (se mantiene `academic`)
- Cambiar la pestaña `usuarios?tab=estudiantes` existente (se deja como está)
