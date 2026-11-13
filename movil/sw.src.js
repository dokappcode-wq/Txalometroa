// Service worker del Txalometroa: la app funciona sin conexión una vez abierta.
// construir.py sustituye la versión en cada compilación para que el móvil coja los cambios.
const VERSION = "txalometroa-__VERSION__";
const APP = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
const IMAGENES = "txalometroa-imagenes";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION && k !== IMAGENES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // La página: primero la red (para coger cambios) y, sin conexión, la copia guardada.
    if (req.mode === "navigate") {
      e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copia)); return r; })
        .catch(() => caches.match("./index.html")));
      return;
    }
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }
  // Fotos de las obras y tipografías: se sirven de la copia y se actualizan por detrás.
  if (/hikateatroa\.eus$|fonts\.googleapis\.com$|fonts\.gstatic\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(IMAGENES).then(async c => {
      const guardada = await c.match(req);
      const red = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => guardada);
      return guardada || red;
    }));
  }
});
