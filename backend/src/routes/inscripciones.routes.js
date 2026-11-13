import { Router } from "express";
import {
  getInscripciones,
  getInscripcionById,
  createInscripcion,
  updateInscripcion,
  deleteInscripcion,
  registrarEstudiante,
} from "../controllers/inscripciones.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createInscripcionSchema,
  updateInscripcionSchema,
} from "../validators/inscripcionesValidators.js";

const router = Router();

router.get("/inscripciones", authMiddleware, getInscripciones);
router.get("/inscripciones/:id", authMiddleware, getInscripcionById);
router.post("/inscripciones/registrar-estudiante", authMiddleware, registrarEstudiante);
router.post("/inscripciones", authMiddleware, validateRequest(createInscripcionSchema), createInscripcion);
router.put("/inscripciones/:id", authMiddleware, validateRequest(updateInscripcionSchema), updateInscripcion);
router.delete("/inscripciones/:id", authMiddleware, deleteInscripcion);

export default router;
