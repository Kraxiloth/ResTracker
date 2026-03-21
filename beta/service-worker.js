/**
 * service-worker.js — ResTracker PWA
 * Handles caching and offline support.
 *
 * Strategy: Cache-first for all core assets.
 * On install, all files in CORE_ASSETS are pre-cached.
 * On fetch, the cache is checked first; network is the fallback.
 * On activate, outdated caches are purged automatically.
 *
 * To force users onto a new cache, bump CACHE_VERSION below.
 */


// ============================================================
//  CACHE CONFIGURATION
//  Bump CACHE_VERSION whenever you deploy changes to force
//  existing installs to fetch fresh assets.
// ============================================================
const CACHE_VERSION  = "v48";
const CACHE_NAME     = `restracker-${CACHE_VERSION}`;


// ============================================================
//  CORE ASSETS
//  Every file listed here is pre-cached on install.
//  Add new files here as the app grows.
// ============================================================
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./config.js",
  "./app.js",
  "./styles/base.css",
  "./js/timer.js",
  "./js/game.js",
  "./js/log.js",
  "./js/stats.js",
  "./js/settings.js",
  "./res/air.png",
  "./res/earth.png",
  "./res/fire.png",
  "./res/water.png",
  "./assets/icons/favicon-16x16.png",
  "./assets/icons/favicon-32x32.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/android-chrome-192x192.png",
  "./assets/icons/android-chrome-512x512.png",
];


// ============================================================
//  INSTALL
//  Pre-cache all core assets when the service worker installs.
//  skipWaiting() ensures the new SW activates immediately
//  rather than waiting for all tabs to close.
// ============================================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});


// ============================================================
//  ACTIVATE
//  Delete any caches that don't match the current CACHE_NAME.
//  This cleans up old versioned caches after an update.
//  clients.claim() lets the SW take control of open pages
//  immediately without requiring a reload.
// ============================================================
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


// ============================================================
//  FETCH
//  Cache-first strategy:
//    1. Check cache — return immediately if found.
//    2. Fall back to network if not in cache.
//    3. Cache the network response for next time.
//    4. If both fail (offline + not cached), return the
//       offline fallback page.
// ============================================================
self.addEventListener("fetch", (event) => {

  // Ignore non-GET requests (POST, PUT etc.) — don't cache these
  if (event.request.method !== "GET") return;

  // Ignore browser extension requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((networkResponse) => {
          // Clone the response — it can only be consumed once
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline fallback — return the cached index for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});