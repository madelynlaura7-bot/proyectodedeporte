const CACHE = "deporzone-v2";
const SHELL = [
  "./", "index.html", "styles.css", "script.js", "manifest.json",
  "data/canchas.json", "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Catálogo JSON: primero red (datos frescos), si falla usa caché
  if (url.origin === location.origin && url.pathname.endsWith("/data/canchas.json")) {
    e.respondWith(
      fetch(e.request)
        .then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Resto: primero caché; si no está, red y se guarda (portadas lazy, jQuery, fuentes)
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return res;
    }).catch(() => e.request.mode === "navigate" ? caches.match("index.html") : undefined))
  );
});
