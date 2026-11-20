import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getAsignacionesAsesor, getClasesAsesor, getEstudiantesDelParalelo, getFichaEstudianteRegistrado } from "../controllers/llamarLista.controllers.js";

const router = Router();
router.get("/llamar-lista/asignaciones", authMiddleware, getAsignacionesAsesor);
router.get("/llamar-lista/clases", authMiddleware, getClasesAsesor);
router.get("/llamar-lista/paralelos/:id/estudiantes", authMiddleware, getEstudiantesDelParalelo);
router.get("/llamar-lista/clases/:classId/estudiantes/:studentId/ficha", authMiddleware, getFichaEstudianteRegistrado);
export default router;
