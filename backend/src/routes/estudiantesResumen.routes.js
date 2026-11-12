import { Router } from "express";
import { getEstudiantesResumen } from "../controllers/estudiantesResumen.controllers.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/estudiantes/resumen", authMiddleware, getEstudiantesResumen);

export default router;
