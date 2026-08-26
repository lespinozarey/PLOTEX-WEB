import {
  obtenerPedido,
  buscarPorEmail,
  listarPedidos,
  actualizarEstado,
  esTransicionValida,
  ESTADOS,
} from "../db/trackingStore.js";

/**
 * GET /api/tracking/:tracking
 * Obtiene un pedido por codigo
 */
export function getByTracking(req, res) {
  const { tracking } = req.params;
  const pedido = obtenerPedido(tracking);
  if (!pedido) return res.status(404).json({ ok: false, error: "Pedido no encontrado" });

  res.json({
    ok: true,
    pedido: {
      tracking: pedido.tracking,
      estado: pedido.estado,
      estadoLabel: ESTADOS[pedido.estado]?.label || pedido.estado,
      progreso: ESTADOS[pedido.estado]?.pct || 0,
      total: pedido.total,
      reparto: pedido.reparto,
      cotizacion: pedido.cotizacion,
      historial: pedido.historial,
      createdAt: pedido.createdAt,
      updatedAt: pedido.updatedAt,
    },
  });
}

/**
 * GET /api/tracking?email=...
 * Busca pedidos por email del cliente
 */
export function searchByEmail(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ ok: false, error: "Email requerido" });

  const resultados = buscarPorEmail(email).map((p) => ({
    tracking: p.tracking,
    estado: p.estado,
    estadoLabel: ESTADOS[p.estado]?.label,
    progreso: ESTADOS[p.estado]?.pct || 0,
    total: p.total,
    createdAt: p.createdAt,
  }));

  res.json({ ok: true, total: resultados.length, pedidos: resultados });
}

/**
 * PATCH /api/tracking/:tracking/estado
 * Actualiza el estado (admin)
 */
export function updateEstado(req, res) {
  const { tracking } = req.params;
  const { estado, nota } = req.body;

  const pedido = obtenerPedido(tracking);
  if (!pedido) return res.status(404).json({ ok: false, error: "Pedido no encontrado" });

  if (!esTransicionValida(pedido.estado, estado)) {
    return res.status(400).json({
      ok: false,
      error: `Transicion invalida: ${pedido.estado} -> ${estado}`,
    });
  }

  const actualizado = actualizarEstado(tracking, estado, nota);
  res.json({ ok: true, pedido: { tracking, estado, updatedAt: actualizado.updatedAt } });
}

/**
 * GET /api/tracking/admin/all
 * Lista todos los pedidos (admin)
 */
export function adminList(req, res) {
  res.json({ ok: true, total: listarPedidos().length, pedidos: listarPedidos() });
}

/**
 * GET /api/tracking/estados
 * Devuelve los estados disponibles
 */
export function getEstados(_req, res) {
  res.json({
    ok: true,
    estados: Object.values(ESTADOS).map((e) => ({ code: e.code, label: e.label, pct: e.pct })),
  });
}