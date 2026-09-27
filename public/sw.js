const CACHE = "kelpers-v1"
const PRECACHE = [
  "/",
  "/offline",
  "/map",
  "/report",
  "/help",
  "/profile",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/kelpers-logo.jpeg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/offline"))
    return
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/reports/")) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

async function networkFirst(request, fallbackUrl) {
  try {
    const fresh = await fetch(request)
    const cache = await caches.open(CACHE)
    cache.put(request, fresh.clone())
    return fresh
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (fallbackUrl) {
      const offline = await caches.match(fallbackUrl)
      if (offline) return offline
    }
    return Response.error()
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const fresh = await fetch(request)
  const cache = await caches.open(CACHE)
  cache.put(request, fresh.clone())
  return fresh
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((fresh) => {
      cache.put(request, fresh.clone())
      return fresh
    })
    .catch(() => cached)
  return cached || network
}
