import { Router } from "express";
import {
  initPayment,
  confirmPayment,
  webpayReturn,
  paymentStatus,
} from "../controllers/paymentController.js";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Inicia una transaccion Webpay Plus para un pedido nuevo
router.post("/init", rateLimiter, initPayment);

// Confirmacion programatica JSON (para frontend SPA / pruebas)
router.get("/confirm", confirmPayment);

// Endpoint de retorno de Transbank (POST tras completar/anular el pago en Webpay)
router.post("/return", webpayReturn);
router.get("/return", webpayReturn); // Transbank tambien puede llegar via GET en algunos flujos

// Consulta el estado de pago de un pedido
router.get("/status/:tracking", paymentStatus);

export default router;
