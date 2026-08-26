import { Router } from "express";
import {
  getByTracking,
  searchByEmail,
  updateEstado,
  adminList,
  getEstados,
} from "../controllers/trackingController.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

// Estados disponibles (para pintar el timeline en el frontend)
router.get("/estados", getEstados);

// Panel admin: listar todos los pedidos
router.get("/admin/all", requireAdmin, adminList);

// Buscar pedidos por email del cliente
router.get("/", searchByEmail);

// Consultar un pedido puntual por su codigo de tracking
router.get("/:tracking", rateLimiter, getByTracking);

// Admin: actualizar el estado de un pedido
router.patch("/:tracking/estado", requireAdmin, updateEstado);

export default router;
