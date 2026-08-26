/**
 * Store en memoria para precios y servicios.
 * En produccion: reemplazar con una base de datos real.
 */

const FORMATOS_VALIDOS = ["A0", "A1", "A2", "A3", "A4"];
const TIPOS_VALIDOS = ["linea-bn", "linea-color", "area-bn", "area-color"];

let precios = {
  precioBase: { A0: 5000, A1: 2500, A2: 1250, A3: 625, A4: 313 },
  multiplicador: { "linea-bn": 1.0, "linea-color": 1.6, "area-bn": 1.6, "area-color": 2.5 },
  descuentos: [
    { min: 50, pct: 30 },
    { min: 20, pct: 20 },
    { min: 5, pct: 10 },
    { min: 1, pct: 0 },
  ],
  costoReparto: 3500,
  repartoGratisMontoMin: 20000,
  costoPlegado: 300,
};

export function getPrecios() {
  return JSON.parse(JSON.stringify(precios));
}

/**
 * Valida y reemplaza la configuracion de precios/servicios.
 * Lanza Error con un mensaje entendible si algo no cuadra.
 */
export function setPrecios(nuevo) {
  if (!nuevo || typeof nuevo !== "object") throw new Error("Datos de precios invalidos");

  const precioBase = { ...precios.precioBase };
  if (nuevo.precioBase) {
    for (const f of FORMATOS_VALIDOS) {
      if (nuevo.precioBase[f] === undefined) continue;
      const v = Number(nuevo.precioBase[f]);
      if (!Number.isFinite(v) || v < 0) throw new Error(`Precio invalido para formato ${f}`);
      precioBase[f] = v;
    }
  }

  const multiplicador = { ...precios.multiplicador };
  if (nuevo.multiplicador) {
    for (const t of TIPOS_VALIDOS) {
      if (nuevo.multiplicador[t] === undefined) continue;
      const v = Number(nuevo.multiplicador[t]);
      if (!Number.isFinite(v) || v <= 0) throw new Error(`Multiplicador invalido para ${t}`);
      multiplicador[t] = v;
    }
  }

  let descuentos = precios.descuentos;
  if (Array.isArray(nuevo.descuentos)) {
    descuentos = nuevo.descuentos.map((d) => {
      const min = Number(d.min);
      const pct = Number(d.pct);
      if (!Number.isFinite(min) || min < 1) throw new Error("Cantidad minima de descuento invalida");
      if (!Number.isFinite(pct) || pct < 0 || pct > 90) throw new Error("Porcentaje de descuento invalido (0-90)");
      return { min, pct };
    }).sort((a, b) => b.min - a.min);
  }

  let costoReparto = precios.costoReparto;
  if (nuevo.costoReparto !== undefined) {
    const v = Number(nuevo.costoReparto);
    if (!Number.isFinite(v) || v < 0) throw new Error("Costo de reparto invalido");
    costoReparto = v;
  }

  let repartoGratisDesde = precios.repartoGratisDesde;
  if (nuevo.repartoGratisDesde !== undefined) {
    const v = Number(nuevo.repartoGratisDesde);
    if (!Number.isFinite(v) || v < 1) throw new Error("Cantidad de reparto gratis invalida");
    repartoGratisDesde = v;
  }

  precios = { precioBase, multiplicador, descuentos, costoReparto, repartoGratisDesde };
  return getPrecios();
}

export { FORMATOS_VALIDOS, TIPOS_VALIDOS };
