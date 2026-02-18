/* eslint-disable no-restricted-globals */

const CACHE_NAME = "hifzdeen-pwa-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([OFFLINE_URL, "/manifest.webmanifest", "/icon.svg", "/maskable-icon.svg"]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => (key === CACHE_NAME ? undefined : caches.delete(key))));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigation: network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(OFFLINE_URL);
          return cached ?? new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Same-origin static assets: cache-first then revalidate.
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticLike =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font";

  if (isSameOrigin && isStaticLike) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});

