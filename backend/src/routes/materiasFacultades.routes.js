import { Router } from "express";
import {
  getMateriasFacultades,
  getMateriaFacultadById,
  createMateriaFacultad,
  updateMateriaFacultad,
  deleteMateriaFacultad,
} from "../controllers/materiasFacultades.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createMateriaFacultadSchema,
  updateMateriaFacultadSchema,
} from "../validators/materiasFacultadesValidators.js";

const router = Router();

router.get("/materias-facultades", authMiddleware, getMateriasFacultades);
router.get("/materias-facultades/:id", authMiddleware, getMateriaFacultadById);
router.post("/materias-facultades", authMiddleware, validateRequest(createMateriaFacultadSchema), createMateriaFacultad);
router.put("/materias-facultades/:id", authMiddleware, validateRequest(updateMateriaFacultadSchema), updateMateriaFacultad);
router.delete("/materias-facultades/:id", authMiddleware, deleteMateriaFacultad);

export default router;
