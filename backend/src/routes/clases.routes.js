import { Router } from "express";
import {
  getClases,
  getClaseById,
  createClase,
  updateClase,
  deleteClase,
} from "../controllers/clases.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { hasAnyRole } from "../middleware/roleMiddleware.js";
import { ROLE_NAMES } from "../config/roles.js";
import {
  createClaseAdministracionSchema,
  createClaseSchema,
  updateClaseSchema,
} from "../validators/clasesValidators.js";

const router = Router();
const validateStandardCreate = validateRequest(createClaseSchema);
const validateAdministrationCreate = validateRequest(createClaseAdministracionSchema);

const validateCreateClase = (req, res, next) =>
  (hasAnyRole(req.user, [ROLE_NAMES.ADMINISTRACION])
    ? validateAdministrationCreate
    : validateStandardCreate)(req, res, next);

router.get("/clases", authMiddleware, getClases);
router.get("/clases/:id", authMiddleware, getClaseById);
router.post("/clases", authMiddleware, validateCreateClase, createClase);
router.put("/clases/:id", authMiddleware, validateRequest(updateClaseSchema), updateClase);
router.delete("/clases/:id", authMiddleware, deleteClase);

export default router;
