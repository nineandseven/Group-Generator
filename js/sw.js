const CACHE_NAME = "badminton-scheduler-v1";

const CACHE_FILES = [
  "../",
  "../index.html",
  "../css/theme.css",
  "../css/style.css",
  "../js/sw.js",
  "../js/script.js",
  "../manifest.json",
  "../images/icon-192.png",
  "../images/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_FILES))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        return cached || fetch(event.request);
      })
  );
});
