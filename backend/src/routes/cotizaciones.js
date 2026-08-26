import { Router } from "express";
import { crear, listar, calc, precios } from "../controllers/cotizacionesController.js";
import { validarCotizacion } from "../middleware/validator.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { handleUpload } from "../middleware/upload.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();
router.post("/calcular", rateLimiter, calc);
router.post("/", rateLimiter, handleUpload, validarCotizacion, crear);
router.get("/precios", precios);
router.get("/", requireAdmin, listar);
export default router;