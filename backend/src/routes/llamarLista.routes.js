import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getAsignacionesAsesor, getClasesAsesor, getEstudiantesDelParalelo } from "../controllers/llamarLista.controllers.js";

const router = Router();
router.get("/llamar-lista/asignaciones", authMiddleware, getAsignacionesAsesor);
router.get("/llamar-lista/clases", authMiddleware, getClasesAsesor);
router.get("/llamar-lista/paralelos/:id/estudiantes", authMiddleware, getEstudiantesDelParalelo);
export default router;
