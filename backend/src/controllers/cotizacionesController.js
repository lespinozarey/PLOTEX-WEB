import { calcular, tablaPrecios } from "../utils/priceCalculator.js";
import { enviarNotificacionCotizacion } from "../utils/mailer.js";

const cotizaciones = [];

export const crear = async (req, res) => {
  try {
    const { nombre, email, telefono, mensaje, formato, tipo, cantidad, reparto } = req.body;
    // Cuando el formulario llega como multipart/form-data (con archivo adjunto),
    // "calculo" viaja como un string JSON en vez de un objeto.
    let calculo = req.body.calculo;
    if (typeof calculo === "string") {
      try { calculo = JSON.parse(calculo); } catch { calculo = undefined; }
    }

    const c = cotizaciones.length + 1;
    const archivo = req.file || null;
    const cot = {
      id: c,
      nombre, email, telefono, mensaje,
      formato, tipo, cantidad: Number(cantidad) || 1,
      reparto: reparto === true || reparto === "true",
      calculo,
      archivo: archivo
        ? { nombre: archivo.originalname, tipo: archivo.mimetype, tamano: archivo.size, guardadoComo: archivo.filename }
        : null,
      createdAt: new Date().toISOString(),
      ip: req.ip,
    };
    cotizaciones.push(cot);

    // El envio de correo no debe bloquear ni hacer fallar la respuesta al cliente
    enviarNotificacionCotizacion(cot, archivo).catch((err) =>
      console.error("[cotizaciones] fallo el envio de correo:", err.message)
    );

    res.status(201).json({ ok: true, id: c, mensaje: "Cotizacion creada" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const listar = (_req, res) => {
  res.json({ ok: true, total: cotizaciones.length, cotizaciones: cotizaciones.slice(-50).reverse() });
};

/** Usado por el panel de admin: todas las cotizaciones, sin recortar. */
export function obtenerCotizaciones() {
  return cotizaciones.slice().reverse();
}

/** Usado por el panel de admin: busca una cotizacion puntual por id. */
export function obtenerCotizacionPorId(id) {
  return cotizaciones.find((c) => c.id === Number(id)) || null;
}

export const calc = (req, res) => {
  try {
    const { formato, tipo, cantidad, reparto } = req.body;
    if (!formato || !tipo) return res.status(400).json({ ok: false, error: "Faltan datos" });
    res.json({ ok: true, calculo: calcular({ formato, tipo, cantidad, reparto }) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

export const precios = (_req, res) => res.json({ ok: true, ...tablaPrecios() });

export const health = (_req, res) => res.json({ ok: true, ts: new Date().toISOString() });