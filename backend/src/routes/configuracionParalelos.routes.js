import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createConfiguracionParalelo, getConfiguracionParalelos, updateConfiguracionParalelo } from "../controllers/configuracionParalelos.controllers.js";

const router = Router();
router.get("/configuracion-paralelos", authMiddleware, getConfiguracionParalelos);
router.post("/configuracion-paralelos", authMiddleware, createConfiguracionParalelo);
router.put("/configuracion-paralelos/:id", authMiddleware, updateConfiguracionParalelo);
export default router;
