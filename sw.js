const CACHE = "nt-reader-v18";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./data/nt.json",
  "./data/hi.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => cached || caches.match("./") || fetch(request))
    );
    return;
  }

  const path = new URL(request.url).pathname;
  const networkFirst =
    path.endsWith("/nt.json") ||
    path.endsWith("/hi.json") ||
    path.endsWith("/app.js") ||
    path.endsWith("/styles.css");

  event.respondWith(
    networkFirst
      ? fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => caches.match(request))
      : caches.match(request).then((cached) => cached || fetch(request))
  );
});
