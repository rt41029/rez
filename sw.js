const VERSION = "v3";
const SHELL_CACHE = `rezerv-shell-${VERSION}`;
const RUNTIME_CACHE = `rezerv-runtime-${VERSION}`;
const OFFLINE_URL = "./offline.html";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./offline.html",
  "./evod-template.pdf",
  "./qr-photo.jpg",
  "./splash-start.jpg",
  "./menu-icon-1.svg",
  "./menu-icon-2.svg",
  "./menu-icon-3.svg",
  "./menu-icon-4.svg",
  "./menu-icon-5.svg",
  "./menu-icon-6.svg",
  "./plus-menu-icon-1.svg",
  "./plus-menu-icon-2.svg",
  "./plus-menu-icon-3.svg",
  "./notif-bell.png",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))
    );
    if ("navigationPreload" in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const response = await fetch(request);
        const runtime = await caches.open(RUNTIME_CACHE);
        runtime.put(request, response.clone());
        return response;
      } catch (_) {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match("./index.html")) || (await cache.match(OFFLINE_URL));
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        const runtime = await caches.open(RUNTIME_CACHE);
        runtime.put(request, response.clone());
        return response;
      } catch (_) {
        return caches.match(OFFLINE_URL);
      }
    })());
    return;
  }
});
