/* global self, caches */
// Build artifacts only. No runtime cache writes, request bodies, credentials or provider logging.
const CONFIG = /* PWA_CONFIG */ null;
const scope = new URL(self.registration.scope);
if (scope.pathname !== CONFIG.scope) throw new Error("Unexpected PWA scope");
const known = new Set(
  CONFIG.entries.map((entry) => new URL(entry.url, scope.origin).href),
);
const routes = new Set(
  CONFIG.entries
    .filter((entry) => entry.file.endsWith("index.html"))
    .map((entry) => entry.url),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CONFIG.cacheName);
      try {
        // Bound concurrency; installation succeeds only after every artifact is verified and stored.
        let next = 0;
        const results = await Promise.allSettled(
          Array.from({ length: 4 }, async () => {
            while (next < CONFIG.entries.length) {
              const entry = CONFIG.entries[next++];
              const url = new URL(entry.url, scope.origin).href;
              const response = await fetch(url, {
                cache: "reload",
                credentials: "omit",
                redirect: "error",
              });
              if (!response.ok || response.type === "opaque")
                throw new Error("Precache failed");
              const hash = Array.from(
                new Uint8Array(
                  await crypto.subtle.digest(
                    "SHA-256",
                    await response.clone().arrayBuffer(),
                  ),
                ),
                (n) => n.toString(16).padStart(2, "0"),
              ).join("");
              if (hash !== entry.sha256)
                throw new Error("Precache integrity failed");
              await cache.put(url, response);
            }
          }),
        );
        if (results.some((result) => result.status === "rejected"))
          throw new Error("Precache failed");
      } catch (error) {
        await caches.delete(CONFIG.cacheName);
        throw error;
      }
      // No skipWaiting: an old document must finish using its matching chunks before activation.
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(CONFIG.cachePrefix) && name !== CONFIG.cacheName)
          await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Presence check only; never read header values. POST/BYOK always bypasses this handler.
  if (
    request.method !== "GET" ||
    request.cache === "no-store" ||
    request.headers.has("authorization")
  )
    return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname))
    return;
  let key = url.href;
  if (request.mode === "navigate") {
    const pathname = url.pathname.endsWith("/")
      ? url.pathname
      : url.pathname + "/";
    if (!routes.has(pathname)) return; // Unknown paths keep their real 404; no SPA fallback.
    key = scope.origin + pathname; // Only navigation ignores search (record/?id=...).
  }
  if (!known.has(key)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CONFIG.cacheName);
      return (await cache.match(key)) || fetch(request);
    })(),
  );
});
