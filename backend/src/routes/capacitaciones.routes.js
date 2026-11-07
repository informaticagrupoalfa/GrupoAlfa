import { Router } from "express";
import {
  getCapacitaciones,
  getCapacitacionById,
  createCapacitacion,
  updateCapacitacion,
  deleteCapacitacion,
  getCapacitacionesActivas,
} from "../controllers/capacitaciones.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createCapacitacionSchema,
  updateCapacitacionSchema,
} from "../validators/capacitacionesValidators.js";

const router = Router();

router.get("/capacitaciones", authMiddleware, getCapacitaciones);
router.get("/capacitaciones/activas", authMiddleware, getCapacitacionesActivas);
router.get("/capacitaciones/:id", authMiddleware, getCapacitacionById);
router.post("/capacitaciones", authMiddleware, validateRequest(createCapacitacionSchema), createCapacitacion);
router.put("/capacitaciones/:id", authMiddleware, validateRequest(updateCapacitacionSchema), updateCapacitacion);
router.delete("/capacitaciones/:id", authMiddleware, deleteCapacitacion);

export default router;
