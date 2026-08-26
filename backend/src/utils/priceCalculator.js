import { getPrecios } from "../db/pricingStore.js";

export function calcular({ formato, tipo, cantidad, reparto = false, customW, customH }) {
  const { precioBase, multiplicador, descuentos, costoReparto, repartoGratisDesde } = getPrecios();

  let base = precioBase[formato];
  if (!base && (formato === "Custom" || formato === "Especial" || (customW && customH))) {
    const w = Number(customW) || 914;
    const h = Number(customH) || 1500;
    const areaM2 = (w * h) / 1000000;
    base = Math.max(400, Math.round(areaM2 * (precioBase["A0"] || 5000)));
  }

  if (!base) throw new Error("Formato invalido");
  if (!multiplicador[tipo]) throw new Error("Tipo invalido");
  const cant = Math.max(1, parseInt(cantidad, 10) || 1);

  const unitario = Math.round(base * multiplicador[tipo]);
  const subtotal = unitario * cant;
  const desc = descuentos.find((d) => cant >= d.min)?.pct || 0;
  const descMonto = Math.round(subtotal * (desc / 100));
  const subDesc = subtotal - descMonto;
  const costoRepartoFinal = reparto ? (cant >= repartoGratisDesde ? 0 : costoReparto) : 0;
  const total = subDesc + costoRepartoFinal;

  return {
    formato, tipo, cantidad: cant, unitario, subtotal,
    descuento: desc, descuentoMonto: descMonto, subDesc,
    reparto, costoReparto: costoRepartoFinal, total,
  };
}

export function tablaPrecios() {
  const { precioBase, multiplicador, descuentos, costoReparto, repartoGratisDesde } = getPrecios();
  const tabla = {};
  for (const f of Object.keys(precioBase)) {
    tabla[f] = {};
    for (const t of Object.keys(multiplicador)) tabla[f][t] = Math.round(precioBase[f] * multiplicador[t]);
  }
  return { precios: tabla, descuentos, costoReparto, repartoGratisDesde };
}
