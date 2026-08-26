/**
 * PLOTEX TEMUCO - Service Worker
 * Cache-First Architecture for Zero-FOUC & Instant Reloads
 */

const CACHE_NAME = "plotex-v5-cache";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./posters-cientificos.html",
  "./letreros-obra.html",
  "./lona-pvc.html",
  "./styles.css",
  "./script.js",
  "./assets/plotter-studio.jpg",
  "./assets/poster-congress-expo.jpg",
  "./assets/poster-presentation.jpg",
  "./assets/letrero-mop-faena.jpg",
  "./assets/letrero-mop-taller.jpg",
  "./assets/lona-pvc-fachada.jpg",
  "./assets/lona-pvc-taller.jpg",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[SW] Precaching warning:", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Ignorar llamadas de API dinámicas de pago o tracking
  if (request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retornar caché al instante (0ms) y actualizar en segundo plano (Stale-While-Revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return networkResponse;
      });
    })
  );
});
