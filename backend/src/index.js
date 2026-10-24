import express from "express";
import usuariosRoutes from "./routes/usuarios.routes.js";
import materiasRoutes from "./routes/materias.routes.js";
import asesoresRoutes from "./routes/asesores.routes.js";
import capacitacionesRoutes from "./routes/capacitaciones.routes.js";
import temasRoutes from "./routes/temas.routes.js";
import estudiantesRoutes from "./routes/estudiantes.routes.js";
import administrativosRoutes from "./routes/administrativos.routes.js";
import apoderadosRoutes from "./routes/apoderados.routes.js";
import facultadesRoutes from "./routes/facultades.routes.js";
import aulasRoutes from "./routes/aulas.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import carrerasRoutes from "./routes/carreras.routes.js";
import convocatoriasRoutes from "./routes/convocatorias.routes.js";
import asignacionesRolRoutes from "./routes/asignacionesRol.routes.js";
import inscripcionesRoutes from "./routes/inscripciones.routes.js";
import examenesRoutes from "./routes/examenes.routes.js";
import contenidosRoutes from "./routes/contenidos.routes.js";
import materiasAsesoresRoutes from "./routes/materiasAsesores.routes.js";
import postulacionesRoutes from "./routes/postulaciones.routes.js";
import materiasConvocatoriaRoutes from "./routes/materiasConvocatoria.routes.js";
import asignacionesAsesoresRoutes from "./routes/asignacionesAsesores.routes.js";
import asignacionesMateriasRoutes from "./routes/asignacionesMaterias.routes.js";
import matriculacionesRoutes from "./routes/matriculaciones.routes.js";
import clasesRoutes from "./routes/clases.routes.js";
import avancesRoutes from "./routes/avances.routes.js";
import mensualidadesRoutes from "./routes/mensualidades.routes.js";
import asistenciasRoutes from "./routes/asistencias.routes.js";
import morgan from "morgan";
import { PORT } from "./config.js";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { authorizeApi } from "./middleware/apiAuthorization.js";

config();

if (!process.env.JWT_SECRET) {
  console.warn("ADVERTENCIA: JWT_SECRET no definido en .env");
}

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(cookieParser());

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Autorización por rol para todo /api, antes de registrar los routers.
app.use("/api", authorizeApi);

app.use("/api", usuariosRoutes);
app.use("/api", materiasRoutes);
app.use("/api", asesoresRoutes);
app.use("/api", capacitacionesRoutes);
app.use("/api", temasRoutes);
app.use("/api", estudiantesRoutes);
app.use("/api", administrativosRoutes);
app.use("/api", apoderadosRoutes);
app.use("/api", facultadesRoutes);
app.use("/api", aulasRoutes);
app.use("/api", rolesRoutes);
app.use("/api", carrerasRoutes);
app.use("/api", convocatoriasRoutes);
app.use("/api", asignacionesRolRoutes);
app.use("/api", inscripcionesRoutes);
app.use("/api", examenesRoutes);
app.use("/api", contenidosRoutes);
app.use("/api", materiasAsesoresRoutes);
app.use("/api", postulacionesRoutes);
app.use("/api", materiasConvocatoriaRoutes);
app.use("/api", asignacionesAsesoresRoutes);
app.use("/api", asignacionesMateriasRoutes);
app.use("/api", matriculacionesRoutes);
app.use("/api", clasesRoutes);
app.use("/api", avancesRoutes);
app.use("/api", mensualidadesRoutes);
app.use("/api", asistenciasRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT);
// eslint-disable-next-line no-console
console.log("Server on port", PORT);
