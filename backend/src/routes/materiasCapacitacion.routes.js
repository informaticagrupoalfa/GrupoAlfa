import { Router } from "express";
import {
  getMateriasCapacitacion,
  getMateriaCapacitacionById,
  createMateriaCapacitacion,
  updateMateriaCapacitacion,
  deleteMateriaCapacitacion,
} from "../controllers/materiasCapacitacion.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createMateriaCapacitacionSchema,
  updateMateriaCapacitacionSchema,
} from "../validators/materiasCapacitacionValidators.js";

const router = Router();

router.get("/materias-capacitacion", authMiddleware, getMateriasCapacitacion);
router.get("/materias-capacitacion/:id", authMiddleware, getMateriaCapacitacionById);
router.post("/materias-capacitacion", authMiddleware, validateRequest(createMateriaCapacitacionSchema), createMateriaCapacitacion);
router.put("/materias-capacitacion/:id", authMiddleware, validateRequest(updateMateriaCapacitacionSchema), updateMateriaCapacitacion);
router.delete("/materias-capacitacion/:id", authMiddleware, deleteMateriaCapacitacion);

export default router;
