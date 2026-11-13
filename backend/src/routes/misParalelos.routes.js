import { Router } from "express";
import { getMisParalelos } from "../controllers/misParalelos.controllers.js";

const router = Router();

// Cualquier usuario autenticado puede consultar sus propios paralelos.
router.get("/mis-paralelos", getMisParalelos);

export default router;
