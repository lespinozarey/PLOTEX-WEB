import nodemailer from "nodemailer";

// Correo de respaldo fijo: siempre recibe una copia de cada cotizacion,
// independiente de lo configurado en EMAIL_TO.
const CORREO_RESPALDO = "plotextemuco@gmail.com";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null; // sin credenciales configuradas: no se intenta enviar
  }
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Envia el Ticket de Compra / Orden de Trabajo confirmada a plotextemuco@gmail.com
 * y con copia al cliente.
 */
export async function enviarTicketCompra(pedido, pago = null) {
  const t = getTransporter();
  const destinatarios = new Set([
    process.env.EMAIL_TO,
    CORREO_RESPALDO,
    pedido.email
  ].filter(Boolean));

  const cot = pedido.cotizacion || {};
  const isFactura = Boolean(pedido.factura?.rut);

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 24px; border-radius: 8px;">
      <h2 style="color: #E64514; margin-top: 0;">PLOTEX TEMUCO — TICKET DE COMPRA ONLINE</h2>
      <div style="background: #f4f4f4; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0;"><b>Código de Orden:</b> <span style="font-family: monospace; font-size: 1.1em; color: #E64514;">${escapeHtml(pedido.tracking)}</span></p>
        <p style="margin: 4px 0 0;"><b>Fecha:</b> ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}</p>
        <p style="margin: 4px 0 0;"><b>Estado:</b> <span style="color: #1B7A42; font-weight: bold;">PAGADO / EN PREPARACIÓN</span></p>
      </div>

      <h3>1. Datos del Cliente & Despacho</h3>
      <p style="margin: 4px 0;"><b>Nombre:</b> ${escapeHtml(pedido.nombre)}</p>
      <p style="margin: 4px 0;"><b>Teléfono:</b> ${escapeHtml(pedido.telefono)}</p>
      <p style="margin: 4px 0;"><b>Email:</b> ${escapeHtml(pedido.email)}</p>
      <p style="margin: 4px 0;"><b>Modalidad de Entrega:</b> ${escapeHtml(
        pedido.envio?.modalidad === "nacional"
          ? `Envío a Todo Chile vía ${pedido.envio.courier || "Starken"} (${pedido.envio.destino === "sucursal" ? "A Sucursal / Por Pagar" : "A Domicilio"})`
          : pedido.envio?.modalidad === "retiro"
          ? "Retiro en Taller (Av. Caupolicán #1234, Temuco)"
          : "Despacho Local Temuco / Padre Las Casas"
      )}</p>
      <p style="margin: 4px 0;"><b>Dirección de Entrega:</b> ${escapeHtml(pedido.direccion || "Retiro presencial en taller")}</p>

      ${isFactura ? `
        <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 10px; border-radius: 4px; margin-top: 10px;">
          <h4 style="margin: 0 0 6px; color: #3730a3;">Datos para Facturación:</h4>
          <p style="margin: 2px 0;"><b>Razón Social:</b> ${escapeHtml(pedido.factura.razonSocial)}</p>
          <p style="margin: 2px 0;"><b>RUT Empresa:</b> ${escapeHtml(pedido.factura.rut)}</p>
          <p style="margin: 2px 0;"><b>Giro:</b> ${escapeHtml(pedido.factura.giro)}</p>
        </div>
      ` : `<p style="margin: 4px 0;"><b>Documento tributario:</b> Boleta Electrónica</p>`}

      <h3>2. Especificaciones de Ploteo</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #eee; text-align: left;">
            <th style="padding: 8px; border: 1px solid #ccc;">Ítem</th>
            <th style="padding: 8px; border: 1px solid #ccc;">Cant.</th>
            <th style="padding: 8px; border: 1px solid #ccc; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc;">
              Ploteo Formato <b>${escapeHtml(cot.format || cot.formato || "A1")}</b> (${escapeHtml(cot.type || cot.tipo || "Línea B/N")})<br/>
              <small style="color: #666;">Sustrato: ${escapeHtml(cot.paper || "Bond 80g")}</small>
            </td>
            <td style="padding: 8px; border: 1px solid #ccc;">${escapeHtml(String(cot.qty || cot.cantidad || 1))}</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">$${Number(cot.totalFinal || cot.total || 0).toLocaleString("es-CL")}</td>
          </tr>
          ${cot.plegado ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ccc;" colspan="2">Plegado Normalizado NCh (formato archivador)</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">$${Number(cot.plegadoTotal || 0).toLocaleString("es-CL")}</td>
            </tr>
          ` : ""}
          ${cot.deliveryMode === "local" ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ccc;" colspan="2">Despacho en Temuco / Padre Las Casas</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">$${Number(cot.despachoTotal || 0).toLocaleString("es-CL")}</td>
            </tr>
          ` : cot.deliveryMode === "nacional" ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ccc;" colspan="2">Envío Nacional a Todo Chile (Vía ${escapeHtml(cot.courier || "Starken")}) - Tubo rígido</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">Por Pagar</td>
            </tr>
          ` : ""}
        </tbody>
      </table>

      <h3>3. Desglose Contable</h3>
      <table style="width: 100%; max-width: 300px; margin-left: auto; margin-bottom: 20px;">
        <tr>
          <td><b>Subtotal Neto:</b></td>
          <td style="text-align: right;">$${Number(cot.neto || Math.round((cot.totalFinal || cot.total || 0) / 1.19)).toLocaleString("es-CL")}</td>
        </tr>
        <tr>
          <td><b>IVA (19%):</b></td>
          <td style="text-align: right;">$${Number(cot.iva || ((cot.totalFinal || cot.total || 0) - Math.round((cot.totalFinal || cot.total || 0) / 1.19))).toLocaleString("es-CL")}</td>
        </tr>
        <tr style="font-size: 1.2em; color: #E64514;">
          <td><b>TOTAL PAGADO:</b></td>
          <td style="text-align: right;"><b>$${Number(cot.totalFinal || cot.total || 0).toLocaleString("es-CL")}</b></td>
        </tr>
      </table>

      ${pago ? `
        <div style="font-size: 0.85em; color: #666; border-top: 1px dashed #ccc; padding-top: 8px;">
          <b>Método de Pago:</b> Webpay Plus (Transbank)<br/>
          <b>Código Autorización:</b> ${escapeHtml(pago.autorizacion || "N/A")}<br/>
          <b>Tarjeta:</b> **** **** **** ${escapeHtml(pago.tarjeta || "XXXX")}
        </div>
      ` : ""}
    </div>
  `;

  if (!t) {
    console.log(`[mailer - MOCK] Ticket de compra generado para ${Array.from(destinatarios).join(", ")}:\nCódigo: ${pedido.tracking} | Total: $${cot.totalFinal || cot.total}`);
    return { enviado: true, mock: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@plotex.cl",
    to: Array.from(destinatarios).join(","),
    subject: `[TICKET #${pedido.tracking}] Nuevo pedido pagado de ${pedido.nombre} - PLOTEX`,
    html,
  };

  try {
    await t.sendMail(mailOptions);
    return { enviado: true };
  } catch (err) {
    console.error("[mailer] Error enviando ticket:", err.message);
    return { enviado: false, motivo: err.message };
  }
}

/**
 * Envia la notificacion de una nueva cotizacion al correo del negocio (EMAIL_TO)
 * y siempre una copia de respaldo a plotextemuco@gmail.com.
 * Si el archivo adjunto viene en memoria (multer memoryStorage), se adjunta al correo.
 */
export async function enviarNotificacionCotizacion(cot, archivo) {
  const t = getTransporter();
  if (!t) {
    console.warn("[mailer] EMAIL_HOST/EMAIL_USER/EMAIL_PASS no configurados; se omite el envio de correo.");
    return { enviado: false, motivo: "sin_configuracion" };
  }

  const destinatarios = new Set(
    [process.env.EMAIL_TO, CORREO_RESPALDO].filter(Boolean)
  );

  const html = `
    <h2>Nueva solicitud de cotizacion - PLOTEX</h2>
    <p><b>Nombre:</b> ${escapeHtml(cot.nombre)}</p>
    <p><b>Email:</b> ${escapeHtml(cot.email)}</p>
    <p><b>Telefono:</b> ${escapeHtml(cot.telefono)}</p>
    ${cot.mensaje ? `<p><b>Mensaje:</b> ${escapeHtml(cot.mensaje)}</p>` : ""}
    ${
      cot.calculo
        ? `<h3>Detalle de la cotizacion</h3>
           <ul>
             <li>Formato: ${escapeHtml(cot.calculo.formato)}</li>
             <li>Tipo: ${escapeHtml(cot.calculo.tipo)}</li>
             <li>Cantidad: ${escapeHtml(String(cot.calculo.cantidad))}</li>
             <li>Reparto a domicilio: ${cot.calculo.reparto ? "Si" : "No"}</li>
             <li>Total: $${Number(cot.calculo.total || 0).toLocaleString("es-CL")}</li>
           </ul>`
        : ""
    }
    ${archivo ? `<p><b>Archivo adjunto:</b> ${escapeHtml(archivo.originalname)}</p>` : "<p>Sin archivo adjunto.</p>"}
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: Array.from(destinatarios).join(","),
    subject: `Nueva cotizacion de ${cot.nombre} - PLOTEX`,
    html,
    attachments: archivo
      ? [{ filename: archivo.originalname, path: archivo.path }]
      : [],
  };

  try {
    await t.sendMail(mailOptions);
    return { enviado: true };
  } catch (err) {
    console.error("[mailer] Error enviando correo:", err.message);
    return { enviado: false, motivo: "error_envio" };
  }
}
