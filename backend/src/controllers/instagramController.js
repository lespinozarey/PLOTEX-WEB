import { getInstagramFeed, setInstagramFeed, updatePostsFromApi } from "../db/instagramStore.js";

/**
 * GET /api/instagram/feed
 * Endpoint público que devuelve los 4 posts más recientes para la web
 */
export async function getFeed(_req, res) {
  try {
    const data = getInstagramFeed();
    res.json({
      ok: true,
      username: data.username,
      lastSync: data.lastSync,
      hasToken: Boolean(data.accessToken),
      posts: data.posts,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * POST /api/instagram/sync
 * Sincroniza en vivo las últimas publicaciones llamando a la API oficial de Instagram Graph
 */
export async function syncInstagram(_req, res) {
  try {
    const config = getInstagramFeed();
    const token = config.accessToken;

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: "No se ha configurado un Token de Acceso de Instagram (Instagram Basic Display / Graph API).",
      });
    }

    // Llamada oficial a Instagram Graph API
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=6&access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    const json = await response.json();

    if (!response.ok || json.error) {
      const errMsg = json.error?.message || "Error al conectar con la API de Instagram";
      return res.status(502).json({ ok: false, error: errMsg });
    }

    if (json.data && Array.isArray(json.data)) {
      const updated = updatePostsFromApi(json.data);
      return res.json({
        ok: true,
        mensaje: "Feed sincronizado exitosamente desde Instagram",
        posts: updated.posts,
        lastSync: updated.lastSync,
      });
    }

    res.status(400).json({ ok: false, error: "La API de Instagram no retornó publicaciones válidas" });
  } catch (err) {
    console.error("[InstagramSync]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * PUT /api/instagram/config
 * Permite al administrador guardar el Access Token o actualizar manualmente los posts destacados
 */
export async function updateFeedConfig(req, res) {
  try {
    const updated = setInstagramFeed(req.body);
    res.json({
      ok: true,
      mensaje: "Configuración de Instagram actualizada",
      feed: {
        username: updated.username,
        hasToken: Boolean(updated.accessToken),
        lastSync: updated.lastSync,
        posts: updated.posts,
      },
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}
