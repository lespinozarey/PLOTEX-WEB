import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "plotex_secret_key_change_me_in_prod";

/**
 * Protege rutas de administracion verificando el token JWT presente en la cookie HttpOnly 'admin_token'.
 */
export function requireAdmin(req, res, next) {
  const token =
    req.cookies?.admin_token ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);

  if (!token) {
    return res.status(401).json({ ok: false, error: "No autorizado. Sesion no iniciada." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Sesion invalida o expirada." });
  }
}


