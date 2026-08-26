import { Router } from "express";
import { getFeed, syncInstagram, updateFeedConfig } from "../controllers/instagramController.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Endpoint público para el feed dinámico en el home
router.get("/feed", rateLimiter, getFeed);

// Endpoints de administración
router.post("/sync", requireAdmin, syncInstagram);
router.put("/config", requireAdmin, updateFeedConfig);

export default router;
