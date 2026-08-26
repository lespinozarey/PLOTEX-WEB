/**
 * Wrapper de Transbank Webpay Plus
 * Docs: https://www.transbankdevelopers.cl/documentacion/webpay-plus
 *
 * Ambientes:
 * - INTEGRACION (testing): usa codigo de comercio 597055555532 (pruebas)
 * - PRODUCCION: requiere contrato comercial con Transbank
 */

// NOTA: transbank-sdk no es un paquete npm oficial mantenido.
// En produccion real, usa la SDK oficial o implementa las llamadas REST.
// Aqui dejamos un wrapper con la API documentada para que lo adaptes.

const TRANSBANK_ENV = process.env.TRANSBANK_ENV || "integration";

const ENDPOINTS = {
  integration: {
    base: "https://webpay3g.transbank.cl/webpayplus/wsapi",
    returnUrl: "https://webpay3g.transbank.cl/webpayserver/initTransaction",
  },
  production: {
    base: "https://webpay3g.transbank.cl/webpayplus/wsapi",
  },
};

const COMMERCE_CODES = {
  integration: "597055555532",
  production: process.env.TRANSBANK_COMMERCE_CODE || "",
};

const API_KEYS = {
  integration: "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
  production: process.env.TRANSBANK_API_KEY || "",
};

/**
 * Inicia una transaccion en Webpay Plus
 * @param {Object} params
 * @param {number} params.amount - Monto en CLP
 * @param {string} params.buyOrder - Orden de compra (unico por transaccion)
 * @param {string} params.sessionId - ID de sesion
 * @param {string} params.returnUrl - URL de retorno
 * @returns {Promise<Object>}
 */
export async function initTransaction({ amount, buyOrder, sessionId, returnUrl }) {
  const env = TRANSBANK_ENV === "production" ? "production" : "integration";
  const commerceCode = COMMERCE_CODES[env];
  const apiKey = API_KEYS[env];

  if (env === "production" && (!commerceCode || !apiKey)) {
    throw new Error("Faltan credenciales de Transbank para produccion");
  }

  // En ambiente de integracion, simulamos la respuesta esperada
  if (env === "integration") {
    return {
      url: "https://webpay3g.transbank.cl/webpayserver/initTransaction",
      token: `01ab${Math.random().toString(36).slice(2, 18)}`,
      simulated: true,
    };
  }

  const body = {
    buy_order: buyOrder,
    session_id: sessionId,
    amount: Math.round(amount),
    return_url: returnUrl,
  };

  const res = await fetch(`${ENDPOINTS[env].base}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Tbk-Api-Key-Id": commerceCode,
      "Tbk-Api-Key-Secret": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Transbank error: ${res.status} - ${txt}`);
  }

  const data = await res.json();
  return {
    url: data.url,
    token: data.token,
  };
}

/**
 * Confirma una transaccion con el token entregado por Transbank
 * @param {string} token
 * @returns {Promise<Object>}
 */
export async function confirmTransaction(token) {
  const env = TRANSBANK_ENV === "production" ? "production" : "integration";
  const commerceCode = COMMERCE_CODES[env];
  const apiKey = API_KEYS[env];

  // En integracion simulamos una respuesta exitosa
  if (env === "integration") {
    return {
      vci: "TSY",
      amount: 12500,
      status: "AUTHORIZED",
      buy_order: `ORD-${Date.now()}`,
      session_id: `SES-${Date.now()}`,
      card_number: "**** **** **** 1234",
      accounting_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      transaction_date: new Date().toISOString(),
      authorization_code: `AUTH${Math.floor(Math.random() * 999999)}`,
      payment_type_code: "VN",
      installments_number: 0,
      response_code: 0,
      simulated: true,
    };
  }

  const res = await fetch(`${ENDPOINTS[env].base}/transactions/${token}`, {
    method: "PUT",
    headers: {
      "Tbk-Api-Key-Id": commerceCode,
      "Tbk-Api-Key-Secret": apiKey,
    },
  });

  if (!res.ok) throw new Error(`Transbank confirm error: ${res.status}`);
  return res.json();
}

/**
 * Genera un codigo de autorizacion (VCI) valido
 * Para produccion usar el de Transbank
 */
export function isAuthorized(response) {
  return response && (response.status === "AUTHORIZED" || response.response_code === 0);
}