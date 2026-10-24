import { Router } from "express";
import {
  getUsuarios,
  getUsuarioById,
  getUsuarioCatalogo,
  getMe,
  createUsuario,
  updateUsuario,
  updateUsuarioRoles,
  deleteUsuario,
  login,
  logout,
} from "../controllers/usuarios.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  loginUsuarioSchema,
  updateUsuarioRolesSchema,
} from "../validators/usuariosValidators.js";

const router = Router();

// públicas
router.post("/usuarios", validateRequest(createUsuarioSchema), createUsuario);
router.post("/usuarios/login", validateRequest(loginUsuarioSchema), login);
router.post("/usuarios/logout", logout);

// protegidas
router.get("/usuarios/me", authMiddleware, getMe);
router.get("/usuarios/catalogo", authMiddleware, getUsuarioCatalogo);
router.get("/usuarios", authMiddleware, getUsuarios);
router.get("/usuarios/:id", authMiddleware, getUsuarioById);
router.put("/usuarios/:id/roles", authMiddleware, validateRequest(updateUsuarioRolesSchema), updateUsuarioRoles);
router.put("/usuarios/:id", authMiddleware, validateRequest(updateUsuarioSchema), updateUsuario);
router.delete("/usuarios/:id", authMiddleware, deleteUsuario);

export default router;
