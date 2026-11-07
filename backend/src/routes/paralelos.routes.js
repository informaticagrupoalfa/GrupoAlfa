import { Router } from "express";
import {
  getParalelos,
  getParaleloById,
  createParalelo,
  updateParalelo,
  deleteParalelo,
} from "../controllers/paralelos.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createParaleloSchema,
  updateParaleloSchema,
} from "../validators/paralelosValidators.js";

const router = Router();

router.get("/paralelos", authMiddleware, getParalelos);
router.get("/paralelos/:id", authMiddleware, getParaleloById);
router.post("/paralelos", authMiddleware, validateRequest(createParaleloSchema), createParalelo);
router.put("/paralelos/:id", authMiddleware, validateRequest(updateParaleloSchema), updateParalelo);
router.delete("/paralelos/:id", authMiddleware, deleteParalelo);

export default router;
