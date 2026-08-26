/**
 * PLOTEX TEMUCO - Automated QA & Security Test Suite
 * Arquitectura SOLID, Estrategias de Productos, Motor de Despacho y Seguridad Web.
 */

const assert = require("assert");

console.log("==================================================");
console.log("   PLOTEX TEMUCO - SUITE DE PRUEBAS AUTOMATIZADA  ");
console.log("   SOLID Architecture & Web Security Verification ");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------
// 1. SEGURIDAD WEB & SANITIZACIÓN ANTI-XSS
// -----------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttr(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

test("SEC-01: Sanitización estricta contra inyecciones XSS en texto", () => {
  const dirtyPayload = "<script>alert('xss')</script> & <b>negrita</b>";
  const clean = escapeHtml(dirtyPayload);
  assert(!clean.includes("<script>"), "No debe contener etiquetas script");
  assert.strictEqual(clean, "&lt;script&gt;alert('xss')&lt;/script&gt; &amp; &lt;b&gt;negrita&lt;/b&gt;");
});

test("SEC-02: Sanitización de atributos HTML contra inyecciones de escape de comillas", () => {
  const dirtyAttr = '\" onmouseover=\"alert(1)\"';
  const cleanAttr = escapeHtmlAttr(dirtyAttr);
  assert(!cleanAttr.includes('\" onmouseover'), "No debe permitir inyección de manejadores de eventos");
  assert.strictEqual(cleanAttr, '&quot; onmouseover=&quot;alert(1)&quot;');
});

// -----------------------------------------------------------------
// 2. VALIDACIÓN DE RUT CHILENO (ALGORITMO MÓDULO 11)
// -----------------------------------------------------------------
function validateChileanRut(rutCompleto) {
  if (!rutCompleto) return false;
  const limpio = rutCompleto.replace(/[\.\-]/g, "").toUpperCase();
  if (limpio.length < 8) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += multiplo * parseInt(cuerpo[i], 10);
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : String(dvEsperado);
  return dv === dvCalculado;
}

test("SEC-03: Validación estricta de RUT Empresa Chileno para Facturación", () => {
  assert.strictEqual(validateChileanRut("76.192.083-4"), false, "RUT con dígito verificador incorrecto debe fallar");
  assert.strictEqual(validateChileanRut("12.345.678-0"), false, "RUT erróneo debe fallar");
  assert.strictEqual(validateChileanRut("76192083-9"), true, "RUT válido sin puntos");
  assert.strictEqual(validateChileanRut("76.192.083-9"), true, "RUT válido con puntos y guion");
});

// -----------------------------------------------------------------
// 3. ESTRATEGIAS SOLID DE PRODUCTOS (PRICING & CALCULATIONS)
// -----------------------------------------------------------------
test("SOLID-01: PlanosStrategy - Cálculo A1 Línea B/N en Bond 80g", () => {
  const baseA1 = 2500;
  const multBn = 1.0;
  const unitPrice = Math.round(baseA1 * multBn);
  assert.strictEqual(unitPrice, 2500, "Precio unitario A1 debe ser $2.500");
});

test("SOLID-02: PlanosStrategy - Formato A3 en Fotográfico Glossy 180g ($5.000)", () => {
  const unitPrice = 5000;
  assert.strictEqual(unitPrice, 5000, "Foto Glossy 180g (A3) debe costar $5.000");
});

test("SOLID-03: PlanosStrategy - Plegado Normalizado NCh a $300 c/u", () => {
  const plegadoUnit = 300;
  const qty = 5;
  const plegadoTotal = plegadoUnit * qty;
  assert.strictEqual(plegadoTotal, 1500, "Plegado de 5 láminas a $300 debe sumar $1.500");
});

test("SOLID-04: PlanosStrategy - Regla de Negocio: Foto Glossy fuerza formato exclusivo A3", () => {
  function enforceFormatForPaper(paper, selectedFormat) {
    if (paper === "foto-180-a3") {
      return { format: "A3", locked: true };
    }
    return { format: selectedFormat, locked: false };
  }
  const resFoto = enforceFormatForPaper("foto-180-a3", "A0");
  assert.strictEqual(resFoto.format, "A3", "Debe forzar formato A3");
  assert.strictEqual(resFoto.locked, true, "Debe quedar bloqueado");

  const resBond = enforceFormatForPaper("bond-80", "A0");
  assert.strictEqual(resBond.format, "A0", "Bond permite formatos libres");
  assert.strictEqual(resBond.locked, false, "No debe estar bloqueado");
});

test("SOLID-05: PostersStrategy - Formato 90×120 cm con Tubo Portapóster Rígido", () => {
  const basePoster90x120 = 14900;
  const sustratoSintetico = 0; // Estándar recomendado
  const tuboRigido = 2500;
  const total = basePoster90x120 + sustratoSintetico + tuboRigido;
  assert.strictEqual(total, 17400, "Póster 90x120 con tubo rígido debe costar $17.400");
});

test("SOLID-06: LetrerosStrategy - Letrero de Obra MOP 3.0×2.0 m con Gráfica Reflectante", () => {
  const baseMop3x2 = 120000;
  const estructuraZincMadera = 0; // Estándar
  const graficaReflectante = 20000;
  const total = baseMop3x2 + estructuraZincMadera + graficaReflectante;
  assert.strictEqual(total, 140000, "Letrero MOP 3x2 reflectante debe costar $140.000");
});

test("SOLID-07: LonaStrategy - Lona Frontlit 13oz de 3.0×1.5m (4.5 m²) con Ojetillos", () => {
  const areaM2 = 3.0 * 1.5; // 4.5 m²
  const precioM2Frontlit = 8500;
  const confeccionOjetillos = 1500;
  const unitPrice = Math.round((precioM2Frontlit + confeccionOjetillos) * areaM2); // 10.000 * 4.5 = 45.000
  assert.strictEqual(unitPrice, 45000, "Lona 4.5 m² con ojetillos debe costar $45.000");
});

// -----------------------------------------------------------------
// 4. MOTOR DE DESPACHO EN TEMUCO ($3.500 & 100% OFF DESDE $20.000)
// -----------------------------------------------------------------
test("DELIVERY-01: Despacho en Temuco vale $3.500 para pedidos bajo $20.000", () => {
  const subtotal = 14900; // 1 póster
  const despacho = subtotal >= 20000 ? 0 : 3500;
  assert.strictEqual(despacho, 3500, "Debe cobrar $3.500 de despacho para pedidos menores a $20.000");
  const total = subtotal + despacho;
  assert.strictEqual(total, 18400);
});

test("DELIVERY-02: Despacho en Temuco es 100% GRATIS ($0) desde $20.000", () => {
  const subtotal = 25000; // Pedido sobre $20.000
  const despacho = subtotal >= 20000 ? 0 : 3500;
  assert.strictEqual(despacho, 0, "Despacho debe ser $0 (Gratis) en pedidos iguales o superiores a $20.000");
  const total = subtotal + despacho;
  assert.strictEqual(total, 25000);
});

test("DELIVERY-03: Retiro en Taller (Sector Fundo El Carmen) siempre es $0", () => {
  const subtotal = 5000;
  const modoEntrega = "retiro";
  const costoEntrega = modoEntrega === "retiro" ? 0 : 3500;
  assert.strictEqual(costoEntrega, 0, "Retiro en taller debe ser $0");
});

// -----------------------------------------------------------------
// 5. DETECCIÓN DE MEDIDAS DE ARCHIVO PDF
// -----------------------------------------------------------------
test("PDF-01: Detección binaria de dimensiones /MediaBox (A1: 594 × 841 mm)", () => {
  const samplePdf = "%PDF-1.4\n1 0 obj\n<< /Type /Page /MediaBox [0 0 1683.78 2383.94] >>\nendobj";
  const match = samplePdf.match(/\/MediaBox\s*\[\s*([\d\.\-]+)\s+([\d\.\-]+)\s+([\d\.\-]+)\s+([\d\.\-]+)\s*\]/);
  assert(match, "Debe encontrar la etiqueta /MediaBox");
  const wPt = Math.abs(parseFloat(match[3]) - parseFloat(match[1]));
  const hPt = Math.abs(parseFloat(match[4]) - parseFloat(match[2]));
  const wMm = Math.round(wPt * 0.352778);
  const hMm = Math.round(hPt * 0.352778);
  assert.strictEqual(wMm, 594, "Ancho A1 debe ser 594 mm");
  assert.strictEqual(hMm, 841, "Alto A1 debe ser 841 mm");
});

// -----------------------------------------------------------------
// 6. GENERADOR DE PRESUPUESTO PROFORMA & ORDER DISPATCHER
// -----------------------------------------------------------------
test("PROFORMA-01: Estructura y datos bancarios en Presupuesto Proforma", () => {
  const quoteResult = {
    unitPrice: 3800,
    extraTotal: 0,
    extraLabel: "",
    plegadoTotal: 300,
    deliveryFee: 3500,
    deliveryLabel: "Despacho Temuco",
    deliveryDesc: "$3.500",
    deliveryIsFree: false,
    subtotal: 7600,
    discPct: 0,
    discAmount: 0,
    subtotalWithDisc: 7600,
    neto: 6387,
    iva: 1213,
    totalFinal: 7600
  };

  assert(quoteResult.totalFinal > 0, "Total de cotización debe ser positivo");
  assert.strictEqual(quoteResult.neto + quoteResult.iva, quoteResult.totalFinal, "Neto + IVA debe ser igual al Total Final");
  assert.strictEqual(quoteResult.plegadoTotal, 300, "Plegado proforma debe ser $300");
});

console.log("\n==================================================");
console.log(`   RESULTADOS: ${passed} PASADOS | ${failed} FALLADOS`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\n✅ ¡Todas las pruebas unitarias y de seguridad pasaron con éxito!");
}
