/**
 * Store en memoria y persistente para el Feed de Instagram (@plotextemuco)
 */

let instagramConfig = {
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
  username: "plotextemuco",
  lastSync: null,
  posts: [
    {
      id: "post-1",
      badge: "LÁMINA A0",
      title: "Concurso de Arquitectura",
      description: "Ploteo full color en papel fotográfico satinado 200g a 2400 DPI para entrega universitaria en Temuco.",
      imageUrl: "assets/ig-post-1.jpg",
      permalink: "https://instagram.com/plotextemuco",
      date: new Date().toISOString(),
    },
    {
      id: "post-2",
      badge: "PLEGADO NCh",
      title: "Juego de 40 Planos DOM",
      description: "Planos de cálculo y arquitectura doblados con solapa para carpeta de ingreso municipal.",
      imageUrl: "assets/ig-post-2.jpg",
      permalink: "https://instagram.com/plotextemuco",
      date: new Date().toISOString(),
    },
    {
      id: "post-3",
      badge: "PAPEL VEGETAL",
      title: "Plano Topográfico 90g",
      description: "Impresión en sustrato vegetal translúcido de alta definición para superposición de redes.",
      imageUrl: "assets/ig-post-3.jpg",
      permalink: "https://instagram.com/plotextemuco",
      date: new Date().toISOString(),
    },
    {
      id: "post-4",
      badge: "DESPACHO OBRA",
      title: "Entrega en Terreno Temuco",
      description: "Despacho protegido en tubo rígido directo a faena en sector Av. Alemania y Padre Las Casas.",
      imageUrl: "assets/ig-post-4.jpg",
      permalink: "https://instagram.com/plotextemuco",
      date: new Date().toISOString(),
    },
  ],
};

export function getInstagramFeed() {
  return JSON.parse(JSON.stringify(instagramConfig));
}

export function setInstagramFeed(nuevo) {
  if (!nuevo || typeof nuevo !== "object") throw new Error("Datos de feed inválidos");
  
  if (nuevo.accessToken !== undefined) {
    instagramConfig.accessToken = String(nuevo.accessToken).trim();
  }
  if (nuevo.username) {
    instagramConfig.username = String(nuevo.username).trim().replace("@", "");
  }
  if (Array.isArray(nuevo.posts)) {
    instagramConfig.posts = nuevo.posts.slice(0, 8).map((p, idx) => ({
      id: p.id || `custom-post-${idx + 1}`,
      badge: p.badge || "PLOTEX",
      title: p.title || "Publicación @plotextemuco",
      description: p.description || "",
      imageUrl: p.imageUrl || "assets/ig-post-1.jpg",
      permalink: p.permalink || "https://instagram.com/plotextemuco",
      date: p.date || new Date().toISOString(),
    }));
  }
  instagramConfig.lastSync = new Date().toISOString();
  return getInstagramFeed();
}

export function updatePostsFromApi(apiPosts) {
  if (!Array.isArray(apiPosts) || apiPosts.length === 0) return getInstagramFeed();
  
  instagramConfig.posts = apiPosts.slice(0, 4).map((p, idx) => {
    const caption = p.caption || "";
    // Extraer primera línea como título
    const lines = caption.split("\n").map(l => l.trim()).filter(Boolean);
    const title = lines[0] ? (lines[0].length > 40 ? lines[0].slice(0, 37) + "..." : lines[0]) : `Publicación #${idx + 1}`;
    const description = lines.length > 1 ? lines.slice(1).join(" ").slice(0, 110) + "..." : caption.slice(0, 110);
    
    // Detectar badge según contenido
    let badge = "INSTAGRAM";
    const upper = caption.toUpperCase();
    if (upper.includes("A0") || upper.includes("A1") || upper.includes("PLANO")) badge = "PLANO CAD";
    if (upper.includes("PLEGADO") || upper.includes("DOM") || upper.includes("NCH")) badge = "PLEGADO NCh";
    if (upper.includes("VEGETAL") || upper.includes("SUSTRATO")) badge = "PAPEL VEGETAL";
    if (upper.includes("OBRA") || upper.includes("DESPACHO") || upper.includes("TERRENO")) badge = "DESPACHO OBRA";

    return {
      id: p.id || `ig-${idx}`,
      badge,
      title,
      description: description || "Trabajo técnico gran formato realizado en taller PLOTEX Temuco.",
      imageUrl: p.media_type === "VIDEO" ? (p.thumbnail_url || p.media_url) : p.media_url,
      permalink: p.permalink || `https://instagram.com/plotextemuco`,
      date: p.timestamp || new Date().toISOString(),
    };
  });

  instagramConfig.lastSync = new Date().toISOString();
  return getInstagramFeed();
}
