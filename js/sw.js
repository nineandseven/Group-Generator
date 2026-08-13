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
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        for (const url of CACHE_FILES) {
          try {
            await cache.add(url);
            console.log("[SW] Cached:", url);
          } catch (error) {
            console.error("[SW] Failed:", url, error);
          }
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const clone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });

        return response;
      });
    }),
  );
});
