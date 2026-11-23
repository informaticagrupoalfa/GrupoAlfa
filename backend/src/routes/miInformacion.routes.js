import { Router } from "express";
import { getMiInformacion, getMisAsistencias } from "../controllers/miInformacion.controllers.js";

const router = Router();

// El estudiante se obtiene del JWT; no se acepta un id por parámetro.
router.get("/mi-informacion", getMiInformacion);
router.get("/mi-informacion/asistencias", getMisAsistencias);

export default router;
