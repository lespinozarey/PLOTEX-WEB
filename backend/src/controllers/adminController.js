import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPrecios, setPrecios } from "../db/pricingStore.js";
import { obtenerCotizacionPorId } from "./cotizacionesController.js";
import { UPLOADS_DIR } from "../middleware/upload.js";

const JWT_SECRET = process.env.JWT_SECRET || "plotex_secret_key_change_me_in_prod";
const ADMIN_USER = process.env.ADMIN_USER || "admin";

/**
 * POST /api/admin/login
 * Autentica usuario y contraseña. Emite una Cookie HttpOnly con JWT.
 */
export function login(req, res) {
  const { usuario, password } = req.body || {};

  if (!usuario || !password) {
    return res.status(400).json({ ok: false, error: "Usuario y contraseña requeridos" });
  }

  const expectedUser = ADMIN_USER;
  let isMatch = false;

  if (usuario === expectedUser) {
    if (process.env.ADMIN_PASSWORD_HASH) {
      isMatch = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH);
    } else {
      const expectedPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || "admin123";
      isMatch = password === expectedPassword;
    }
  }

  if (!isMatch) {
    return res.status(401).json({ ok: false, error: "Usuario o contraseña incorrectos" });
  }

  const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: "2h" });

  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000, // 2 horas
  });

  res.json({ ok: true, usuario });
}

/**
 * POST /api/admin/logout
 * Elimina la cookie HttpOnly de sesion.
 */
export function logout(_req, res) {
  res.clearCookie("admin_token");
  res.json({ ok: true, mensaje: "Sesion cerrada" });
}

/**
 * GET /api/admin/me
 * Retorna la informacion del admin autenticado.
 */
export function me(req, res) {
  res.json({ ok: true, usuario: req.adminUser?.usuario || ADMIN_USER });
}


/**
 * GET /api/admin/precios
 */
export function obtenerPrecios(_req, res) {
  res.json({ ok: true, precios: getPrecios() });
}

/**
 * PUT /api/admin/precios
 * Body: { precioBase?, multiplicador?, descuentos?, costoReparto?, repartoGratisDesde? }
 * Los campos que no se envian mantienen su valor actual.
 */
export function actualizarPrecios(req, res) {
  try {
    const actualizado = setPrecios(req.body);
    res.json({ ok: true, precios: actualizado });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

/**
 * GET /api/admin/cotizaciones/:id/archivo
 * Descarga el archivo adjunto de una cotizacion puntual.
 */
export function descargarArchivo(req, res) {
  const cot = obtenerCotizacionPorId(req.params.id);
  if (!cot || !cot.archivo || !cot.archivo.guardadoComo) {
    return res.status(404).json({ ok: false, error: "Esta cotizacion no tiene archivo adjunto" });
  }

  // Prevenir Path Traversal sanitizando el nombre y validando la ruta resuelta
  const safeFilename = path.basename(cot.archivo.guardadoComo);
  const resolvedUploadsDir = path.resolve(UPLOADS_DIR);
  const filePath = path.resolve(resolvedUploadsDir, safeFilename);

  if (!filePath.startsWith(resolvedUploadsDir) || !fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: "El archivo ya no esta disponible en el servidor" });
  }

  res.download(filePath, cot.archivo.nombre);
}

