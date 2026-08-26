import { body, validationResult } from "express-validator";

export const validarCotizacion = [
  body("nombre").trim().notEmpty().isLength({ min: 2, max: 100 }),
  body("email").trim().isEmail().normalizeEmail(),
  body("telefono")
    .trim()
    .notEmpty()
    .withMessage("El telefono es requerido")
    .customSanitizer((v) => v.replace(/[\s\-().]/g, ""))
    .matches(/^\+?56?9\d{8}$|^\+?\d{7,15}$/)
    .withMessage("El telefono no parece valido"),
  body("formato").optional().isIn(["A0", "A1", "A2", "A3", "A4"]),
  body("tipo").optional().isIn(["linea-bn", "linea-color", "area-bn", "area-color"]),
  body("cantidad").optional().isInt({ min: 1, max: 10000 }),
  body("reparto").optional().isBoolean(),
  body("mensaje").optional().isLength({ max: 2000 }),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ ok: false, errores: errs.array() });
    next();
  },
];