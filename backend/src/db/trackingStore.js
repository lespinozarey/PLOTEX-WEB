/**
 * Store en memoria para pedidos y tracking
 * En produccion: reemplazar con MongoDB, PostgreSQL, etc.
 */

const ESTADOS = {
  RECIBIDO:     { code: "RECIBIDO",     label: "Recibido",       pct: 10 },
  EN_PREPARACION:{ code: "EN_PREPARACION", label: "En preparacion", pct: 30 },
  PLOTTEANDO:   { code: "PLOTTEANDO",   label: "Plotteando",      pct: 55 },
  EN_REPARTO:   { code: "EN_REPARTO",   label: "En reparto",      pct: 80 },
  ENTREGADO:    { code: "ENTREGADO",    label: "Entregado",       pct: 100 },
  CANCELADO:    { code: "CANCELADO",    label: "Cancelado",       pct: 0 },
};

const ORDEN_ESTADOS = ["RECIBIDO", "EN_PREPARACION", "PLOTTEANDO", "EN_REPARTO", "ENTREGADO"];

const pedidos = new Map();

/**
 * Genera codigo de tracking unico tipo PLX-XXXX-XXXX
 */
export function generarTracking() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PLX-${seg()}-${seg()}`;
}

/**
 * Crea un pedido
 */
export function crearPedido(datos) {
  const tracking = generarTracking();
  const pedido = {
    tracking,
    cliente: {
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
    },
    cotizacion: datos.cotizacion,
    total: datos.total,
    reparto: datos.reparto,
    direccion: datos.direccion || null,
    envio: datos.envio || null,
    factura: datos.factura || null,
    estado: "RECIBIDO",
    pagos: [],
    historial: [
      {
        estado: "RECIBIDO",
        fecha: new Date().toISOString(),
        nota: "Pedido recibido y validado",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  pedidos.set(tracking, pedido);
  return pedido;
}

/**
 * Obtiene un pedido por tracking
 */
export function obtenerPedido(tracking) {
  return pedidos.get(tracking) || null;
}

/**
 * Busca pedidos por email (para que el cliente los encuentre)
 */
export function buscarPorEmail(email) {
  const e = (email || "").toLowerCase();
  return Array.from(pedidos.values()).filter((p) => p.cliente.email.toLowerCase() === e);
}

/**
 * Lista todos los pedidos (admin)
 */
export function listarPedidos() {
  return Array.from(pedidos.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Registra un pago en el pedido
 */
export function registrarPago(tracking, datosPago) {
  const p = pedidos.get(tracking);
  if (!p) return null;
  p.pagos.push({ ...datosPago, fecha: new Date().toISOString() });
  if (datosPago.estado === "APROBADO") {
    p.estado = "EN_PREPARACION";
    p.historial.push({
      estado: "EN_PREPARACION",
      fecha: new Date().toISOString(),
      nota: `Pago confirmado via ${datosPago.metodo} - ${datosPago.autorizacion || ""}`,
    });
  }
  p.updatedAt = new Date().toISOString();
  return p;
}

/**
 * Actualiza el estado de un pedido
 */
export function actualizarEstado(tracking, nuevoEstado, nota = "") {
  const p = pedidos.get(tracking);
  if (!p) return null;
  if (!ESTADOS[nuevoEstado]) throw new Error("Estado invalido");
  p.estado = nuevoEstado;
  p.historial.push({
    estado: nuevoEstado,
    fecha: new Date().toISOString(),
    nota: nota || `Estado actualizado a ${ESTADOS[nuevoEstado].label}`,
  });
  p.updatedAt = new Date().toISOString();
  return p;
}

/**
 * Verifica si la transicion de estado es valida
 */
export function esTransicionValida(desde, hacia) {
  if (hacia === "CANCELADO") return true;
  const i = ORDEN_ESTADOS.indexOf(desde);
  const j = ORDEN_ESTADOS.indexOf(hacia);
  return i >= 0 && j >= 0 && j >= i;
}

export { ESTADOS, ORDEN_ESTADOS };