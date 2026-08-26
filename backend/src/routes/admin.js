import { Router } from "express";
import {
  login,
  logout,
  me,
  obtenerPrecios,
  actualizarPrecios,
  descargarArchivo,
} from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/login", loginRateLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAdmin, me);
router.get("/precios", requireAdmin, obtenerPrecios);
router.put("/precios", requireAdmin, actualizarPrecios);
router.get("/cotizaciones/:id/archivo", requireAdmin, descargarArchivo);

export default router;


