import express from "express";
import os from "node:os";
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
import materiasFacultadesRoutes from "./routes/materiasFacultades.routes.js";
import materiasFacultadesTemasRoutes from "./routes/materiasFacultadesTemas.routes.js";
import asignacionesAsesoresRoutes from "./routes/asignacionesAsesores.routes.js";
import asignacionesMateriasRoutes from "./routes/asignacionesMaterias.routes.js";
import matriculacionesRoutes from "./routes/matriculaciones.routes.js";
import clasesRoutes from "./routes/clases.routes.js";
import avancesRoutes from "./routes/avances.routes.js";
import mensualidadesRoutes from "./routes/mensualidades.routes.js";
import asistenciasRoutes from "./routes/asistencias.routes.js";
import datosRoutes from "./routes/datos.routes.js";
import materiasCapacitacionRoutes from "./routes/materiasCapacitacion.routes.js";
import morgan from "morgan";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { authorizeApi } from "./middleware/apiAuthorization.js";
import { env } from "./env.js";

config();

const app = express();

app.set('trust proxy', true);

const corsOptions = {
  origin: env.corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/health", (req, res) => res.json({ status: "ok" }));

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
app.use("/api", materiasFacultadesRoutes);
app.use("/api", materiasFacultadesTemasRoutes);
app.use("/api", asignacionesAsesoresRoutes);
app.use("/api", asignacionesMateriasRoutes);
app.use("/api", matriculacionesRoutes);
app.use("/api", clasesRoutes);
app.use("/api", avancesRoutes);
app.use("/api", mensualidadesRoutes);
app.use("/api", asistenciasRoutes);
app.use("/api", datosRoutes);
app.use("/api", materiasCapacitacionRoutes);

app.use(notFound);
app.use(errorHandler);

export { app };

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(
      (network) =>
        network &&
        !network.internal &&
        (network.family === "IPv4" || network.family === 4)
    )
    .map((network) => network.address);
}

export { getLanAddresses };
