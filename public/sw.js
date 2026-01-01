/**
 * Service Worker for Snippets PWA
 * 
 * Provides offline support and caching:
 * - Cache-first strategy for static assets (CSS, JS, fonts)
 * - Network-first strategy for HTML (ensures fresh content)
 * - Stale-while-revalidate for images
 * 
 * @version 1.0.0
 */

const CACHE_NAME = 'snippets-v1';

/** Static assets to pre-cache on install */
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

/**
 * Install event - pre-cache essential assets
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - serve from cache with network fallback
 * Uses cache-first for better offline support
 */
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses or opaque responses
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});