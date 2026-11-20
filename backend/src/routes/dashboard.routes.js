import { Router } from "express";
import { getDashboardResumen } from "../controllers/dashboard.controllers.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { MANAGEMENT_ROLES } from "../config/roles.js";

const router = Router();

router.get("/dashboard/resumen", requireRole(...MANAGEMENT_ROLES), getDashboardResumen);

export default router;
