import { initTransaction, confirmTransaction, isAuthorized } from "../utils/transbank.js";
import {
  crearPedido,
  obtenerPedido,
  registrarPago,
} from "../db/trackingStore.js";
import { enviarTicketCompra } from "../utils/mailer.js";

/**
 * POST /api/payment/init
 * Inicia una transaccion Webpay
 */
export async function initPayment(req, res) {
  try {
    const { cotizacion, cliente, direccion, envio, factura } = req.body;
    if (!cotizacion || !cliente?.nombre || !cliente?.email || !cliente?.telefono) {
      return res.status(400).json({ ok: false, error: "Faltan datos del pedido" });
    }
    if (!cotizacion.total && !cotizacion.totalFinal) {
      return res.status(400).json({ ok: false, error: "Monto invalido" });
    }

    const totalMonto = cotizacion.totalFinal || cotizacion.total;

    // Crear pedido en estado RECIBIDO
    const pedido = crearPedido({
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      cotizacion,
      total: totalMonto,
      reparto: cotizacion.despacho || cotizacion.reparto,
      direccion,
      envio: envio || null,
      factura: factura || null,
    });

    const buyOrder = `PLX-${pedido.tracking.replace(/-/g, "").slice(0, 12)}`;
    const sessionId = `SES-${Date.now()}`;
    // Transbank redirige (POST) a esta URL de backend; desde ahi se confirma
    // la transaccion y se reenvia al usuario a la pagina estatica de resultado.
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const returnUrl = `${backendUrl}/api/payment/return?tracking=${pedido.tracking}`;

    const result = await initTransaction({
      amount: cotizacion.total,
      buyOrder,
      sessionId,
      returnUrl,
    });

    res.json({
      ok: true,
      tracking: pedido.tracking,
      url: result.url,
      token: result.token,
      simulated: result.simulated || false,
    });
  } catch (err) {
    console.error("[initPayment]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /api/payment/confirm
 * Confirma el pago despues del redirect de Transbank
 */
export async function confirmPayment(req, res) {
  try {
    const { token_ws, tracking } = req.query;
    if (!token_ws || !tracking) {
      return res.status(400).json({ ok: false, error: "Faltan parametros" });
    }

    const pedido = obtenerPedido(tracking);
    if (!pedido) {
      return res.status(404).json({ ok: false, error: "Pedido no encontrado" });
    }

    const tbResponse = await confirmTransaction(token_ws);
    const aprobado = isAuthorized(tbResponse);

    const pago = {
      token: token_ws,
      ordenCompra: tbResponse.buy_order,
      autorizacion: tbResponse.authorization_code,
      tarjeta: tbResponse.card_number,
      monto: tbResponse.amount,
      estado: aprobado ? "APROBADO" : "RECHAZADO",
      metodo: "WEBPAY",
    };

    const actualizado = registrarPago(tracking, pago);

    if (aprobado) {
      enviarTicketCompra(pedido, pago).catch((e) => console.error("[mailer] Error en ticket async:", e));
    }

    res.json({
      ok: aprobado,
      tracking,
      estado: actualizado?.estado || (aprobado ? "EN_PREPARACION" : "RECIBIDO"),
      pago,
      pedido: {
        tracking: pedido.tracking,
        total: pedido.total,
        estado: pedido.estado,
      },
    });
  } catch (err) {
    console.error("[confirmPayment]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * POST /api/payment/return
 * Endpoint al que Transbank redirige (via POST) tras el pago en Webpay.
 * Confirma la transaccion y reenvia al usuario a la pagina estatica de confirmacion.
 */
export async function webpayReturn(req, res) {
  const tracking = req.query.tracking;
  const tokenWs = req.body?.token_ws || req.query.token_ws;
  const tokenWsAbort = req.body?.TBK_TOKEN || req.query.TBK_TOKEN; // usuario anulo el pago
  const frontend = process.env.FRONTEND_URL || "";

  try {
    if (!tracking) {
      return res.status(400).send("Falta el parametro de seguimiento del pedido");
    }

    // El usuario abandono o anulo el pago en Webpay
    if (tokenWsAbort && !tokenWs) {
      return res.redirect(302, `${frontend}/pago/confirmar.html?tracking=${tracking}&ok=0&motivo=anulado`);
    }

    if (!tokenWs) {
      return res.redirect(302, `${frontend}/pago/confirmar.html?tracking=${tracking}&ok=0&motivo=sin_token`);
    }

    const pedido = obtenerPedido(tracking);
    if (!pedido) {
      return res.redirect(302, `${frontend}/pago/confirmar.html?tracking=${tracking}&ok=0&motivo=no_encontrado`);
    }

    const tbResponse = await confirmTransaction(tokenWs);
    const aprobado = isAuthorized(tbResponse);

    const pago = {
      token: tokenWs,
      ordenCompra: tbResponse.buy_order,
      autorizacion: tbResponse.authorization_code,
      tarjeta: tbResponse.card_number,
      monto: tbResponse.amount,
      estado: aprobado ? "APROBADO" : "RECHAZADO",
      metodo: "WEBPAY",
    };

    registrarPago(tracking, pago);

    if (aprobado) {
      enviarTicketCompra(pedido, pago).catch((e) => console.error("[mailer] Error en ticket return:", e));
    }

    return res.redirect(302, `${frontend}/pago/confirmar.html?tracking=${tracking}&ok=${aprobado ? 1 : 0}`);
  } catch (err) {
    console.error("[webpayReturn]", err);
    return res.redirect(302, `${frontend}/pago/confirmar.html?tracking=${tracking || ""}&ok=0&motivo=error`);
  }
}

/**
 * GET /api/payment/status/:tracking
 * Consulta el estado del pago
 */
export function paymentStatus(req, res) {
  const { tracking } = req.params;
  const pedido = obtenerPedido(tracking);
  if (!pedido) return res.status(404).json({ ok: false, error: "No encontrado" });
  res.json({
    ok: true,
    tracking: pedido.tracking,
    estado: pedido.estado,
    pagos: pedido.pagos,
    total: pedido.total,
  });
}