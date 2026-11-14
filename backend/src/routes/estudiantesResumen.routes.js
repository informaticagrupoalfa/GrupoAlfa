import { Router } from "express";
import {
  getEstudianteDetalle,
  getEstudiantesResumen,
} from "../controllers/estudiantesResumen.controllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/estudiantes/resumen", authMiddleware, getEstudiantesResumen);
router.get("/estudiantes/:id/detalle", authMiddleware, getEstudianteDetalle);

export default router;
