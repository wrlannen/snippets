// Minimal service worker for PWA installability and offline support
const CACHE_NAME = 'snippets-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/dist/app.js',
  '/dist/vendor.js',
  '/dist/sidebar-state.js',
  '/tailwind.output.css',
  '/vendor/codemirror.min.css',
  '/vendor/dracula.min.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/app-screenshot.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});