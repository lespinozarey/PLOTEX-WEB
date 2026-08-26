import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cotizacionesRoutes from "./routes/cotizaciones.js";
import paymentRoutes from "./routes/payment.js";
import trackingRoutes from "./routes/tracking.js";
import adminRoutes from "./routes/admin.js";
import instagramRoutes from "./routes/instagram.js";
import { health } from "./controllers/cotizacionesController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND = process.env.FRONTEND_URL || "*";

// Configuracion avanzada de Helmet para cabeceras de seguridad HTTP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Desactivado para permitir integracion flexible con Webpay / CDN assets
  })
);

// Configuracion de CORS segura
const allowedOrigins = FRONTEND === "*" ? "*" : FRONTEND.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === "*" || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Acceso no permitido por CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
// Transbank redirige a /api/payment/return via POST con datos application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// Rutas de API
app.get("/api/health", health);
app.use("/api/cotizaciones", cotizacionesRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/instagram", instagramRoutes);

// Servir frontend estático (HTML, CSS, JS, imágenes, admin, etc.)
app.use(express.static(rootDir));

// Manejador 404 para llamadas de API no encontradas
app.use("/api/*", (_req, res) => res.status(404).json({ ok: false, error: "Endpoint no encontrado" }));

// Fallback para rutas directas al frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

// Middleware global de manejo de errores (evita fugar trazas de error internas al cliente)
app.use((err, _req, res, _next) => {
  console.error("[ServerError]", err);
  const status = err.status || 500;
  const msg = process.env.NODE_ENV === "production" ? "Error interno del servidor" : err.message;
  res.status(status).json({ ok: false, error: msg });
});

app.listen(PORT, () => console.log(`\n  🚀 PLOTEX Platform & API corriendo en http://localhost:${PORT}\n`));
export default app;