---
name: PLOTEX Temuco Design System
description: Identidad visual editorial técnica inspirada en la precisión suiza y el ploteo arquitectónico
colors:
  primary: "#ff3e00"
  primary-hover: "#e63700"
  primary-light: "#fff0eb"
  neutral-bg: "#F9F8F5"
  neutral-card: "#FFFFFF"
  neutral-subtle: "#F1EFEA"
  neutral-muted: "#E8E5DE"
  ink-primary: "#111215"
  ink-secondary: "#383A40"
  ink-muted: "#565961"
  line-subtle: "#E2DFD7"
  line-dark: "#C8C4B8"
  success: "#146937"
  success-light: "#EBF7EF"
  whatsapp: "#25D366"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 2.75rem)"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.55
  mono:
    fontFamily: "JetBrains Mono, SF Mono, monospace"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-card}"
    rounded: "{rounded.sm}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-subtle}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  card:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: PLOTEX Temuco

## Overview

**Creative North Star: "The Architectural Drafting Table" (La Mesa de Dibujo Técnico)**

La identidad visual de PLOTEX se sustenta en la disciplina de la tipografía suiza, la exactitud de los planos CAD y la sobriedad editorial. El diseño huye de los clichés comerciales de las imprentas convencionales (fondos oscuros estridentes, brillos plásticos, elementos recargados) para ofrecer una superficie cálida, limpia y de altísima legibilidad, donde los datos técnicos y los cálculos en vivo son los verdaderos protagonistas.

El color de acento principal es el **Naranja Oficial Svelte (`#ff3e00`)**, utilizado estratégicamente en elementos interactivos clave: cabecera de marca, selectores activos, botones de acción principal, badges de fidelidad y estados de proceso. Se complementa con una base de papel cálido (`#F9F8F5`), tarjetas blanco puro (`#FFFFFF`), líneas sutiles de cuadrícula técnica (`#E2DFD7`) y tinta profunda (`#111215`).

**Key Characteristics:**
- **Claridad Vectorial**: Información estructurada en módulos limpios con grillas de 2 columnas.
- **Micro-Tipografía Mono**: Cifras en CLP, dimensiones en mm, escalas y metadatos formateados en *JetBrains Mono*.
- **Micro-Interacciones Táctiles**: Elevación controlada (`translateY(-3px)`), transiciones suaves de opacidad (150ms) y bordes contrastados al hover.

---

## Colors

Paleta inspirada en el papel de plano arquitectónico, el grafito y el acento de marcador de taller:

- **Primario & Marca**: `var(--brand-svelte, #ff3e00)` — Acento enérgico para herramientas de acción y navegación activa.
- **Superficies Neutras**:
  - `var(--bg)` (`#F9F8F5`): Fondo general cálido.
  - `var(--bg-card)` (`#FFFFFF`): Fondo de módulos de cotización, tablas y modales.
  - `var(--bg-subtle)` (`#F1EFEA`): Fondo de contenedores secundarios y filas alternas.
- **Tipografía & Tinta**:
  - `var(--ink)` (`#111215`): Texto principal y títulos.
  - `var(--ink-secondary)` (`#383A40`): Descripciones y etiquetas secundarias (Contraste > 7.5:1).
  - `var(--ink-muted)` (`#565961`): Metadatos y notas de apoyo (Contraste > 5.5:1).
- **Semántica**:
  - `var(--success)` (`#146937`): Estados aprobados, envío gratis y badges positivos.
  - `#25D366`: WhatsApp técnico para pedidos inmediatos.

---

## Typography

Estructura tipográfica jerárquica con dos familias especializadas:

1. **Inter**: Tipografía sans-serif de grado suizo para encabezados de alto impacto, textos descriptivos y controles de formulario.
2. **JetBrains Mono**: Tipografía monospace para cotizaciones, cálculos de dimensiones, códigos de orden `PLX-XXXXX` y tablas de tarifas.

---

## Layout

- **Contenedor Central**: Ancho máximo de `1200px` con relleno lateral responsivo (`0 20px` en escritorio, `0 16px` en móvil).
- **Hero Showcase**: Grilla de 2 columnas balanceadas (45% argumento técnico + 55% carrusel visual de alta fidelidad).
- **Cotizador Interactivo**: Grilla de 2 columnas lado a lado (60% configuración técnica y sustratos + 40% resumen de orden proforma en tarjeta fija/sticky).
- **Grillas Secundarias**: Módulos de 3 y 4 columnas (`grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))`) que colapsan fluidamente a una sola columna en pantallas móviles (< 768px).

---

## Elevation & Depth

- **Superficies Planas con Elevación Sutil**: PLOTEX prioriza la planitud arquitectónica con delineado sutil (`border: 1px solid var(--line)`).
- **Sombras de Tarjeta**:
  - Estado base: `box-shadow: 0 1px 3px rgba(17, 18, 21, 0.04), 0 4px 12px rgba(17, 18, 21, 0.03)`.
  - Estado hover: `box-shadow: 0 10px 24px rgba(0, 0, 0, 0.05); transform: translateY(-3px)`.
- **Modales & Diálogos**: `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2)` con `backdrop-filter: blur(4px)`.

---

## Shapes

- **Radios de Borde**:
  - `4px` (`--r-sm`): Botones, inputs, badges de código e iconos técnicos.
  - `8px` (`--r-md`): Tarjetas de cotizador, carruseles, tablas y modales.
  - `9999px` (`--r-full`): Píldoras de estado, badges de despacho y botón flotante de WhatsApp.
- **Bordes**: `1px solid var(--line)` (`#E2DFD7`) para demarcación limpia de componentes.

---

## Components

### 1. Botones (`.btn`)
- **Primario (`.btn-primary`)**: Fondo `#ff3e00`, texto `#ffffff`, `font-weight: 700`. Hover a `#e63700`.
- **Secundario (`.btn-secondary`)**: Fondo `#F1EFEA`, borde `1px solid #C8C4B8`, texto `#111215`.
- **WhatsApp (`.btn-whatsapp`)**: Fondo `#25D366`, texto `#ffffff`, icono de WhatsApp.

### 2. Píldoras Selectoras de Opciones (`.radio-pill`)
- Selector de sustratos, formato y acabados con borde interactivo. Al seleccionarse (`:checked`), el borde cambia a `#ff3e00` con fondo blanco puro y radio button personalizado.

### 3. Stepper de Cantidad (`.qty-stepper`)
- Botones `-` y `+` con tamaño táctil accesible (44×44px) e input central mono sincronizado en tiempo real.

### 4. Dropzone de Archivos (`.dropzone-clean`)
- Zona de arrastre con borde discontinuo (`dashed`), indicador de análisis con spinner y previsualización de metadatos de archivo cargado.

### 5. Resumen Fijo / Proforma (`.summary-card`)
- Tarjeta de desglose financiero con subtotales, IVA, despacho y total destacado en tipografía mono grande.

---

## Do's and Don'ts

### Do's:
- **Sí** respetar la escala 1:1 en todos los textos explicativos y reglas de negocio.
- **Sí** utilizar *JetBrains Mono* para todos los precios en CLP y formatos numéricos.
- **Sí** mantener el naranja Svelte (`#ff3e00`) como acento de precisión y no como fondo masivo de página completa.
- **Sí** garantizar que todos los botones e inputs posean atributos de accesibilidad (`aria-label`, `title`).

### Don'ts:
- **No** usar gradientes de arcoíris ni sombras pesadas de estilo skeuomórfico.
- **No** utilizar texto con contraste inferior a 4.5:1 contra el fondo.
- **No** bloquear la carga del render con fuentes o scripts síncronos; mantener siempre carga diferida/asíncrona.
