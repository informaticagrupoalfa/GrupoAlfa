import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createAsignacionDocente, deleteAsignacionDocente, getAsignacionesDocentes, updateAsignacionDocente } from "../controllers/asignacionesDocentesParalelo.controllers.js";

const router=Router();
router.get("/asignaciones-docentes-paralelo",authMiddleware,getAsignacionesDocentes);
router.post("/asignaciones-docentes-paralelo",authMiddleware,createAsignacionDocente);
router.put("/asignaciones-docentes-paralelo",authMiddleware,updateAsignacionDocente);
router.delete("/asignaciones-docentes-paralelo",authMiddleware,deleteAsignacionDocente);
export default router;
