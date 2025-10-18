// Service worker for Food Exchange Planner PWA

// Name of the cache for this version of the app
const CACHE_NAME = 'food-exchange-planner-v2';

// List of resources to pre-cache for offline use.  These paths are
// relative to the root of the PWA when served.  If you add new
// resources that are essential for offline functionality, be sure to
// include them here.
const ASSETS_TO_CACHE = [
  // Use relative paths here so that the service worker caches files correctly
  // when deployed on GitHub Pages (which serves content from a sub-path).
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'food_exchange_dataset.json',
  'images/icon-192.png',
  'images/icon-512.png'
];

// During the installation phase, open a cache and preload the
// essential assets.  The service worker will not complete
// installation until all specified assets are cached.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Intercept network requests and serve cached versions when
// available.  If the resource is not cached, the request falls
// through to the network.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If a cached response is found, return it; otherwise fetch from network
      return cachedResponse || fetch(event.request);
    })
  );
});

// Activate event fires when a new service worker takes control.  This
// handler cleans up old caches that do not match the current cache
// name, ensuring that outdated resources do not linger.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      );
    })
  );
});
