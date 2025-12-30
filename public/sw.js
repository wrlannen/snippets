// Minimal service worker for PWA installability
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

// Optionally, add fetch event for offline support
// self.addEventListener('fetch', event => {});