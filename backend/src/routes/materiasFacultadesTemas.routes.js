import { Router } from "express";
import {
  getMateriasFacultadesTemas,
  getMateriaFacultadTemaById,
  createMateriaFacultadTema,
  updateMateriaFacultadTema,
  deleteMateriaFacultadTema,
} from "../controllers/materiasFacultadesTemas.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createMateriaFacultadTemaSchema,
  updateMateriaFacultadTemaSchema,
} from "../validators/materiasFacultadesTemasValidators.js";

const router = Router();

router.get("/materias-facultades-temas", authMiddleware, getMateriasFacultadesTemas);
router.get("/materias-facultades-temas/:id", authMiddleware, getMateriaFacultadTemaById);
router.post("/materias-facultades-temas", authMiddleware, validateRequest(createMateriaFacultadTemaSchema), createMateriaFacultadTema);
router.put("/materias-facultades-temas/:id", authMiddleware, validateRequest(updateMateriaFacultadTemaSchema), updateMateriaFacultadTema);
router.delete("/materias-facultades-temas/:id", authMiddleware, deleteMateriaFacultadTema);

export default router;
