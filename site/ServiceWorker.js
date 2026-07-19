const cachePrefix = "chromashift-shell-";
const cacheName = cachePrefix + "0.5.1";
const shell = ["./", "index.html", "manifest.webmanifest", "TemplateData/style.css", "TemplateData/app-icon.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // Unity's own data cache manages the large Build payload. Keeping it out of the
  // service-worker cache avoids storing the game twice on memory-constrained iPhones.
  if (new URL(request.url).pathname.includes("/Build/")) return;
  // Network-first keeps installed PWAs on the current menu, stylesheet and
  // manifest even when a release reuses the same product version. The cached
  // shell remains a useful fallback when the hosting edge is temporarily down.
  event.respondWith(fetch(request).then(response => {
    if (response && response.ok)
      caches.open(cacheName).then(cache => cache.put(request, response.clone()));
    return response;
  }).catch(() => caches.match(request).then(cached => {
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match("./");
    return Response.error();
  })));
});
