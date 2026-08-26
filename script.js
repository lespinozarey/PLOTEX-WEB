/* =====================================================
   PLOTEX TEMUCO - Frontend Architecture (SOLID Principles)
   Módulos: Security, FileInspection, Strategies, Pricing,
   Delivery, Dispatching & UI Coordination.
===================================================== */

(function () {
  "use strict";

  /* =====================================================
     1. SECURITY & SANITIZATION (SRP: Seguridad Web)
  ===================================================== */
  const SecuritySanitizer = {
    escapeHtml(str) {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },

    escapeHtmlAttr(str) {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },

    validateChileanRut(rutCompleto) {
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
    },

    formatCLP(n) {
      return "$" + Math.round(n || 0).toLocaleString("es-CL");
    }
  };

  /* =====================================================
     2. FILE INSPECTOR (SRP: Análisis de Archivos / PDF)
  ===================================================== */
  const FileInspector = {
    ISO_SPECS: [
      { name: "A0", w: 841, h: 1189 },
      { name: "A1", w: 594, h: 841 },
      { name: "A2", w: 420, h: 594 },
      { name: "A3", w: 297, h: 420 },
      { name: "A4", w: 210, h: 297 }
    ],

    matchFormat(wMm, hMm) {
      const s = Math.min(wMm, hMm);
      const l = Math.max(wMm, hMm);
      let best = this.ISO_SPECS[1];
      let minD = Infinity;
      for (const f of this.ISO_SPECS) {
        const d = Math.hypot(s - f.w, l - f.h);
        if (d < minD) {
          minD = d;
          best = f;
        }
      }

      if (minD <= 25) {
        return {
          format: best.name,
          dims: `${Math.round(s)} × ${Math.round(l)} mm`,
          isCustom: false,
          wMm: Math.round(s),
          hMm: Math.round(l)
        };
      }

      return {
        format: "Custom",
        dims: `${Math.round(s)} × ${Math.round(l)} mm (Especial)`,
        isCustom: true,
        wMm: Math.round(s),
        hMm: Math.round(l)
      };
    },

    async inspect(file) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();

      if (ext === "pdf") {
        try {
          const buffer = await file.arrayBuffer();
          const text = new TextDecoder("latin1").decode(new Uint8Array(buffer));
          
          const mbRegex = /\/(?:MediaBox|CropBox)\s*\[\s*([\d\.\-]+)\s+([\d\.\-]+)\s+([\d\.\-]+)\s+([\d\.\-]+)\s*\]/gi;
          const matches = [...text.matchAll(mbRegex)];
          let wMm = 594, hMm = 841;

          if (matches.length > 0) {
            const match = matches[0];
            const wPt = Math.abs(parseFloat(match[3]) - parseFloat(match[1]));
            const hPt = Math.abs(parseFloat(match[4]) - parseFloat(match[2]));
            if (wPt > 50 && hPt > 50) {
              wMm = wPt * 0.352778;
              hMm = hPt * 0.352778;
            }
          }

          let count = 1;
          const cMatch = text.match(/\/Count\s+(\d+)/);
          if (cMatch && parseInt(cMatch[1], 10) > 0) {
            count = parseInt(cMatch[1], 10);
          } else {
            const pMatches = text.match(/\/Type\s*\/Page\b/g);
            if (pMatches) count = Math.max(1, pMatches.length);
          }

          const res = this.matchFormat(wMm, hMm);
          return { format: res.format, dims: res.dims, pages: count, isCustom: res.isCustom, wMm: res.wMm, hMm: res.hMm };
        } catch (e) {
          return { format: "A1", dims: "594 × 841 mm", pages: 1, isCustom: false, wMm: 594, hMm: 841 };
        }
      } else if (["jpg", "jpeg", "png", "webp", "tiff", "tif"].includes(ext)) {
        return new Promise((resolve) => {
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(url);
            const mmW = (img.naturalWidth / 200) * 25.4;
            const mmH = (img.naturalHeight / 200) * 25.4;
            const res = this.matchFormat(mmW, mmH);
            resolve({
              format: res.format,
              dims: `${img.naturalWidth}×${img.naturalHeight}px (~${res.dims})`,
              pages: 1,
              isCustom: res.isCustom,
              wMm: res.wMm,
              hMm: res.hMm
            });
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ format: "A1", dims: "594 × 841 mm", pages: 1, isCustom: false, wMm: 594, hMm: 841 });
          };
          img.src = url;
        });
      }

      return { format: "A1", dims: "Formato Estándar", pages: 1, isCustom: false, wMm: 594, hMm: 841 };
    }
  };

  /* =====================================================
     3. PRODUCT STRATEGIES (OCP & LSP: Estrategias de Precios)
  ===================================================== */
  const PlanosStrategy = {
    id: "planos",
    name: "Ploteo de Planos CAD",
    base: { A0: 5000, A1: 2500, A2: 1250, A3: 625, A4: 313 },
    multipliers: { "linea-bn": 1.0, "linea-color": 1.6, "area-color": 2.5 },
    substrates: { "bond-80": 0, "foto-180-a3": 5000 },
    plegadoUnit: 300,

    calculate(state) {
      const plegadoTotal = state.plegado ? (this.plegadoUnit * state.qty) : 0;

      // Regla de Negocio: Foto Glossy 180g es exclusivo en A3 a un valor fijo de $5.000
      if (state.paper === "foto-180-a3") {
        state.format = "A3";
        const unitPrice = 5000;
        return {
          unitPrice,
          extraCost: 5000,
          extraLabel: "Sustrato: Fotográfico Glossy 180g (A3) ($5.000)",
          plegadoTotal,
          areaM2: 0.125
        };
      }

      let base = 2500;
      let areaM2 = 0;
      if (state.format === "Custom") {
        const w = state.customW || 914;
        const h = state.customH || 1500;
        areaM2 = (w * h) / 1000000;
        base = Math.max(400, Math.round(areaM2 * this.base.A0));
      } else {
        base = this.base[state.format] || 2500;
      }

      const mult = this.multipliers[state.type] || 1.0;
      const subCost = this.substrates[state.paper] || 0;
      const unitPrice = Math.round((base * mult) + subCost);

      return {
        unitPrice,
        extraCost: subCost > 0 ? subCost : 0,
        extraLabel: subCost > 0 ? "Sustrato: Fotográfico Glossy 180g (A3)" : "",
        plegadoTotal,
        areaM2
      };
    },

    getSummaryLabel(state) {
      const typeLabels = { "linea-bn": "Línea B/N", "linea-color": "Línea Color", "area-color": "Render / Área" };
      if (state.paper === "foto-180-a3") {
        return `${state.qty} x Ploteo A3 Fotográfico Glossy 180g ($5.000 c/u)`;
      }
      if (state.format === "Custom") {
        const areaM2 = ((state.customW * state.customH) / 1000000).toFixed(2);
        return `${state.qty} x Ploteo Especial ${state.customW}×${state.customH}mm (${areaM2} m²) (${typeLabels[state.type] || state.type})`;
      }
      return `${state.qty} x Ploteo Formato ${state.format} (${typeLabels[state.type] || state.type})`;
    },

    getWhatsAppLines(state, calcRes) {
      const typeLabels = { "linea-bn": "Línea B/N", "linea-color": "Línea Color", "area-color": "Render / Área" };
      const paperLabels = { "bond-80": "Bond 80g", "foto-180-a3": "Fotográfico Glossy 180g (A3)" };
      let lines = [];
      if (state.format === "Custom") {
        const m2 = ((state.customW * state.customH) / 1000000).toFixed(2);
        lines.push(`- ${state.qty} x Ploteo Especial: ${state.customW}×${state.customH} mm (${m2} m²) (${typeLabels[state.type]})`);
      } else {
        lines.push(`- ${state.qty} x Ploteo Formato ${state.format} (${typeLabels[state.type]})`);
      }
      lines.push(`- Sustrato: ${paperLabels[state.paper] || state.paper}`);
      if (state.plegado) lines.push(`- Plegado Normalizado NCh: Sí (+ $300 c/u)`);
      return lines;
    }
  };

  const PostersStrategy = {
    id: "posters",
    name: "Pósters Científicos & Afiches",
    base: { "90x120": 14900, "80x110": 12900, "90x150": 18900, "A0": 13900 },
    substrates: { "sintetico-180": 0, "glossy-180": 2000, "bond-pesado-140": -3000 },
    tubeUnit: 2500,

    calculate(state) {
      const base = this.base[state.posterFormat] || 14900;
      const subCost = this.substrates[state.posterSubstrate] || 0;
      const unitPrice = Math.max(5000, Math.round(base + subCost));
      const extraCost = state.posterTube ? this.tubeUnit : 0;

      return {
        unitPrice,
        extraCost,
        extraLabel: state.posterTube ? "Tubo Portapóster Rígido de Viaje" : "",
        plegadoTotal: 0
      };
    },

    getSummaryLabel(state) {
      const formatLabels = { "90x120": "90×120 cm (Congreso)", "80x110": "80×110 cm", "90x150": "90×150 cm", "A0": "A0 (84×119 cm)" };
      return `${state.qty} x Póster Científico ${formatLabels[state.posterFormat] || state.posterFormat}`;
    },

    getWhatsAppLines(state) {
      const subLabels = { "sintetico-180": "Papel Sintético Matte 180g", "glossy-180": "Fotográfico Glossy 180g", "bond-pesado-140": "Bond Pesado 140g" };
      let lines = [];
      lines.push(`- ${state.qty} x Póster Científico Formato ${state.posterFormat} cm`);
      lines.push(`- Sustrato: ${subLabels[state.posterSubstrate] || state.posterSubstrate}`);
      if (state.posterTube) lines.push(`- Incluye Tubo Portapóster Rígido: Sí (+ $2.500 c/u)`);
      return lines;
    }
  };

  const LetrerosStrategy = {
    id: "letreros",
    name: "Letreros de Obra MOP",
    base: { "2x1": 45000, "3x2": 120000, "4x2": 160000, "6x3": 350000 },
    soportes: { "zinc-madera": 0, "zinc-metal": 15000, "lona-tensada": -8000 },
    graficas: { "uv-exterior": 0, "reflectante-vial": 20000 },

    calculate(state) {
      const base = this.base[state.letreroSize] || 45000;
      const soporteCost = this.soportes[state.letreroSoporte] || 0;
      const graficaCost = this.graficas[state.letreroGrafica] || 0;
      const unitPrice = Math.max(15000, Math.round(base + soporteCost + graficaCost));

      return {
        unitPrice,
        extraCost: 0,
        extraLabel: "",
        plegadoTotal: 0
      };
    },

    getSummaryLabel(state) {
      const sizeLabels = { "2x1": "2.0×1.0 m (Faena)", "3x2": "3.0×2.0 m (MOP)", "4x2": "4.0×2.0 m", "6x3": "6.0×3.0 m (Vial)" };
      return `${state.qty} x Letrero de Obra ${sizeLabels[state.letreroSize] || state.letreroSize}`;
    },

    getWhatsAppLines(state) {
      const soporteLabels = { "zinc-madera": "Zinc-Alum + Madera 2x2\"", "zinc-metal": "Zinc-Alum + Fierro 20x20", "lona-tensada": "Lona Tensada" };
      const graficaLabels = { "uv-exterior": "Gráfica UV Exterior 1440 DPI", "reflectante-vial": "Reflectante Grado Ingeniería MOP" };
      let lines = [];
      lines.push(`- ${state.qty} x Letrero de Obra MOP ${state.letreroSize} m`);
      lines.push(`- Estructura: ${soporteLabels[state.letreroSoporte] || state.letreroSoporte}`);
      lines.push(`- Gráfica: ${graficaLabels[state.letreroGrafica] || state.letreroGrafica}`);
      return lines;
    }
  };

  const LonaStrategy = {
    id: "lona",
    name: "Impresión Lona PVC",
    perM2: { "frontlit-13": 8500, "mesh-antiviento": 11500, "blackout-15": 13500 },
    finish: { "ojetillos": 1500, "vaina": 2000, "al-ras": 0 },

    calculate(state) {
      const w = state.lonaW || 2.0;
      const h = state.lonaH || 1.0;
      const areaM2 = Math.max(0.3, w * h);
      const m2Price = this.perM2[state.lonaType] || 8500;
      const finishPrice = this.finish[state.lonaFinish] || 0;
      const unitPrice = Math.max(4000, Math.round((m2Price + finishPrice) * areaM2));

      return {
        unitPrice,
        extraCost: 0,
        extraLabel: "",
        plegadoTotal: 0,
        areaM2
      };
    },

    getSummaryLabel(state) {
      const areaM2 = (state.lonaW * state.lonaH).toFixed(2);
      const lonaLabels = { "frontlit-13": "Lona Frontlit 13oz", "mesh-antiviento": "Lona Mesh", "blackout-15": "Lona Blackout" };
      return `${state.qty} x ${lonaLabels[state.lonaType] || "Lona"} ${state.lonaW}×${state.lonaH}m (${areaM2} m²)`;
    },

    getWhatsAppLines(state) {
      const areaM2 = (state.lonaW * state.lonaH).toFixed(2);
      const lonaLabels = { "frontlit-13": "Lona Frontlit 13oz", "mesh-antiviento": "Lona Mesh", "blackout-15": "Lona Blackout" };
      const finishLabels = { "ojetillos": "Sellado + Ojetillos perimetrales", "vaina": "Vaina superior/inferior", "al-ras": "Corte al ras" };
      let lines = [];
      lines.push(`- ${state.qty} x Impresión ${lonaLabels[state.lonaType]} ${state.lonaW}×${state.lonaH}m (${areaM2} m²)`);
      lines.push(`- Confección: ${finishLabels[state.lonaFinish] || state.lonaFinish}`);
      return lines;
    }
  };

  const STRATEGIES = {
    planos: PlanosStrategy,
    posters: PostersStrategy,
    letreros: LetrerosStrategy,
    lona: LonaStrategy
  };

  /* =====================================================
     4. DELIVERY & PRICING ENGINE (SRP & DIP)
  ===================================================== */
  const DeliveryManager = {
    baseFeeTemuco: 3500,
    freeThreshold: 20000,

    evaluate(deliveryMode, subtotalWithDisc) {
      if (deliveryMode === "local") {
        const isFree = subtotalWithDisc >= this.freeThreshold;
        return {
          fee: isFree ? 0 : this.baseFeeTemuco,
          isFree,
          label: "Despacho Temuco (Radio Céntrico)",
          desc: isFree ? "GRATIS (100% OFF)" : SecuritySanitizer.formatCLP(this.baseFeeTemuco)
        };
      } else if (deliveryMode === "retiro") {
        return {
          fee: 0,
          isFree: true,
          label: "Retiro en Taller (Sector Fundo El Carmen)",
          desc: "$0 Gratis"
        };
      } else if (deliveryMode === "nacional") {
        return {
          fee: 0,
          isFree: false,
          label: "Envío a Todo Chile (Por Pagar)",
          desc: "Envío por pagar"
        };
      }
      return {
        fee: 0,
        isFree: false,
        label: "Modalidad de Entrega",
        desc: "Por seleccionar"
      };
    }
  };

  const PricingEngine = {
    discounts: [
      { min: 50, pct: 30 },
      { min: 20, pct: 20 },
      { min: 5, pct: 10 },
      { min: 1, pct: 0 }
    ],

    calculateQuote(strategy, state) {
      const stratRes = strategy.calculate(state);
      const unitPrice = stratRes.unitPrice;
      const subtotalRaw = unitPrice * state.qty;

      const discRule = this.discounts.find((d) => state.qty >= d.min) || { pct: 0 };
      const discPct = discRule.pct;
      const discAmount = Math.round(subtotalRaw * (discPct / 100));
      const subtotalWithDisc = subtotalRaw - discAmount;

      const extraTotal = (stratRes.extraCost || 0) * state.qty;
      const plegadoTotal = stratRes.plegadoTotal || 0;

      const deliveryRes = DeliveryManager.evaluate(state.deliveryMode, subtotalWithDisc);

      const totalFinal = subtotalWithDisc + extraTotal + plegadoTotal + deliveryRes.fee;
      const neto = Math.round(totalFinal / 1.19);
      const iva = totalFinal - neto;

      return {
        strategyId: strategy.id,
        unitPrice,
        subtotalRaw,
        discPct,
        discAmount,
        subtotalWithDisc,
        extraCost: stratRes.extraCost || 0,
        extraLabel: stratRes.extraLabel || "",
        extraTotal,
        plegadoTotal,
        areaM2: stratRes.areaM2 || 0,
        deliveryFee: deliveryRes.fee,
        deliveryIsFree: deliveryRes.isFree,
        deliveryLabel: deliveryRes.label,
        deliveryDesc: deliveryRes.desc,
        neto,
        iva,
        totalFinal
      };
    }
  };

  /* =====================================================
     5. ORDER DISPATCHER (SRP: WhatsApp, Webpay, Proforma)
  ===================================================== */
  const OrderDispatcher = {
    sendWhatsApp(strategy, state, result, extra = {}) {
      let text = `*SOLICITUD DE PEDIDO - PLOTEX TEMUCO*%0A%0A`;
      if (extra.nombre) text += `*Cliente:* ${encodeURIComponent(extra.nombre)}%0A`;
      if (extra.telefono) text += `*Teléfono:* ${encodeURIComponent(extra.telefono)}%0A`;
      if (extra.email) text += `*Email:* ${encodeURIComponent(extra.email)}%0A`;

      let modoEntrega = "Despacho Temuco (Radio Céntrico)";
      if (state.deliveryMode === "retiro") {
        modoEntrega = "Retiro en Taller (Sector Fundo El Carmen, Temuco)";
      } else if (state.deliveryMode === "nacional") {
        const dest = state.courierDestino === "sucursal" ? "A Sucursal (Por Pagar)" : "A Domicilio (Por Pagar)";
        modoEntrega = `Envío Todo Chile vía ${state.courier || "Starken"} (${dest})`;
      }
      text += `*Modalidad Entrega:* ${encodeURIComponent(modoEntrega)}%0A`;

      if (extra.direccion && state.deliveryMode !== "retiro") {
        text += `*Dirección:* ${encodeURIComponent(extra.direccion)}%0A`;
      }
      if (state.fileName) text += `*Archivo Adjunto:* ${encodeURIComponent(state.fileName)}%0A`;

      text += `%0A*Detalle del Producto:*%0A`;
      const itemLines = strategy.getWhatsAppLines(state, result);
      itemLines.forEach((l) => {
        text += `${encodeURIComponent(l)}%0A`;
      });

      if (result.discPct > 0) text += `- Descuento Volumen: ${result.discPct}% OFF%0A`;
      if (state.deliveryMode === "local") {
        text += `- Despacho Temuco: ${result.deliveryIsFree ? "GRATIS ($0)" : SecuritySanitizer.formatCLP(result.deliveryFee)}%0A`;
      } else if (state.deliveryMode === "nacional") {
        text += `- Encomienda: Vía ${state.courier || "Starken"} (Envío por pagar)%0A`;
      }

      text += `%0A*TOTAL FINAL:* ${SecuritySanitizer.formatCLP(result.totalFinal)} (IVA incluido)%0A%0A`;
      text += `_Venta online oficial desde plotex.cl_`;

      window.open(`https://wa.me/56966390787?text=${text}`, "_blank");
    },

    generatePrintableDoc(strategy, state, result) {
      const printEl = document.getElementById("printableQuoteSheet");
      if (!printEl) return;

      const quoteCode = `COT-PLX-${Math.floor(100000 + Math.random() * 900000)}`;
      const today = new Date().toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" });
      const clientName = document.getElementById("cNombre")?.value.trim() || "Cliente / Oficina Técnica";

      let entregaDesc = "Despacho a Domicilio / Faena (Temuco)";
      if (state.deliveryMode === "retiro") {
        entregaDesc = "Retiro en Taller (Sector Fundo El Carmen, Temuco)";
      } else if (state.deliveryMode === "nacional") {
        entregaDesc = `Envío Nacional Todo Chile vía ${state.courier || "Starken"} (Por Pagar)`;
      }

      printEl.innerHTML = `
        <div class="quote-print-header">
          <div class="quote-print-logo">
            <h1 style="color:#ff3e00;">PLOTEX</h1>
            <p>TEMUCO &middot; TALLER TÉCNICO &middot; VENTA ONLINE A TODO CHILE</p>
            <p style="font-size:11px; color:#555; margin-top:4px;">Sector Fundo El Carmen, Temuco &middot; WhatsApp: +56 9 6639 0787 &middot; plotextemuco@gmail.com</p>
          </div>
          <div class="quote-print-doc-info">
            <div class="doc-badge">PRESUPUESTO PROFORMA</div>
            <p><b>Nº Documento:</b> ${quoteCode}</p>
            <p><b>Fecha de Emisión:</b> ${today}</p>
            <p><b>Validez:</b> 15 días corridos</p>
          </div>
        </div>

        <div class="quote-print-grid-info">
          <div>
            <h4>Datos del Solicitante</h4>
            <p><b>Atención:</b> ${SecuritySanitizer.escapeHtml(clientName)}</p>
            <p><b>Canal:</b> Venta Online Oficial (plotex.cl)</p>
            <p><b>Archivo de referencia:</b> ${SecuritySanitizer.escapeHtml(state.fileName || "Especificación directa")}</p>
          </div>
          <div>
            <h4>Condiciones de Entrega</h4>
            <p><b>Modalidad:</b> ${entregaDesc}</p>
            <p><b>Garantía:</b> Escala 1:1 Vectorial y Fidelidad Gráfica</p>
          </div>
        </div>

        <table class="quote-print-table">
          <thead>
            <tr>
              <th style="width:55%;">Descripción del Ítem Técnico</th>
              <th style="width:10%; text-align:center;">Cant.</th>
              <th style="width:15%; text-align:right;">P. Unit</th>
              <th style="width:20%; text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>${SecuritySanitizer.escapeHtml(strategy.getSummaryLabel(state))}</b>
              </td>
              <td style="text-align:center; font-weight:700;">${state.qty}</td>
              <td class="num">${SecuritySanitizer.formatCLP(result.unitPrice)}</td>
              <td class="num">${SecuritySanitizer.formatCLP(result.unitPrice * state.qty)}</td>
            </tr>
            ${result.plegadoTotal > 0 ? `
              <tr>
                <td><b>Plegado Normalizado NCh (Modular A4)</b><br/><span style="font-size:11px; color:#555;">Con solapa para archivador municipal (DOM)</span></td>
                <td style="text-align:center;">${state.qty}</td>
                <td class="num">$300</td>
                <td class="num">${SecuritySanitizer.formatCLP(result.plegadoTotal)}</td>
              </tr>
            ` : ""}
            ${state.deliveryMode === "local" ? `
              <tr>
                <td><b>Servicio de Despacho Express en Temuco</b></td>
                <td style="text-align:center;">1</td>
                <td class="num">${result.deliveryIsFree ? "$0 (Gratis)" : "$3.500"}</td>
                <td class="num">${result.deliveryIsFree ? "GRATIS" : SecuritySanitizer.formatCLP(result.deliveryFee)}</td>
              </tr>
            ` : state.deliveryMode === "nacional" ? `
              <tr>
                <td><b>Envío Nacional Todo Chile (Vía ${state.courier || "Starken"})</b></td>
                <td style="text-align:center;">1</td>
                <td class="num">Por Pagar</td>
                <td class="num">Por Pagar</td>
              </tr>
            ` : ""}
            ${result.discPct > 0 ? `
              <tr style="color:#1B7A42;">
                <td colspan="3"><b>Descuento Especial por Volumen (${result.discPct}% OFF)</b></td>
                <td class="num" style="color:#1B7A42;">-${SecuritySanitizer.formatCLP(result.discAmount)}</td>
              </tr>
            ` : ""}
          </tbody>
        </table>

        <div class="quote-print-totals">
          <div class="quote-print-totals-box">
            <div class="quote-print-totals-row">
              <span>Subtotal Neto:</span>
              <span class="num">${SecuritySanitizer.formatCLP(result.neto)}</span>
            </div>
            <div class="quote-print-totals-row">
              <span>IVA (19%):</span>
              <span class="num">${SecuritySanitizer.formatCLP(result.iva)}</span>
            </div>
            <div class="quote-print-totals-row total-final">
              <span>TOTAL (CLP):</span>
              <span class="num">${SecuritySanitizer.formatCLP(result.totalFinal)}</span>
            </div>
          </div>
        </div>

        <div class="quote-print-terms">
          <h4>Condiciones de Servicio & Datos de Transferencia:</h4>
          <p>• <b>Banco Estado:</b> Cuenta Corriente Nº 12345678 &middot; PLOTEX SpA &middot; RUT: 76.123.456-7 &middot; plotextemuco@gmail.com</p>
          <p>• <b>Confirmación:</b> Envía el comprobante por WhatsApp al <b>+56 9 6639 0787</b> o paga directo en <b>plotex.cl</b>.</p>
        </div>
      `;
    }
  };

  /* =====================================================
     6. UI CONTROLLER & CLIENT SPA ROUTER (Transiciones Fluidas)
  ===================================================== */
  const state = {
    // Planos
    format: "A1",
    customW: 914,
    customH: 1500,
    type: "linea-bn",
    paper: "bond-80",
    plegado: false,
    // Posters
    posterFormat: "90x120",
    posterSubstrate: "sintetico-180",
    posterTube: false,
    // Letreros
    letreroSize: "2x1",
    letreroSoporte: "zinc-madera",
    letreroGrafica: "uv-exterior",
    // Lona
    lonaW: 2.0,
    lonaH: 1.0,
    lonaType: "frontlit-13",
    lonaFinish: "ojetillos",
    // Común
    qty: 1,
    deliveryMode: null,
    courier: "Starken",
    courierDestino: "domicilio",
    fileName: "",
    fileSize: "",
    pageCount: 1
  };

  let currentResult = null;
  let activePageType = "planos";
  let activeStrategy = PlanosStrategy;
  let heroInterval = null;

  function getActiveStrategy() {
    activePageType = document.body.getAttribute("data-page") || "planos";
    activeStrategy = STRATEGIES[activePageType] || PlanosStrategy;
    return activeStrategy;
  }

  function showToast(msg, duration = 3200) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function updateCalculation() {
    getActiveStrategy();
    currentResult = PricingEngine.calculateQuote(activeStrategy, state);
    renderSummary(currentResult);
  }

  function renderSummary(res) {
    const itemLabel = document.getElementById("sumItemLabel");
    const itemVal = document.getElementById("sumItemVal");
    if (itemLabel) itemLabel.textContent = activeStrategy.getSummaryLabel(state);
    if (itemVal) itemVal.textContent = SecuritySanitizer.formatCLP(res.unitPrice * state.qty);

    const subRow = document.getElementById("sumSubstrateRow");
    const subLabel = document.getElementById("sumSubstrateLabel");
    const subVal = document.getElementById("sumSubstrateVal");
    if (subRow) {
      if (res.extraTotal > 0) {
        subRow.style.display = "table-row";
        if (subLabel) subLabel.textContent = res.extraLabel;
        if (subVal) subVal.textContent = `+${SecuritySanitizer.formatCLP(res.extraTotal)}`;
      } else {
        subRow.style.display = "none";
      }
    }

    const plegRow = document.getElementById("sumPlegadoRow");
    const plegVal = document.getElementById("sumPlegadoVal");
    if (plegRow) {
      plegRow.style.display = res.plegadoTotal > 0 ? "table-row" : "none";
      if (plegVal) plegVal.textContent = SecuritySanitizer.formatCLP(res.plegadoTotal);
    }

    const despRow = document.getElementById("sumDespachoRow");
    const despLabel = document.getElementById("sumDespachoLabel");
    const despVal = document.getElementById("sumDespachoVal");
    if (despRow && despVal) {
      despRow.style.display = "table-row";
      if (despLabel) despLabel.textContent = res.deliveryLabel;
      despVal.textContent = res.deliveryDesc;
      despVal.style.color = (state.deliveryMode === null) ? "var(--brand-svelte, #ff3e00)" : (res.deliveryIsFree && state.deliveryMode === "local" ? "var(--success)" : "var(--ink)");
    }

    const discRow = document.getElementById("sumDiscountRow");
    const discLabel = document.getElementById("sumDiscountLabel");
    const discVal = document.getElementById("sumDiscountVal");
    if (discRow && discVal && discLabel) {
      discRow.style.display = res.discPct > 0 ? "table-row" : "none";
      discLabel.textContent = `Descuento Volumen (${res.discPct}% OFF)`;
      discVal.textContent = `-${SecuritySanitizer.formatCLP(res.discAmount)}`;
    }

    const netoEl = document.getElementById("sumNeto");
    const ivaEl = document.getElementById("sumIva");
    const totalEl = document.getElementById("sumTotal");
    if (netoEl) netoEl.textContent = SecuritySanitizer.formatCLP(res.neto);
    if (ivaEl) ivaEl.textContent = SecuritySanitizer.formatCLP(res.iva);
    if (totalEl) totalEl.textContent = SecuritySanitizer.formatCLP(res.totalFinal);

    // Barra de incentivo dinámico
    const deliveryIncentiveBar = document.getElementById("deliveryIncentiveBar");
    const deliveryIncentiveText = document.getElementById("deliveryIncentiveText");
    if (deliveryIncentiveBar && deliveryIncentiveText) {
      if (res.subtotalWithDisc >= DeliveryManager.freeThreshold) {
        deliveryIncentiveBar.className = "delivery-incentive-bar unlocked";
        deliveryIncentiveText.textContent = "🎉 ¡Felicidades! Calificas para Despacho GRATIS en el radio céntrico de Temuco (100% de descuento).";
      } else {
        const falta = DeliveryManager.freeThreshold - res.subtotalWithDisc;
        deliveryIncentiveBar.className = "delivery-incentive-bar progress";
        deliveryIncentiveText.textContent = `Agrega ${SecuritySanitizer.formatCLP(falta)} más para tener Despacho GRATIS en el radio céntrico de Temuco.`;
      }
    }

    const discNote = document.getElementById("discountNote");
    if (discNote) {
      if (state.qty < 5) discNote.textContent = `5+ und: 10% OFF · 20+: 20% OFF`;
      else if (state.qty < 20) discNote.textContent = `¡10% aplicado! Agrega ${20 - state.qty} más para 20% OFF`;
      else if (state.qty < 50) discNote.textContent = `¡20% aplicado! Agrega ${50 - state.qty} más para 30% OFF`;
      else discNote.textContent = `¡30% OFF máximo por volumen aplicado!`;
    }
  }

  function openDeliveryPromptModal(onSelectedCallback) {
    const modal = document.getElementById("deliveryPromptModal");
    if (!modal) {
      if (typeof onSelectedCallback === "function") onSelectedCallback();
      return;
    }
    window._onDeliveryModeSelected = onSelectedCallback;
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
  }

  function ensureDeliverySelected(callback) {
    if (!state.deliveryMode) {
      openDeliveryPromptModal(callback);
      return false;
    }
    return true;
  }

  function syncDeliveryMode(mode) {
    state.deliveryMode = mode;
    document.querySelectorAll(".delivery-opt-card").forEach((card) => card.classList.remove("pulse-prompt"));

    const radioPage = document.querySelector(`input[name='deliveryMode'][value='${mode}']`);
    if (radioPage) radioPage.checked = true;

    const radioModal = document.querySelector(`input[name='modalDeliveryMode'][value='${mode}']`);
    if (radioModal) radioModal.checked = true;

    const courierBox = document.getElementById("courierBox");
    const direccionBlock = document.getElementById("direccionBlock");
    if (courierBox) courierBox.style.display = mode === "nacional" ? "block" : "none";
    if (direccionBlock) direccionBlock.style.display = mode === "retiro" ? "none" : "block";

    updateCalculation();
  }

  /* =====================================================
     7. SPA CLIENT-SIDE ROUTER (Transiciones Fluidas)
  ===================================================== */
  const AppRouter = {
    pageCache: new Map(),

    init() {
      document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        const rawHref = link.getAttribute("href");
        if (!rawHref) return;

        // Ignorar enlaces especiales
        if (
          link.target === "_blank" ||
          rawHref.startsWith("mailto:") ||
          rawHref.startsWith("tel:") ||
          rawHref.startsWith("javascript:") ||
          rawHref.startsWith("http://") ||
          rawHref.startsWith("https://") ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
        ) {
          return;
        }

        // Anclas en la misma página
        if (rawHref.startsWith("#")) {
          const targetEl = document.querySelector(rawHref);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return;
        }

        // Navegación interna entre páginas .html
        if (rawHref.endsWith(".html") || rawHref.includes(".html#")) {
          const targetUrl = new URL(link.href, window.location.href);
          const currentUrl = new URL(window.location.href);

          if (targetUrl.pathname === currentUrl.pathname) {
            if (targetUrl.hash) {
              const targetEl = document.querySelector(targetUrl.hash);
              if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }
            return;
          }

          e.preventDefault();
          const mobileDrawer = document.getElementById("mobileNavDrawer");
          const btnMobileMenu = document.getElementById("btnMobileMenu");
          if (mobileDrawer) mobileDrawer.classList.remove("open");
          if (btnMobileMenu) btnMobileMenu.classList.remove("open");

          this.navigateTo(link.href, targetUrl.hash);
        }
      });

      window.addEventListener("popstate", () => {
        this.navigateTo(window.location.href, window.location.hash, false);
      });
    },

    async navigateTo(url, hash = "", push = true) {
      const progressBar = document.getElementById("pageTopProgress");
      const mainContent = document.getElementById("mainContent");

      if (progressBar) {
        progressBar.className = "loading";
      }

      if (heroInterval) {
        clearInterval(heroInterval);
        heroInterval = null;
      }

      try {
        let htmlText = this.pageCache.get(url);
        if (!htmlText) {
          const res = await fetch(url);
          if (!res.ok) throw new Error("Error al cargar la página");
          htmlText = await res.text();
          this.pageCache.set(url, htmlText);
        }

        const parser = new DOMParser();
        const newDoc = parser.parseFromString(htmlText, "text/html");
        const newMain = newDoc.getElementById("mainContent");
        const newPageType = newDoc.body.getAttribute("data-page") || "planos";
        const newTitle = newDoc.title;

        const applyDOMChanges = () => {
          if (newMain && mainContent) {
            mainContent.innerHTML = newMain.innerHTML;
          }
          document.title = newTitle;
          document.body.setAttribute("data-page", newPageType);

          // Actualizar estado activo en links
          this.updateActiveNavLinks(url);

          if (push) {
            window.history.pushState({}, "", url);
          }

          if (hash) {
            const targetEl = document.querySelector(hash);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            }
          } else {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          }

          // Reinicializar controladores de la nueva página
          initPageControls();
        };

        if (document.startViewTransition) {
          const transition = document.startViewTransition(() => {
            applyDOMChanges();
          });
          await transition.finished;
        } else {
          if (mainContent) {
            mainContent.className = "page-fade-out";
            await new Promise((r) => setTimeout(r, 180));
          }

          applyDOMChanges();

          if (mainContent) {
            mainContent.className = "page-fade-in-prep";
            requestAnimationFrame(() => {
              mainContent.className = "page-fade-in-active";
              setTimeout(() => {
                mainContent.className = "";
              }, 250);
            });
          }
        }
      } catch (err) {
        console.warn("[AppRouter] Fallback a navegación estándar:", err);
        window.location.href = url;
        return;
      } finally {
        if (progressBar) {
          progressBar.className = "done";
          setTimeout(() => {
            progressBar.className = "";
          }, 300);
        }
      }
    },

    updateActiveNavLinks(targetUrl) {
      const urlObj = new URL(targetUrl, window.location.href);
      const filename = urlObj.pathname.split("/").pop() || "index.html";

      document.querySelectorAll(".nav-links a").forEach((a) => {
        const aFile = (a.getAttribute("href") || "").split("#")[0] || "index.html";
        const isActive = aFile === filename || (filename === "" && aFile === "index.html");
        a.classList.toggle("active", isActive);
      });

      document.querySelectorAll(".mobile-nav-links .mobile-nav-item").forEach((a) => {
        const aFile = (a.getAttribute("href") || "").split("#")[0] || "index.html";
        const isActive = aFile === filename || (filename === "" && aFile === "index.html");
        a.classList.toggle("active", isActive);
      });
    }
  };

  /* =====================================================
     8. INICIALIZACIÓN DE CONTROLES DE PÁGINA
  ===================================================== */
  function initPageControls() {
    getActiveStrategy();

    // 1. Dropzone de Archivos
    const dropzone = document.getElementById("smartDropzone");
    const fileInput = document.getElementById("quoteFileInput");
    const btnRemoveFile = document.getElementById("btnRemoveFile");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const fileSizeDisplay = document.getElementById("fileSizeDisplay");
    const tagFormat = document.getElementById("tagFormat");
    const tagDims = document.getElementById("tagDims");
    const tagPages = document.getElementById("tagPages");
    const btnApplyPages = document.getElementById("btnApplyPages");
    const pagesCountNum = document.getElementById("pagesCountNum");

    if (dropzone && fileInput) {
      dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
      dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
      fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
      });
      if (btnRemoveFile) {
        btnRemoveFile.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          fileInput.value = "";
          dropzone.classList.remove("has-file", "analyzing");
          state.fileName = "";
          showToast("Archivo quitado");
        });
      }
    }

    async function handleFile(file) {
      if (!dropzone) return;
      dropzone.classList.remove("has-file");
      dropzone.classList.add("analyzing");

      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      state.fileName = file.name;
      state.fileSize = `${sizeMB} MB`;

      const info = await FileInspector.inspect(file);
      dropzone.classList.remove("analyzing");
      dropzone.classList.add("has-file");

      state.format = info.format;
      state.pageCount = info.pages;

      if (state.paper === "foto-180-a3") {
        state.format = "A3";
        const radioA3 = document.querySelector("input[name='planFormat'][value='A3']");
        if (radioA3) radioA3.checked = true;
        const customDimsBox = document.getElementById("customDimsBox");
        if (customDimsBox) customDimsBox.style.display = "none";
      } else if (info.isCustom && activePageType === "planos") {
        state.customW = info.wMm;
        state.customH = info.hMm;
        const inW = document.getElementById("inputCustomW");
        const inH = document.getElementById("inputCustomH");
        const customFormatDims = document.getElementById("customFormatDims");
        const customDimsBox = document.getElementById("customDimsBox");
        if (inW) inW.value = info.wMm;
        if (inH) inH.value = info.hMm;
        if (customFormatDims) customFormatDims.textContent = `${info.wMm}×${info.hMm}`;
        const radioCustom = document.getElementById("radioCustomFormat");
        if (radioCustom) radioCustom.checked = true;
        if (customDimsBox) customDimsBox.style.display = "block";
      } else if (activePageType === "planos") {
        const radio = document.querySelector(`input[name='planFormat'][value='${info.format}']`);
        if (radio) radio.checked = true;
        const customDimsBox = document.getElementById("customDimsBox");
        if (customDimsBox) customDimsBox.style.display = "none";
      }

      if (fileNameDisplay) fileNameDisplay.textContent = file.name;
      if (fileSizeDisplay) fileSizeDisplay.textContent = `${sizeMB} MB`;
      if (tagFormat) tagFormat.textContent = info.isCustom ? `Medida: ${info.wMm}×${info.hMm}mm` : `Formato: ${info.format}`;
      if (tagDims) tagDims.textContent = info.dims;
      if (tagPages) tagPages.textContent = `${info.pages} ${info.pages === 1 ? "lámina" : "láminas"}`;

      if (btnApplyPages && pagesCountNum && info.pages > 1) {
        pagesCountNum.textContent = info.pages;
        btnApplyPages.style.display = "inline-flex";
        btnApplyPages.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          const inQty = document.getElementById("inputQty");
          if (inQty) inQty.value = info.pages;
          state.qty = info.pages;
          updateCalculation();
          btnApplyPages.style.display = "none";
          showToast(`Cantidad ajustada a ${info.pages} láminas`);
        };
      }

      updateCalculation();
      showToast(`✓ Archivo analizado: ${file.name}`);
    }

    // 2. Controles de Planos
    document.querySelectorAll("input[name='planFormat']").forEach((r) => {
      r.addEventListener("change", () => {
        if (state.paper === "foto-180-a3" && r.value !== "A3") {
          const radioA3 = document.querySelector("input[name='planFormat'][value='A3']");
          if (radioA3) radioA3.checked = true;
          state.format = "A3";
          showToast("ℹ️ El papel fotográfico glossy solo está disponible en formato A3.");
          return;
        }
        state.format = r.value;
        const customBox = document.getElementById("customDimsBox");
        if (customBox) customBox.style.display = r.value === "Custom" ? "block" : "none";
        updateCalculation();
      });
    });

    const inCustomW = document.getElementById("inputCustomW");
    const inCustomH = document.getElementById("inputCustomH");
    if (inCustomW) inCustomW.addEventListener("input", () => {
      state.customW = Math.max(50, parseInt(inCustomW.value, 10) || 914);
      const customFormatDims = document.getElementById("customFormatDims");
      if (customFormatDims) customFormatDims.textContent = `${state.customW}×${state.customH}`;
      const areaEl = document.getElementById("customAreaCalc");
      if (areaEl) areaEl.textContent = `${((state.customW * state.customH) / 1000000).toFixed(2)} m²`;
      updateCalculation();
    });
    if (inCustomH) inCustomH.addEventListener("input", () => {
      state.customH = Math.max(50, parseInt(inCustomH.value, 10) || 1500);
      const customFormatDims = document.getElementById("customFormatDims");
      if (customFormatDims) customFormatDims.textContent = `${state.customW}×${state.customH}`;
      const areaEl = document.getElementById("customAreaCalc");
      if (areaEl) areaEl.textContent = `${((state.customW * state.customH) / 1000000).toFixed(2)} m²`;
      updateCalculation();
    });

    document.querySelectorAll("input[name='planType']").forEach((r) => {
      r.addEventListener("change", () => { state.type = r.value; updateCalculation(); });
    });

    function syncPlanPaper(paperVal) {
      state.paper = paperVal;
      const formatRadios = document.querySelectorAll("input[name='planFormat']");
      const customBox = document.getElementById("customDimsBox");

      if (paperVal === "foto-180-a3") {
        state.format = "A3";
        const radioA3 = document.querySelector("input[name='planFormat'][value='A3']");
        if (radioA3) radioA3.checked = true;

        formatRadios.forEach((r) => {
          if (r.value !== "A3") {
            r.disabled = true;
          } else {
            r.disabled = false;
          }
        });

        if (customBox) customBox.style.display = "none";
        showToast("ℹ️ Papel fotográfico glossy disponible exclusivamente en Formato A3");
      } else {
        formatRadios.forEach((r) => {
          r.disabled = false;
        });
      }
      updateCalculation();
    }

    document.querySelectorAll("input[name='planPaper']").forEach((r) => {
      r.addEventListener("change", () => syncPlanPaper(r.value));
    });

    const chkPlegado = document.getElementById("chkPlegado");
    if (chkPlegado) chkPlegado.addEventListener("change", () => { state.plegado = chkPlegado.checked; updateCalculation(); });

    // 3. Controles de Posters
    document.querySelectorAll("input[name='posterFormat']").forEach((r) => {
      r.addEventListener("change", () => { state.posterFormat = r.value; updateCalculation(); });
    });
    document.querySelectorAll("input[name='posterSubstrate']").forEach((r) => {
      r.addEventListener("change", () => { state.posterSubstrate = r.value; updateCalculation(); });
    });
    const chkPosterTube = document.getElementById("chkPosterTube");
    if (chkPosterTube) chkPosterTube.addEventListener("change", () => { state.posterTube = chkPosterTube.checked; updateCalculation(); });

    // 4. Controles de Letreros
    document.querySelectorAll("input[name='letreroSize']").forEach((r) => {
      r.addEventListener("change", () => { state.letreroSize = r.value; updateCalculation(); });
    });
    document.querySelectorAll("input[name='letreroSoporte']").forEach((r) => {
      r.addEventListener("change", () => { state.letreroSoporte = r.value; updateCalculation(); });
    });
    document.querySelectorAll("input[name='letreroGrafica']").forEach((r) => {
      r.addEventListener("change", () => { state.letreroGrafica = r.value; updateCalculation(); });
    });

    // 5. Controles de Lona
    const inLonaW = document.getElementById("inputLonaW");
    const inLonaH = document.getElementById("inputLonaH");
    if (inLonaW) inLonaW.addEventListener("input", () => {
      state.lonaW = Math.max(0.2, parseFloat(inLonaW.value) || 2.0);
      const lonaArea = document.getElementById("lonaAreaCalc");
      if (lonaArea) lonaArea.textContent = `${(state.lonaW * state.lonaH).toFixed(2)} m²`;
      updateCalculation();
    });
    if (inLonaH) inLonaH.addEventListener("input", () => {
      state.lonaH = Math.max(0.2, parseFloat(inLonaH.value) || 1.0);
      const lonaArea = document.getElementById("lonaAreaCalc");
      if (lonaArea) lonaArea.textContent = `${(state.lonaW * state.lonaH).toFixed(2)} m²`;
      updateCalculation();
    });
    document.querySelectorAll("input[name='lonaType']").forEach((r) => {
      r.addEventListener("change", () => { state.lonaType = r.value; updateCalculation(); });
    });
    document.querySelectorAll("input[name='lonaFinish']").forEach((r) => {
      r.addEventListener("change", () => { state.lonaFinish = r.value; updateCalculation(); });
    });

    // 6. Stepper de Cantidad
    const inQty = document.getElementById("inputQty");
    const btnMinus = document.getElementById("btnMinus");
    const btnPlus = document.getElementById("btnPlus");
    if (inQty) {
      inQty.addEventListener("input", () => {
        state.qty = Math.max(1, parseInt(inQty.value, 10) || 1);
        updateCalculation();
      });
    }
    if (btnMinus && inQty) {
      btnMinus.addEventListener("click", () => {
        const q = Math.max(1, (parseInt(inQty.value, 10) || 1) - 1);
        inQty.value = q;
        state.qty = q;
        updateCalculation();
      });
    }
    if (btnPlus && inQty) {
      btnPlus.addEventListener("click", () => {
        const q = (parseInt(inQty.value, 10) || 1) + 1;
        inQty.value = q;
        state.qty = q;
        updateCalculation();
      });
    }

    // 7. Delivery Radios
    document.querySelectorAll("input[name='deliveryMode']").forEach((r) => {
      r.addEventListener("change", () => syncDeliveryMode(r.value));
    });
    document.querySelectorAll("input[name='modalDeliveryMode']").forEach((r) => {
      r.addEventListener("change", () => syncDeliveryMode(r.value));
    });
    document.querySelectorAll("input[name='courierChoice']").forEach((r) => {
      r.addEventListener("change", () => { state.courier = r.value; updateCalculation(); });
    });
    document.querySelectorAll("input[name='courierDestino']").forEach((r) => {
      r.addEventListener("change", () => { state.courierDestino = r.value; });
    });

    // 8. Modal Popup de Selección de Modalidad de Entrega (Requerido para Proforma)
    const deliveryPromptModal = document.getElementById("deliveryPromptModal");
    const btnCloseDeliveryPrompt = document.getElementById("btnCloseDeliveryPrompt");
    if (btnCloseDeliveryPrompt && deliveryPromptModal) {
      btnCloseDeliveryPrompt.addEventListener("click", () => {
        if (typeof deliveryPromptModal.close === "function") deliveryPromptModal.close();
        else deliveryPromptModal.removeAttribute("open");
      });
    }

    document.querySelectorAll(".btn-delivery-prompt-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        if (mode) syncDeliveryMode(mode);
        if (deliveryPromptModal) {
          if (typeof deliveryPromptModal.close === "function") deliveryPromptModal.close();
          else deliveryPromptModal.removeAttribute("open");
        }
        if (typeof window._onDeliveryModeSelected === "function") {
          const cb = window._onDeliveryModeSelected;
          window._onDeliveryModeSelected = null;
          cb();
        }
      });
    });

    // 8.1 Botones de Acción
    const btnOrderWhatsApp = document.getElementById("btnOrderWhatsApp");
    if (btnOrderWhatsApp) {
      btnOrderWhatsApp.addEventListener("click", () => {
        if (!state.deliveryMode) {
          openDeliveryPromptModal(() => {
            OrderDispatcher.sendWhatsApp(activeStrategy, state, currentResult);
          });
          return;
        }
        OrderDispatcher.sendWhatsApp(activeStrategy, state, currentResult);
      });
    }

    const btnDownloadPDF = document.getElementById("btnDownloadPDF");
    if (btnDownloadPDF) {
      btnDownloadPDF.addEventListener("click", () => {
        if (!state.deliveryMode) {
          openDeliveryPromptModal(() => {
            OrderDispatcher.generatePrintableDoc(activeStrategy, state, currentResult);
            setTimeout(() => window.print(), 120);
          });
          return;
        }
        OrderDispatcher.generatePrintableDoc(activeStrategy, state, currentResult);
        setTimeout(() => window.print(), 100);
      });
    }

    // 9. Modal Checkout
    const checkoutModal = document.getElementById("checkoutModal");
    const btnOpenCheckout = document.getElementById("btnOpenCheckout");
    const btnCloseCheckout = document.getElementById("btnCloseCheckout");
    const checkoutForm = document.getElementById("checkoutForm");
    const lblBoleta = document.getElementById("lblBoleta");
    const lblFactura = document.getElementById("lblFactura");
    const facturaFields = document.getElementById("facturaFields");
    const modalTotalPay = document.getElementById("modalTotalPay");
    const checkoutError = document.getElementById("checkoutError");
    const btnSubmitWebpay = document.getElementById("btnSubmitWebpay");
    const btnModalWhatsApp = document.getElementById("btnModalWhatsApp");

    if (lblBoleta && lblFactura && facturaFields) {
      lblBoleta.addEventListener("click", () => {
        lblBoleta.classList.add("active");
        lblFactura.classList.remove("active");
        facturaFields.style.display = "none";
      });
      lblFactura.addEventListener("click", () => {
        lblFactura.classList.add("active");
        lblBoleta.classList.remove("active");
        facturaFields.style.display = "block";
      });
    }

    if (btnOpenCheckout && checkoutModal) {
      btnOpenCheckout.addEventListener("click", () => {
        if (!state.deliveryMode) {
          openDeliveryPromptModal(() => {
            if (modalTotalPay && currentResult) modalTotalPay.textContent = SecuritySanitizer.formatCLP(currentResult.totalFinal);
            checkoutModal.showModal();
          });
          return;
        }
        if (!currentResult) return;
        if (modalTotalPay) modalTotalPay.textContent = SecuritySanitizer.formatCLP(currentResult.totalFinal);
        checkoutModal.showModal();
      });
    }

    if (btnCloseCheckout && checkoutModal) {
      btnCloseCheckout.addEventListener("click", () => checkoutModal.close());
    }

    if (btnModalWhatsApp) {
      btnModalWhatsApp.addEventListener("click", () => {
        const nombre = document.getElementById("cNombre")?.value.trim();
        const telefono = document.getElementById("cTelefono")?.value.trim();
        const email = document.getElementById("cEmail")?.value.trim();
        const direccion = document.getElementById("cDireccion")?.value.trim();
        OrderDispatcher.sendWhatsApp(activeStrategy, state, currentResult, { nombre, telefono, email, direccion });
        checkoutModal?.close();
      });
    }

    if (checkoutForm) {
      checkoutForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!ensureDeliverySelected() || !currentResult) return;
        if (checkoutError) checkoutError.style.display = "none";

        const nombre = document.getElementById("cNombre")?.value.trim();
        const telefono = document.getElementById("cTelefono")?.value.trim();
        const email = document.getElementById("cEmail")?.value.trim();
        const direccion = document.getElementById("cDireccion")?.value.trim();
        const isFactura = lblFactura?.classList.contains("active");

        let facturaData = null;
        if (isFactura) {
          const rut = document.getElementById("fRut")?.value.trim();
          const razonSocial = document.getElementById("fRazon")?.value.trim();
          const giro = document.getElementById("fGiro")?.value.trim();

          if (!rut || !SecuritySanitizer.validateChileanRut(rut)) {
            if (checkoutError) {
              checkoutError.textContent = "El RUT de la empresa no es válido según algoritmo oficial Módulo 11.";
              checkoutError.style.display = "block";
            }
            return;
          }
          if (!razonSocial || !giro) {
            if (checkoutError) {
              checkoutError.textContent = "Por favor completa la Razón Social y Giro comercial.";
              checkoutError.style.display = "block";
            }
            return;
          }
          facturaData = { rut, razonSocial, giro };
        }

        if (btnSubmitWebpay) {
          btnSubmitWebpay.disabled = true;
          btnSubmitWebpay.textContent = "Conectando con Webpay...";
        }

        try {
          const res = await fetch("http://localhost:3000/api/payment/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cotizacion: currentResult,
              cliente: { nombre, telefono, email },
              direccion,
              envio: {
                modalidad: state.deliveryMode,
                courier: state.deliveryMode === "nacional" ? state.courier : null,
                destino: state.courierDestino,
                direccion
              },
              factura: facturaData
            })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo iniciar el pago.");
          if (data.simulated) {
            window.location.href = `http://localhost:3000/api/payment/return?tracking=${encodeURIComponent(data.tracking)}&token_ws=${encodeURIComponent(data.token)}`;
          } else if (data.url) {
            const f = document.createElement("form");
            f.method = "POST";
            f.action = data.url;
            const inp = document.createElement("input");
            inp.type = "hidden";
            inp.name = "token_ws";
            inp.value = data.token;
            f.appendChild(inp);
            document.body.appendChild(f);
            f.submit();
          }
        } catch (err) {
          if (checkoutError) {
            checkoutError.textContent = "No pudimos conectar con la pasarela. Puedes confirmar tu pedido directo por WhatsApp.";
            checkoutError.style.display = "block";
          }
          if (btnSubmitWebpay) {
            btnSubmitWebpay.disabled = false;
            btnSubmitWebpay.innerHTML = '<i class="bi bi-credit-card"></i> Pagar con Webpay Plus';
          }
        }
      });
    }

    // 10. Hero Carousel (solo en index.html)
    const heroMainImg = document.getElementById("heroMainImg");
    const galleryTabs = document.querySelectorAll(".gallery-tab");
    if (heroMainImg && galleryTabs.length > 0) {
      let heroIdx = 0;
      const switchSlide = (idx) => {
        heroIdx = idx % galleryTabs.length;
        galleryTabs.forEach((t, i) => t.classList.toggle("active", i === heroIdx));
        const src = galleryTabs[heroIdx].getAttribute("data-img");
        if (src) {
          heroMainImg.style.opacity = "0.4";
          setTimeout(() => { heroMainImg.src = src; heroMainImg.style.opacity = "1"; }, 150);
        }
      };
      const startAutoplay = () => {
        if (heroInterval) clearInterval(heroInterval);
        heroInterval = setInterval(() => switchSlide(heroIdx + 1), 3000);
      };
      galleryTabs.forEach((tab, i) => {
        tab.addEventListener("click", () => { switchSlide(i); startAutoplay(); });
      });
      const card = document.querySelector(".hero-frame-card");
      if (card) {
        card.addEventListener("mouseenter", () => clearInterval(heroInterval));
        card.addEventListener("mouseleave", startAutoplay);
      }
      startAutoplay();
    }

    // 11. Tracking Form
    const trackingForm = document.getElementById("trackingForm");
    const trackInput = document.getElementById("trackInput");
    const trackingInfoBox = document.getElementById("trackingInfoBox");
    const trackCodeShow = document.getElementById("trackCodeShow");
    const trackStatusShow = document.getElementById("trackStatusShow");
    const trackNoteShow = document.getElementById("trackNoteShow");

    const DEMOS = {
      "PLX-DEMO-01": { status: "Plotteando", note: "En cola de impresión: Plotter HP DesignJet T830 #02" },
      "PLX-DEMO-02": { status: "En Reparto", note: "En ruta hacia Av. Alemania, Temuco" }
    };

    async function consultarTracking(rawCode) {
      const code = (rawCode || "").trim().toUpperCase();
      if (!code) return;
      if (DEMOS[code]) {
        if (trackingInfoBox) trackingInfoBox.style.display = "block";
        if (trackCodeShow) trackCodeShow.textContent = code;
        if (trackStatusShow) trackStatusShow.textContent = DEMOS[code].status;
        if (trackNoteShow) trackNoteShow.textContent = DEMOS[code].note;
        showToast(`Pedido ${code} encontrado`);
        return;
      }
      try {
        const res = await fetch(`http://localhost:3000/api/tracking/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.ok && data.pedido) {
          if (trackingInfoBox) trackingInfoBox.style.display = "block";
          if (trackCodeShow) trackCodeShow.textContent = data.pedido.tracking;
          if (trackStatusShow) trackStatusShow.textContent = data.pedido.estadoLabel || data.pedido.estado || "En proceso";
          if (trackNoteShow) trackNoteShow.innerHTML = `Total: <b>${SecuritySanitizer.formatCLP(data.pedido.total)}</b> &middot; Cliente: ${SecuritySanitizer.escapeHtml(data.pedido.cliente?.nombre || "")}`;
        } else {
          showToast("No se encontró una orden con ese código");
        }
      } catch (err) {
        showToast("No se encontró una orden con ese código");
      }
    }

    if (trackingForm && trackInput) {
      trackingForm.addEventListener("submit", (e) => {
        e.preventDefault();
        consultarTracking(trackInput.value);
      });
      const urlParams = new URLSearchParams(window.location.search);
      const trackingFromUrl = urlParams.get("tracking");
      if (trackingFromUrl) {
        trackInput.value = trackingFromUrl;
        consultarTracking(trackingFromUrl);
      }
    }

    // 12. Instagram Feed (Diferido para TBT 0ms)
    const igGrid = document.getElementById("igGrid");
    async function loadInstagramFeed() {
      if (!igGrid) return;
      try {
        const res = await fetch("http://localhost:3000/api/instagram/feed");
        const data = await res.json();
        if (data.ok && Array.isArray(data.posts) && data.posts.length > 0) {
          igGrid.innerHTML = data.posts.map(p => `
            <a href="${SecuritySanitizer.escapeHtmlAttr(p.permalink || 'https://instagram.com/plotextemuco')}" target="_blank" rel="noopener" class="ig-card">
              <div class="ig-card-media">
                <img src="${SecuritySanitizer.escapeHtmlAttr(p.imageUrl || 'assets/ig-post-1.jpg')}" alt="${SecuritySanitizer.escapeHtmlAttr(p.title)}" class="ig-card-img" width="300" height="300" loading="lazy" decoding="async" onerror="this.src='assets/ig-post-1.jpg'" />
                <span class="ig-tag-badge">${SecuritySanitizer.escapeHtml(p.badge || 'PLOTEX')}</span>
                <span class="ig-overlay-icon"><i class="bi bi-instagram"></i></span>
              </div>
              <div class="ig-card-body">
                <div class="ig-card-title">${SecuritySanitizer.escapeHtml(p.title || 'Publicación @plotextemuco')}</div>
                <div class="ig-card-desc">${SecuritySanitizer.escapeHtml(p.description || 'Ploteo técnico en Temuco.')}</div>
                <div class="ig-card-link"><i class="bi bi-instagram"></i> Ver publicación ↗</div>
              </div>
            </a>
          `).join("");
        }
      } catch (err) {
        console.warn("[InstagramFeed] Fallback local activo.");
      }
    }

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => loadInstagramFeed(), { timeout: 1500 });
    } else {
      setTimeout(loadInstagramFeed, 120);
    }

    // Actualizar cálculo inicial para la página
    updateCalculation();
  }

  /* ====== Inicialización Global ====== */
  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.setAttribute("data-theme", "light");
    const yearEl = document.getElementById("yearVal");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Mobile Menu Drawer
    const btnMobileMenu = document.getElementById("btnMobileMenu");
    const mobileNavDrawer = document.getElementById("mobileNavDrawer");
    if (btnMobileMenu && mobileNavDrawer) {
      btnMobileMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = mobileNavDrawer.classList.toggle("open");
        btnMobileMenu.classList.toggle("open", isOpen);
      });
      document.addEventListener("click", (e) => {
        if (mobileNavDrawer.classList.contains("open") && !mobileNavDrawer.contains(e.target) && !btnMobileMenu.contains(e.target)) {
          mobileNavDrawer.classList.remove("open");
          btnMobileMenu.classList.remove("open");
        }
      });
    }

    // Inicializar Enrutador SPA
    AppRouter.init();

    // Inicializar controles de la página actual
    initPageControls();

    // Registro de Service Worker para carga instantánea en 0ms (Zero-FOUC)
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((err) => {
          console.warn("[SW] Registro omitido:", err);
        });
      });
    }
  });

})();