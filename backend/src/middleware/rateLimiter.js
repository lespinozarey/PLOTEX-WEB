import rateLimit from "express-rate-limit";

// Rate limiter general para endpoints publicos
export const rateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  message: { ok: false, error: "Demasiadas solicitudes. Por favor intente mas tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter estricto para inicio de sesion (previene fuerza bruta)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // maximo 5 intentos fallidos/solicitudes
  message: { ok: false, error: "Demasiados intentos de acceso. Intente nuevamente en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});